import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { WebSocketServer, WebSocket } from 'ws';
import { EdgeDatabase } from './database.js';
import { CEASimulator } from './simulator.js';
import { RuleEngine } from './ruleEngine.js';
import { ActuatorCommandSchema, ZoneSetpointSchema } from '@autogrow/shared';
import type { ZoneSetpoint, RawSensorReading } from '@autogrow/shared';

const PORT = Number(process.env.PORT) || 8080;
const FARM_ID = process.env.FARM_ID || 'farm-akl-001';
const ZONE_ID = 'zone-1';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

// Initialize Core Subsystems
const db = new EdgeDatabase();
const simulator = new CEASimulator(FARM_ID, ZONE_ID);
const ruleEngine = new RuleEngine();

// Default Zone Setpoint
let currentSetpoint: ZoneSetpoint = db.getZoneSetpoint(FARM_ID, ZONE_ID) || {
  farm_id: FARM_ID,
  zone_id: ZONE_ID,
  crop_profile: 'Vine Crops (Tomatoes)',
  target_ec: 2.40,
  ec_deadband: 0.15,
  target_ph: 5.80,
  ph_deadband: 0.20,
  target_vpd: 1.15,
  target_temp_day: 24.0,
  target_temp_night: 18.0,
  target_vwc_irrigation: 58.0,
  updated_at: new Date().toISOString()
};
db.saveZoneSetpoint(currentSetpoint);

// Rollup Aggregation Buffer (Aggregates 60 1-second ticks into 1-minute bucket)
let rollupBuffer: Record<string, { min: number; max: number; sum: number; count: number; unit: string }> = {};
let currentMinuteBucket = new Date().toISOString().substring(0, 16) + ':00Z';

// ==============================================================================
// 1-SECOND SIMULATION & CONTROL TICK LOOP
// ==============================================================================
setInterval(() => {
  // 1. Advance simulation physics & generate raw sensor readings
  const readings = simulator.tick();
  ruleEngine.tickActuators();

  // 2. Persist raw readings to local SQLite WAL database
  for (const r of readings) {
    db.insertRawReading(r);

    // Rollup buffer accumulation
    if (!rollupBuffer[r.metric]) {
      rollupBuffer[r.metric] = { min: r.value, max: r.value, sum: r.value, count: 1, unit: r.unit };
    } else {
      const b = rollupBuffer[r.metric];
      b.min = Math.min(b.min, r.value);
      b.max = Math.max(b.max, r.value);
      b.sum += r.value;
      b.count += 1;
    }
  }

  // 3. Check 1-minute boundary for Store-and-Forward Rollup Upsert
  const nowMinute = new Date().toISOString().substring(0, 16) + ':00Z';
  if (nowMinute !== currentMinuteBucket) {
    for (const [metric, b] of Object.entries(rollupBuffer)) {
      db.upsertRollup1m({
        farm_id: FARM_ID,
        zone_id: ZONE_ID,
        sensor_id: `sensor-${metric}`,
        metric: metric as any,
        bucket_minute: currentMinuteBucket,
        min_val: b.min,
        avg_val: Number((b.sum / b.count).toFixed(2)),
        max_val: b.max,
        sample_count: b.count
      });
    }
    rollupBuffer = {};
    currentMinuteBucket = nowMinute;
  }

  // 4. Closed-loop automation evaluation
  const { commands, alarms } = ruleEngine.evaluateRules(readings, currentSetpoint, FARM_ID);

  for (const cmd of commands) {
    if (db.tryExecuteCommand(cmd)) {
      ruleEngine.executeCommand(cmd, (actId, dur) => simulator.applyActuatorPulse(actId, dur));
    }
  }

  for (const alm of alarms) {
    db.recordAlarm(alm);
  }

  // 5. Broadcast live telemetry packet over WebSockets to local dashboards
  const activeAlarms = db.getActiveAlarms(FARM_ID);
  const actuatorStates = ruleEngine.getActuatorStates();
  
  const broadcastPayload = JSON.stringify({
    type: 'TELEMETRY_TICK',
    farm_id: FARM_ID,
    zone_id: ZONE_ID,
    timestamp: new Date().toISOString(),
    metrics: readings.reduce((acc, r) => ({ ...acc, [r.metric]: r.value }), {}),
    actuators: actuatorStates,
    active_alarms: activeAlarms,
    setpoint: currentSetpoint
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(broadcastPayload);
    }
  }
}, 1000);

// ==============================================================================
// REST API ENDPOINTS
// ==============================================================================

// Health & Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    farm_id: FARM_ID,
    edge_version: '1.0.0-AKL',
    uptime_seconds: process.uptime(),
    db_mode: 'SQLITE_WAL',
    timestamp: new Date().toISOString()
  });
});

// Live Snapshot
app.get('/api/telemetry/live', (req, res) => {
  const readings = db.getRecentRawReadings(ZONE_ID, 10);
  const actuators = ruleEngine.getActuatorStates();
  const alarms = db.getActiveAlarms(FARM_ID);

  res.json({
    farm_id: FARM_ID,
    zone_id: ZONE_ID,
    readings,
    actuators,
    alarms,
    setpoint: currentSetpoint
  });
});

// Historical 24h Rollup Charts
app.get('/api/telemetry/history', (req, res) => {
  const metric = (req.query.metric as string) || 'vpd';
  const hours = Number(req.query.hours) || 24;
  const history = db.getHistoricalRollups(FARM_ID, ZONE_ID, metric, hours);
  res.json({ farm_id: FARM_ID, zone_id: ZONE_ID, metric, history });
});

// Manual Actuator Command Override (With Safety Bounds, Deduplication & Expiry)
app.post('/api/commands', (req, res) => {
  const parseResult = ActuatorCommandSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid command payload', details: parseResult.error.format() });
    return;
  }

  const cmd = parseResult.data;

  // Deduplication & Expiry check inside SQLite
  const isAccepted = db.tryExecuteCommand(cmd);
  if (!isAccepted) {
    res.status(409).json({ error: 'Command rejected: Expired or duplicate command_id' });
    return;
  }

  const success = ruleEngine.executeCommand(cmd, (actId, dur) => simulator.applyActuatorPulse(actId, dur));
  res.json({ success, command_id: cmd.command_id, status: 'EXECUTING', actuator: cmd.actuator_id });
});

// Emergency Pause: Stops all pumps and valves
app.post('/api/emergency-pause', (req, res) => {
  ruleEngine.pauseAllOutputs(FARM_ID);
  res.json({ success: true, message: 'All active actuators paused immediately' });
});

// Active Alarms & Acknowledgment
app.get('/api/alarms', (req, res) => {
  res.json(db.getActiveAlarms(FARM_ID));
});

app.post('/api/alarms/:id/ack', (req, res) => {
  db.resolveAlarm(req.params.id);
  res.json({ success: true, resolved_id: req.params.id });
});

// Setpoints
app.get('/api/setpoints', (req, res) => {
  res.json(currentSetpoint);
});

app.post('/api/setpoints', (req, res) => {
  const parseResult = ZoneSetpointSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid setpoint data', details: parseResult.error.format() });
    return;
  }

  currentSetpoint = parseResult.data;
  db.saveZoneSetpoint(currentSetpoint);
  res.json({ success: true, setpoint: currentSetpoint });
});

// Serve compiled dashboard static files on Edge Web Server (http://farm-box.local:8080)
const dashboardDist = path.resolve(process.cwd(), '../dashboard/dist');
if (fs.existsSync(dashboardDist)) {
  console.log(`[Autogrow Edge Engine] Serving compiled Farm Dashboard from ${dashboardDist}`);
  app.use(express.static(dashboardDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
    res.sendFile(path.join(dashboardDist, 'index.html'));
  });
}

// Start Server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[Autogrow Edge Engine] Running on http://0.0.0.0:${PORT}`);
  console.log(`[Autogrow Edge Engine] WebSocket endpoint ready at ws://0.0.0.0:${PORT}/ws`);
  console.log(`[Autogrow Edge Engine] Farm ID: ${FARM_ID} | Zone ID: ${ZONE_ID}`);
});
