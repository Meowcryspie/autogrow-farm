import React, { useState, useMemo, useEffect } from 'react';
import {
  Cpu,
  MapPin,
  Calendar,
  ZoomIn,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sprout,
  Scale,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';
import {
  FarmLocationData,
  TileStructure,
  AttachedSensor,
  ensureControllers,
  getStructureTypeLabel
} from './FarmDigitalTwinMap';

interface ExecutiveAnalyticsDashboardProps {
  farm: FarmLocationData;
  onOpenControllersTab?: () => void;
  onOpenHarvestTab?: () => void;
}

interface DailyReading {
  day: number;
  dateLabel: string;
  avg: number;
  min: number;
  max: number;
  inBand: boolean;
}

interface HourlyReading {
  hour: number;
  label: string;
  value: number;
  inBand: boolean;
}

interface CropProductionRecord {
  structureId: string;
  locationName: string;
  zone: string;
  structureTypeLabel: string;
  cropName: string;
  cropTypeGroup: string;
  stageLabel: string;
  stageIndex: number; // 1..5
  totalStages: number;
  dayInCycle: number;
  cycleDays: number;
  daysToHarvest: number;
  areaSqM: number;
  yieldDensityKgPerSqM: number;
  expectedYieldKg: number;
  gradeAProjectedPercent: number;
  ecStatusOk: boolean;
  envSummary: string;
}

const MONTHS_OPTIONS = [
  { id: '2026-11', label: 'Nov 2026', short: 'Nov', days: 30 },
  { id: '2026-10', label: 'Oct 2026', short: 'Oct', days: 31 },
  { id: '2026-09', label: 'Sep 2026', short: 'Sep', days: 30 }
] as const;

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function getSensorTarget(sensor: AttachedSensor, struct: TileStructure): { target: number; tolerance: number; decimals: number } {
  switch (sensor.type) {
    case 'ec':
      return { target: struct.metrics.targetEc > 0 ? struct.metrics.targetEc : sensor.value, tolerance: 0.25, decimals: 2 };
    case 'ph':
      return { target: struct.metrics.targetPh > 0 ? struct.metrics.targetPh : 5.8, tolerance: 0.22, decimals: 2 };
    case 'vpd':
      return { target: 1.05, tolerance: 0.25, decimals: 2 };
    case 'vwc':
      return { target: 68, tolerance: 10, decimals: 1 };
    case 'temp':
      return { target: 21, tolerance: 3, decimals: 1 };
    case 'co2':
      return { target: 900, tolerance: 180, decimals: 0 };
    case 'par':
      return { target: 450, tolerance: 120, decimals: 0 };
    default:
      return { target: sensor.value, tolerance: Math.max(0.2, sensor.value * 0.12), decimals: 2 };
  }
}

function buildMonthlySeries(
  seedKey: string,
  sensor: AttachedSensor,
  struct: TileStructure,
  monthIdx: number,
  isAttention: boolean
): DailyReading[] {
  const monthMeta = MONTHS_OPTIONS[monthIdx] || MONTHS_OPTIONS[0];
  const { target, tolerance, decimals } = getSensorTarget(sensor, struct);
  const baseVal = sensor.value;
  const seed = hashString(`${seedKey}-${monthMeta.id}`);
  const amp =
    sensor.type === 'ec' ? 0.14 :
    sensor.type === 'ph' ? 0.12 :
    sensor.type === 'vpd' ? 0.16 :
    sensor.type === 'vwc' ? 4.5 :
    sensor.type === 'temp' ? 1.8 : 0.15;

  const points: DailyReading[] = [];
  for (let d = 1; d <= monthMeta.days; d++) {
    const wave = Math.sin((d + (seed % 7)) * 0.52) * amp * 0.65 + Math.cos((d * 1.15) + (seed % 11)) * amp * 0.35;
    const monthShift = monthIdx === 0 ? 0 : monthIdx === 1 ? -amp * 0.25 : amp * 0.18;
    const attentionSpike = isAttention && (d % 6 === 2 || d % 9 === 5) ? (sensor.type === 'ph' ? 0.28 : -amp * 1.65) : 0;
    const rawAvg = Math.max(0, baseVal + wave + monthShift + attentionSpike);
    const factor = Math.pow(10, decimals);
    const avg = Math.round(rawAvg * factor) / factor;
    const spread = Math.round((amp * (0.6 + ((seed + d * 13) % 5) * 0.12)) * factor) / factor;
    const min = Math.max(0, Math.round((avg - spread) * factor) / factor);
    const max = Math.round((avg + spread) * factor) / factor;
    const inBand = target === 0 ? true : Math.abs(avg - target) <= tolerance;

    points.push({
      day: d,
      dateLabel: `${monthMeta.short} ${String(d).padStart(2, '0')}`,
      avg,
      min,
      max,
      inBand
    });
  }
  return points;
}

function buildHourlySeriesForDay(
  seedKey: string,
  sensor: AttachedSensor,
  struct: TileStructure,
  dayReading: DailyReading
): HourlyReading[] {
  const { target, tolerance, decimals } = getSensorTarget(sensor, struct);
  const seed = hashString(`${seedKey}-day-${dayReading.day}`);
  const factor = Math.pow(10, decimals);

  // Diurnal shape centered around solar noon (13:00)
  const rawOffsets: number[] = [];
  for (let h = 0; h < 24; h++) {
    const solar = Math.sin(((h - 6) / 24) * Math.PI * 2); // peak ~12:00, trough ~00:00
    const microRipple = Math.sin((h + (seed % 5)) * 1.4) * 0.18;
    let diurnal = solar + microRipple;
    if (sensor.type === 'ph') {
      // pH drops during dosing intervals, recovers gently
      diurnal = -solar * 0.65 + Math.cos(h * 0.9) * 0.35;
    } else if (sensor.type === 'vwc') {
      // Moisture dips mid-afternoon and peaks after scheduled irrigation
      diurnal = -solar * 0.8 + ((h % 4 === 0) ? 0.45 : -0.1);
    }
    rawOffsets.push(diurnal);
  }

  const meanOffset = rawOffsets.reduce((s, v) => s + v, 0) / 24;
  const halfSpan = Math.max(0.01, (dayReading.max - dayReading.min) / 2);
  const maxAbs = Math.max(...rawOffsets.map((v) => Math.abs(v - meanOffset)), 1);

  return rawOffsets.map((raw, h) => {
    const normalized = ((raw - meanOffset) / maxAbs) * halfSpan;
    const val = Math.max(0, Math.round((dayReading.avg + normalized) * factor) / factor);
    return {
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
      value: val,
      inBand: target === 0 ? true : Math.abs(val - target) <= tolerance
    };
  });
}

function isProductionStructure(struct: TileStructure): boolean {
  const lowerCrop = (struct.crop || '').toLowerCase();
  if (
    lowerCrop.includes('stock tank') ||
    lowerCrop.includes('graded packout') ||
    lowerCrop.includes('cold chain') ||
    lowerCrop.includes('delivery header') ||
    lowerCrop.includes('nutrient formula') ||
    lowerCrop.includes('concentrated a/b') ||
    lowerCrop.includes('transport')
  ) {
    return false;
  }
  return struct.type === 'greenhouse' || struct.type === 'polyhouse' || struct.type === 'beds';
}

function deriveCropProduction(struct: TileStructure, idx: number): CropProductionRecord {
  const cropLower = (struct.crop || '').toLowerCase();
  const areaSqM = Math.max(24, struct.wTiles * struct.hTiles * 40);

  let cropTypeGroup = struct.crop || 'Commercial Hydroponic Crop';
  let stageLabel = 'Vegetative Canopy';
  let stageIndex = 2;
  let cycleDays = 60;
  let dayInCycle = 32;
  let yieldDensityKgPerSqM = 28.5;

  if (cropLower.includes('tomato')) {
    cropTypeGroup = 'Vine Tomatoes';
    stageLabel = 'Generative · Fruit Ripening';
    stageIndex = 4;
    cycleDays = 84;
    dayInCycle = 68;
    yieldDensityKgPerSqM = 48.0;
  } else if (cropLower.includes('pepper') || cropLower.includes('cucumber')) {
    cropTypeGroup = 'Snack Peppers & Cucumbers';
    stageLabel = 'Flowering & Fruit Set';
    stageIndex = 3;
    cycleDays = 95;
    dayInCycle = 54;
    yieldDensityKgPerSqM = 36.5;
  } else if (cropLower.includes('lettuce') && cropLower.includes('seedling')) {
    cropTypeGroup = 'Lettuce Seedlings';
    stageLabel = '3-True-Leaf Plug Ready';
    stageIndex = 5;
    cycleDays = 18;
    dayInCycle = 16;
    yieldDensityKgPerSqM = 12.4;
  } else if (cropLower.includes('lettuce')) {
    cropTypeGroup = 'Crisphead Butter Lettuce';
    stageLabel = 'Head Fill · Harvest Ready';
    stageIndex = 5;
    cycleDays = 28;
    dayInCycle = 25;
    yieldDensityKgPerSqM = 22.0;
  } else if (cropLower.includes('herb') || cropLower.includes('basil') || cropLower.includes('mint')) {
    cropTypeGroup = 'Culinary Herbs (Basil/Mint)';
    stageLabel = 'Vegetative · Continuous Cut';
    stageIndex = 4;
    cycleDays = 30;
    dayInCycle = 21;
    yieldDensityKgPerSqM = 14.5;
  } else if (cropLower.includes('runner')) {
    cropTypeGroup = 'Strawberry Runners';
    stageLabel = 'Rooting & Stolon Set';
    stageIndex = 2;
    cycleDays = 42;
    dayInCycle = 24;
    yieldDensityKgPerSqM = 11.8;
  } else if (cropLower.includes('strawberr')) {
    cropTypeGroup = 'Albion Strawberries';
    const staggered = idx % 2 === 1;
    stageLabel = staggered ? 'Flowering & Crown Set' : 'Berry Ripening · First Flush';
    stageIndex = staggered ? 3 : 4;
    cycleDays = 75;
    dayInCycle = staggered ? 39 : 61;
    yieldDensityKgPerSqM = 24.5;
  } else if (cropLower.includes('melon')) {
    cropTypeGroup = 'Japanese Crown Melon';
    stageLabel = 'Netting & Sugar Loading';
    stageIndex = 4;
    cycleDays = 82;
    dayInCycle = 64;
    yieldDensityKgPerSqM = 18.2;
  } else if (cropLower.includes('seedling') || cropLower.includes('plug')) {
    cropTypeGroup = 'High-Density Seedlings';
    stageLabel = 'Cotyledon -> 2-True-Leaf';
    stageIndex = 2;
    cycleDays = 21;
    dayInCycle = 11;
    yieldDensityKgPerSqM = 9.5;
  } else if (cropLower.includes('microgreen') || cropLower.includes('amaranth') || cropLower.includes('pea')) {
    cropTypeGroup = 'Microgreens & Shoots';
    stageLabel = 'Canopy Fill · Pre-Harvest';
    stageIndex = 5;
    cycleDays = 14;
    dayInCycle = 12;
    yieldDensityKgPerSqM = 10.8;
  } else {
    const mod = idx % 3;
    stageLabel = mod === 0 ? 'Active Vegetative' : mod === 1 ? 'Flowering / Fruit Set' : 'Maturation · Harvest Soon';
    stageIndex = mod + 2;
    cycleDays = 45;
    dayInCycle = 20 + mod * 9;
    yieldDensityKgPerSqM = 24.0;
  }

  const ecDiff = struct.metrics.targetEc > 0 ? Math.abs(struct.metrics.ec - struct.metrics.targetEc) : 0;
  const phDiff = Math.abs(struct.metrics.ph - struct.metrics.targetPh);
  const ecStatusOk = ecDiff <= 0.2 && phDiff <= 0.3 && struct.controller.status !== 'ATTENTION';
  const envPenalty = ecStatusOk ? 1.0 : 0.91;
  const expectedYieldKg = Math.round(areaSqM * yieldDensityKgPerSqM * envPenalty);
  const gradeAProjectedPercent = ecStatusOk ? Number((94.8 - ecDiff * 6).toFixed(1)) : 87.4;

  return {
    structureId: struct.id,
    locationName: struct.name,
    zone: struct.zone,
    structureTypeLabel: getStructureTypeLabel(struct.type),
    cropName: struct.crop,
    cropTypeGroup,
    stageLabel,
    stageIndex,
    totalStages: 5,
    dayInCycle,
    cycleDays,
    daysToHarvest: Math.max(1, cycleDays - dayInCycle),
    areaSqM,
    yieldDensityKgPerSqM: Number((yieldDensityKgPerSqM * envPenalty).toFixed(1)),
    expectedYieldKg,
    gradeAProjectedPercent,
    ecStatusOk,
    envSummary: `EC ${struct.metrics.ec.toFixed(2)} mS · pH ${struct.metrics.ph.toFixed(2)} · VPD ${struct.metrics.vpd.toFixed(2)} kPa`
  };
}

function getShortLocationLabel(struct: TileStructure, allStructures: TileStructure[]): string {
  const parts = struct.name.split('·').map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return struct.name;
  const prefixCount = allStructures.filter((s) => s.name.split('·')[0].trim() === parts[0]).length;
  return prefixCount > 1 ? parts.slice(1).join(' · ') : parts[0];
}

export const ExecutiveAnalyticsDashboard: React.FC<ExecutiveAnalyticsDashboardProps> = ({
  farm,
  onOpenControllersTab,
  onOpenHarvestTab
}) => {
  // Filter across places/locations within the estate
  const [selectedLocationId, setSelectedLocationId] = useState<string>('ALL');

  // Selected controller (MUST click controller first before revealing its sensors)
  const [selectedControllerKey, setSelectedControllerKey] = useState<string | null>(null);
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);

  // Time-series drilldown state: Monthly average -> click day to zoom into daily hourly profile
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(0);
  const [zoomedDay, setZoomedDay] = useState<number | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Reset controller/location selection cleanly when switching farms
  useEffect(() => {
    setSelectedLocationId('ALL');
    setSelectedControllerKey(null);
    setSelectedSensorId(null);
    setZoomedDay(null);
    setHoveredBarIndex(null);
  }, [farm.id]);

  // Build controller fleet grouped by location/structure
  const locationGroups = useMemo(() => {
    const filteredStructs =
      selectedLocationId === 'ALL'
        ? farm.structures
        : farm.structures.filter((s) => s.id === selectedLocationId);

    return filteredStructs.map((struct) => {
      const ctrls = ensureControllers(struct);
      return {
        struct,
        controllers: ctrls.map((ctrl, idx) => ({
          key: `${struct.id}::${ctrl.serial || idx}`,
          ctrl,
          struct
        }))
      };
    });
  }, [farm.structures, selectedLocationId]);

  const totalControllersInView = useMemo(
    () => locationGroups.reduce((sum, g) => sum + g.controllers.length, 0),
    [locationGroups]
  );

  // Lookup active clicked controller entry
  const activeControllerEntry = useMemo(() => {
    if (!selectedControllerKey) return null;
    for (const group of locationGroups) {
      const found = group.controllers.find((c) => c.key === selectedControllerKey);
      if (found) return found;
    }
    return null;
  }, [locationGroups, selectedControllerKey]);

  const attachedSensors: AttachedSensor[] = useMemo(() => {
    if (!activeControllerEntry) return [];
    if (activeControllerEntry.ctrl.sensors && activeControllerEntry.ctrl.sensors.length > 0) {
      return activeControllerEntry.ctrl.sensors;
    }
    return ensureControllers({ ...activeControllerEntry.struct, controllers: undefined })[0].sensors || [];
  }, [activeControllerEntry]);

  // Auto-select first sensor ONLY after user clicks a controller
  const activeSensor: AttachedSensor | null = useMemo(() => {
    if (!activeControllerEntry || attachedSensors.length === 0) return null;
    if (selectedSensorId) {
      const match = attachedSensors.find((s) => s.id === selectedSensorId);
      if (match) return match;
    }
    return attachedSensors[0];
  }, [activeControllerEntry, attachedSensors, selectedSensorId]);

  // Monthly & Daily series for the selected controller + sensor
  const monthlySeries = useMemo(() => {
    if (!activeControllerEntry || !activeSensor) return [];
    return buildMonthlySeries(
      `${farm.id}-${activeControllerEntry.key}-${activeSensor.id}`,
      activeSensor,
      activeControllerEntry.struct,
      selectedMonthIdx,
      activeControllerEntry.ctrl.status === 'ATTENTION'
    );
  }, [farm.id, activeControllerEntry, activeSensor, selectedMonthIdx]);

  const monthlyStats = useMemo(() => {
    if (monthlySeries.length === 0 || !activeSensor || !activeControllerEntry) {
      return { avg: 0, min: 0, max: 0, compliancePct: 100, target: 0, decimals: 2 };
    }
    const { target, decimals } = getSensorTarget(activeSensor, activeControllerEntry.struct);
    const sum = monthlySeries.reduce((s, p) => s + p.avg, 0);
    const avg = Number((sum / monthlySeries.length).toFixed(decimals));
    const min = Math.min(...monthlySeries.map((p) => p.min));
    const max = Math.max(...monthlySeries.map((p) => p.max));
    const inBandCount = monthlySeries.filter((p) => p.inBand).length;
    const compliancePct = Math.round((inBandCount / monthlySeries.length) * 100);
    return { avg, min, max, compliancePct, target, decimals };
  }, [monthlySeries, activeSensor, activeControllerEntry]);

  const zoomedDayObj = useMemo(() => {
    if (zoomedDay === null) return null;
    return monthlySeries.find((d) => d.day === zoomedDay) || null;
  }, [monthlySeries, zoomedDay]);

  const hourlySeries = useMemo(() => {
    if (!activeControllerEntry || !activeSensor || !zoomedDayObj) return [];
    return buildHourlySeriesForDay(
      `${farm.id}-${activeControllerEntry.key}-${activeSensor.id}`,
      activeSensor,
      activeControllerEntry.struct,
      zoomedDayObj
    );
  }, [farm.id, activeControllerEntry, activeSensor, zoomedDayObj]);

  // Crop Production & Yield Output (filtered by location when location is chosen)
  const cropRecords: CropProductionRecord[] = useMemo(() => {
    const sourceStructs =
      selectedLocationId === 'ALL'
        ? farm.structures
        : farm.structures.filter((s) => s.id === selectedLocationId);

    return sourceStructs
      .filter(isProductionStructure)
      .map((s, idx) => deriveCropProduction(s, idx));
  }, [farm.structures, selectedLocationId]);

  const cropSummary = useMemo(() => {
    const byType = new Map<string, { cropType: string; totalKg: number; areaSqM: number; bays: number; earliestHarvestDays: number }>();
    let totalYieldKg = 0;
    let totalAreaSqM = 0;
    let gradeASum = 0;
    let nearestHarvest: { days: number; location: string; crop: string } | null = null;

    for (const rec of cropRecords) {
      totalYieldKg += rec.expectedYieldKg;
      totalAreaSqM += rec.areaSqM;
      gradeASum += rec.gradeAProjectedPercent;

      if (!nearestHarvest || rec.daysToHarvest < nearestHarvest.days) {
        nearestHarvest = { days: rec.daysToHarvest, location: rec.locationName, crop: rec.cropTypeGroup };
      }

      const existing = byType.get(rec.cropTypeGroup);
      if (existing) {
        existing.totalKg += rec.expectedYieldKg;
        existing.areaSqM += rec.areaSqM;
        existing.bays += 1;
        existing.earliestHarvestDays = Math.min(existing.earliestHarvestDays, rec.daysToHarvest);
      } else {
        byType.set(rec.cropTypeGroup, {
          cropType: rec.cropTypeGroup,
          totalKg: rec.expectedYieldKg,
          areaSqM: rec.areaSqM,
          bays: 1,
          earliestHarvestDays: rec.daysToHarvest
        });
      }
    }

    const cropTypesList = Array.from(byType.values());
    const avgGradeA = cropRecords.length > 0 ? (gradeASum / cropRecords.length).toFixed(1) : '0.0';
    const avgDensity = totalAreaSqM > 0 ? (totalYieldKg / totalAreaSqM).toFixed(1) : '0.0';
    const optimalBays = cropRecords.filter((r) => r.ecStatusOk).length;

    return {
      cropTypeCount: cropTypesList.length,
      cropTypesList,
      totalYieldKg,
      totalAreaSqM,
      avgGradeA,
      avgDensity,
      optimalBays,
      nearestHarvest
    };
  }, [cropRecords]);

  const handleSelectController = (key: string) => {
    if (selectedControllerKey === key) {
      setSelectedControllerKey(null);
      setSelectedSensorId(null);
      setZoomedDay(null);
      setHoveredBarIndex(null);
    } else {
      setSelectedControllerKey(key);
      setSelectedSensorId(null);
      setZoomedDay(null);
      setHoveredBarIndex(null);
    }
  };

  const monthMeta = MONTHS_OPTIONS[selectedMonthIdx] || MONTHS_OPTIONS[0];

  return (
    <section
      data-testid="executive-analytics-dashboard"
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      {/* Top Executive Location Filter & Context Bar */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: '10px',
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                fontFamily: 'monospace',
                letterSpacing: '0.06em',
                padding: '2px 7px',
                borderRadius: '4px',
                backgroundColor: '#0F172A',
                color: '#34D399'
              }}>
                EXECUTIVE ANALYTICS
              </span>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Sensor Intelligence & Crop Production · {farm.name}
              </h2>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#64748B' }}>
              {farm.location} — Divided by facility location. Click any controller to inspect attached sensors, monthly averages, and day-level telemetry.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onOpenControllersTab && (
              <button
                onClick={onOpenControllersTab}
                style={{
                  padding: '6px 11px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  color: '#0F172A',
                  cursor: 'pointer'
                }}
              >
                Full Hardware Fleet ({farm.stats.activeControllers})
              </button>
            )}
            {onOpenHarvestTab && (
              <button
                onClick={onOpenHarvestTab}
                style={{
                  padding: '6px 11px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#0F172A',
                  border: '1px solid #0F172A',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                Harvest Batch Ledger
              </button>
            )}
          </div>
        </div>

        {/* Divided by Location Selector Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800, color: '#475569', marginRight: '4px' }}>
            <MapPin size={12} color="#10B981" />
            LOCATION:
          </span>

          <button
            data-testid="exec-location-ALL"
            onClick={() => {
              setSelectedLocationId('ALL');
              setZoomedDay(null);
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              border: selectedLocationId === 'ALL' ? '1px solid #0F172A' : '1px solid #E2E8F0',
              backgroundColor: selectedLocationId === 'ALL' ? '#0F172A' : '#F8FAFC',
              color: selectedLocationId === 'ALL' ? '#FFFFFF' : '#475569'
            }}
          >
            All Locations ({farm.structures.length})
          </button>

          {farm.structures.map((struct) => {
            const active = selectedLocationId === struct.id;
            const shortName = getShortLocationLabel(struct, farm.structures);
            return (
              <button
                key={struct.id}
                data-testid={`exec-location-${struct.id}`}
                onClick={() => {
                  setSelectedLocationId(struct.id);
                  setSelectedControllerKey(null);
                  setSelectedSensorId(null);
                  setZoomedDay(null);
                }}
                title={`${struct.name} (${struct.zone})`}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: active ? '1px solid #10B981' : '1px solid #E2E8F0',
                  backgroundColor: active ? '#ECFDF5' : '#FFFFFF',
                  color: active ? '#065F46' : '#475569'
                }}
              >
                {shortName}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: Asymmetric Split — Left: Controller Fleet by Location | Right: Click-to-Inspect Sensor & Month/Day Zoom */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 1.05fr) minmax(440px, 1.95fr)',
        gap: '16px',
        alignItems: 'stretch'
      }}>
        {/* LEFT PANE: Controller Fleet Tracking (Divided by Location, hides raw sensors until clicked) */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={15} color="#0F172A" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                  Controller Fleet by Location
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                  Controller type deployed per place · click to inspect sensors
                </div>
              </div>
            </div>
            <span style={{
              fontSize: '10.5px',
              fontFamily: 'monospace',
              fontWeight: 800,
              color: '#0F172A',
              backgroundColor: '#E2E8F0',
              padding: '2px 8px',
              borderRadius: '4px',
              whiteSpace: 'nowrap'
            }}>
              {totalControllersInView} {totalControllersInView === 1 ? 'UNIT' : 'UNITS'}
            </span>
          </div>

          <div style={{
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxHeight: '470px',
            overflowY: 'auto'
          }}>
            {locationGroups.map(({ struct, controllers }) => (
              <div
                key={struct.id}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  flexShrink: 0
                }}
              >
                {/* Location Header */}
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {struct.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>
                      {struct.zone} · {getStructureTypeLabel(struct.type)}
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#475569', whiteSpace: 'nowrap' }}>
                    {controllers.length} ctrl
                  </span>
                </div>

                {/* Controller Type Cards under this Location (NO inline sensor dump) */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {controllers.map(({ key, ctrl }, idx) => {
                    const isSelected = selectedControllerKey === key;
                    const sensorCount = ctrl.sensors?.length ?? ensureControllers({ ...struct, controllers: undefined })[0].sensors?.length ?? 4;
                    const isAttention = ctrl.status === 'ATTENTION';

                    return (
                      <button
                        key={key}
                        type="button"
                        data-testid={`exec-controller-card-${struct.id}-${idx}`}
                        onClick={() => handleSelectController(key)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          border: 'none',
                          borderTop: idx > 0 ? '1px solid #F1F5F9' : 'none',
                          borderLeft: isSelected ? '3px solid #10B981' : '3px solid transparent',
                          backgroundColor: isSelected ? '#ECFDF5' : '#FFFFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'background-color 0.12s ease'
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: isAttention ? '#F59E0B' : '#10B981',
                              flexShrink: 0
                            }} />
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>
                              {ctrl.model}
                            </span>
                          </div>
                          <div style={{ fontSize: '10.5px', fontFamily: 'monospace', color: '#64748B', marginTop: '2px' }}>
                            {ctrl.serial} · {ctrl.ipAddress} · {ctrl.status}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            backgroundColor: isSelected ? '#0F172A' : '#F1F5F9',
                            color: isSelected ? '#34D399' : '#334155',
                            border: '1px solid #CBD5E1'
                          }}>
                            {sensorCount} Sensors
                          </span>
                          <ChevronRight size={13} color={isSelected ? '#065F46' : '#94A3B8'} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANE: Revealed ONLY after clicking a controller — Sensor List + Monthly Avg + Zoom to Day */}
        <div
          data-testid="exec-sensor-analysis-pane"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {!activeControllerEntry || !activeSensor ? (
            <div
              data-testid="exec-select-controller-prompt"
              style={{
                flex: 1,
                padding: '32px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                gap: '12px'
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Activity size={20} color="#34D399" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  Select a Controller to Inspect Sensor Analytics
                </h3>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748B', maxWidth: '460px', lineHeight: 1.5 }}>
                  Click any controller card on the left to reveal the sensors wired to that location, review the <strong>monthly average</strong>, and <strong>zoom into any day</strong> for 24-hour diurnal telemetry.
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px', marginTop: '6px' }}>
                {locationGroups.slice(0, 4).map(({ struct, controllers }) => {
                  const first = controllers[0];
                  if (!first) return null;
                  return (
                    <button
                      key={first.key}
                      type="button"
                      onClick={() => handleSelectController(first.key)}
                      style={{
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        color: '#0F172A',
                        cursor: 'pointer'
                      }}
                    >
                      Inspect {getShortLocationLabel(struct, farm.structures)} ({first.ctrl.model.split(' ')[0]})
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Controller & Location Header */}
              <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 800 }}>
                      {activeControllerEntry.ctrl.model}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      color: '#34D399'
                    }}>
                      {activeControllerEntry.ctrl.serial}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    Place: <strong style={{ color: '#E2E8F0' }}>{activeControllerEntry.struct.name}</strong> · {activeControllerEntry.struct.zone}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedControllerKey(null);
                    setSelectedSensorId(null);
                    setZoomedDay(null);
                  }}
                  title="Close sensor inspector"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 9px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#E2E8F0',
                    cursor: 'pointer'
                  }}
                >
                  <X size={12} />
                  <span>Close</span>
                </button>
              </div>

              {/* Attached Sensors Selector (Only visible now that controller was clicked) */}
              <div
                data-testid="exec-revealed-sensors"
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC'
                }}
              >
                <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Attached Sensors on {activeControllerEntry.ctrl.serial} ({attachedSensors.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                  {attachedSensors.map((sensor) => {
                    const isSensorActive = sensor.id === activeSensor.id;
                    return (
                      <button
                        key={sensor.id}
                        type="button"
                        data-testid={`exec-sensor-tab-${sensor.type}`}
                        onClick={() => {
                          setSelectedSensorId(sensor.id);
                          setHoveredBarIndex(null);
                        }}
                        style={{
                          textAlign: 'left',
                          padding: '8px 10px',
                          borderRadius: '7px',
                          cursor: 'pointer',
                          border: isSensorActive ? '1px solid #0F172A' : '1px solid #CBD5E1',
                          backgroundColor: isSensorActive ? '#0F172A' : '#FFFFFF',
                          color: isSensorActive ? '#FFFFFF' : '#0F172A'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', fontFamily: 'monospace', opacity: 0.8 }}>
                          <span>{sensor.pin}</span>
                          <span>{sensor.status}</span>
                        </div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sensor.name}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: isSensorActive ? '#34D399' : '#10B981', marginTop: '2px' }}>
                          {sensor.value} {sensor.unit}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Avg vs Zoomed-In Day View Header & Controls */}
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {zoomedDayObj ? (
                      <button
                        type="button"
                        data-testid="exec-back-to-month-btn"
                        onClick={() => {
                          setZoomedDay(null);
                          setHoveredBarIndex(null);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 800,
                          backgroundColor: '#0F172A',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <ArrowLeft size={12} />
                        <span>Back to Month Avg</span>
                      </button>
                    ) : (
                      <Calendar size={15} color="#0F172A" />
                    )}

                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                        {zoomedDayObj
                          ? `Day Zoom (${zoomedDayObj.dateLabel}, 2026) · ${activeSensor.name}`
                          : `Monthly Average (${monthMeta.label}) · ${activeSensor.name}`}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {zoomedDayObj
                          ? '24-hour diurnal curve for selected day — use arrows to inspect adjacent days'
                          : 'Click any day bar below to zoom into hourly sensor readings for that day'}
                      </div>
                    </div>
                  </div>

                  {/* Month Switcher OR Day Steppers */}
                  {zoomedDayObj ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        disabled={zoomedDayObj.day <= 1}
                        onClick={() => setZoomedDay((d) => (d && d > 1 ? d - 1 : d))}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          cursor: zoomedDayObj.day <= 1 ? 'not-allowed' : 'pointer',
                          opacity: zoomedDayObj.day <= 1 ? 0.45 : 1,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Previous day"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, fontFamily: 'monospace', minWidth: '64px', textAlign: 'center', color: '#0F172A' }}>
                        {zoomedDayObj.dateLabel}
                      </span>
                      <button
                        type="button"
                        disabled={zoomedDayObj.day >= monthMeta.days}
                        onClick={() => setZoomedDay((d) => (d && d < monthMeta.days ? d + 1 : d))}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          cursor: zoomedDayObj.day >= monthMeta.days ? 'not-allowed' : 'pointer',
                          opacity: zoomedDayObj.day >= monthMeta.days ? 0.45 : 1,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Next day"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {MONTHS_OPTIONS.map((m, idx) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSelectedMonthIdx(idx);
                            setZoomedDay(null);
                          }}
                          style={{
                            padding: '4px 9px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: selectedMonthIdx === idx ? '1px solid #0F172A' : '1px solid #CBD5E1',
                            backgroundColor: selectedMonthIdx === idx ? '#0F172A' : '#FFFFFF',
                            color: selectedMonthIdx === idx ? '#FFFFFF' : '#475569'
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        data-testid="exec-zoom-latest-day-btn"
                        onClick={() => setZoomedDay(monthlySeries[monthlySeries.length - 1]?.day ?? 15)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 9px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          border: '1px solid #10B981',
                          backgroundColor: '#ECFDF5',
                          color: '#065F46',
                          cursor: 'pointer'
                        }}
                        title="Zoom into day view"
                      >
                        <ZoomIn size={12} />
                        <span>Zoom Day</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 4 KPI Strip (Changes between Month Stats and Zoomed Day Stats) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#F8FAFC'
                }}>
                  {zoomedDayObj ? (
                    <>
                      <div style={{ padding: '10px 12px', borderRight: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Day Mean</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                          {zoomedDayObj.avg} <span style={{ fontSize: '10.5px', fontWeight: 600 }}>{activeSensor.unit}</span>
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px', borderRight: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Day Min</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace', color: '#2563EB' }}>
                          {zoomedDayObj.min} {activeSensor.unit}
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px', borderRight: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Day Peak</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace', color: '#D97706' }}>
                          {zoomedDayObj.max} {activeSensor.unit}
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>vs Month Avg</div>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          color: Math.abs(zoomedDayObj.avg - monthlyStats.avg) <= 0.15 ? '#10B981' : '#D97706'
                        }}>
                          {zoomedDayObj.avg >= monthlyStats.avg ? '+' : ''}
                          {(zoomedDayObj.avg - monthlyStats.avg).toFixed(monthlyStats.decimals)} {activeSensor.unit}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ padding: '10px 12px', borderRight: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Monthly Avg</div>
                        <div data-testid="exec-monthly-avg-value" style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                          {monthlyStats.avg} <span style={{ fontSize: '10.5px', fontWeight: 600 }}>{activeSensor.unit}</span>
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px', borderRight: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Month Range</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'monospace', color: '#334155' }}>
                          {monthlyStats.min} – {monthlyStats.max}
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px', borderRight: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Target Setpoint</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace', color: '#2563EB' }}>
                          {monthlyStats.target} {activeSensor.unit}
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Target Compliance</div>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          color: monthlyStats.compliancePct >= 90 ? '#10B981' : '#D97706'
                        }}>
                          {monthlyStats.compliancePct}% In-Band
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* CHART AREA */}
                {zoomedDayObj ? (
                  /* DAY VIEW: 24-hour SVG Diurnal Line + Bar Strip */
                  <div
                    data-testid="exec-day-zoom-chart"
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '11px', color: '#64748B' }}>
                      <span>
                        Hourly Sensor Output ({zoomedDayObj.dateLabel}) · Live Unit: <strong style={{ color: '#0F172A' }}>{activeSensor.unit}</strong>
                      </span>
                      <span style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: 700 }}>
                        {hoveredBarIndex !== null && hourlySeries[hoveredBarIndex]
                          ? `${hourlySeries[hoveredBarIndex].label} → ${hourlySeries[hoveredBarIndex].value} ${activeSensor.unit}`
                          : `Target: ${monthlyStats.target} ${activeSensor.unit}`}
                      </span>
                    </div>

                    {(() => {
                      const vals = hourlySeries.map((h) => h.value);
                      const minV = Math.min(...vals, monthlyStats.target || vals[0]) * 0.92;
                      const maxV = Math.max(...vals, monthlyStats.target || vals[0]) * 1.08;
                      const span = Math.max(0.05, maxV - minV);
                      const W = 640;
                      const H = 140;
                      const pad = 16;

                      const targetY = H - pad - (((monthlyStats.target - minV) / span) * (H - pad * 2));
                      const polylinePts = hourlySeries
                        .map((pt, i) => {
                          const x = pad + (i / 23) * (W - pad * 2);
                          const y = H - pad - (((pt.value - minV) / span) * (H - pad * 2));
                          return `${x},${y}`;
                        })
                        .join(' ');

                      return (
                        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '148px', display: 'block' }}>
                          {/* Grid guidelines */}
                          <line x1={pad} y1={pad} x2={W - pad} y2={pad} stroke="#F1F5F9" strokeWidth="1" />
                          <line x1={pad} y1={H / 2} x2={W - pad} y2={H / 2} stroke="#F1F5F9" strokeWidth="1" />
                          <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#E2E8F0" strokeWidth="1" />

                          {/* Target line */}
                          {monthlyStats.target > 0 && targetY >= pad && targetY <= H - pad && (
                            <line
                              x1={pad}
                              y1={targetY}
                              x2={W - pad}
                              y2={targetY}
                              stroke="#2563EB"
                              strokeDasharray="4 4"
                              strokeWidth="1.2"
                            />
                          )}

                          {/* Diurnal curve */}
                          <polyline
                            fill="none"
                            stroke="#10B981"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={polylinePts}
                          />

                          {/* Interactive Hour Nodes */}
                          {hourlySeries.map((pt, i) => {
                            const x = pad + (i / 23) * (W - pad * 2);
                            const y = H - pad - (((pt.value - minV) / span) * (H - pad * 2));
                            const isHover = hoveredBarIndex === i;
                            return (
                              <g
                                key={pt.hour}
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredBarIndex(i)}
                                onMouseLeave={() => setHoveredBarIndex(null)}
                              >
                                <rect x={x - 10} y={0} width={20} height={H} fill="transparent" />
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={isHover ? 5 : 3}
                                  fill={pt.inBand ? (isHover ? '#0F172A' : '#10B981') : '#F59E0B'}
                                  stroke="#FFFFFF"
                                  strokeWidth="1.2"
                                />
                              </g>
                            );
                          })}
                        </svg>
                      );
                    })()}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'monospace', color: '#64748B', padding: '4px 6px 0' }}>
                      <span>00:00 (Night)</span>
                      <span>06:00</span>
                      <span>12:00 (Solar Peak)</span>
                      <span>18:00</span>
                      <span>23:00</span>
                    </div>
                  </div>
                ) : (
                  /* MONTH VIEW: Interactive 30/31-Day Bars — click any day to zoom in */
                  <div
                    data-testid="exec-month-avg-chart"
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '11px', color: '#64748B', flexWrap: 'wrap', gap: '6px' }}>
                      <span>
                        Daily Averages for {monthMeta.label} · Click any bar to zoom into that day
                      </span>
                      <span style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: 700 }}>
                        {hoveredBarIndex !== null && monthlySeries[hoveredBarIndex]
                          ? `${monthlySeries[hoveredBarIndex].dateLabel}: Avg ${monthlySeries[hoveredBarIndex].avg} ${activeSensor.unit} (${monthlySeries[hoveredBarIndex].min}–${monthlySeries[hoveredBarIndex].max})`
                          : `Month Avg: ${monthlyStats.avg} ${activeSensor.unit}`}
                      </span>
                    </div>

                    {(() => {
                      const maxBarVal = Math.max(...monthlySeries.map((d) => d.avg), 0.1);
                      const minBarVal = Math.min(...monthlySeries.map((d) => d.avg)) * 0.78;
                      const range = Math.max(0.05, maxBarVal - minBarVal);

                      return (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '128px', padding: '8px 2px 0', borderBottom: '1px solid #E2E8F0' }}>
                          {monthlySeries.map((d, idx) => {
                            const pct = Math.max(12, Math.min(100, Math.round(((d.avg - minBarVal) / range) * 100)));
                            const isHover = hoveredBarIndex === idx;
                            return (
                              <button
                                key={d.day}
                                type="button"
                                data-testid={`exec-month-day-bar-${d.day}`}
                                onClick={() => {
                                  setZoomedDay(d.day);
                                  setHoveredBarIndex(null);
                                }}
                                onMouseEnter={() => setHoveredBarIndex(idx)}
                                onMouseLeave={() => setHoveredBarIndex(null)}
                                title={`${d.dateLabel}: ${d.avg} ${activeSensor.unit} — Click to zoom in`}
                                style={{
                                  flex: 1,
                                  height: `${pct}%`,
                                  border: 'none',
                                  borderRadius: '3px 3px 0 0',
                                  cursor: 'pointer',
                                  padding: 0,
                                  backgroundColor: isHover
                                    ? '#0F172A'
                                    : d.inBand
                                      ? '#10B981'
                                      : '#F59E0B',
                                  transition: 'background-color 0.1s ease, height 0.2s ease'
                                }}
                              />
                            );
                          })}
                        </div>
                      );
                    })()}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'monospace', color: '#64748B', marginTop: '5px' }}>
                      <span>{monthMeta.short} 01</span>
                      <span>{monthMeta.short} 10</span>
                      <span>{monthMeta.short} 20</span>
                      <span>{monthMeta.short} {monthMeta.days}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* SECTION 2: CROP PRODUCTION & OUTPUT INTELLIGENCE (Crop Types, Expected Yield, Growth Stage — Divided by Location) */}
      <div
        data-testid="exec-crop-production-panel"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '10px',
          overflow: 'hidden'
        }}
      >
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sprout size={16} color="#10B981" />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                Crop Production, Expected Yield & Phenological Stage
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                Active crop mix, projected biomass output adjusted by live EC/pH compliance, and growth stage per growing location
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {cropSummary.cropTypesList.map((ct) => (
              <span
                key={ct.cropType}
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '5px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A'
                }}
              >
                {ct.cropType} · <span style={{ fontFamily: 'monospace', color: '#059669' }}>{ct.totalKg.toLocaleString()} kg</span>
              </span>
            ))}
          </div>
        </div>

        {/* 4 Hairline Executive Production KPIs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          borderBottom: '1px solid #E2E8F0'
        }}>
          <div style={{ padding: '14px 18px', borderRight: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              <Layers size={12} color="#10B981" />
              <span>Active Crop Types</span>
            </div>
            <div data-testid="exec-crop-type-count" style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', marginTop: '4px' }}>
              {cropSummary.cropTypeCount} {cropSummary.cropTypeCount === 1 ? 'Type' : 'Types'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              Across {cropRecords.length} active growing {cropRecords.length === 1 ? 'location' : 'locations'} ({cropSummary.totalAreaSqM.toLocaleString()} m²)
            </div>
          </div>

          <div style={{ padding: '14px 18px', borderRight: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              <Scale size={12} color="#2563EB" />
              <span>Expected Cycle Yield</span>
            </div>
            <div data-testid="exec-expected-yield-total" style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', marginTop: '4px' }}>
              {cropSummary.totalYieldKg.toLocaleString()} kg
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              Avg {cropSummary.avgDensity} kg/m² · Est. {cropSummary.avgGradeA}% Grade-A packout
            </div>
          </div>

          <div style={{ padding: '14px 18px', borderRight: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              <Calendar size={12} color="#D97706" />
              <span>Next Expected Harvest</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', marginTop: '4px' }}>
              {cropSummary.nearestHarvest ? `In ${cropSummary.nearestHarvest.days}d` : '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {cropSummary.nearestHarvest
                ? `${cropSummary.nearestHarvest.crop} · ${cropSummary.nearestHarvest.location.split('·')[0].trim()}`
                : 'Select a growing location'}
            </div>
          </div>

          <div style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              <CheckCircle2 size={12} color="#10B981" />
              <span>Env-to-Yield Health</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: cropSummary.optimalBays === cropRecords.length ? '#10B981' : '#D97706', fontFamily: 'monospace', marginTop: '4px' }}>
              {cropRecords.length > 0 ? `${cropSummary.optimalBays}/${cropRecords.length} Optimal` : 'N/A'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              {cropSummary.optimalBays === cropRecords.length
                ? 'All growing bays within target EC/pH envelope'
                : 'EC/pH drift detected — yield adjusted'}
            </div>
          </div>
        </div>

        {/* Location-Divided Crop Stage & Expected Yield Table */}
        {cropRecords.length === 0 ? (
          <div style={{ padding: '20px', fontSize: '12px', color: '#64748B', textAlign: 'center' }}>
            The selected location is a support/fertigation utility facility (non-crop bay). Select a greenhouse, polyhouse, or NFT bed location to inspect crop yield and stage.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 16px' }}>Location / Facility</th>
                  <th style={{ padding: '10px 14px' }}>Crop Type</th>
                  <th style={{ padding: '10px 14px' }}>Current Stage</th>
                  <th style={{ padding: '10px 14px' }}>Cycle Progress</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Area & Density</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Expected Yield</th>
                </tr>
              </thead>
              <tbody>
                {cropRecords.map((rec) => {
                  const pct = Math.min(100, Math.round((rec.dayInCycle / rec.cycleDays) * 100));
                  return (
                    <tr
                      key={rec.structureId}
                      style={{ borderBottom: '1px solid #F1F5F9' }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{rec.locationName}</div>
                        <div style={{ fontSize: '10.5px', color: '#64748B', fontFamily: 'monospace' }}>
                          {rec.zone} · {rec.structureTypeLabel}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{rec.cropTypeGroup}</div>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>{rec.cropName}</div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: rec.stageIndex >= 5 ? '#ECFDF5' : rec.stageIndex >= 4 ? '#EFF6FF' : '#F8FAFC',
                          color: rec.stageIndex >= 5 ? '#065F46' : rec.stageIndex >= 4 ? '#1E40AF' : '#334155',
                          border: `1px solid ${rec.stageIndex >= 5 ? '#A7F3D0' : rec.stageIndex >= 4 ? '#BFDBFE' : '#CBD5E1'}`
                        }}>
                          Stage {rec.stageIndex}/{rec.totalStages} · {rec.stageLabel}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', marginTop: '4px', color: rec.ecStatusOk ? '#059669' : '#D97706', fontFamily: 'monospace' }}>
                          {!rec.ecStatusOk && <AlertTriangle size={10} />}
                          <span>{rec.envSummary}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', minWidth: '150px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontFamily: 'monospace', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>Day {rec.dayInCycle}/{rec.cycleDays}</span>
                          <span style={{ color: '#64748B' }}>Harvest in {rec.daysToHarvest}d</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`,
                            height: '100%',
                            backgroundColor: rec.ecStatusOk ? '#10B981' : '#F59E0B',
                            borderRadius: '3px'
                          }} />
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{rec.areaSqM.toLocaleString()} m²</div>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>{rec.yieldDensityKgPerSqM} kg/m²</div>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#059669' }}>
                          {rec.expectedYieldKg.toLocaleString()} kg
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748B' }}>
                          {rec.gradeAProjectedPercent}% Grade-A est.
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
