import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Smartphone, 
  Layers, 
  Activity, 
  Cpu, 
  Droplet, 
  ChevronRight, 
  Sparkles, 
  Flame, 
  TrendingUp,
  Sliders
} from 'lucide-react';
import { FarmDigitalTwinMap, TileStructure } from './FarmDigitalTwinMap';
import { FarmOutputAnalytics } from './FarmOutputAnalytics';
import { DoseSuggestions } from './DoseSuggestions';
import { ActuatorMatrix } from './ActuatorMatrix';
import { TelemetryChart } from './TelemetryChart';
import { AlarmsFeed } from './AlarmsFeed';
import type { ZoneSetpoint, ActuatorState, AlarmEvent } from '@autogrow/shared';

interface FarmOSControlCenterProps {
  metrics: Record<string, number>;
  actuators: Record<string, ActuatorState>;
  active_alarms: AlarmEvent[];
  setpoint: ZoneSetpoint | null;
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'OFFLINE';
  onToggleViewMode: (mode: 'mobile' | 'desktop') => void;
  onOpenSetpoints: () => void;
  onTriggerCommand: (actuatorId: string, durationSec: number) => Promise<boolean>;
  onSaveSetpoint: (newSetpoint: ZoneSetpoint) => Promise<void>;
  onAcknowledgeAlarm: (alarmId: string) => Promise<void>;
}

export const FarmOSControlCenter: React.FC<FarmOSControlCenterProps> = ({
  metrics,
  actuators,
  active_alarms,
  setpoint,
  connectionStatus,
  onToggleViewMode,
  onOpenSetpoints,
  onTriggerCommand,
  onSaveSetpoint,
  onAcknowledgeAlarm
}) => {
  const [navTab, setNavTab] = useState<'overview' | 'map' | 'controllers' | 'harvest' | 'analytics'>('map');
  const [activeZoneTab, setActiveZoneTab] = useState<'all' | 'glasshouses' | 'hydro'>('all');
  const [selectedStruct, setSelectedStruct] = useState<TileStructure | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A', display: 'flex', flexDirection: 'column' }}>
      {/* 1. WarehouseOS-Style Top Navigation Bar */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {/* Brand & Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: '#0F172A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 900,
            fontSize: '18px'
          }}>
            <span style={{ color: '#10B981' }}>W</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                FarmOS
              </span>
              <span style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#10B981',
                padding: '1px 6px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '4px'
              }}>
                CONTROL CENTER
              </span>
            </div>
          </div>
        </div>

        {/* Center Navigation Tabs (WarehouseOS Style) */}
        <nav style={{ display: 'flex', gap: '4px', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
          {[
            { id: 'overview', label: 'Overview', icon: <Layers size={14} /> },
            { id: 'map', label: 'Farm Map (3D Digital Twin)', icon: <Activity size={14} /> },
            { id: 'controllers', label: 'Controllers & Hardware', icon: <Cpu size={14} /> },
            { id: 'harvest', label: 'Harvest & Yield', icon: <TrendingUp size={14} /> },
            { id: 'analytics', label: 'Dosing AI Engine', icon: <Sparkles size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setNavTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: navTab === tab.id ? '#FFFFFF' : 'transparent',
                color: navTab === tab.id ? '#0F172A' : '#64748B',
                fontSize: '12px',
                fontWeight: navTab === tab.id ? 800 : 500,
                cursor: 'pointer',
                boxShadow: navTab === tab.id ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Right Action Tools: Search, Alerts, Profile, Mobile App Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#F1F5F9',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            width: '180px'
          }}>
            <Search size={14} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search farm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '12px',
                color: '#0F172A',
                outline: 'none',
                width: '100%'
              }}
            />
          </div>

          {/* Notification Bell */}
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bell size={16} color="#475569" />
            </div>
            <div style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#EF4444',
              border: '2px solid #FFFFFF'
            }} />
          </div>

          {/* User Profile Avatar */}
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: '#E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '13px',
            color: '#475569'
          }}>
            AG
          </div>

          {/* Connection Status & Setpoints */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'monospace', color: '#64748B' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: connectionStatus === 'CONNECTED' ? '#10B981' : '#EF4444' }} />
            <span>{connectionStatus}</span>
          </div>

          <button
            onClick={onOpenSetpoints}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#0F172A',
              cursor: 'pointer'
            }}
          >
            <Sliders size={13} color="#10B981" />
            <span>Setpoints</span>
          </button>

          {/* Toggle to Pocket Mobile App Mode */}
          <button
            onClick={() => onToggleViewMode('mobile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            <Smartphone size={14} color="#10B981" />
            <span>Mobile App View</span>
          </button>
        </div>
      </header>

      {/* 2. Hero Header Sub-Bar (Exact Match to WarehouseOS Reference Image) */}
      <section style={{
        padding: '20px 24px 16px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.03em' }}>
            Full farm digital twin map
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
            Live digital twin · 14 connected controllers · 8 active polyhouses · positions update every 1s
          </p>
        </div>

        {/* Zone/Floor Selectors */}
        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '8px' }}>
          {[
            { id: 'all', label: 'All Zones (Global)' },
            { id: 'glasshouses', label: 'Zone 1 · Glasshouses' },
            { id: 'hydro', label: 'Zone 2 · Hydro NFT' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveZoneTab(tab.id as any)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeZoneTab === tab.id ? '#FFFFFF' : 'transparent',
                color: activeZoneTab === tab.id ? '#0F172A' : '#64748B',
                fontSize: '12px',
                fontWeight: activeZoneTab === tab.id ? 800 : 500,
                cursor: 'pointer',
                boxShadow: activeZoneTab === tab.id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* 3. Main Dashboard Body */}
      <main style={{ flex: 1, padding: '24px', maxWidth: '1600px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {navTab === 'map' && (
          <>
            {/* 3D Farm Digital Twin Map with 1x1 Isometric Tile Grid & FarmVille Placement */}
            <FarmDigitalTwinMap
              onSelectStructure={(struct) => setSelectedStruct(struct)}
              selectedStructureId={selectedStruct?.id}
              onTriggerDose={onTriggerCommand}
            />

            {/* Bottom Row of 3 Tracking Cards (Matching the reference image's bottom 3 cards) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              {/* Card 1: Controller Fleet Tracking (Workers tracking equivalent) */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Cpu size={16} color="#0F172A" />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                      Controller fleet tracking
                    </span>
                  </div>
                  <button
                    onClick={() => setNavTab('controllers')}
                    style={{ background: 'none', border: 'none', fontSize: '11px', fontWeight: 700, color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                  >
                    All 14 <ChevronRight size={12} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { name: 'EC Mini Controller #01', zone: 'Venlo Bay 1', metric: '2.35 mS', count: '42 DC/h', val: 92 },
                    { name: 'EC Mini Controller #02', zone: 'NFT Hydro A', metric: '1.65 mS', count: '18 DC/h', val: 58 },
                    { name: 'MultiGrow Pro Hub #01', zone: 'Central Skid', metric: '16 Relays armed', count: '100% Armed', val: 98 },
                    { name: 'IntelliDose Station #03', zone: 'Seedling Nursery', metric: '1.20 mS', count: '12 DC/h', val: 84 }
                  ].map((ctrl, idx) => (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>{ctrl.name}</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#10B981' }}>{ctrl.metric}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', marginBottom: '6px' }}>
                        <span>{ctrl.zone}</span>
                        <span>{ctrl.count}</span>
                      </div>
                      {/* Gradient Progress Bar */}
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${ctrl.val}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)',
                          borderRadius: '3px'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Dosing & Equipment Tracking (Forklift / Equipment tracking equivalent) */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Droplet size={16} color="#0F172A" />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                      Dosing pumps & actuators
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', fontFamily: 'monospace' }}>
                    CLOSED-LOOP OK
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { id: 'pump-acid', name: 'Acid Dosing Pump (pH Down)', rate: '350 ml/min', status: 'IDLE', statusColor: '#64748B' },
                    { id: 'pump-nutrient-a', name: 'Nutrient Pump A (Calcium Nitrate)', rate: '350 ml/min', status: 'STANDBY', statusColor: '#10B981' },
                    { id: 'pump-nutrient-b', name: 'Nutrient Pump B (Potassium/Phosphorus)', rate: '350 ml/min', status: 'STANDBY', statusColor: '#10B981' },
                    { id: 'valve-irrigation-1', name: 'Main Substrate Irrigation Valve', rate: '2.5 bar pressure', status: 'RUNNING', statusColor: '#2563EB' }
                  ].map((eq) => (
                    <div
                      key={eq.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                          {eq.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {eq.rate}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: `${eq.statusColor}15`,
                          color: eq.statusColor
                        }}>
                          {eq.status}
                        </span>
                        <button
                          onClick={() => onTriggerCommand(eq.id, 10)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#0F172A',
                            cursor: 'pointer'
                          }}
                        >
                          Pulse 10s
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: Congestion / Hotspot Heatmap (Direct equivalent from reference image) */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Flame size={16} color="#F59E0B" />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                      Crop stress & hotspot heatmap
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', fontFamily: 'monospace' }}>
                    2 HOTSPOTS DETECTED
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <div style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE'
                  }}>
                    <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 700 }}>
                      NFT Hydro Zone B
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#1E3A8A', fontFamily: 'monospace', margin: '4px 0' }}>
                      94% Load
                    </div>
                    <div style={{ fontSize: '10px', color: '#3B82F6' }}>
                      EC drift -0.15 mS (Dosing active)
                    </div>
                  </div>

                  <div style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FDE68A'
                  }}>
                    <div style={{ fontSize: '11px', color: '#92400E', fontWeight: 700 }}>
                      Fertigation Silo B
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#78350F', fontFamily: 'monospace', margin: '4px 0' }}>
                      86% Load
                    </div>
                    <div style={{ fontSize: '10px', color: '#D97706' }}>
                      24% Tank capacity remaining
                    </div>
                  </div>
                </div>

                {/* Hotspot Trend Mini Chart */}
                <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>
                  24-Hour Transpirational Stress Curve
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '48px', padding: '0 4px' }}>
                  {[28, 35, 42, 68, 94, 88, 76, 62, 45, 38, 32, 30].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${h}%`,
                        backgroundColor: h > 80 ? '#F59E0B' : '#3B82F6',
                        borderRadius: '2px',
                        transition: 'height 0.3s ease'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {navTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Actuators Grid, Alarms, and Telemetry Chart */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <ActuatorMatrix actuators={actuators} onTriggerCommand={onTriggerCommand} />
                <AlarmsFeed alarms={active_alarms} onAcknowledgeAlarm={onAcknowledgeAlarm} />
              </div>
              <TelemetryChart currentMetricValues={metrics} />
            </div>
          </div>
        )}

        {navTab === 'controllers' && (
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '24px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              Autogrow Controller Fleet & Hardware Inventory
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
              Manage all paired Autogrow EC Mini controllers, MultiGrow MGC-Pro hubs, and peristaltic pump stations.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {[
                { model: 'Autogrow EC Mini Rev 3', serial: 'EM-4401-MY', zone: 'NFT Hydro Channel A', ip: '192.168.10.51', rssi: '-62 dBm', ec: '1.65 mS', status: 'ONLINE' },
                { model: 'Autogrow EC Mini Rev 3', serial: 'EM-4402-MY', zone: 'NFT Hydro Channel B', ip: '192.168.10.52', rssi: '-66 dBm', ec: '1.52 mS', status: 'ATTENTION' },
                { model: 'MultiGrow MGC-Pro 16-Ch', serial: 'AG-8841-NZ', zone: 'Venlo Glasshouse Bay 1', ip: '192.168.10.45', rssi: '-52 dBm', ec: '2.35 mS', status: 'ONLINE' },
                { model: 'MultiGrow MGC-Pro 16-Ch', serial: 'AG-8842-NZ', zone: 'Venlo Glasshouse Bay 2', ip: '192.168.10.46', rssi: '-55 dBm', ec: '2.40 mS', status: 'ONLINE' },
                { model: 'Autogrow EC Mini Skid', serial: 'EM-4400-HQ', zone: 'Central Fertigation Tanks', ip: '192.168.10.40', rssi: '-48 dBm', ec: '2.80 mS', status: 'ONLINE' },
                { model: 'IntelliDose Hub', serial: 'ID-9901-NZ', zone: 'Seedling Nursery', ip: '192.168.10.35', rssi: '-45 dBm', ec: '1.20 mS', status: 'ONLINE' }
              ].map((c, idx) => (
                <div key={idx} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>{c.model}</span>
                    <span style={{ fontSize: '10px', fontWeight: 800, fontFamily: 'monospace', color: c.status === 'ONLINE' ? '#10B981' : '#F59E0B' }}>
                      {c.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Zone: <strong>{c.zone}</strong></div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94A3B8' }}>Serial: {c.serial} · IP: {c.ip}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #E2E8F0', fontSize: '11px' }}>
                    <span>Wi-Fi Signal: <strong>{c.rssi}</strong></span>
                    <span>Live EC: <strong style={{ color: '#10B981' }}>{c.ec}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {navTab === 'harvest' && (
          <FarmOutputAnalytics />
        )}

        {navTab === 'analytics' && (
          <DoseSuggestions currentSetpoint={setpoint} onApplySetpoints={onSaveSetpoint} />
        )}
      </main>
    </div>
  );
};
