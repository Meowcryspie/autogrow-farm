import type { RawSensorReading, MetricType } from '@autogrow/shared';

export interface SimulatedZoneState {
  farmId: string;
  zoneId: string;
  zoneName: string;
  cropProfile: string;
  ec: number;        // mS/cm
  ph: number;        // pH
  tempAir: number;   // °C
  humidity: number;  // %
  vwc: number;       // %
  ppfd: number;      // µmol/m²/s
  waterTemp: number; // °C
  co2: number;       // ppm
  dosingActive: boolean;
  irrigationActive: boolean;
  ventOpenPercent: number;
}

export class CEASimulator {
  private state: SimulatedZoneState;

  constructor(farmId: string = 'farm-akl-001', zoneId: string = 'zone-1') {
    this.state = {
      farmId,
      zoneId,
      zoneName: 'Venlo Bay 1 (Tomatoes)',
      cropProfile: 'Vine Crops (Tomatoes)',
      ec: 2.35,
      ph: 5.82,
      tempAir: 22.4,
      humidity: 72.0,
      vwc: 64.5,
      ppfd: 450,
      waterTemp: 20.8,
      co2: 780,
      dosingActive: false,
      irrigationActive: false,
      ventOpenPercent: 25
    };
  }

  getState(): SimulatedZoneState {
    return { ...this.state };
  }

  // Calculate Vapor Pressure Deficit using real CEA Tetens Equation
  calculateVPD(tempC: number, rhPercent: number): number {
    const vpSat = 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    const vpAir = vpSat * (rhPercent / 100);
    const vpd = vpSat - vpAir;
    return Number(Math.max(0.1, vpd).toFixed(2));
  }

  // Actuator feedback triggers
  applyActuatorPulse(actuatorId: string, durationSec: number) {
    if (actuatorId.includes('acid') || actuatorId.includes('ph-down')) {
      this.state.ph = Math.max(4.5, Number((this.state.ph - 0.25).toFixed(2)));
    } else if (actuatorId.includes('pump-a') || actuatorId.includes('pump-b') || actuatorId.includes('nutrient')) {
      this.state.ec = Math.min(4.5, Number((this.state.ec + 0.20).toFixed(2)));
    } else if (actuatorId.includes('valve') || actuatorId.includes('irrigation')) {
      this.state.vwc = Math.min(85.0, Number((this.state.vwc + 12.0).toFixed(1)));
    } else if (actuatorId.includes('vent')) {
      this.state.tempAir = Math.max(18.0, Number((this.state.tempAir - 1.5).toFixed(1)));
      this.state.humidity = Math.max(45.0, Number((this.state.humidity - 5.0).toFixed(1)));
    }
  }

  // Advance simulation clock (1 step = 1 second)
  tick(): RawSensorReading[] {
    const now = new Date();
    // Diurnal time-of-day progression (0.0 to 1.0)
    const hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const isDay = hours >= 6 && hours <= 19;

    // Solar radiation curve (Bell curve peaking at 13:00)
    let targetPPFD = 0;
    if (isDay) {
      const solarAngle = Math.sin(((hours - 6) / 13) * Math.PI);
      targetPPFD = Math.round(solarAngle * 950 + (Math.random() * 40 - 20));
    }
    this.state.ppfd = Math.max(0, targetPPFD);

    // Temperature follows solar radiation with 1hr thermal lag
    const baseTemp = isDay ? 21.0 + Math.sin(((hours - 7) / 13) * Math.PI) * 5.5 : 17.5;
    this.state.tempAir = Number((baseTemp + (Math.random() * 0.4 - 0.2)).toFixed(1));

    // Humidity inverse to temperature
    const baseRH = isDay ? 68.0 - Math.sin(((hours - 6) / 13) * Math.PI) * 16.0 : 82.0;
    this.state.humidity = Number((baseRH + (Math.random() * 0.8 - 0.4)).toFixed(1));

    // VPD computed from Temp & Humidity
    const vpd = this.calculateVPD(this.state.tempAir, this.state.humidity);

    // Natural plant transpiration drydown on substrate
    const transpirationRate = isDay ? (vpd * 0.04) : 0.005;
    this.state.vwc = Number(Math.max(30.0, this.state.vwc - transpirationRate).toFixed(2));

    // Natural pH upward drift (root anion exchange)
    this.state.ph = Number(Math.min(7.2, this.state.ph + 0.002).toFixed(2));

    // Natural EC dilution
    this.state.ec = Number(Math.max(1.2, this.state.ec - 0.001).toFixed(2));

    const timestamp = now.toISOString();

    const readings: RawSensorReading[] = [
      { farm_id: this.state.farmId, zone_id: this.state.zoneId, sensor_id: 'probe-ec-1', metric: 'ec', value: this.state.ec, unit: 'mS/cm', recorded_at: timestamp },
      { farm_id: this.state.farmId, zone_id: this.state.zoneId, sensor_id: 'probe-ph-1', metric: 'ph', value: this.state.ph, unit: 'pH', recorded_at: timestamp },
      { farm_id: this.state.farmId, zone_id: this.state.zoneId, sensor_id: 'calc-vpd-1', metric: 'vpd', value: vpd, unit: 'kPa', recorded_at: timestamp },
      { farm_id: this.state.farmId, zone_id: this.state.zoneId, sensor_id: 'sensor-temp-1', metric: 'temp_air', value: this.state.tempAir, unit: '°C', recorded_at: timestamp },
      { farm_id: this.state.farmId, zone_id: this.state.zoneId, sensor_id: 'sensor-rh-1', metric: 'humidity', value: this.state.humidity, unit: '%', recorded_at: timestamp },
      { farm_id: this.state.farmId, zone_id: this.state.zoneId, sensor_id: 'probe-vwc-1', metric: 'vwc', value: this.state.vwc, unit: '%', recorded_at: timestamp },
      { farm_id: this.state.farmId, zone_id: this.state.zoneId, sensor_id: 'mast-ppfd-1', metric: 'ppfd', value: this.state.ppfd, unit: 'µmol/m²/s', recorded_at: timestamp },
      { farm_id: this.state.farmId, zone_id: this.state.zoneId, sensor_id: 'tank-temp-1', metric: 'water_temp', value: this.state.waterTemp, unit: '°C', recorded_at: timestamp }
    ];

    return readings;
  }
}
