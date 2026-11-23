-- ==============================================================================
-- AUTOGROW CEA DATABASE DEFINITIONS (SQLITE EDGE & POSTGRESQL CLOUD)
-- ==============================================================================

-- 1. EDGE SQLITE SCHEMA (Runs in WAL mode on local Mini-PC / Edge Daemon)
-- ------------------------------------------------------------------------------
-- Raw High-Frequency Sensor Stream (Retained locally for 7-14 days)
CREATE TABLE IF NOT EXISTS raw_sensor_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farm_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  sensor_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  recorded_at TEXT NOT NULL -- ISO-8601 UTC
);
CREATE INDEX IF NOT EXISTS idx_raw_readings_time ON raw_sensor_readings(farm_id, zone_id, metric, recorded_at);

-- Local 1-Minute Rollup Queue for Store-and-Forward Sync
CREATE TABLE IF NOT EXISTS sensor_rollups_1m (
  farm_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  sensor_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  bucket_minute TEXT NOT NULL, -- 'YYYY-MM-DDTHH:mm:00Z'
  min_val REAL NOT NULL,
  avg_val REAL NOT NULL,
  max_val REAL NOT NULL,
  sample_count INTEGER NOT NULL,
  synced INTEGER DEFAULT 0,    -- 0 = pending cloud sync, 1 = synced
  PRIMARY KEY (farm_id, sensor_id, bucket_minute)
);
CREATE INDEX IF NOT EXISTS idx_sync_queue ON sensor_rollups_1m(synced, bucket_minute);

-- Command Deduplication & Replay Guard (Prevents executing delayed duplicate commands)
CREATE TABLE IF NOT EXISTS executed_commands (
  command_id TEXT PRIMARY KEY, -- UUID v4
  farm_id TEXT NOT NULL,
  actuator_id TEXT NOT NULL,
  action TEXT NOT NULL,
  duration_sec REAL NOT NULL,
  executed_at TEXT NOT NULL    -- ISO-8601 UTC
);

-- Local Alarms Table
CREATE TABLE IF NOT EXISTS active_alarms (
  alarm_id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  zone_id TEXT,
  severity TEXT NOT NULL,
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  triggered_at TEXT NOT NULL,
  acknowledged_at TEXT,
  resolved_at TEXT
);

-- Active Setpoints per Zone
CREATE TABLE IF NOT EXISTS zone_setpoints (
  farm_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  crop_profile TEXT NOT NULL,
  target_ec REAL NOT NULL,
  ec_deadband REAL NOT NULL,
  target_ph REAL NOT NULL,
  ph_deadband REAL NOT NULL,
  target_vpd REAL NOT NULL,
  target_temp_day REAL NOT NULL,
  target_temp_night REAL NOT NULL,
  target_vwc_irrigation REAL NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (farm_id, zone_id)
);


-- 2. CLOUD POSTGRESQL SCHEMA (Runs on Central Cloud VPS / Supabase)
-- ------------------------------------------------------------------------------
-- Note: Designed for monthly partitioning and idempotent upserts:
-- INSERT INTO cloud_sensor_rollups_1m (...) 
-- ON CONFLICT (farm_id, sensor_id, bucket_minute) 
-- DO UPDATE SET min_val = EXCLUDED.min_val, avg_val = EXCLUDED.avg_val, max_val = EXCLUDED.max_val;
