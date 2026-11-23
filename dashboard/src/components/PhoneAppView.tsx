import React, { useState } from 'react';
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
  CheckCircle2, 
  ChevronRight 
} from 'lucide-react';
import type { ActuatorState, AlarmEvent, ZoneSetpoint } from '@autogrow/shared';
import { FarmOneDrawing } from './graphics/FarmOneDrawing';
import { FarmTwoDrawing } from './graphics/FarmTwoDrawing';
import { EcGauge } from './graphics/EcGauge';
import { ECMiniDrawing } from './graphics/ECMiniDrawing';

interface PhoneAppViewProps {
  metrics: Record<string, number>;
  actuators: Record<string, ActuatorState>;
  active_alarms: AlarmEvent[];
  setpoint: ZoneSetpoint | null;
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'OFFLINE';
  onTriggerCommand: (actuatorId: string, durationSec: number) => Promise<boolean>;
  onAcknowledgeAlarm: (alarmId: string) => Promise<void>;
  isStandaloneMobile?: boolean;
}

export const PhoneAppView: React.FC<PhoneAppViewProps> = ({
  metrics,
  actuators,
  active_alarms,
  setpoint,
  connectionStatus,
  onTriggerCommand,
  onAcknowledgeAlarm,
  isStandaloneMobile = false
}) => {
  // Navigation State
  const [activeScreen, setActiveScreen] = useState<'farms' | 'telemetry' | 'dosing' | 'substrate' | 'alarms' | 'pairing'>('farms');
  const [selectedPreset, setSelectedPreset] = useState<'compact' | 'standard' | 'promax'>('standard');
  const [zoomScale, setZoomScale] = useState<number>(95);

  // Dosing State
  const [isDosingPulsing, setIsDosingPulsing] = useState(false);
  const [lastDoseMsg, setLastDoseMsg] = useState('12 mins ago');
  const [dosingMode, setDosingMode] = useState<'Auto' | 'Manual' | 'Off'>('Auto');
  const [selectedStage, setSelectedStage] = useState<string>('Bloom');
  const [targetEC, setTargetEC] = useState<number>(setpoint?.target_ec ?? 1.80);

  const stagePresets = [
    { label: 'Seedling', target: 0.8 },
    { label: 'Veg', target: 1.4 },
    { label: 'Bloom', target: 1.8 },
    { label: 'Peak', target: 2.2 },
  ];

  const presets = {
    compact: { width: 340, height: 720, label: '340 × 720 · Compact' },
    standard: { width: 380, height: 800, label: '380 × 800 · iPhone / Pixel' },
    promax: { width: 420, height: 860, label: '420 × 860 · Pro Max / Ultra' }
  };

  const currentFrame = presets[selectedPreset];

  // Live Metric Values from WebSocket / Simulator
  const rawEC = metrics.ec !== undefined ? metrics.ec : 1.82;
  const liveEC = rawEC.toFixed(2);
  const livePH = metrics.ph !== undefined ? metrics.ph.toFixed(2) : '5.85';
  const liveTemp = metrics.temp_air !== undefined ? metrics.temp_air.toFixed(1) : '22.4';
  const liveWaterTemp = metrics.temp_water !== undefined ? metrics.temp_water.toFixed(1) : '21.4';
  const liveVPD = metrics.vpd !== undefined ? metrics.vpd.toFixed(2) : '1.15';
  const liveCO2 = metrics.co2 !== undefined ? Math.round(metrics.co2) : 780;
  const liveVWC = metrics.vwc !== undefined ? metrics.vwc.toFixed(1) : '64.5';
  const livePoreEC = metrics.rootzone_pore_ec !== undefined ? metrics.rootzone_pore_ec.toFixed(2) : '2.10';

  // Live Actuator states
  const acidPump = actuators['pump-acid'];
  const nutrientA = actuators['pump-nutrient-a'];
  const nutrientB = actuators['pump-nutrient-b'];
  const isAcidActive = acidPump?.status === 'ACTIVE' || (acidPump?.remaining_seconds && acidPump.remaining_seconds > 0);
  const isNutrientAActive = nutrientA?.status === 'ACTIVE' || (nutrientA?.remaining_seconds && nutrientA.remaining_seconds > 0);
  const isNutrientBActive = nutrientB?.status === 'ACTIVE' || (nutrientB?.remaining_seconds && nutrientB.remaining_seconds > 0);

  const handlePulseDose = async () => {
    setIsDosingPulsing(true);
    try {
      await onTriggerCommand('pump-acid', 10);
      setLastDoseMsg('Just now');
    } finally {
      setTimeout(() => setIsDosingPulsing(false), 10000);
    }
  };

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
      margin: '0 auto'
    }}>
      {/* Hardware Dynamic Island Notch (Only on desktop frame) */}
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
          gap: '6px'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#111827' }} />
          <div style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: connectionStatus === 'CONNECTED' ? '#15803D' : '#EF4444'
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
        zIndex: 40
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
        
        {/* ================= SCREEN 1: MY FARMS OVERVIEW (3D ISOMETRIC) ================= */}
        {activeScreen === 'farms' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Top Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: '0 0 2px 0', letterSpacing: '-0.02em' }}>
                  My farms
                </h3>
                <div style={{ fontSize: '11.5px', color: '#15803D', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#15803D' }} />
                  Live telemetry active
                </div>
              </div>

              <div style={{ backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px' }}>
                {connectionStatus === 'CONNECTED' ? '8 of 10 online' : 'Reconnecting...'}
              </div>
            </div>

            {/* Add Device Button */}
            <button
              onClick={() => setActiveScreen('pairing')}
              style={{
                backgroundColor: '#111827',
                color: '#FFFFFF',
                padding: '12px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              Add a device
            </button>

            {/* 3 Summary KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>Tanks</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>10</div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: active_alarms.length > 0 ? '#DC2626' : '#6B7280', fontWeight: 600 }}>Alarms</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: active_alarms.length > 0 ? '#DC2626' : '#111827', fontFamily: 'monospace' }}>
                  {active_alarms.length}
                </div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>Offline</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>2</div>
              </div>
            </div>

            {/* Farm Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Farm 1: Cameron Highlands (Interactive 3D Isometric Peaked Greenhouse) */}
              <div 
                onClick={() => setActiveScreen('telemetry')}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E5E7EB',
                  padding: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'transform 0.15s ease',
                }}
              >
                {/* 3D Isometric Farm One Drawing */}
                <div style={{ width: '100%', maxWidth: '260px', margin: '0 auto 8px auto', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.06))' }}>
                  <FarmOneDrawing />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '4px' }}>
                    ALL ONLINE
                  </span>
                  <span style={{ fontSize: '11px', color: '#6B7280' }}>Cameron Highlands</span>
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: '0 0 6px 0' }}>
                  Highlands Hydroponics
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#4B5563', borderTop: '1px solid #F3F4F6', paddingTop: '8px' }}>
                  <span>4 Tanks Active</span>
                  <span>Avg EC: <strong style={{ color: '#15803D' }}>{liveEC} mS/cm</strong></span>
                </div>
              </div>

              {/* Farm 2: Genting Highlands (Interactive 3D Isometric Hydroponic Beds) */}
              <div 
                onClick={() => setActiveScreen('telemetry')}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E5E7EB',
                  padding: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'transform 0.15s ease',
                }}
              >
                {/* 3D Isometric Farm Two Drawing */}
                <div style={{ width: '100%', maxWidth: '260px', margin: '0 auto 8px auto', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.06))' }}>
                  <FarmTwoDrawing />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '4px' }}>
                    1 ATTENTION
                  </span>
                  <span style={{ fontSize: '11px', color: '#6B7280' }}>Genting Highlands</span>
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: '0 0 6px 0' }}>
                  Pahang Berry Bay
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#4B5563', borderTop: '1px solid #F3F4F6', paddingTop: '8px' }}>
                  <span>6 Tanks Active</span>
                  <span>Avg EC: <strong style={{ color: '#15803D' }}>2.12 mS/cm</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= SCREEN 2: TANK TELEMETRY & CURVED EC GAUGE ================= */}
        {activeScreen === 'telemetry' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Top Bar with Back to Farms */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setActiveScreen('farms')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  color: '#15803D',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                ← All farms
              </button>
              <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '4px' }}>
                LIVE 1s
              </span>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: '0 0 2px 0' }}>
                Tank 1 - Bloom NFT
              </h3>
              <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
                Highlands Hydroponics · Zone 01
              </div>
            </div>

            {/* Curved EC Gauge Card */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '14px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
                Electrical Conductivity (EC)
              </div>

              {/* Curved Sweep Gauge */}
              <EcGauge 
                ec={rawEC}
                target={targetEC}
                lowLimit={1.4}
                highLimit={2.2}
                statusColor="green"
              />

              {/* Target Stepper */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginTop: '4px' }}>
                <button
                  onClick={() => setTargetEC(prev => Math.max(0.6, Number((prev - 0.1).toFixed(1))))}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}
                >
                  -
                </button>
                <div style={{ fontSize: '12px', color: '#374151' }}>
                  Target: <strong style={{ color: '#15803D' }}>{targetEC.toFixed(1)}</strong> mS
                </div>
                <button
                  onClick={() => setTargetEC(prev => Math.min(3.5, Number((prev + 0.1).toFixed(1))))}
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
                  <Droplet size={12} style={{ color: '#0284C7' }} />
                  pH Level
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>
                  {livePH}
                </div>
                <div style={{ fontSize: '10px', color: '#15803D', fontWeight: 600 }}>Optimal (5.8–6.2)</div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
                  <Thermometer size={12} style={{ color: '#D97706' }} />
                  Water Temp
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>
                  {liveWaterTemp}°C
                </div>
                <div style={{ fontSize: '10px', color: '#15803D', fontWeight: 600 }}>Chiller Stable</div>
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
                {stagePresets.map(st => (
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

            {/* Quick Action to Dosing */}
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
                gap: '8px'
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
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Dosing Controls
                </h3>
                <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
                  4-Channel Peristaltic Closed-Loop
                </div>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '4px' }}>
                INTERLOCK SAFE
              </span>
            </div>

            {/* 4-Channel Live Actuator Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {[
                { id: 'pump-nutrient-a', name: 'Nutrient A (NPK)', active: isNutrientAActive, remaining: nutrientA?.remaining_seconds },
                { id: 'pump-nutrient-b', name: 'Nutrient B (Micro)', active: isNutrientBActive, remaining: nutrientB?.remaining_seconds },
                { id: 'pump-acid', name: 'pH Down (Acid)', active: isAcidActive, remaining: acidPump?.remaining_seconds },
                { id: 'valve-irrigation-1', name: 'Irrigation Valve', active: actuators['valve-irrigation-1']?.status === 'ACTIVE', remaining: 0 },
              ].map(pump => (
                <div
                  key={pump.id}
                  style={{
                    backgroundColor: pump.active ? '#F0FDF4' : '#FFFFFF',
                    border: `1px solid ${pump.active ? '#15803D' : '#E5E7EB'}`,
                    borderRadius: '12px',
                    padding: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>
                    {pump.id}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', margin: '3px 0' }}>
                    {pump.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: pump.active ? '#15803D' : '#6B7280' }}>
                      {pump.active ? `INJECTING (${pump.remaining}s)` : 'STANDBY'}
                    </span>
                    <button
                      onClick={() => onTriggerCommand(pump.id, 8)}
                      disabled={!!pump.active}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: pump.active ? '#D1D5DB' : '#111827',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '10px',
                        fontWeight: 700,
                        cursor: pump.active ? 'default' : 'pointer'
                      }}
                    >
                      Pulse 8s
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Dosing Mode Selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Dosing Mode:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['Auto', 'Manual', 'Off'] as const).map(mode => (
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
                      backgroundColor: dosingMode === mode ? '#111827' : '#F3F4F6',
                      color: dosingMode === mode ? '#FFFFFF' : '#4B5563',
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Pulse Dose Once Button */}
            <button
              onClick={handlePulseDose}
              disabled={isDosingPulsing}
              style={{
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: isDosingPulsing ? '#15803D' : '#111827',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: isDosingPulsing ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.2s',
                marginTop: 'auto'
              }}
            >
              <Droplet size={16} style={{ color: '#76b82a' }} />
              {isDosingPulsing ? 'Executing 10s Calibrated Dose...' : 'Pulse Dose 10s (Nutrient Skid)'}
            </button>
            <div style={{ textAlign: 'center', fontSize: '10px', color: '#9CA3AF' }}>
              Last manual injection: {lastDoseMsg}
            </div>
          </div>
        )}

        {/* ================= SCREEN 4: SUBSTRATE & ROOTZONE ================= */}
        {activeScreen === 'substrate' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Substrate Root-Zone
                </h3>
                <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
                  Grodan 100cm Rockwool Slab Sensor
                </div>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '4px' }}>
                TDR PROBE
              </span>
            </div>

            {/* Primary VWC Display */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '18px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                VOLUMETRIC WATER CONTENT (VWC)
              </div>
              <div style={{ fontSize: '38px', fontWeight: 900, color: '#111827', fontFamily: 'monospace' }}>
                {liveVWC}%
              </div>
              <div style={{ fontSize: '11px', color: '#15803D', fontWeight: 600 }}>
                Optimal Target: 60% – 68%
              </div>

              {/* Moisture Progress Meter */}
              <div style={{ height: '8px', backgroundColor: '#E5E7EB', borderRadius: '999px', marginTop: '12px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, Number(liveVWC))}%`, height: '100%', backgroundColor: '#15803D', borderRadius: '999px' }} />
              </div>
            </div>

            {/* Root-Zone Pore EC & Temp */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, marginBottom: '2px' }}>
                  Pore Water EC
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>
                  {livePoreEC} mS/cm
                </div>
                <div style={{ fontSize: '10px', color: '#15803D', fontWeight: 600 }}>Salt Balance Normal</div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, marginBottom: '2px' }}>
                  Slab Temp
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>
                  20.8°C
                </div>
                <div style={{ fontSize: '10px', color: '#15803D', fontWeight: 600 }}>Within Root Range</div>
              </div>
            </div>

            {/* Diurnal Dry-Back Target Info */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                Dry-Back Steering Profile:
              </div>
              <div style={{ fontSize: '11.5px', color: '#6B7280', lineHeight: 1.5 }}>
                Generative steering: overnight dry-back capped at 12%. First morning shot triggers at 100 W/m² solar accumulation.
              </div>
            </div>
          </div>
        )}

        {/* ================= SCREEN 5: ALARMS & DIAGNOSTICS ================= */}
        {activeScreen === 'alarms' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Active Alarms
                </h3>
                <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
                  Edge Safety & Interlock Monitoring
                </div>
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                backgroundColor: active_alarms.length > 0 ? '#FEE2E2' : '#DCFCE7',
                color: active_alarms.length > 0 ? '#DC2626' : '#15803D',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                {active_alarms.length > 0 ? `${active_alarms.length} ACTIVE` : 'ALL CLEAR'}
              </span>
            </div>

            {active_alarms.length === 0 ? (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E5E7EB', padding: '28px 16px', textAlign: 'center' }}>
                <CheckCircle size={36} color="#15803D" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                  No Active Edge Alarms
                </div>
                <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '4px' }}>
                  All sensors, dosing pumps, and tanks are operating within safe agronomic limits.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {active_alarms.map(alarm => (
                  <div
                    key={alarm.alarm_id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #FCA5A5',
                      padding: '12px',
                      boxShadow: '0 2px 4px rgba(239,68,68,0.06)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#FEE2E2', color: '#DC2626', padding: '2px 6px', borderRadius: '4px' }}>
                        {alarm.severity}
                      </span>
                      <span style={{ fontSize: '10px', color: '#6B7280' }}>
                        {new Date(alarm.triggered_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', margin: '4px 0' }}>
                      {alarm.code}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#4B5563', marginBottom: '8px' }}>
                      {alarm.message}
                    </div>
                    <button
                      onClick={() => onAcknowledgeAlarm(alarm.alarm_id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#111827',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Acknowledge Alarm
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= SCREEN 6: DEVICE PAIRING FLOW ================= */}
        {activeScreen === 'pairing' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setActiveScreen('farms')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  color: '#15803D',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                ← Cancel
              </button>
              <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>Step 2 of 3</span>
            </div>

            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: '0 0 4px 0' }}>
                Pair Autogrow Device
              </h3>
              <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                Provisioning greenhouse Wi-Fi credentials to controller.
              </p>
            </div>

            {/* Found Controller Card */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #76b82a', padding: '14px', boxShadow: '0 2px 8px rgba(118,184,42,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803D' }}>
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>
                    MultiGrow MGC-Pro Found
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#6B7280', fontFamily: 'monospace' }}>
                    BLE: AG-8841-NZ · Signal: -48 dBm
                  </div>
                </div>
              </div>
            </div>

            {/* EC Mini Graphic */}
            <div style={{ maxWidth: '140px', margin: '0 auto' }}>
              <ECMiniDrawing />
            </div>

            {/* Wi-Fi Configuration Box */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', marginBottom: '10px' }}>
                Facility Network Selected:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: 600, color: '#111827' }}>
                  <Wifi size={14} style={{ color: '#15803D' }} />
                  Greenhouse_5G_Commercial
                </div>
                <span style={{ fontSize: '10px', color: '#15803D', fontWeight: 700 }}>STRONG</span>
              </div>

              <button
                onClick={() => setActiveScreen('telemetry')}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: '#76b82a',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Complete Setup & Launch Tank
              </button>
            </div>

            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#15803D' }}>
              <ShieldCheck size={16} />
              Encrypted TLS 1.3 token exchanged with Edge Server.
            </div>
          </div>
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
          { id: 'farms', label: 'Farms', icon: <Layers size={17} /> },
          { id: 'telemetry', label: 'Telemetry', icon: <Activity size={17} /> },
          { id: 'dosing', label: 'Dosing', icon: <Droplet size={17} /> },
          { id: 'substrate', label: 'Substrate', icon: <Sun size={17} /> },
          { id: 'alarms', label: `Alarms (${active_alarms.length})`, icon: <Bell size={17} /> },
        ].map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveScreen(tab.id as any)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              cursor: 'pointer',
              color: activeScreen === tab.id ? '#15803D' : '#6B7280',
              fontWeight: activeScreen === tab.id ? 700 : 500,
              flex: 1,
              textAlign: 'center'
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </div>
        ))}
      </div>

      {/* Hardware Home Indicator Bar */}
      <div style={{ height: '18px', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '110px', height: '4px', borderRadius: '999px', backgroundColor: '#1F2937' }} />
      </div>
    </div>
  );

  // If viewed on mobile viewport or LAN phone, render full-bleed directly
  if (isStandaloneMobile) {
    return (
      <div style={{ width: '100%', height: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
        {phoneContent}
      </div>
    );
  }

  // Desktop Simulator Studio Mode
  return (
    <div style={{
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: 'calc(100vh - 60px)',
      backgroundColor: '#0F172A',
      background: 'radial-gradient(circle at 50% 20%, #1E293B 0%, #0F172A 100%)'
    }}>
      {/* Viewport Control Bar */}
      <div style={{
        maxWidth: '560px',
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
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Smartphone size={15} color="#76b82a" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#F8FAFC' }}>
            Phone Simulator
          </span>
        </div>

        {/* Frame Presets */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['compact', 'standard', 'promax'] as const).map(p => (
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
                transition: 'all 0.15s ease'
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Zoom Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>Scale:</span>
          <input
            type="range"
            min="70"
            max="105"
            value={zoomScale}
            onChange={e => setZoomScale(Number(e.target.value))}
            style={{ width: '90px', accentColor: '#76b82a', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '11px', color: '#F8FAFC', fontFamily: 'monospace', width: '32px' }}>
            {zoomScale}%
          </span>
          <button
            onClick={() => { setZoomScale(95); setSelectedPreset('standard'); }}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Render Phone Scaled */}
      <div style={{
        transform: `scale(${zoomScale / 100})`,
        transformOrigin: 'top center',
        transition: 'transform 0.2s ease, width 0.3s ease, height 0.3s ease',
        display: 'flex',
        justifyContent: 'center',
        paddingBottom: '40px'
      }}>
        {phoneContent}
      </div>
    </div>
  );
};
