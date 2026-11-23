import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Smartphone, 
  Activity, 
  Cpu, 
  Droplet, 
  ChevronRight, 
  ChevronLeft,
  Sparkles, 
  Flame, 
  TrendingUp,
  Sliders
} from 'lucide-react';
import { FarmDigitalTwinMap, TileStructure, FARMS_DATA } from './FarmDigitalTwinMap';
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
  // Navigation tabs (Unified: Overview is combined with 3D map)
  const [navTab, setNavTab] = useState<'map' | 'controllers' | 'harvest' | 'analytics'>('map');
  const [activeZoneTab, setActiveZoneTab] = useState<'all' | 'glasshouses' | 'hydro'>('all');
  const [selectedStruct, setSelectedStruct] = useState<TileStructure | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Multi-Farm Location State (Growers with multiple farms)
  const [currentFarmIndex, setCurrentFarmIndex] = useState<number>(0);
  const currentFarm = FARMS_DATA[currentFarmIndex] || FARMS_DATA[0];

  const handlePrevFarm = () => {
    setCurrentFarmIndex((prev) => (prev - 1 + FARMS_DATA.length) % FARMS_DATA.length);
  };

  const handleNextFarm = () => {
    setCurrentFarmIndex((prev) => (prev + 1) % FARMS_DATA.length);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A', display: 'flex' }}>
      
      {/* 1. Collapsible Left SCADA Management Sidebar */}
      <aside style={{
        width: isSidebarOpen ? '260px' : '64px',
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRight: '1px solid #1E293B',
        flexShrink: 0,
        minHeight: '100vh',
        zIndex: 60
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isSidebarOpen ? 'space-between' : 'center',
          height: '61px'
        }}>
          {isSidebarOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                color: '#0F172A',
                fontSize: '16px'
              }}>
                A
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  Autogrow SCADA
                </div>
                <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace' }}>
                  MULTI-FARM SUITE
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              color: '#0F172A',
              fontSize: '16px'
            }}>
              A
            </div>
          )}

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Multi-Farm Selector in Left Sidebar */}
        <div style={{
          padding: isSidebarOpen ? '14px 12px' : '10px 8px',
          borderBottom: '1px solid #1E293B'
        }}>
          {isSidebarOpen ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>
                  FARM LOCATIONS ({FARMS_DATA.length})
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={handlePrevFarm} title="Prev farm" style={{ padding: '2px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                    <ChevronLeft size={13} />
                  </button>
                  <button onClick={handleNextFarm} title="Next farm" style={{ padding: '2px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {FARMS_DATA.map((f, i) => {
                  const isCur = currentFarmIndex === i;
                  return (
                    <div
                      key={f.id}
                      onClick={() => setCurrentFarmIndex(i)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: isCur ? 'rgba(16, 185, 129, 0.18)' : '#1E293B',
                        border: `1px solid ${isCur ? '#10B981' : '#334155'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: isCur ? '#34D399' : '#FFFFFF' }}>
                          {f.name.split(' ')[0]} {f.name.split(' ')[1]}
                        </span>
                        <span style={{ fontSize: '9px', color: '#10B981', fontFamily: 'monospace' }}>
                          {f.gridCols}×{f.gridRows}
                        </span>
                      </div>
                      <div style={{ fontSize: '9px', color: '#94A3B8', marginTop: '2px' }}>
                        {f.location.split(',')[0]} · {f.stats.crop.split('&')[0].trim()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={handleNextFarm}
                title={`Switch Farm (${currentFarm.name})`}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#1E293B',
                  border: '1px solid #10B981',
                  color: '#10B981',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800
                }}
              >
                F{currentFarmIndex + 1}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Menu Links (Unified without redundancy) */}
        <div style={{ padding: isSidebarOpen ? '16px 12px' : '16px 8px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {isSidebarOpen && (
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', padding: '0 8px 6px', letterSpacing: '0.05em' }}>
              SCADA MODULES
            </div>
          )}

          {[
            { id: 'map', label: 'Farm Overview (3D Twin)', icon: <Activity size={16} /> },
            { id: 'controllers', label: 'Hardware & Sensors', icon: <Cpu size={16} /> },
            { id: 'harvest', label: 'Farm Yield Output', icon: <TrendingUp size={16} /> },
            { id: 'analytics', label: 'AI Dosing Engine', icon: <Sparkles size={16} /> }
          ].map(item => {
            const isActive = navTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setNavTab(item.id as any)}
                title={!isSidebarOpen ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: isSidebarOpen ? '9px 12px' : '9px',
                  justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: isActive ? '#34D399' : '#94A3B8',
                  fontSize: '12px',
                  fontWeight: isActive ? 800 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ color: isActive ? '#34D399' : '#94A3B8' }}>{item.icon}</div>
                {isSidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer Widget */}
        <div style={{
          padding: isSidebarOpen ? '16px' : '12px 6px',
          borderTop: '1px solid #1E293B',
          backgroundColor: '#0B1120'
        }}>
          {isSidebarOpen ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF' }}>EDGE ENGINE</span>
                <span style={{ fontSize: '9px', fontWeight: 800, fontFamily: 'monospace', color: '#34D399', backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '1px 5px', borderRadius: '4px' }}>
                  {connectionStatus}
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '10px' }}>
                SQLite WAL · Port 8080 · 14 Nodes
              </div>
              <button
                onClick={() => onToggleViewMode('mobile')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '7px',
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Smartphone size={13} color="#10B981" />
                <span>Mobile App View</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onToggleViewMode('mobile')}
              title="Switch to Mobile App View"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                backgroundColor: '#1E293B',
                border: 'none',
                borderRadius: '6px',
                color: '#10B981',
                cursor: 'pointer'
              }}
            >
              <Smartphone size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        
        {/* 2. Top Header Navigation Bar (WarehouseOS Style) */}
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

          {/* Center Navigation Tabs (Unified without redundancy) */}
          <nav style={{ display: 'flex', gap: '4px', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
            {[
              { id: 'map', label: 'Farm Overview (3D Twin)', icon: <Activity size={14} /> },
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
                  whiteSpace: 'nowrap',
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

        {/* 3. Hero Header Sub-Bar with Multi-Farm Quick Switcher */}
        <section style={{
          padding: '16px 24px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.03em' }}>
                {currentFarm.name}
              </h1>
              {/* Previous & Next Farm Navigation Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={handlePrevFarm}
                  title="Previous Farm Location"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 8px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#0F172A'
                  }}
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>
                <button
                  onClick={handleNextFarm}
                  title="Next Farm Location"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 8px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#0F172A'
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
              {currentFarm.location} · {currentFarm.gridCols}×{currentFarm.gridRows} Grid · {currentFarm.stats.activeControllers} Connected Controllers · {currentFarm.stats.crop}
            </p>
          </div>

          {/* Zone/Floor Selectors */}
          <div style={{ display: 'flex', gap: '6px', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '8px' }}>
            {[
              { id: 'all', label: 'All Zones (Global)' },
              { id: 'glasshouses', label: 'Zone 1 · Peaked Glass' },
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

        {/* 4. Main Dashboard Body */}
        <main style={{ flex: 1, padding: '24px', maxWidth: '1600px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {navTab === 'map' && (
            <>
              {/* 3D Farm Digital Twin Map with 1x1 Isometric Tile Grid, FarmVille Resizing & Multi-Farm Controls */}
              <FarmDigitalTwinMap
                activeFarmIndex={currentFarmIndex}
                onFarmChange={(idx) => setCurrentFarmIndex(idx)}
                onSelectStructure={(struct) => setSelectedStruct(struct)}
                selectedStructureId={selectedStruct?.id}
                onTriggerDose={onTriggerCommand}
              />

              {/* Bottom Row of 3 Tracking Cards (WarehouseOS Exact Layout) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                {/* Card 1: Controller Fleet Tracking */}
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
                      All {currentFarm.stats.activeControllers} <ChevronRight size={12} />
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

                {/* Card 2: Dosing & Equipment Tracking */}
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
                      { name: 'Acid Dosing Pump (pH Down)', rate: '350 ml/min', id: 'pump-acid' },
                      { name: 'Nutrient Stock Pump A (NPK Base)', rate: '500 ml/min', id: 'pump-nutrient-a' },
                      { name: 'Nutrient Stock Pump B (Micro/CalMag)', rate: '500 ml/min', id: 'pump-nutrient-b' },
                      { name: 'Main Irrigation Delivery Solenoid', rate: '2,400 L/hr', id: 'valve-irrigation' }
                    ].map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0'
                      }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            Flow rate: {item.rate}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748B' }}>
                            IDLE
                          </span>
                          <button
                            onClick={() => onTriggerCommand(item.id, 10)}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
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

                {/* Card 3: Crop Stress & Hotspot Heatmap */}
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
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#D97706', fontFamily: 'monospace' }}>
                      2 HOTSPOTS DETECTED
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
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

              {/* 5. Integrated SCADA Live Feeds & Telemetry (Unified with the 3D Overview) */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '24px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity size={18} color="#10B981" />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                        Live Operations & Telemetry Ledger · {currentFarm.name}
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                        Direct edge actuator overrides, active safety alerts, and continuous sensor streams.
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <ActuatorMatrix actuators={actuators} onTriggerCommand={onTriggerCommand} />
                    <AlarmsFeed alarms={active_alarms} onAcknowledgeAlarm={onAcknowledgeAlarm} />
                  </div>

                  <div>
                    <TelemetryChart currentMetricValues={metrics} />
                  </div>
                </div>
              </div>
            </>
          )}

          {navTab === 'controllers' && (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                Autogrow Controller Fleet & Hardware Inventory · {currentFarm.name}
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
                Manage all paired Autogrow EC Mini controllers, MultiGrow MGC-Pro hubs, and peristaltic pump stations for this farm estate.
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
    </div>
  );
};
