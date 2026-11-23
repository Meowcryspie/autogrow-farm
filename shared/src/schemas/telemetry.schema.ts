import { z } from 'zod';

export const MetricTypeSchema = z.enum([
  'ec',
  'ph',
  'vpd',
  'temp_air',
  'humidity',
  'vwc',
  'ppfd',
  'water_temp',
  'co2',
  'par_accum'
]);

export const RawSensorReadingSchema = z.object({
  farm_id: z.string().min(1),
  zone_id: z.string().min(1),
  sensor_id: z.string().min(1),
  metric: MetricTypeSchema,
  value: z.number(),
  unit: z.string(),
  recorded_at: z.string().datetime()
});

export const SensorRollup1mSchema = z.object({
  farm_id: z.string().min(1),
  zone_id: z.string().min(1),
  sensor_id: z.string().min(1),
  metric: MetricTypeSchema,
  bucket_minute: z.string().datetime(),
  min_val: z.number(),
  avg_val: z.number(),
  max_val: z.number(),
  sample_count: z.number().int().positive(),
  synced: z.number().int().optional()
});

export const ActuatorActionSchema = z.enum(['RUN_TIMED', 'STOP', 'PAUSE_ALL']);

export const ActuatorCommandSchema = z.object({
  command_id: z.string().uuid(),
  farm_id: z.string().min(1),
  zone_id: z.string().optional(),
  actuator_id: z.string().min(1),
  action: ActuatorActionSchema,
  duration_sec: z.number().positive().max(300), // Max 5 minutes hard cap
  issued_by: z.string().min(1),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime()
}).refine(data => {
  const created = new Date(data.created_at).getTime();
  const expires = new Date(data.expires_at).getTime();
  return expires > created && (expires - created) <= 60000; // Expiry within 60s
}, {
  message: 'expires_at must be strictly after created_at and within 60 seconds'
});

export const AlarmSeveritySchema = z.enum(['INFO', 'WARNING', 'CRITICAL']);

export const AlarmEventSchema = z.object({
  alarm_id: z.string().uuid(),
  farm_id: z.string().min(1),
  zone_id: z.string().optional(),
  severity: AlarmSeveritySchema,
  code: z.string().min(1),
  message: z.string().min(1),
  triggered_at: z.string().datetime(),
  acknowledged_at: z.string().datetime().nullable().optional(),
  resolved_at: z.string().datetime().nullable().optional()
});

export const ZoneSetpointSchema = z.object({
  farm_id: z.string().min(1),
  zone_id: z.string().min(1),
  crop_profile: z.string().min(1),
  target_ec: z.number().min(0).max(10),
  ec_deadband: z.number().min(0.01).max(1),
  target_ph: z.number().min(3).max(9),
  ph_deadband: z.number().min(0.01).max(1),
  target_vpd: z.number().min(0).max(4),
  target_temp_day: z.number().min(5).max(50),
  target_temp_night: z.number().min(5).max(50),
  target_vwc_irrigation: z.number().min(10).max(90),
  updated_at: z.string().datetime()
});
