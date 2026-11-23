import React, { useState } from 'react';
import { 
  Signal, 
  Wifi, 
  Battery, 
  Droplet, 
  Thermometer, 
  Wind, 
  Sun, 
  Activity, 
  Play, 
  Layers, 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert,
  Check
} from 'lucide-react';
import type { ActuatorState, AlarmEvent, ZoneSetpoint } from '@autogrow/shared';

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
  const [activeAppTab, setActiveAppTab] = useState<'telemetry' | 'dosing' | 'substrate' | 'alarms'>('telemetry');
  const [selectedPreset, setSelectedPreset] = useState<'compact' | 'standard' | 'promax'>('standard');
  const [isDosingPulsing, setIsDosingPulsing] = useState(false);
  const [lastDoseMsg, setLastDoseMsg] = useState('2 mins ago');

  const presets = {
    compact: { width: 340, height: 700, label: '340 × 700 · Compact' },
    standard: { width: 380, height: 790, label: '380 × 790 · Grower Phone' },
    promax: { width: 420, height: 850, label: '420 × 850 · Field Pro Max' }
  };

  const currentFrame = presets[selectedPreset];

  // Live Metric Values from WebSocket
  const liveEC = metrics.ec !== undefined ? metrics.ec.toFixed(2) : '2.35';
  const livePH = metrics.ph !== undefined ? metrics.ph.toFixed(2) : '5.82';
  const liveTemp = metrics.temp_air !== undefined ? metrics.temp_air.toFixed(1) : '22.4';
  const liveRH = metrics.humidity !== undefined ? metrics.humidity.toFixed(1) : '72.0';
  const liveVPD = metrics.vpd !== undefined ? metrics.vpd.toFixed(2) : '1.15';
  const liveCO2 = metrics.co2 !== undefined ? Math.round(metrics.co2) : 780;
  const liveVWC = metrics.vwc !== undefined ? metrics.vwc.toFixed(1) : '64.5';

  // Live Actuator states
  const acidPump = actuators['pump-acid'];
  const nutrientA = actuators['pump-nutrient-a'];
  const nutrientB = actuators['pump-nutrient-b'];
  const isAcidActive = acidPump?.status === 'ACTIVE' || (acidPump?.remaining_seconds && acidPump.remaining_seconds > 0);
  const isNutrientAActive = nutrientA?.status === 'ACTIVE' || (nutrientA?.remaining_seconds && nutrientA.remaining_seconds > 0);
  const isNutrientBActive = nutrientB?.status === 'ACTIVE' || (nutrientB?.remaining_seconds && nutrientB.remaining_seconds > 0);
  const isAnyDosing = isAcidActive || isNutrientAActive || isNutrientBActive || isDosingPulsing;

  const handlePulseDose = async () => {
    setIsDosingPulsing(true);
    try {
      await onTriggerCommand('pump-acid', 12);
      setLastDoseMsg('Just now');
    } finally {
      setTimeout(() => setIsDosingPulsing(false), 12000);
    }
  };

  const phoneContent = (
    <div style={{
      width: isStandaloneMobile ? '100%' : `${currentFrame.width}px`,
      height: isStandaloneMobile ? '100%' : `${currentFrame.height}px`,
      maxWidth: '100%',
      backgroundColor: '#FFFFFF',
      borderRadius: isStandaloneMobile ? '0' : '46px',
      border: isStandaloneMobile ? 'none' : '10px solid #1E2922',
      boxShadow: isStandaloneMobile ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
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
          width: '110px',
          height: '24px',
          backgroundColor: '#1E2922',
          borderRadius: '16px',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#111913' }} />
          <div style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: connectionStatus === 'CONNECTED' ? '#10B981' : '#EF4444'
          }} />
        </div>
      )}

      {/* Phone Status Bar */}
      <div style={{
        height: isStandaloneMobile ? '32px' : '42px',
        padding: '8px 22px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        color: '#111827',
        fontWeight: 700,
        backgroundColor: '#FFFFFF',
        zIndex: 40
      }}>
        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Signal size={12} />
          <Wifi size={12} color={connectionStatus === 'CONNECTED' ? '#10B981' : '#EF4444'} />
          <Battery size={13} />
        </div>
      </div>

      {/* IntelliGrow App Shell */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC', overflowY: 'auto' }}>
        
        {/* App Facility Topbar */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '9.5px', color: '#15803D', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
                FACILITY #01 · AUCKLAND
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                VENLO BAY 1 · TOMATOES
              </div>
            </div>
            <span style={{
              padding: '3px 8px',
              borderRadius: '999px',
              backgroundColor: connectionStatus === 'CONNECTED' ? '#DCFCE7' : '#FEE2E2',
              border: `1px solid ${connectionStatus === 'CONNECTED' ? '#86EFAC' : '#FCA5A5'}`,
              fontSize: '9.5px',
              color: connectionStatus === 'CONNECTED' ? '#166534' : '#991B1B',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800
            }}>
              {connectionStatus === 'CONNECTED' ? 'ONLINE (1s)' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div style={{ display: 'flex', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
          {[
            { id: 'telemetry', label: 'Sensors' },
            { id: 'dosing', label: 'Dosing' },
            { id: 'substrate', label: 'Substrate' },
            { id: 'alarms', label: `Alarms (${active_alarms.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveAppTab(tab.id as any)}
              style={{
                flex: 1,
                padding: '10px 4px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                border: 'none',
                backgroundColor: activeAppTab === tab.id ? '#F1F5F9' : 'transparent',
                borderBottom: activeAppTab === tab.id ? '2.5px solid #10B981' : 'none',
                color: activeAppTab === tab.id ? '#0F172A' : '#64748B',
                cursor: 'pointer',
                fontWeight: activeAppTab === tab.id ? 800 : 600,
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* App Tab Content Body */}
        <div style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* TAB 1: SENSORS & TELEMETRY */}
          {activeAppTab === 'telemetry' && (
            <>
              {/* Dual Big Radial Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* EC Card */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    CONDUCTIVITY
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', fontFamily: 'var(--font-mono)', margin: '3px 0' }}>
                    {liveEC}
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#15803D', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    Target: {setpoint?.target_ec ? setpoint.target_ec.toFixed(2) : '2.40'} mS/cm
                  </div>
                </div>

                {/* pH Card */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    SOLUTION pH
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', fontFamily: 'var(--font-mono)', margin: '3px 0' }}>
                    {livePH}
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#0284C7', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    Target: {setpoint?.target_ph ? setpoint.target_ph.toFixed(2) : '5.80'} pH
                  </div>
                </div>
              </div>

              {/* Climate Quad Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', color: '#64748B', fontWeight: 700 }}>
                    <Thermometer size={12} color="#D97706" />
                    TEMP
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                    {liveTemp}°C
                  </div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', color: '#64748B', fontWeight: 700 }}>
                    <Droplet size={12} color="#0284C7" />
                    RH
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                    {liveRH}%
                  </div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', color: '#64748B', fontWeight: 700 }}>
                    <Wind size={12} color="#10B981" />
                    VPD
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#15803D', fontFamily: 'var(--font-mono)' }}>
                    {liveVPD} kPa
                  </div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', color: '#64748B', fontWeight: 700 }}>
                    <Sun size={12} color="#D97706" />
                    CO2
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                    {liveCO2} ppm
                  </div>
                </div>
              </div>

              {/* 24-hr VPD Trend Bar */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#64748B', marginBottom: '8px', fontWeight: 700 }}>
                  <span>24-HR VPD DIURNAL ACCUMULATION</span>
                  <span style={{ color: '#15803D' }}>OPTIMAL BAND</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '38px' }}>
                  {[32, 45, 58, 68, 74, 82, 88, 92, 85, 76, 70, 64, 58, 52, 48, 44, 46, 50].map((val, idx) => (
                    <div 
                      key={idx}
                      style={{
                        flex: 1,
                        height: `${val}%`,
                        backgroundColor: val > 80 ? '#10B981' : '#86EFAC',
                        borderRadius: '2px'
                      }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: DOSING & ACTUATORS */}
          {activeAppTab === 'dosing' && (
            <>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '9.5px', color: '#64748B', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>ACTIVE SKID RECIPE</span>
                  <span style={{ fontSize: '9.5px', color: '#15803D', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>RECIPE #01: VEG ACCELERATION</span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.4 }}>
                  Closed-loop peristaltic injection calibrated for rockwool substrate slab fertigation.
                </div>
              </div>

              {/* 4-Channel Live Dosing Status */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[
                  { name: 'PUMP A', active: isNutrientAActive, label: isNutrientAActive ? `${nutrientA?.remaining_seconds}s` : 'RDY' },
                  { name: 'PUMP B', active: isNutrientBActive, label: isNutrientBActive ? `${nutrientB?.remaining_seconds}s` : 'RDY' },
                  { name: 'pH DOWN', active: isAcidActive, label: isAcidActive ? `${acidPump?.remaining_seconds}s` : 'RDY' },
                  { name: 'VALVE 1', active: actuators['valve-irrigation-1']?.status === 'ACTIVE', label: 'RDY' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '6px',
                      backgroundColor: item.active ? '#DCFCE7' : '#FFFFFF',
                      border: `1px solid ${item.active ? '#10B981' : '#E2E8F0'}`,
                      textAlign: 'center',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ fontSize: '8px', color: '#64748B', fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: item.active ? '#15803D' : '#0F172A', marginTop: '2px' }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Interactive Dose Button */}
              <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                <button
                  onClick={handlePulseDose}
                  disabled={isAnyDosing}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: '8px',
                    backgroundColor: isAnyDosing ? '#DCFCE7' : '#10B981',
                    color: isAnyDosing ? '#15803D' : '#FFFFFF',
                    border: '1px solid #10B981',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    cursor: isAnyDosing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  <Play size={14} />
                  <span>{isAnyDosing ? 'Dosing In Progress...' : 'Trigger 12s Acid Pulse'}</span>
                </button>
                <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#64748B', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                  Last dosed: {lastDoseMsg}
                </div>
              </div>
            </>
          )}

          {/* TAB 3: SUBSTRATE & VWC% */}
          {activeAppTab === 'substrate' && (
            <>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '9.5px', color: '#0284C7', fontFamily: 'var(--font-mono)', marginBottom: '4px', fontWeight: 800 }}>
                  SUBSTRATE TDR PROBE · WCS-2026
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                  Volumetric Water: {liveVWC}%
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  Pore Water EC: 3.15 mS/cm • Slab Temp: 21.2°C
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '9.5px', color: '#64748B', marginBottom: '6px', fontWeight: 700 }}>
                  DAILY DRYBACK STEERING
                </div>
                <div style={{ fontSize: '12px', color: '#0F172A' }}>
                  Target dryback before sunrise: <strong style={{ color: '#15803D' }}>12.0%</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  Current dryback: 8.5% (On track for generative crop steering)
                </div>
              </div>
            </>
          )}

          {/* TAB 4: ALARMS */}
          {activeAppTab === 'alarms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {active_alarms.length === 0 ? (
                <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={16} color="#16A34A" />
                  <div style={{ fontSize: '11.5px', color: '#14532D', fontWeight: 700 }}>
                    Watchdog OK: All 12 sensor nodes responding normally.
                  </div>
                </div>
              ) : (
                active_alarms.map(alm => (
                  <div 
                    key={alm.alarm_id}
                    style={{
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #FCD34D',
                      borderRadius: '8px',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={15} color="#D97706" style={{ flexShrink: 0 }} />
                      <div style={{ fontSize: '11px', color: '#78350F' }}>
                        <strong>{alm.code}:</strong> {alm.message}
                      </div>
                    </div>
                    <button
                      onClick={() => onAcknowledgeAlarm(alm.alarm_id)}
                      style={{ padding: '3px 6px', backgroundColor: '#FFFFFF', border: '1px solid #F59E0B', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      <Check size={10} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Bottom App Bar */}
        <div style={{
          height: '46px',
          borderTop: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          color: '#64748B'
        }}>
          <Activity size={17} color={activeAppTab === 'telemetry' ? '#10B981' : '#64748B'} onClick={() => setActiveAppTab('telemetry')} style={{ cursor: 'pointer' }} />
          <Droplet size={17} color={activeAppTab === 'dosing' ? '#10B981' : '#64748B'} onClick={() => setActiveAppTab('dosing')} style={{ cursor: 'pointer' }} />
          <Layers size={17} color={activeAppTab === 'substrate' ? '#10B981' : '#64748B'} onClick={() => setActiveAppTab('substrate')} style={{ cursor: 'pointer' }} />
          <Bell size={17} color={activeAppTab === 'alarms' ? '#10B981' : '#64748B'} onClick={() => setActiveAppTab('alarms')} style={{ cursor: 'pointer' }} />
        </div>

        {/* iPhone Home Swipe Bar */}
        <div style={{ height: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
          <div style={{ width: '90px', height: '3px', backgroundColor: '#CBD5E1', borderRadius: '999px' }} />
        </div>

      </div>
    </div>
  );

  if (isStandaloneMobile) {
    return phoneContent;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      
      {/* Device Preset Switcher Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-hairline)',
        padding: '8px 16px',
        borderRadius: '8px'
      }}>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
          Phone Viewport:
        </span>
        {(['compact', 'standard', 'promax'] as const).map(p => (
          <button
            key={p}
            onClick={() => setSelectedPreset(p)}
            style={{
              padding: '4px 10px',
              fontSize: '11.5px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              backgroundColor: selectedPreset === p ? '#10B981' : 'transparent',
              color: selectedPreset === p ? '#FFFFFF' : 'var(--text-dim)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {presets[p].label.split(' · ')[1]}
          </button>
        ))}
      </div>

      {/* Scaled Device Chassis with Flanking Specification Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
        gap: '30px',
        alignItems: 'center',
        width: '100%',
        maxWidth: '1200px'
      }}>
        {/* Left Specification Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)', borderRadius: '10px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', marginBottom: '6px' }}>
              <Activity size={16} />
              <div style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#FFFFFF' }}>
                SUB-500MS LIVE TELEMETRY
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
              WebSocket stream synchronized directly to the on-premise SQLite WAL telemetry engine.
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)', borderRadius: '10px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38BDF8', marginBottom: '6px' }}>
              <Droplet size={16} />
              <div style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#FFFFFF' }}>
                MANUAL PULSE OVERRIDE
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
              Push 12-second acid shots or nutrient micro-doses with bounded auto-shutoff safety timers.
            </p>
          </div>
        </div>

        {/* Center Scaled Phone */}
        <div>
          {phoneContent}
        </div>

        {/* Right Specification Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)', borderRadius: '10px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', marginBottom: '6px' }}>
              <ShieldAlert size={16} />
              <div style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#FFFFFF' }}>
                AUTONOMOUS LOCAL LOGIC
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
              Operates 24/7 inside the greenhouse even if fiber/4G internet is completely severed.
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)', borderRadius: '10px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F59E0B', marginBottom: '6px' }}>
              <AlertTriangle size={16} />
              <div style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#FFFFFF' }}>
                AUDIBLE CROP ALARMS
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
              Instant notifications on pH drift &gt; 0.5, stomatal VPD closure, and pump dry-run faults.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
