export const SQLITE_EDGE_SCHEMA = `
CREATE TABLE IF NOT EXISTS raw_sensor_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farm_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  sensor_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  recorded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_raw_readings_time ON raw_sensor_readings(farm_id, zone_id, metric, recorded_at);

CREATE TABLE IF NOT EXISTS sensor_rollups_1m (
  farm_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  sensor_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  bucket_minute TEXT NOT NULL,
  min_val REAL NOT NULL,
  avg_val REAL NOT NULL,
  max_val REAL NOT NULL,
  sample_count INTEGER NOT NULL,
  synced INTEGER DEFAULT 0,
  PRIMARY KEY (farm_id, sensor_id, bucket_minute)
);
CREATE INDEX IF NOT EXISTS idx_sync_queue ON sensor_rollups_1m(synced, bucket_minute);

CREATE TABLE IF NOT EXISTS executed_commands (
  command_id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  actuator_id TEXT NOT NULL,
  action TEXT NOT NULL,
  duration_sec REAL NOT NULL,
  executed_at TEXT NOT NULL
);

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
`;

export const POSTGRES_CLOUD_SCHEMA = `
CREATE TABLE IF NOT EXISTS cloud_sensor_rollups_1m (
  farm_id VARCHAR(64) NOT NULL,
  zone_id VARCHAR(64) NOT NULL,
  sensor_id VARCHAR(64) NOT NULL,
  metric VARCHAR(32) NOT NULL,
  bucket_minute TIMESTAMPTZ NOT NULL,
  min_val NUMERIC(8,2) NOT NULL,
  avg_val NUMERIC(8,2) NOT NULL,
  max_val NUMERIC(8,2) NOT NULL,
  sample_count INT NOT NULL,
  PRIMARY KEY (farm_id, sensor_id, bucket_minute)
);

CREATE TABLE IF NOT EXISTS cloud_command_audit (
  command_id UUID PRIMARY KEY,
  farm_id VARCHAR(64) NOT NULL,
  actuator_id VARCHAR(64) NOT NULL,
  action VARCHAR(32) NOT NULL,
  duration_sec NUMERIC(6,1) NOT NULL,
  issued_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) DEFAULT 'DISPATCHED'
);
`;
