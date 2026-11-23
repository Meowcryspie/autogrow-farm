import { randomUUID } from 'node:crypto';
import type { 
  RawSensorReading, 
  ZoneSetpoint, 
  ActuatorCommand, 
  ActuatorState, 
  AlarmEvent 
} from '@autogrow/shared';
import { SAFETY_LIMITS } from '@autogrow/shared';

export class RuleEngine {
  private activeActuators: Map<string, { state: ActuatorState; timeoutHandle?: NodeJS.Timeout }> = new Map();
  private lastDoseTime: number = 0;
  private lastIrrigationTime: number = 0;

  constructor() {
    // Initialize default actuator states
    const defaultActuators = [
      'pump-acid', 
      'pump-nutrient-a', 
      'pump-nutrient-b', 
      'valve-irrigation-1', 
      'ridge-vent-north'
    ];
    for (const act of defaultActuators) {
      this.activeActuators.set(act, {
        state: {
          farm_id: 'farm-akl-001',
          actuator_id: act,
          status: 'IDLE',
          remaining_seconds: 0,
          updated_at: new Date().toISOString()
        }
      });
    }
  }

  getActuatorStates(): Record<string, ActuatorState> {
    const res: Record<string, ActuatorState> = {};
    for (const [key, val] of this.activeActuators.entries()) {
      res[key] = { ...val.state };
    }
    return res;
  }

  // Execute or pulse an actuator with bounded duration
  executeCommand(cmd: ActuatorCommand, onPulseApply?: (actuatorId: string, durationSec: number) => void): boolean {
    const actId = cmd.actuator_id;
    const current = this.activeActuators.get(actId);

    if (cmd.action === 'STOP' || cmd.action === 'PAUSE_ALL') {
      if (current?.timeoutHandle) clearTimeout(current.timeoutHandle);
      this.activeActuators.set(actId, {
        state: {
          farm_id: cmd.farm_id,
          actuator_id: actId,
          status: 'IDLE',
          current_action: undefined,
          remaining_seconds: 0,
          updated_at: new Date().toISOString()
        }
      });
      return true;
    }

    if (cmd.action === 'RUN_TIMED') {
      // Hard safety duration cap
      const cappedDuration = Math.min(cmd.duration_sec, SAFETY_LIMITS.MAX_DOSE_PUMP_RUN_SECONDS);

      if (current?.timeoutHandle) clearTimeout(current.timeoutHandle);

      const timeout = setTimeout(() => {
        this.activeActuators.set(actId, {
          state: {
            farm_id: cmd.farm_id,
            actuator_id: actId,
            status: 'IDLE',
            remaining_seconds: 0,
            updated_at: new Date().toISOString()
          }
        });
      }, cappedDuration * 1000);

      this.activeActuators.set(actId, {
        state: {
          farm_id: cmd.farm_id,
          actuator_id: actId,
          status: 'ACTIVE',
          current_action: 'RUN_TIMED',
          remaining_seconds: cappedDuration,
          updated_at: new Date().toISOString()
        },
        timeoutHandle: timeout
      });

      if (onPulseApply) {
        onPulseApply(actId, cappedDuration);
      }
      return true;
    }

    return false;
  }

  // Emergency Pause: Stop all dosing and valves immediately
  pauseAllOutputs(farmId: string): void {
    for (const [actId, item] of this.activeActuators.entries()) {
      if (item.timeoutHandle) clearTimeout(item.timeoutHandle);
      this.activeActuators.set(actId, {
        state: {
          farm_id: farmId,
          actuator_id: actId,
          status: 'IDLE',
          current_action: undefined,
          remaining_seconds: 0,
          updated_at: new Date().toISOString()
        }
      });
    }
  }

  // Decrement running seconds
  tickActuators(): void {
    for (const [, item] of this.activeActuators.entries()) {
      if (item.state.status === 'ACTIVE' && item.state.remaining_seconds && item.state.remaining_seconds > 0) {
        item.state.remaining_seconds -= 1;
        if (item.state.remaining_seconds <= 0) {
          item.state.status = 'IDLE';
          item.state.remaining_seconds = 0;
        }
      }
    }
  }

  // Evaluate Closed-Loop CEA Control Rules
  evaluateRules(
    readings: RawSensorReading[], 
    setpoint: ZoneSetpoint, 
    farmId: string
  ): { commands: ActuatorCommand[]; alarms: AlarmEvent[] } {
    const commands: ActuatorCommand[] = [];
    const alarms: AlarmEvent[] = [];
    const now = Date.now();
    const isoNow = new Date().toISOString();
    const expiry = new Date(now + 10000).toISOString();

    const readingMap: Record<string, number> = {};
    for (const r of readings) {
      readingMap[r.metric] = r.value;
    }

    const currentPH = readingMap['ph'];
    const currentEC = readingMap['ec'];
    const currentVWC = readingMap['vwc'];
    const currentVPD = readingMap['vpd'];

    // 1. pH Control Rule (Closed-loop acid dosing)
    if (currentPH !== undefined) {
      if (currentPH > (setpoint.target_ph + setpoint.ph_deadband) && (now - this.lastDoseTime > 90000)) {
        this.lastDoseTime = now;
        commands.push({
          command_id: randomUUID(),
          farm_id: farmId,
          zone_id: setpoint.zone_id,
          actuator_id: 'pump-acid',
          action: 'RUN_TIMED',
          duration_sec: 12, // 12 second acid shot
          issued_by: 'rule-engine-ph-auto',
          created_at: isoNow,
          expires_at: expiry
        });
      }

      if (currentPH > 6.8) {
        alarms.push({
          alarm_id: randomUUID(),
          farm_id: farmId,
          zone_id: setpoint.zone_id,
          severity: 'WARNING',
          code: 'PH_DRIFT_HIGH',
          message: `Canopy pH elevated to ${currentPH.toFixed(2)} (Target: ${setpoint.target_ph.toFixed(2)})`,
          triggered_at: isoNow
        });
      }
    }

    // 2. EC Control Rule (Closed-loop nutrient A/B dosing)
    if (currentEC !== undefined) {
      if (currentEC < (setpoint.target_ec - setpoint.ec_deadband) && (now - this.lastDoseTime > 90000)) {
        this.lastDoseTime = now;
        commands.push({
          command_id: randomUUID(),
          farm_id: farmId,
          zone_id: setpoint.zone_id,
          actuator_id: 'pump-nutrient-a',
          action: 'RUN_TIMED',
          duration_sec: 15,
          issued_by: 'rule-engine-ec-auto',
          created_at: isoNow,
          expires_at: expiry
        });
      }
    }

    // 3. Substrate Moisture VWC% Rule
    if (currentVWC !== undefined && currentVWC < setpoint.target_vwc_irrigation && (now - this.lastIrrigationTime > 300000)) {
      this.lastIrrigationTime = now;
      commands.push({
        command_id: randomUUID(),
        farm_id: farmId,
        zone_id: setpoint.zone_id,
        actuator_id: 'valve-irrigation-1',
        action: 'RUN_TIMED',
        duration_sec: 35, // 35 second slab saturation pulse
        issued_by: 'rule-engine-vwc-auto',
        created_at: isoNow,
        expires_at: expiry
      });
    }

    // 4. VPD Extreme Stress Alarm
    if (currentVPD !== undefined && currentVPD > 1.85) {
      alarms.push({
        alarm_id: randomUUID(),
        farm_id: farmId,
        zone_id: setpoint.zone_id,
        severity: 'CRITICAL',
        code: 'VPD_TRANSPIRATION_STRESS',
        message: `Vapor Pressure Deficit critical: ${currentVPD.toFixed(2)} kPa. Stomata closing.`,
        triggered_at: isoNow
      });
    }

    return { commands, alarms };
  }
}
