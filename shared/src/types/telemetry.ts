/**
 * Shared CEA (Controlled Environment Agriculture) Telemetry & Control Contracts
 * Single source of truth for Edge Worker, Cloud Relay, Web Dashboard, and Mobile App.
 */

export type MetricType = 
  | 'ec'           // Electrical Conductivity (mS/cm)
  | 'ph'           // Potential Hydrogen (pH 0-14)
  | 'vpd'          // Vapor Pressure Deficit (kPa)
  | 'temp_air'     // Canopy Air Temperature (°C)
  | 'humidity'     // Relative Humidity (% RH)
  | 'vwc'          // Volumetric Water Content in substrate (%)
  | 'ppfd'         // Photosynthetic Photon Flux Density (µmol/m²/s)
  | 'water_temp'   // Irrigation / Nutrient Reservoir Temp (°C)
  | 'co2'          // Ambient Carbon Dioxide (ppm)
  | 'par_accum';   // Daily Light Integral / Radiation Accumulation (mol/m²/day)

export interface RawSensorReading {
  farm_id: string;
  zone_id: string;
  sensor_id: string;
  metric: MetricType;
  value: number;
  unit: string;
  recorded_at: string; // ISO-8601 UTC
}

export interface SensorRollup1m {
  farm_id: string;
  zone_id: string;
  sensor_id: string;
  metric: MetricType;
  bucket_minute: string; // Truncated to minute: 'YYYY-MM-DDTHH:mm:00Z'
  min_val: number;
  avg_val: number;
  max_val: number;
  sample_count: number;
  synced?: number;       // 0 = pending cloud upload, 1 = synced (Edge SQLite only)
}

export type ActuatorAction = 'RUN_TIMED' | 'STOP' | 'PAUSE_ALL';

export interface ActuatorCommand {
  command_id: string;        // UUID v4 (unique for deduplication)
  farm_id: string;
  zone_id?: string;
  actuator_id: string;       // e.g. 'pump-a', 'pump-b', 'pump-acid', 'valve-zone-1', 'ridge-vent-north'
  action: ActuatorAction;
  duration_sec: number;      // Bounded duration enforced by Edge (e.g. 15s - NEVER infinite)
  issued_by: string;         // Operator or Automation Rule ID
  created_at: string;        // ISO-8601 UTC
  expires_at: string;        // ISO-8601 UTC (typically created_at + 10s). Expired packets are dropped.
}

export type ActuatorStateStatus = 'IDLE' | 'ACTIVE' | 'FAULT' | 'MANUAL_HOLD';

export interface ActuatorState {
  farm_id: string;
  actuator_id: string;
  status: ActuatorStateStatus;
  current_action?: ActuatorAction;
  remaining_seconds?: number;
  updated_at: string; // ISO-8601 UTC
}

export type AlarmSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AlarmEvent {
  alarm_id: string;          // UUID v4
  farm_id: string;
  zone_id?: string;
  severity: AlarmSeverity;
  code: string;              // e.g. 'PH_DRIFT_HIGH', 'EC_TOO_LOW', 'VPD_TRANSPIRATION_STRESS', 'PUMP_DRY_RUN'
  message: string;
  triggered_at: string;      // ISO-8601 UTC
  acknowledged_at?: string | null;
  resolved_at?: string | null;
}

export interface ZoneSetpoint {
  farm_id: string;
  zone_id: string;
  crop_profile: string;      // e.g. 'Vine Crops (Tomatoes)', 'Leafy Greens (NFT)'
  target_ec: number;         // e.g. 2.4 mS/cm
  ec_deadband: number;       // e.g. 0.2 mS/cm
  target_ph: number;         // e.g. 5.8
  ph_deadband: number;       // e.g. 0.3
  target_vpd: number;        // e.g. 1.15 kPa
  target_temp_day: number;   // e.g. 24.5 °C
  target_temp_night: number; // e.g. 18.0 °C
  target_vwc_irrigation: number; // e.g. trigger irrigation at 55% VWC
  updated_at: string;
}

export interface GreenhouseZoneSummary {
  zone_id: string;
  zone_name: string;
  crop: string;
  readings: Record<MetricType, number | undefined>;
  actuators: Record<string, ActuatorState>;
  active_alarms: AlarmEvent[];
  last_sync: string;
  is_online: boolean;
}
