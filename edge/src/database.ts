import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { SQLITE_EDGE_SCHEMA } from '@autogrow/shared';
import type { RawSensorReading, SensorRollup1m, ActuatorCommand, AlarmEvent, ZoneSetpoint } from '@autogrow/shared';

export class EdgeDatabase {
  private db: DatabaseSync;

  constructor(dbPath?: string) {
    const dataDir = dbPath ? path.dirname(dbPath) : path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const resolvedPath = dbPath || path.join(dataDir, 'farm_edge.sqlite');
    this.db = new DatabaseSync(resolvedPath);

    // Enforce SQLite WAL (Write-Ahead-Logging) Mode for rock-solid crash safety during power outages
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA synchronous = NORMAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');

    // Initialize Schema
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(SQLITE_EDGE_SCHEMA);
  }

  // Raw Reading Ingestion
  insertRawReading(reading: RawSensorReading): void {
    const stmt = this.db.prepare(`
      INSERT INTO raw_sensor_readings (farm_id, zone_id, sensor_id, metric, value, unit, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      reading.farm_id,
      reading.zone_id,
      reading.sensor_id,
      reading.metric,
      reading.value,
      reading.unit,
      reading.recorded_at
    );
  }

  // 1-Minute Rollup Store-and-Forward Upsert
  upsertRollup1m(rollup: SensorRollup1m): void {
    const stmt = this.db.prepare(`
      INSERT INTO sensor_rollups_1m (farm_id, zone_id, sensor_id, metric, bucket_minute, min_val, avg_val, max_val, sample_count, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(farm_id, sensor_id, bucket_minute) DO UPDATE SET
        min_val = MIN(sensor_rollups_1m.min_val, excluded.min_val),
        avg_val = (sensor_rollups_1m.avg_val * sensor_rollups_1m.sample_count + excluded.avg_val * excluded.sample_count) / (sensor_rollups_1m.sample_count + excluded.sample_count),
        max_val = MAX(sensor_rollups_1m.max_val, excluded.max_val),
        sample_count = sensor_rollups_1m.sample_count + excluded.sample_count
    `);
    stmt.run(
      rollup.farm_id,
      rollup.zone_id,
      rollup.sensor_id,
      rollup.metric,
      rollup.bucket_minute,
      rollup.min_val,
      rollup.avg_val,
      rollup.max_val,
      rollup.sample_count
    );
  }

  // Command Deduplication: Check and Record Executed Command
  tryExecuteCommand(cmd: ActuatorCommand): boolean {
    // 1. Check if command expired
    const now = new Date().getTime();
    const expiry = new Date(cmd.expires_at).getTime();
    if (now > expiry) {
      console.warn(`[EdgeDB] Dropping expired command ${cmd.command_id} (expired ${now - expiry}ms ago)`);
      return false;
    }

    // 2. Check if already executed (Idempotency Guard)
    const checkStmt = this.db.prepare('SELECT command_id FROM executed_commands WHERE command_id = ?');
    const existing = checkStmt.get(cmd.command_id);
    if (existing) {
      console.warn(`[EdgeDB] Dropping duplicate command ${cmd.command_id} (already executed)`);
      return false;
    }

    // 3. Insert into executed_commands
    const insertStmt = this.db.prepare(`
      INSERT INTO executed_commands (command_id, farm_id, actuator_id, action, duration_sec, executed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(cmd.command_id, cmd.farm_id, cmd.actuator_id, cmd.action, cmd.duration_sec, new Date().toISOString());
    return true;
  }

  // Get Recent Readings for Dashboard
  getRecentRawReadings(zoneId: string, limit: number = 50): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM raw_sensor_readings
      WHERE zone_id = ?
      ORDER BY id DESC
      LIMIT ?
    `);
    return stmt.all(zoneId, limit);
  }

  // Get Historical Rollups
  getHistoricalRollups(farmId: string, zoneId: string, metric: string, hours: number = 24): any[] {
    const since = new Date(Date.now() - hours * 3600000).toISOString();
    const stmt = this.db.prepare(`
      SELECT bucket_minute, avg_val, min_val, max_val
      FROM sensor_rollups_1m
      WHERE farm_id = ? AND zone_id = ? AND metric = ? AND bucket_minute >= ?
      ORDER BY bucket_minute ASC
    `);
    return stmt.all(farmId, zoneId, metric, since);
  }

  // Active Alarms Management
  recordAlarm(alarm: AlarmEvent): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO active_alarms (alarm_id, farm_id, zone_id, severity, code, message, triggered_at, acknowledged_at, resolved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      alarm.alarm_id,
      alarm.farm_id,
      alarm.zone_id || null,
      alarm.severity,
      alarm.code,
      alarm.message,
      alarm.triggered_at,
      alarm.acknowledged_at || null,
      alarm.resolved_at || null
    );
  }

  getActiveAlarms(farmId: string): AlarmEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM active_alarms
      WHERE farm_id = ? AND resolved_at IS NULL
      ORDER BY triggered_at DESC
    `);
    return stmt.all(farmId) as unknown as AlarmEvent[];
  }

  resolveAlarm(alarmId: string): void {
    const stmt = this.db.prepare('UPDATE active_alarms SET resolved_at = ? WHERE alarm_id = ?');
    stmt.run(new Date().toISOString(), alarmId);
  }

  // Setpoints
  getZoneSetpoint(farmId: string, zoneId: string): ZoneSetpoint | null {
    const stmt = this.db.prepare('SELECT * FROM zone_setpoints WHERE farm_id = ? AND zone_id = ?');
    const row = stmt.get(farmId, zoneId);
    return row ? (row as unknown as ZoneSetpoint) : null;
  }

  saveZoneSetpoint(setpoint: ZoneSetpoint): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO zone_setpoints (
        farm_id, zone_id, crop_profile, target_ec, ec_deadband, target_ph, ph_deadband,
        target_vpd, target_temp_day, target_temp_night, target_vwc_irrigation, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      setpoint.farm_id,
      setpoint.zone_id,
      setpoint.crop_profile,
      setpoint.target_ec,
      setpoint.ec_deadband,
      setpoint.target_ph,
      setpoint.ph_deadband,
      setpoint.target_vpd,
      setpoint.target_temp_day,
      setpoint.target_temp_night,
      setpoint.target_vwc_irrigation,
      setpoint.updated_at
    );
  }
}
