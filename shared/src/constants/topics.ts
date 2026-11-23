/**
 * Standardized MQTT Topics and Safety Operational Constants
 */

// MQTT Topic Builders
export const MQTT_TOPICS = {
  // Telemetry (Sensors -> Edge -> Cloud)
  zoneTelemetry: (farmId: string, zoneId: string) => `farm/${farmId}/zone/${zoneId}/telemetry`,
  allTelemetry: (farmId: string) => `farm/${farmId}/zone/+/telemetry`,

  // Actuator Commands (App / Cloud -> Edge)
  actuatorCommand: (farmId: string, actuatorId: string) => `farm/${farmId}/actuator/${actuatorId}/command`,
  allCommands: (farmId: string) => `farm/${farmId}/actuator/+/command`,

  // Actuator State Feedback (Edge -> App / Cloud)
  actuatorState: (farmId: string, actuatorId: string) => `farm/${farmId}/actuator/${actuatorId}/state`,
  allStates: (farmId: string) => `farm/${farmId}/actuator/+/state`,

  // Alarms
  alarms: (farmId: string) => `farm/${farmId}/alarms`,

  // Heartbeat & Sync Status
  heartbeat: (farmId: string) => `farm/${farmId}/heartbeat`,
  setpoints: (farmId: string, zoneId: string) => `farm/${farmId}/zone/${zoneId}/setpoints`
};

// Physical CEA Safety Caps (Enforced at Edge Level)
export const SAFETY_LIMITS = {
  // Maximum continuous dose run time regardless of payload
  MAX_DOSE_PUMP_RUN_SECONDS: 60,
  // Maximum valve continuous open time
  MAX_IRRIGATION_VALVE_SECONDS: 300,
  // Command expiry window (packets older than this are dropped)
  DEFAULT_COMMAND_EXPIRY_MS: 10000, // 10 seconds
  // Default heartbeat interval from edge to cloud
  EDGE_HEARTBEAT_INTERVAL_MS: 5000,
  // Threshold after which a farm is considered offline
  FARM_OFFLINE_THRESHOLD_MS: 30000
};

// Standard CEA Metric Units & Labels
export const METRIC_METADATA: Record<string, { label: string; unit: string; min: number; max: number; precision: number }> = {
  ec: { label: 'Electrical Conductivity', unit: 'mS/cm', min: 0.0, max: 6.0, precision: 2 },
  ph: { label: 'pH Level', unit: 'pH', min: 3.5, max: 8.5, precision: 2 },
  vpd: { label: 'Vapor Pressure Deficit', unit: 'kPa', min: 0.2, max: 2.8, precision: 2 },
  temp_air: { label: 'Canopy Air Temperature', unit: '°C', min: 10.0, max: 45.0, precision: 1 },
  humidity: { label: 'Relative Humidity', unit: '%', min: 20.0, max: 100.0, precision: 1 },
  vwc: { label: 'Substrate Moisture', unit: '% VWC', min: 10.0, max: 90.0, precision: 1 },
  ppfd: { label: 'PAR Light Intensity', unit: 'µmol/m²/s', min: 0, max: 2000, precision: 0 },
  water_temp: { label: 'Reservoir Water Temp', unit: '°C', min: 10.0, max: 35.0, precision: 1 },
  co2: { label: 'Carbon Dioxide', unit: 'ppm', min: 300, max: 2000, precision: 0 },
  par_accum: { label: 'Daily Light Integral', unit: 'mol/m²/d', min: 0, max: 60, precision: 1 }
};
