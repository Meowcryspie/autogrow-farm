import React, { useState, useEffect, useMemo } from 'react';
import {
  Signal,
  Wifi,
  Battery,
  Droplet,
  Thermometer,
  Sun,
  Activity,
  Layers,
  Bell,
  CheckCircle,
  Plus,
  RotateCcw,
  Smartphone,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Cpu,
  Lock,
} from 'lucide-react';
import type { ActuatorState, AlarmEvent, ZoneSetpoint } from '@autogrow/shared';
import { FarmOneDrawing } from './graphics/FarmOneDrawing';
import { FarmTwoDrawing } from './graphics/FarmTwoDrawing';
import { EcGauge } from './graphics/EcGauge';
import {
  AttachedController,
  AttachedSensor,
  ensureControllers,
  FarmLocationData,
  FARMS_DATA,
  getStructureTypeLabel,
  TileStructure,
} from './FarmDigitalTwinMap';

interface PhoneAppViewProps {
  farms?: FarmLocationData[];
  onFarmsChange?: React.Dispatch<React.SetStateAction<FarmLocationData[]>>;
  activeFarmIndex?: number;
  onActiveFarmIndexChange?: (idx: number) => void;
  metrics: Record<string, number>;
  actuators: Record<string, ActuatorState>;
  active_alarms: AlarmEvent[];
  setpoint: ZoneSetpoint | null;
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'OFFLINE';
  onTriggerCommand: (actuatorId: string, durationSec: number) => Promise<boolean>;
  onAcknowledgeAlarm: (alarmId: string) => Promise<void>;
  isStandaloneMobile?: boolean;
}

type MobileScreen =
  | 'farms'
  | 'facilities'
  | 'controllers'
  | 'telemetry'
  | 'dosing'
  | 'substrate'
  | 'alarms'
  | 'add_farm'
  | 'pairing';

const CONTROLLER_MODELS: AttachedController['model'][] = [
  'Autogrow EC Mini',
  'MultiGrow MGC-Pro 16-Ch',
  'IntelliDose Hub',
  'IntelliClimate Pro',
];

const SENSOR_SPECS: Record<
  AttachedSensor['type'],
  { name: string; unit: string; defaultVal: number; pin: string }
> = {
  ec: { name: 'EC Substrate Probe', unit: 'mS/cm', defaultVal: 2.35, pin: 'AN-01' },
  ph: { name: 'Glass pH Electrode', unit: 'pH', defaultVal: 5.85, pin: 'AN-02' },
  vpd: { name: 'Air Temp & VPD Sensor', unit: 'kPa', defaultVal: 1.15, pin: 'I2C-1' },
  vwc: { name: 'Substrate VWC% Moisture', unit: '%', defaultVal: 65.0, pin: 'AN-03' },
  temp: { name: 'Water Temperature Probe', unit: '°C', defaultVal: 21.0, pin: 'AN-04' },
  co2: { name: 'Ambient CO2 NDIR Sensor', unit: 'ppm', defaultVal: 850, pin: 'UART-1' },
  par: { name: 'PAR Quantum Light Meter', unit: 'µmol/m²/s', defaultVal: 480, pin: 'SDI-12' },
};

export const PhoneAppView: React.FC<PhoneAppViewProps> = ({
  farms: controlledFarms,
  onFarmsChange,
  activeFarmIndex,
  onActiveFarmIndexChange,
  metrics,
  actuators,
  active_alarms,
  setpoint,
  connectionStatus,
  onTriggerCommand,
  onAcknowledgeAlarm,
  isStandaloneMobile = false,
}) => {
  const [internalFarms, setInternalFarms] = useState<FarmLocationData[]>(() => FARMS_DATA);
  const farms = controlledFarms && controlledFarms.length > 0 ? controlledFarms : internalFarms;
  const setFarms = onFarmsChange ?? setInternalFarms;

  const [selectedFarmId, setSelectedFarmId] = useState<string>(farms[activeFarmIndex || 0]?.id || farms[0].id);
  const selectedFarmIdx = useMemo(() => {
    const idx = farms.findIndex((f) => f.id === selectedFarmId);
    return idx >= 0 ? idx : 0;
  }, [farms, selectedFarmId]);
  const selectedFarm = farms[selectedFarmIdx] || farms[0];

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
    selectedFarm.structures[0]?.id || ''
  );
  const selectedFacility: TileStructure | undefined = useMemo(
    () =>
      selectedFarm.structures.find((s) => s.id === selectedFacilityId) ||
      selectedFarm.structures[0],
    [selectedFarm, selectedFacilityId]
  );

  const facilityControllers: AttachedController[] = useMemo(
    () => (selectedFacility ? ensureControllers(selectedFacility) : []),
    [selectedFacility]
  );

  const [selectedControllerKey, setSelectedControllerKey] = useState<string>('');
  const selectedController: AttachedController | undefined = useMemo(
    () =>
      facilityControllers.find((c) => (c.id || c.serial) === selectedControllerKey) ||
      facilityControllers[0],
    [facilityControllers, selectedControllerKey]
  );

  // Navigation & Device Simulator State
  const [activeScreen, setActiveScreen] = useState<MobileScreen>('farms');
  const [selectedPreset, setSelectedPreset] = useState<'compact' | 'standard' | 'promax'>('standard');
  const [zoomScale, setZoomScale] = useState<number>(95);

  // Add Farm Form
  const [newFarmName, setNewFarmName] = useState('');
  const [newFarmLocation, setNewFarmLocation] = useState('');
  const [newFarmCrop, setNewFarmCrop] = useState('');
  const [newFarmFacilityName, setNewFarmFacilityName] = useState('Venlo Bay 01 · Starter Glasshouse');
  const [addFarmError, setAddFarmError] = useState<string | null>(null);

  // Add / Link Controller Form
  const [linkFarmId, setLinkFarmId] = useState(selectedFarm.id);
  const linkFarmObj = farms.find((f) => f.id === linkFarmId) || selectedFarm;
  const [linkFacilityId, setLinkFacilityId] = useState(selectedFacility?.id || '');
  const [linkModel, setLinkModel] = useState<AttachedController['model']>('Autogrow EC Mini');
  const [linkSerial, setLinkSerial] = useState('AG-7104-NZ');
  const [linkWifi, setLinkWifi] = useState('Greenhouse_5G_Commercial');
  const [linkStatusMsg, setLinkStatusMsg] = useState<string | null>(null);

  // Attach Sensor menu
  const [showAttachSensor, setShowAttachSensor] = useState(false);

  // Dosing State
  const [isDosingPulsing, setIsDosingPulsing] = useState(false);
  const [lastDoseMsg, setLastDoseMsg] = useState('12 mins ago');
  const [dosingMode, setDosingMode] = useState<'Auto' | 'Manual' | 'Off'>('Auto');
  const [selectedStage, setSelectedStage] = useState<string>('Bloom');
  const [targetEC, setTargetEC] = useState<number>(setpoint?.target_ec ?? 1.8);

  useEffect(() => {
    if (selectedFacility && selectedFacility.metrics.targetEc > 0) {
      setTargetEC(selectedFacility.metrics.targetEc);
    }
  }, [selectedFacility?.id]);

  useEffect(() => {
    if (linkFarmObj && !linkFarmObj.structures.some((s) => s.id === linkFacilityId)) {
      if (linkFarmObj.structures[0]) {
        setLinkFacilityId(linkFarmObj.structures[0].id);
      }
    }
  }, [linkFarmObj, linkFacilityId]);

  const stagePresets = [
    { label: 'Seedling', target: 0.8 },
    { label: 'Veg', target: 1.4 },
    { label: 'Bloom', target: 1.8 },
    { label: 'Peak', target: 2.2 },
  ];

  const presets = {
    compact: { width: 340, height: 720, label: '340 × 720 · Compact' },
    standard: { width: 380, height: 800, label: '380 × 800 · iPhone / Pixel' },
    promax: { width: 420, height: 860, label: '420 × 860 · Pro Max / Ultra' },
  };

  const currentFrame = presets[selectedPreset];

  // Live metrics scoped to selected controller/facility, blended with WS feed when connected
  const rawEC =
    connectionStatus === 'CONNECTED' && metrics.ec !== undefined
      ? metrics.ec
      : selectedFacility?.metrics.ec ?? 1.82;
  const livePH =
    connectionStatus === 'CONNECTED' && metrics.ph !== undefined
      ? metrics.ph.toFixed(2)
      : (selectedFacility?.metrics.ph ?? 5.85).toFixed(2);
  const liveTemp = metrics.temp_air !== undefined ? metrics.temp_air.toFixed(1) : '22.4';
  const liveWaterTemp =
    connectionStatus === 'CONNECTED' && metrics.temp_water !== undefined
      ? metrics.temp_water.toFixed(1)
      : (selectedFacility?.metrics.waterTemp ?? 21.0).toFixed(1);
  const liveVPD =
    connectionStatus === 'CONNECTED' && metrics.vpd !== undefined
      ? metrics.vpd.toFixed(2)
      : (selectedFacility?.metrics.vpd ?? 1.15).toFixed(2);
  const liveCO2 = metrics.co2 !== undefined ? Math.round(metrics.co2) : 780;
  const liveVWC =
    connectionStatus === 'CONNECTED' && metrics.vwc !== undefined
      ? metrics.vwc.toFixed(1)
      : (selectedFacility?.metrics.vwc ?? 64.5).toFixed(1);
  const livePoreEC =
    metrics.rootzone_pore_ec !== undefined
      ? metrics.rootzone_pore_ec.toFixed(2)
      : (rawEC + 0.25).toFixed(2);

  // Live Actuator states
  const acidPump = actuators['pump-acid'];
  const nutrientA = actuators['pump-nutrient-a'];
  const nutrientB = actuators['pump-nutrient-b'];
  const isAcidActive = acidPump?.status === 'ACTIVE' || Boolean(acidPump?.remaining_seconds && acidPump.remaining_seconds > 0);
  const isNutrientAActive = nutrientA?.status === 'ACTIVE' || Boolean(nutrientA?.remaining_seconds && nutrientA.remaining_seconds > 0);
  const isNutrientBActive = nutrientB?.status === 'ACTIVE' || Boolean(nutrientB?.remaining_seconds && nutrientB.remaining_seconds > 0);

  const handlePulseDose = async () => {
    if (dosingMode === 'Off') return;
    setIsDosingPulsing(true);
    try {
      await onTriggerCommand('pump-acid', 10);
      setLastDoseMsg(`Just now (${selectedController?.serial || 'pump-acid'})`);
    } finally {
      setTimeout(() => setIsDosingPulsing(false), 10000);
    }
  };

  const handleOpenFarm = (farmId: string, idx: number) => {
    setSelectedFarmId(farmId);
    onActiveFarmIndexChange?.(idx);
    const farm = farms[idx];
    if (farm?.structures[0]) {
      setSelectedFacilityId(farm.structures[0].id);
      const ctrls = ensureControllers(farm.structures[0]);
      setSelectedControllerKey(ctrls[0]?.id || ctrls[0]?.serial || '');
    }
    setActiveScreen('facilities');
  };

  const handleCreateFarm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFarmName.trim();
    const cleanLoc = newFarmLocation.trim();
    const cleanCrop = newFarmCrop.trim();
    if (cleanName.length < 3) {
      setAddFarmError('Enter a farm / place name (at least 3 characters).');
      return;
    }
    if (!cleanLoc || !cleanCrop) {
      setAddFarmError('Location and primary crop are required.');
      return;
    }
    if (farms.some((f) => f.name.toLowerCase() === cleanName.toLowerCase())) {
      setAddFarmError('A farm with this name already exists.');
      return;
    }

    const idSuffix = Date.now().toString().slice(-4);
    const createdStruct: TileStructure = {
      id: `fac-${idSuffix}`,
      name: newFarmFacilityName.trim() || 'Venlo Bay 01 · Starter Glasshouse',
      type: 'greenhouse',
      tileX: 1,
      tileY: 1,
      wTiles: 4,
      hTiles: 3,
      rotation: 0,
      zone: 'Zone 01',
      crop: cleanCrop,
      controller: {
        id: `EM-${idSuffix}-NZ`,
        model: 'Autogrow EC Mini',
        serial: `EM-${idSuffix}-NZ`,
        firmware: 'v5.0-Rev3',
        wifiSSID: `${cleanName.split(' ')[0]}_SCADA`,
        rssi: -48,
        ipAddress: '192.168.50.21',
        status: 'ONLINE',
        doseCountHour: 18,
        doseCountTotal: 120,
      },
      metrics: { ec: 2.0, targetEc: 2.0, ph: 5.8, targetPh: 5.8, vpd: 1.05, vwc: 66.0, waterTemp: 20.4 },
      pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' },
    };

    const newFarm: FarmLocationData = {
      id: `farm-${idSuffix}`,
      name: cleanName,
      location: cleanLoc,
      tag: 'Commercial SCADA Estate',
      isActive: true,
      gridCols: 12,
      gridRows: 10,
      structures: [createdStruct],
      stats: {
        totalAreaSqM: 4800,
        activeControllers: 1,
        crop: cleanCrop,
        avgEc: '2.00 mS',
        status: 'ALL ONLINE',
      },
    };

    const nextFarms = [...farms, newFarm];
    setFarms(nextFarms);
    setSelectedFarmId(newFarm.id);
    onActiveFarmIndexChange?.(nextFarms.length - 1);
    setSelectedFacilityId(createdStruct.id);
    setSelectedControllerKey(createdStruct.controller.serial);
    setNewFarmName('');
    setNewFarmLocation('');
    setNewFarmCrop('');
    setAddFarmError(null);
    setActiveScreen('facilities');
  };

  const handleLinkDevice = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSerial = linkSerial.trim().toUpperCase();
    if (cleanSerial.length < 3) return;

    const newCtrlId = `${cleanSerial}-${Date.now().toString().slice(-3)}`;
    setFarms((prev) =>
      prev.map((farm) => {
        if (farm.id !== linkFarmObj.id) return farm;
        const updatedStructures = farm.structures.map((struct) => {
          if (struct.id !== linkFacilityId) return struct;
          const ctrls = ensureControllers(struct);
          const newCtrl: AttachedController = {
            id: newCtrlId,
            model: linkModel,
            serial: cleanSerial,
            firmware: 'v5.0-Rev3',
            wifiSSID: linkWifi.trim() || 'Autogrow_SCADA',
            rssi: -46,
            ipAddress: `192.168.10.${60 + ctrls.length}`,
            status: 'ONLINE',
            doseCountHour: 0,
            doseCountTotal: 0,
            sensors: [
              { id: `${newCtrlId}-s1`, name: 'EC Substrate Probe', type: 'ec', value: struct.metrics.ec || 2.0, unit: 'mS/cm', pin: 'AN-01', status: 'NORMAL' },
              { id: `${newCtrlId}-s2`, name: 'Glass pH Electrode', type: 'ph', value: struct.metrics.ph || 5.8, unit: 'pH', pin: 'AN-02', status: 'NORMAL' },
              { id: `${newCtrlId}-s3`, name: 'Air Temp & VPD Sensor', type: 'vpd', value: struct.metrics.vpd || 1.1, unit: 'kPa', pin: 'I2C-1', status: 'NORMAL' },
            ],
          };
          return { ...struct, controllers: [...ctrls, newCtrl] };
        });
        return {
          ...farm,
          structures: updatedStructures,
          stats: {
            ...farm.stats,
            activeControllers: updatedStructures.reduce((s, st) => s + ensureControllers(st).length, 0),
          },
        };
      })
    );

    setSelectedFarmId(linkFarmObj.id);
    setSelectedFacilityId(linkFacilityId);
    setSelectedControllerKey(newCtrlId);
    setLinkStatusMsg(`Linked ${linkModel} (${cleanSerial}) cleanly.`);
  };

  const handleAttachSensor = (type: AttachedSensor['type']) => {
    if (!selectedFacility || !selectedController) return;
    const spec = SENSOR_SPECS[type];
    const ctrlKey = selectedController.id || selectedController.serial;
    setFarms((prev) =>
      prev.map((farm) => {
        if (farm.id !== selectedFarm.id) return farm;
        return {
          ...farm,
          structures: farm.structures.map((struct) => {
            if (struct.id !== selectedFacility.id) return struct;
            const ctrls = ensureControllers(struct).map((ctrl) => {
              if ((ctrl.id || ctrl.serial) !== ctrlKey) return ctrl;
              const nextIdx = (ctrl.sensors?.length || 0) + 1;
              const nextSensor: AttachedSensor = {
                id: `sens-${Date.now().toString().slice(-4)}-${nextIdx}`,
                name: spec.name,
                type,
                value: spec.defaultVal,
                unit: spec.unit,
                pin: `${spec.pin}-${nextIdx}`,
                status: 'NORMAL',
              };
              return { ...ctrl, sensors: [...(ctrl.sensors || []), nextSensor] };
            });
            return { ...struct, controllers: ctrls };
          }),
        };
      })
    );
    setShowAttachSensor(false);
  };

  const totalControllersAcrossFarms = farms.reduce(
    (sum, f) => sum + f.structures.reduce((s, st) => s + ensureControllers(st).length, 0),
    0
  );
  const controllerSensors = selectedController?.sensors || [];

  const phoneContent = (
    <div style={{
      width: isStandaloneMobile ? '100%' : `${currentFrame.width}px`,
      height: isStandaloneMobile ? '100%' : `${currentFrame.height}px`,
      maxWidth: '100%',
      backgroundColor: '#FFFFFF',
      borderRadius: isStandaloneMobile ? '0' : '44px',
      border: isStandaloneMobile ? 'none' : '10px solid #1F2937',
      boxShadow: isStandaloneMobile ? 'none' : '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.1)',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      userSelect: 'none',
      margin: '0 auto',
    }}>
      {/* Hardware Dynamic Island Notch */}
      {!isStandaloneMobile && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '105px',
          height: '24px',
          backgroundColor: '#1F2937',
          borderRadius: '16px',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#111827' }} />
          <div style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: connectionStatus === 'CONNECTED' ? '#15803D' : '#EF4444',
          }} />
        </div>
      )}

      {/* Phone Status Bar */}
      <div style={{
        height: isStandaloneMobile ? '36px' : '40px',
        padding: '8px 20px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        fontFamily: 'sans-serif',
        color: '#111827',
        fontWeight: 600,
        backgroundColor: '#FFFFFF',
        zIndex: 40,
      }}>
        <span>09:41</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Signal size={12} />
          <Wifi size={12} color={connectionStatus === 'CONNECTED' ? '#15803D' : '#EF4444'} />
          <Battery size={13} />
        </div>
      </div>

      {/* App Body Shell */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#F9FAFB', overflowY: 'auto' }}>

        {/* ================= LEVEL 1: MY FARMS / PLACES ================= */}
        {activeScreen === 'farms' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: '0 0 2px 0', letterSpacing: '-0.02em' }}>
                  My farms
                </h3>
                <div style={{ fontSize: '11.5px', color: '#15803D', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#15803D' }} />
                  SCADA Sync Active
                </div>
              </div>
              <div style={{ backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px' }}>
                {connectionStatus === 'CONNECTED' ? `${totalControllersAcrossFarms} Online` : 'Simulation'}
              </div>
            </div>

            {/* First-page buttons: Add Farm / Place + Add Device */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => setActiveScreen('add_farm')}
                style={{
                  backgroundColor: '#15803D',
                  color: '#FFFFFF',
                  padding: '11px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Plus size={15} />
                Add Farm / Place
              </button>
              <button
                onClick={() => {
                  setLinkFarmId(selectedFarm.id);
                  setLinkFacilityId(selectedFarm.structures[0]?.id || '');
                  setLinkStatusMsg(null);
                  setActiveScreen('pairing');
                }}
                style={{
                  backgroundColor: '#111827',
                  color: '#FFFFFF',
                  padding: '11px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Cpu size={15} color="#34D399" />
                Add Device
              </button>
            </div>

            {/* 3 Summary KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>Farms</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>{farms.length}</div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>Controllers</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>{totalControllersAcrossFarms}</div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: active_alarms.length > 0 ? '#DC2626' : '#6B7280', fontWeight: 600 }}>Alarms</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: active_alarms.length > 0 ? '#DC2626' : '#111827', fontFamily: 'monospace' }}>
                  {active_alarms.length}
                </div>
              </div>
            </div>

            {/* Farm Estates List -> Click Opens Facilities */}
            {farms.map((farm, idx) => {
              const ctrlCount = farm.structures.reduce((s, st) => s + ensureControllers(st).length, 0);
              const hasAttn = farm.structures.some((st) => st.controller.status === 'ATTENTION');
              return (
                <div
                  key={farm.id}
                  onClick={() => handleOpenFarm(farm.id, idx)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    padding: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ width: '100%', maxWidth: '240px', margin: '0 auto 8px auto' }}>
                    {farm.id === 'farm-genting-02' || idx % 2 === 1 ? <FarmTwoDrawing /> : <FarmOneDrawing />}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      backgroundColor: hasAttn ? '#FEF3C7' : '#DCFCE7',
                      color: hasAttn ? '#B45309' : '#15803D',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}>
                      {hasAttn ? '1 ATTENTION' : 'ALL ONLINE'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>{farm.location}</span>
                  </div>
                  <h4 style={{ fontSize: '15.5px', fontWeight: 800, color: '#111827', margin: '0 0 2px 0' }}>
                    {farm.name}
                  </h4>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px' }}>{farm.stats.crop}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#4B5563', borderTop: '1px solid #F3F4F6', paddingTop: '8px' }}>
                    <span>{farm.structures.length} Facilities · {ctrlCount} Ctrl · Avg EC <strong style={{ color: '#15803D' }}>{farm.stats.avgEc}</strong></span>
                    <span style={{ backgroundColor: '#0F172A', color: '#34D399', fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                      Facilities ›
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= LEVEL 2: FACILITIES INSIDE FARM ================= */}
        {activeScreen === 'facilities' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setActiveScreen('farms')}
                style={{ background: 'none', border: 'none', fontSize: '12px', color: '#15803D', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
              >
                <ArrowLeft size={14} /> All Farms
              </button>
              <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '4px' }}>
                FACILITIES
              </span>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>{selectedFarm.name}</h3>
              <div style={{ fontSize: '11.5px', color: '#6B7280' }}>{selectedFarm.location} · {selectedFarm.structures.length} Facilities</div>
            </div>

            <button
              onClick={() => {
                setLinkFarmId(selectedFarm.id);
                setLinkFacilityId(selectedFarm.structures[0]?.id || '');
                setLinkStatusMsg(null);
                setActiveScreen('pairing');
              }}
              style={{
                backgroundColor: '#111827',
                color: '#FFFFFF',
                padding: '10px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Cpu size={14} color="#34D399" /> Add / Link Controller to Farm
            </button>

            {selectedFarm.structures.map((struct) => {
              const ctrls = ensureControllers(struct);
              const isAttn = ctrls.some((c) => c.status === 'ATTENTION');
              return (
                <div
                  key={struct.id}
                  onClick={() => {
                    setSelectedFacilityId(struct.id);
                    setSelectedControllerKey(ctrls[0]?.id || ctrls[0]?.serial || '');
                    setActiveScreen('controllers');
                  }}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    padding: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#111827' }}>{struct.name}</span>
                    <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'monospace', color: isAttn ? '#D97706' : '#15803D' }}>
                      {struct.metrics.ec.toFixed(2)} mS
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>
                    {getStructureTypeLabel(struct.type)} · {struct.crop}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F3F4F6', paddingTop: '6px' }}>
                    <span style={{ fontSize: '10.5px', color: '#4B5563' }}>{struct.zone}</span>
                    <span style={{ backgroundColor: '#0F172A', color: '#34D399', fontSize: '10px', fontWeight: 800, fontFamily: 'monospace', padding: '2px 8px', borderRadius: '5px' }}>
                      {ctrls.length} Ctrl ›
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= LEVEL 3: CHOOSE CONTROLLER IN FACILITY ================= */}
        {activeScreen === 'controllers' && selectedFacility && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setActiveScreen('facilities')}
                style={{ background: 'none', border: 'none', fontSize: '12px', color: '#15803D', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
              >
                <ArrowLeft size={14} /> Back to Facilities
              </button>
              <button
                onClick={() => setActiveScreen('farms')}
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '3px 8px', fontSize: '10.5px', fontWeight: 700, color: '#4B5563', cursor: 'pointer' }}
              >
                All Farms
              </button>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>Controllers</h3>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>{selectedFarm.name} › {selectedFacility.name}</div>
            </div>

            <button
              onClick={() => {
                setLinkFarmId(selectedFarm.id);
                setLinkFacilityId(selectedFacility.id);
                setLinkStatusMsg(null);
                setActiveScreen('pairing');
              }}
              style={{
                backgroundColor: '#111827',
                color: '#FFFFFF',
                padding: '10px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              + Link / Add Controller to This Facility
            </button>

            {facilityControllers.map((ctrl) => {
              const key = ctrl.id || ctrl.serial;
              const isSel = key === (selectedController?.id || selectedController?.serial);
              const isAttn = ctrl.status === 'ATTENTION';
              const sCount = ctrl.sensors?.length || 0;
              return (
                <div
                  key={key}
                  onClick={() => {
                    setSelectedControllerKey(key);
                    setActiveScreen('telemetry');
                  }}
                  style={{
                    backgroundColor: isSel ? '#F0FDF4' : '#FFFFFF',
                    borderRadius: '12px',
                    border: `1px solid ${isSel ? '#15803D' : '#E5E7EB'}`,
                    padding: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>{ctrl.model}</span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      backgroundColor: isAttn ? '#FEF3C7' : '#DCFCE7',
                      color: isAttn ? '#B45309' : '#15803D',
                      padding: '2px 7px',
                      borderRadius: '4px',
                    }}>
                      {ctrl.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#6B7280', marginBottom: '6px' }}>
                    Serial: {ctrl.serial} · FW {ctrl.firmware}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F3F4F6', paddingTop: '6px' }}>
                    <span style={{ fontSize: '10.5px', fontFamily: 'monospace', color: '#4B5563' }}>
                      {ctrl.ipAddress} · {ctrl.rssi} dBm
                    </span>
                    <span style={{ backgroundColor: '#0F172A', color: '#34D399', fontSize: '10px', fontWeight: 800, fontFamily: 'monospace', padding: '2px 8px', borderRadius: '5px' }}>
                      {sCount} Sensors ›
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= LEVEL 4: CONTROLLER SENSORS & LIVE EC TELEMETRY ================= */}
        {activeScreen === 'telemetry' && selectedFacility && selectedController && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setActiveScreen('controllers')}
                style={{ background: 'none', border: 'none', fontSize: '12px', color: '#15803D', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
              >
                <ArrowLeft size={14} /> Controllers
              </button>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setActiveScreen('facilities')}
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', fontWeight: 700, color: '#4B5563', cursor: 'pointer' }}
                >
                  Facilities
                </button>
                <button
                  onClick={() => setActiveScreen('farms')}
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', fontWeight: 700, color: '#4B5563', cursor: 'pointer' }}
                >
                  All Farms
                </button>
              </div>
            </div>

            {/* Active Controller Dark Scope Header */}
            <div style={{ backgroundColor: '#0F172A', borderRadius: '12px', padding: '12px', color: '#FFFFFF' }}>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '2px' }}>
                {selectedFarm.name} › {selectedFacility.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 800 }}>{selectedController.model}</span>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#34D399' }}>{selectedController.serial}</span>
              </div>
              <div style={{ fontSize: '10.5px', color: '#CBD5E1', marginTop: '3px' }}>
                {selectedController.ipAddress} · {selectedController.rssi} dBm · {selectedController.doseCountHour} DC/h
              </div>
            </div>

            {/* Attached Sensors for This Controller */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                Attached Sensors ({controllerSensors.length})
              </span>
              <button
                onClick={() => setShowAttachSensor((v) => !v)}
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '4px 8px', fontSize: '10.5px', fontWeight: 700, color: '#15803D', cursor: 'pointer' }}
              >
                + Attach Sensor
              </button>
            </div>

            {showAttachSensor && (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(Object.keys(SENSOR_SPECS) as AttachedSensor['type'][]).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleAttachSensor(type)}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + {type.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {controllerSensors.map((sensor) => (
              <div
                key={sensor.id}
                style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#111827' }}>{sensor.name}</div>
                  <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#6B7280' }}>{sensor.pin} · {sensor.status}</div>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 900, fontFamily: 'monospace', color: '#15803D' }}>
                  {sensor.value} <span style={{ fontSize: '10.5px', color: '#6B7280' }}>{sensor.unit}</span>
                </div>
              </div>
            ))}

            {/* Curved EC Gauge Card */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
                Electrical Conductivity (EC)
              </div>
              <EcGauge ec={rawEC} target={targetEC} lowLimit={1.4} highLimit={2.4} statusColor="green" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginTop: '4px' }}>
                <button
                  onClick={() => setTargetEC((prev) => Math.max(0.6, Number((prev - 0.1).toFixed(1))))}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}
                >
                  -
                </button>
                <div style={{ fontSize: '12px', color: '#374151' }}>
                  Target: <strong style={{ color: '#15803D' }}>{targetEC.toFixed(1)}</strong> mS
                </div>
                <button
                  onClick={() => setTargetEC((prev) => Math.min(3.5, Number((prev + 0.1).toFixed(1))))}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Secondary Metrics: pH & Water Temp */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
                  <Droplet size={12} style={{ color: '#0284C7' }} /> pH Level
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>{livePH}</div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
                  <Thermometer size={12} style={{ color: '#D97706' }} /> Water Temp
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>{liveWaterTemp}°C</div>
              </div>
            </div>

            {/* Climate Environment Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                <div style={{ fontSize: '9.5px', color: '#6B7280', fontWeight: 600 }}>AIR TEMP</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>{liveTemp}°C</div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                <div style={{ fontSize: '9.5px', color: '#6B7280', fontWeight: 600 }}>VPD</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#15803D', fontFamily: 'monospace' }}>{liveVPD} kPa</div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                <div style={{ fontSize: '9.5px', color: '#6B7280', fontWeight: 600 }}>CO2</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>{liveCO2}</div>
              </div>
            </div>

            {/* Crop Stage Presets */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', marginBottom: '6px' }}>Crop Stage Presets:</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {stagePresets.map((st) => (
                  <button
                    key={st.label}
                    onClick={() => { setSelectedStage(st.label); setTargetEC(st.target); }}
                    style={{
                      flex: 1,
                      padding: '5px 2px',
                      borderRadius: '6px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: selectedStage === st.label ? '1px solid #76b82a' : '1px solid #E5E7EB',
                      backgroundColor: selectedStage === st.label ? '#F0FDF4' : '#F9FAFB',
                      color: selectedStage === st.label ? '#15803D' : '#4B5563',
                    }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setActiveScreen('dosing')}
              style={{
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: '#111827',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Droplet size={14} style={{ color: '#76b82a' }} />
              Open Dosing & Injection Controls
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* ================= SCREEN 3: DOSING & ACTUATORS ================= */}
        {activeScreen === 'dosing' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0 }}>Dosing Controls</h3>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>
                  {selectedFarm.name} › {selectedController?.serial}
                </div>
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                backgroundColor: dosingMode === 'Off' ? '#FEE2E2' : '#DCFCE7',
                color: dosingMode === 'Off' ? '#DC2626' : '#15803D',
                padding: '2px 8px',
                borderRadius: '4px',
              }}>
                {dosingMode === 'Off' ? 'LOCKED (OFF)' : 'INTERLOCK SAFE'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {[
                { id: 'pump-nutrient-a', name: 'Nutrient A (NPK)', active: isNutrientAActive, remaining: nutrientA?.remaining_seconds },
                { id: 'pump-nutrient-b', name: 'Nutrient B (Micro)', active: isNutrientBActive, remaining: nutrientB?.remaining_seconds },
                { id: 'pump-acid', name: 'pH Down (Acid)', active: isAcidActive, remaining: acidPump?.remaining_seconds },
                { id: 'valve-irrigation-1', name: 'Irrigation Valve', active: actuators['valve-irrigation-1']?.status === 'ACTIVE', remaining: 0 },
              ].map((pump) => (
                <div
                  key={pump.id}
                  style={{
                    backgroundColor: pump.active ? '#F0FDF4' : '#FFFFFF',
                    border: `1px solid ${pump.active ? '#15803D' : '#E5E7EB'}`,
                    borderRadius: '12px',
                    padding: '12px',
                  }}
                >
                  <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>{pump.id}</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', margin: '3px 0' }}>{pump.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: pump.active ? '#15803D' : '#6B7280' }}>
                      {pump.active ? `INJECTING (${pump.remaining}s)` : 'STANDBY'}
                    </span>
                    <button
                      onClick={() => dosingMode !== 'Off' && onTriggerCommand(pump.id, 8)}
                      disabled={Boolean(pump.active) || dosingMode === 'Off'}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: pump.active || dosingMode === 'Off' ? '#D1D5DB' : '#111827',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '10px',
                        fontWeight: 700,
                        cursor: pump.active || dosingMode === 'Off' ? 'default' : 'pointer',
                      }}
                    >
                      Pulse 8s
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Lock size={13} /> Dosing Mode:
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['Auto', 'Manual', 'Off'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDosingMode(mode)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: dosingMode === mode ? (mode === 'Off' ? '#DC2626' : '#111827') : '#F3F4F6',
                      color: dosingMode === mode ? '#FFFFFF' : '#4B5563',
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handlePulseDose}
              disabled={isDosingPulsing || dosingMode === 'Off'}
              style={{
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: dosingMode === 'Off' ? '#9CA3AF' : isDosingPulsing ? '#15803D' : '#111827',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: isDosingPulsing || dosingMode === 'Off' ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: 'auto',
              }}
            >
              <Droplet size={16} style={{ color: '#76b82a' }} />
              {isDosingPulsing ? 'Executing 10s Calibrated Dose...' : 'Pulse Dose 10s (Nutrient Skid)'}
            </button>
            <div style={{ textAlign: 'center', fontSize: '10px', color: '#9CA3AF' }}>Last manual injection: {lastDoseMsg}</div>
          </div>
        )}

        {/* ================= SCREEN 4: SUBSTRATE & ROOTZONE ================= */}
        {activeScreen === 'substrate' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0 }}>Substrate Root-Zone</h3>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>{selectedFacility?.name} · {selectedController?.serial}</div>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '4px' }}>
                TDR PROBE
              </span>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '18px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                VOLUMETRIC WATER CONTENT (VWC)
              </div>
              <div style={{ fontSize: '38px', fontWeight: 900, color: '#111827', fontFamily: 'monospace' }}>{liveVWC}%</div>
              <div style={{ fontSize: '11px', color: '#15803D', fontWeight: 600 }}>Optimal Target: 60% – 68%</div>
              <div style={{ height: '8px', backgroundColor: '#E5E7EB', borderRadius: '999px', marginTop: '12px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, Number(liveVWC))}%`, height: '100%', backgroundColor: '#15803D', borderRadius: '999px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, marginBottom: '2px' }}>Pore Water EC</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>{livePoreEC} mS/cm</div>
                <div style={{ fontSize: '10px', color: '#15803D', fontWeight: 600 }}>Salt Balance Normal</div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, marginBottom: '2px' }}>Slab Temp</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>{liveWaterTemp}°C</div>
                <div style={{ fontSize: '10px', color: '#15803D', fontWeight: 600 }}>Within Root Range</div>
              </div>
            </div>
          </div>
        )}

        {/* ================= SCREEN 5: ALARMS ================= */}
        {activeScreen === 'alarms' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0 }}>Active Alarms</h3>
                <div style={{ fontSize: '11.5px', color: '#6B7280' }}>Edge Safety & Interlock Monitoring</div>
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                backgroundColor: active_alarms.length > 0 ? '#FEE2E2' : '#DCFCE7',
                color: active_alarms.length > 0 ? '#DC2626' : '#15803D',
                padding: '2px 8px',
                borderRadius: '4px',
              }}>
                {active_alarms.length > 0 ? `${active_alarms.length} ACTIVE` : 'ALL CLEAR'}
              </span>
            </div>

            {active_alarms.length === 0 ? (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E5E7EB', padding: '28px 16px', textAlign: 'center' }}>
                <CheckCircle size={36} color="#15803D" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>No Active Edge Alarms</div>
                <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '4px' }}>
                  All sensors, dosing pumps, and tanks are operating within safe agronomic limits.
                </div>
              </div>
            ) : (
              active_alarms.map((alarm) => (
                <div key={alarm.alarm_id} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #FCA5A5', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#DC2626' }}>{alarm.severity}</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', margin: '4px 0' }}>{alarm.code}</div>
                  <div style={{ fontSize: '11.5px', color: '#4B5563', marginBottom: '8px' }}>{alarm.message}</div>
                  <button
                    onClick={() => onAcknowledgeAlarm(alarm.alarm_id)}
                    style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#111827', color: '#FFFFFF', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Acknowledge Alarm
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= ADD FARM / PLACE SCREEN ================= */}
        {activeScreen === 'add_farm' && (
          <form onSubmit={handleCreateFarm} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setActiveScreen('farms')}
              style={{ background: 'none', border: 'none', fontSize: '12px', color: '#15803D', fontWeight: 700, cursor: 'pointer', textAlign: 'left', padding: 0 }}
            >
              ← Back to Farms
            </button>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0 }}>Add Farm / Place</h3>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {addFarmError && <div style={{ color: '#DC2626', fontSize: '11.5px', fontWeight: 700 }}>{addFarmError}</div>}
              <input
                type="text"
                placeholder="Farm / Place Name (e.g. Johor Commercial Hydro)"
                value={newFarmName}
                onChange={(e) => setNewFarmName(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '12.5px' }}
              />
              <input
                type="text"
                placeholder="Location (e.g. Kluang, Johor)"
                value={newFarmLocation}
                onChange={(e) => setNewFarmLocation(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '12.5px' }}
              />
              <input
                type="text"
                placeholder="Primary Crop (e.g. Lettuce & Sweet Basil)"
                value={newFarmCrop}
                onChange={(e) => setNewFarmCrop(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '12.5px' }}
              />
              <input
                type="text"
                placeholder="Starter Facility Name"
                value={newFarmFacilityName}
                onChange={(e) => setNewFarmFacilityName(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '12.5px' }}
              />
              <button
                type="submit"
                style={{ padding: '11px', borderRadius: '10px', backgroundColor: '#15803D', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Create Farm Estate
              </button>
            </div>
          </form>
        )}

        {/* ================= ADD & LINK CONTROLLER DEVICE SCREEN ================= */}
        {activeScreen === 'pairing' && (
          <form onSubmit={handleLinkDevice} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setActiveScreen('farms')}
              style={{ background: 'none', border: 'none', fontSize: '12px', color: '#15803D', fontWeight: 700, cursor: 'pointer', textAlign: 'left', padding: 0 }}
            >
              ← Cancel
            </button>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0 }}>Add & Link Controller Device</h3>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>1. Target Farm</label>
              <select
                value={linkFarmObj.id}
                onChange={(e) => setLinkFarmId(e.target.value)}
                style={{ padding: '8px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '12px', backgroundColor: '#FFFFFF' }}
              >
                {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>

              <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>2. Target Facility</label>
              <select
                value={linkFacilityId}
                onChange={(e) => setLinkFacilityId(e.target.value)}
                style={{ padding: '8px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '12px', backgroundColor: '#FFFFFF' }}
              >
                {linkFarmObj.structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>3. Controller Model</label>
              <select
                value={linkModel}
                onChange={(e) => setLinkModel(e.target.value as AttachedController['model'])}
                style={{ padding: '8px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '12px', backgroundColor: '#FFFFFF' }}
              >
                {CONTROLLER_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>

              <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>4. Serial & Wi-Fi SSID</label>
              <input
                type="text"
                value={linkSerial}
                onChange={(e) => setLinkSerial(e.target.value)}
                placeholder="Controller Serial (e.g. AG-7104-NZ)"
                style={{ padding: '8px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '12px' }}
              />
              <input
                type="text"
                value={linkWifi}
                onChange={(e) => setLinkWifi(e.target.value)}
                placeholder="Facility Wi-Fi SSID"
                style={{ padding: '8px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '12px' }}
              />

              {linkStatusMsg && (
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#15803D' }}>{linkStatusMsg}</div>
              )}

              <button
                type="submit"
                style={{ padding: '11px', borderRadius: '10px', backgroundColor: '#15803D', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Save & Link Controller Device
              </button>

              {linkStatusMsg && (
                <button
                  type="button"
                  onClick={() => setActiveScreen('telemetry')}
                  style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#111827', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                >
                  Inspect Linked Controller & Sensors ›
                </button>
              )}
            </div>

            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#15803D' }}>
              <ShieldCheck size={16} />
              Encrypted TLS 1.3 token synced with SCADA digital twin.
            </div>
          </form>
        )}
      </div>

      {/* Bottom Phone App Navigation Bar */}
      <div style={{
        height: '54px',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px',
        fontSize: '10px',
        color: '#6B7280',
      }}>
        {[
          { id: 'farms', label: 'Farms', icon: <Layers size={17} />, match: ['farms', 'facilities', 'controllers', 'add_farm', 'pairing'] },
          { id: 'telemetry', label: 'Sensors', icon: <Activity size={17} />, match: ['telemetry'] },
          { id: 'dosing', label: 'Dosing', icon: <Droplet size={17} />, match: ['dosing'] },
          { id: 'substrate', label: 'Substrate', icon: <Sun size={17} />, match: ['substrate'] },
          { id: 'alarms', label: `Alarms (${active_alarms.length})`, icon: <Bell size={17} />, match: ['alarms'] },
        ].map((tab) => {
          const isAct = tab.match.includes(activeScreen);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveScreen(tab.id as MobileScreen)}
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                cursor: 'pointer',
                color: isAct ? '#15803D' : '#6B7280',
                fontWeight: isAct ? 700 : 500,
                flex: 1,
                textAlign: 'center',
                fontSize: '10px',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ height: '18px', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '110px', height: '4px', borderRadius: '999px', backgroundColor: '#1F2937' }} />
      </div>
    </div>
  );

  if (isStandaloneMobile) {
    return (
      <div style={{ width: '100%', height: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
        {phoneContent}
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: 'calc(100vh - 60px)',
      backgroundColor: '#0F172A',
      background: 'radial-gradient(circle at 50% 20%, #1E293B 0%, #0F172A 100%)',
    }}>
      <div style={{
        maxWidth: '740px',
        width: '100%',
        backgroundColor: '#1E293B',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '12px 18px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Smartphone size={15} color="#76b82a" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#F8FAFC' }}>Phone Simulator</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Versions:</span>
          <a href="https://meowcryspie.github.io/farmgrow/" target="_blank" rel="noreferrer" style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#0F172A', color: '#94A3B8', border: '1px solid #334155', textDecoration: 'none' }}>
            v1.0 Farmgrow ↗
          </a>
          <a href="https://meowcryspie.github.io/autogrow-web/#app" target="_blank" rel="noreferrer" style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#0F172A', color: '#94A3B8', border: '1px solid #334155', textDecoration: 'none' }}>
            v2.0 Web ↗
          </a>
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#15803D', color: '#FFFFFF', border: '1px solid #76b82a' }}>
            v3.0 Live Edge
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {(['compact', 'standard', 'promax'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPreset(p)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                border: selectedPreset === p ? '1px solid #76b82a' : '1px solid #475569',
                backgroundColor: selectedPreset === p ? '#15803D' : '#0F172A',
                color: selectedPreset === p ? '#FFFFFF' : '#94A3B8',
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>Scale:</span>
          <input type="range" min="70" max="105" value={zoomScale} onChange={(e) => setZoomScale(Number(e.target.value))} style={{ width: '90px', accentColor: '#76b82a', cursor: 'pointer' }} />
          <span style={{ fontSize: '11px', color: '#F8FAFC', fontFamily: 'monospace', width: '32px' }}>{zoomScale}%</span>
          <button onClick={() => { setZoomScale(95); setSelectedPreset('standard'); }} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      <div style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: 'top center', display: 'flex', justifyContent: 'center', paddingBottom: '40px' }}>
        {phoneContent}
      </div>
    </div>
  );
};
