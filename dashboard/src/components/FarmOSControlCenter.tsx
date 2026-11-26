import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  Smartphone, 
  Activity, 
  Cpu, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Check,
  Sparkles, 
  TrendingUp,
  Sliders,
  Plus,
  Trash2,
  Power,
  AlertTriangle,
  X
} from 'lucide-react';
import { FarmDigitalTwinMap, TileStructure, FARMS_DATA, FarmLocationData } from './FarmDigitalTwinMap';
import { ExecutiveAnalyticsDashboard } from './ExecutiveAnalyticsDashboard';
import { FarmOutputAnalytics } from './FarmOutputAnalytics';
import { DoseSuggestions } from './DoseSuggestions';
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
  metrics: _metrics,
  actuators: _actuators,
  active_alarms: _active_alarms,
  setpoint,
  connectionStatus,
  onToggleViewMode,
  onOpenSetpoints,
  onTriggerCommand,
  onSaveSetpoint,
  onAcknowledgeAlarm: _onAcknowledgeAlarm
}) => {
  // Navigation tabs (Unified: Overview is combined with 3D map)
  const [navTab, setNavTab] = useState<'map' | 'controllers' | 'harvest' | 'analytics'>('map');
  const [selectedStruct, setSelectedStruct] = useState<TileStructure | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Multi-Farm Location State (Growers with multiple farms)
  const [farms, setFarms] = useState<FarmLocationData[]>(() => FARMS_DATA.map((f) => ({ ...f, isActive: true })));
  const [currentFarmIndex, setCurrentFarmIndex] = useState<number>(0);
  const [isFarmDropdownOpen, setIsFarmDropdownOpen] = useState<boolean>(false);
  const farmDropdownRef = useRef<HTMLDivElement | null>(null);
  const currentFarm = farms[currentFarmIndex] || farms[0];

  const [farmActionToast, setFarmActionToast] = useState<string | null>(null);
  const showFarmToast = (msg: string) => {
    setFarmActionToast(msg);
    setTimeout(() => setFarmActionToast(null), 2600);
  };

  // Add Farm Modal State
  const [isAddFarmModalOpen, setIsAddFarmModalOpen] = useState<boolean>(false);
  const [newFarmName, setNewFarmName] = useState<string>('');
  const [newFarmLocation, setNewFarmLocation] = useState<string>('');
  const [newFarmCrop, setNewFarmCrop] = useState<string>('');
  const [newFarmCols, setNewFarmCols] = useState<number>(12);
  const [newFarmRows, setNewFarmRows] = useState<number>(10);
  const [newFarmPreset, setNewFarmPreset] = useState<'starter' | 'minimal'>('starter');
  const [addFarmError, setAddFarmError] = useState<string | null>(null);

  // Delete Farm Validation Modal State
  const [isDeleteFarmModalOpen, setIsDeleteFarmModalOpen] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleOpenAddFarm = () => {
    setNewFarmName('');
    setNewFarmLocation('');
    setNewFarmCrop('');
    setNewFarmCols(12);
    setNewFarmRows(10);
    setNewFarmPreset('starter');
    setAddFarmError(null);
    setIsAddFarmModalOpen(true);
  };

  const handleCreateFarm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFarmName.trim();
    const cleanLoc = newFarmLocation.trim();
    const cleanCrop = newFarmCrop.trim();

    if (!cleanName || cleanName.length < 3) {
      setAddFarmError('Please enter a farm estate name (at least 3 characters).');
      return;
    }
    if (!cleanLoc) {
      setAddFarmError('Please enter a farm location / region.');
      return;
    }
    if (!cleanCrop) {
      setAddFarmError('Please enter the primary crop grown at this estate.');
      return;
    }
    if (newFarmCols < 6 || newFarmCols > 30 || newFarmRows < 6 || newFarmRows > 24) {
      setAddFarmError('Grid size must be between 6–30 columns and 6–24 rows.');
      return;
    }
    if (farms.some((f) => f.name.toLowerCase() === cleanName.toLowerCase())) {
      setAddFarmError('A farm estate with this name already exists.');
      return;
    }

    const idSuffix = Date.now().toString().slice(-4);
    const starterStructures: TileStructure[] = [
      {
        id: `headhouse-${idSuffix}`,
        name: 'Packhouse & Cold Logistics Hub',
        type: 'headhouse',
        tileX: 1,
        tileY: 6,
        wTiles: 3,
        hTiles: 2,
        rotation: 0,
        zone: 'Logistics',
        crop: 'Graded Packout',
        controller: {
          model: 'MultiGrow MGC-Pro 16-Ch',
          serial: `AG-${idSuffix}-HQ`,
          firmware: 'v2.4.1-LTS',
          wifiSSID: `${cleanName.split(' ')[0]}_SCADA`,
          rssi: -42,
          ipAddress: '192.168.50.10',
          status: 'ONLINE',
          doseCountHour: 0,
          doseCountTotal: 0
        },
        metrics: { ec: 0.0, targetEc: 0.0, ph: 7.0, targetPh: 7.0, vpd: 0.90, vwc: 0.0, waterTemp: 18.0 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
      }
    ];

    if (newFarmPreset === 'starter') {
      starterStructures.unshift({
        id: `gh-${idSuffix}`,
        name: 'Venlo Bay 01 · Starter Glasshouse',
        type: 'greenhouse',
        tileX: 1,
        tileY: 1,
        wTiles: 4,
        hTiles: 3,
        rotation: 0,
        zone: 'Zone 01',
        crop: cleanCrop,
        controller: {
          model: 'Autogrow EC Mini',
          serial: `EM-${idSuffix}-NZ`,
          firmware: 'v5.0-Rev3',
          wifiSSID: `${cleanName.split(' ')[0]}_SCADA`,
          rssi: -48,
          ipAddress: '192.168.50.21',
          status: 'ONLINE',
          doseCountHour: 24,
          doseCountTotal: 120
        },
        metrics: { ec: 2.10, targetEc: 2.10, ph: 5.80, targetPh: 5.80, vpd: 1.05, vwc: 68.0, waterTemp: 20.0 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
      });
    }

    const createdFarm: FarmLocationData = {
      id: `farm-${idSuffix}`,
      name: cleanName,
      location: cleanLoc,
      tag: 'Commercial SCADA Estate',
      isActive: true,
      gridCols: newFarmCols,
      gridRows: newFarmRows,
      structures: starterStructures,
      stats: {
        totalAreaSqM: newFarmCols * newFarmRows * 50,
        activeControllers: starterStructures.length,
        crop: cleanCrop,
        avgEc: newFarmPreset === 'starter' ? '2.10 mS' : '0.00 mS',
        status: 'ALL ONLINE'
      }
    };

    const nextFarms = [...farms, createdFarm];
    setFarms(nextFarms);
    setCurrentFarmIndex(nextFarms.length - 1);
    setIsAddFarmModalOpen(false);
    showFarmToast(`Added new farm estate "${cleanName}"`);
  };

  const handleToggleFarmActive = () => {
    const nextActive = currentFarm.isActive === false;
    setFarms((prev) =>
      prev.map((f, idx) => (idx === currentFarmIndex ? { ...f, isActive: nextActive } : f))
    );
    setIsDeleteFarmModalOpen(false);
    showFarmToast(
      nextActive
        ? `Activated "${currentFarm.name}" — telemetry online`
        : `Deactivated "${currentFarm.name}" — set to standby`
    );
  };

  const handleOpenDeleteFarm = () => {
    setDeleteConfirmText('');
    setDeleteConfirmChecked(false);
    setDeleteError(null);
    setIsDeleteFarmModalOpen(true);
  };

  const handleConfirmDeleteFarm = () => {
    if (farms.length <= 1) {
      setDeleteError('Validation failed: at least one farm estate must remain configured in Farm SCADA.');
      return;
    }
    if (deleteConfirmText.trim() !== currentFarm.name) {
      setDeleteError(`Validation failed: type "${currentFarm.name}" exactly to confirm deletion.`);
      return;
    }
    if (!deleteConfirmChecked) {
      setDeleteError('Validation failed: please check the confirmation box before deleting.');
      return;
    }

    const removedName = currentFarm.name;
    const nextFarms = farms.filter((_, idx) => idx !== currentFarmIndex);
    setFarms(nextFarms);
    setCurrentFarmIndex(Math.max(0, Math.min(currentFarmIndex, nextFarms.length - 1)));
    setIsDeleteFarmModalOpen(false);
    showFarmToast(`Deleted farm estate "${removedName}"`);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (farmDropdownRef.current && !farmDropdownRef.current.contains(e.target as Node)) {
        setIsFarmDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        
        {/* 2. Top Header Navigation Bar (Clean & Centered Search) */}
        <header style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '12px 24px',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          {/* Left spacer to keep center search perfectly centered */}
          <div />

          {/* Center Search Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F1F5F9',
            padding: '7px 16px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            width: '320px'
          }}>
            <Search size={15} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search farm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                color: '#0F172A',
                outline: 'none',
                width: '100%'
              }}
            />
          </div>

          {/* Right Action Tools: Mobile App View, Setpoints, Bell (Alerts), Profile */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
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

            {/* Setpoints Button */}
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

            {/* Notification Bell */}
            <div style={{ position: 'relative', cursor: 'pointer' }} title="Alerts & Notifications">
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
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: '#E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
                color: '#475569',
                cursor: 'pointer'
              }}
              title="User Account (AG)"
            >
              AG
            </div>
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
          <div ref={farmDropdownRef} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: currentFarm.isActive === false ? '#64748B' : '#0F172A', margin: 0, letterSpacing: '-0.03em' }}>
                {currentFarm.name}
              </h1>
              {/* Icon-Only Arrow Dropdown Button to Change Farm */}
              <button
                onClick={() => setIsFarmDropdownOpen((prev) => !prev)}
                title="Switch Farm Location"
                aria-label="Switch Farm Location"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  backgroundColor: isFarmDropdownOpen ? '#0F172A' : '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: isFarmDropdownOpen ? '#FFFFFF' : '#0F172A',
                  transition: 'all 0.15s ease'
                }}
              >
                <ChevronDown
                  size={16}
                  style={{
                    transform: isFarmDropdownOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease'
                  }}
                />
              </button>
              {currentFarm.isActive === false && (
                <span
                  data-testid="farm-deactivated-badge"
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#FEF3C7',
                    color: '#B45309',
                    border: '1px solid #FDE68A'
                  }}
                >
                  DEACTIVATED
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
              {currentFarm.location} · {currentFarm.gridCols}×{currentFarm.gridRows} Grid · {currentFarm.stats.activeControllers} Connected Controllers · {currentFarm.stats.crop}
            </p>

            {/* Farm Switcher Dropdown Menu */}
            {isFarmDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '40px',
                left: 0,
                minWidth: '350px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #CBD5E1',
                boxShadow: '0 16px 32px -8px rgba(15, 23, 42, 0.18)',
                padding: '6px',
                zIndex: 80
              }}>
                {farms.map((farm, idx) => {
                  const isSelected = idx === currentFarmIndex;
                  const isFarmOnline = farm.isActive !== false;
                  return (
                    <button
                      key={farm.id}
                      onClick={() => {
                        setCurrentFarmIndex(idx);
                        setIsFarmDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        padding: '9px 12px',
                        backgroundColor: isSelected ? '#F1F5F9' : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background-color 0.12s ease',
                        opacity: isFarmOnline ? 1 : 0.72
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                            {farm.name}
                          </span>
                          {!isFarmOnline && (
                            <span style={{ fontSize: '9px', fontWeight: 800, fontFamily: 'monospace', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#B45309' }}>
                              DEACTIVATED
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {farm.location} · {farm.gridCols}×{farm.gridRows} · {farm.stats.crop}
                        </div>
                      </div>
                      {isSelected && <Check size={15} color="#10B981" style={{ flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top-Right Farm Estate Management Buttons: Add Farm, Deactivate/Activate, Delete Farm */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {farmActionToast && (
              <span style={{
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 700
              }}>
                {farmActionToast}
              </span>
            )}

            <button
              onClick={handleOpenAddFarm}
              data-testid="add-farm-btn"
              title="Add New Farm Estate"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} color="#10B981" />
              <span>Add Farm</span>
            </button>

            <button
              onClick={handleToggleFarmActive}
              data-testid="toggle-farm-active-btn"
              title={currentFarm.isActive === false ? 'Reactivate this farm estate' : 'Deactivate this farm estate'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: currentFarm.isActive === false ? '#10B981' : '#F8FAFC',
                color: currentFarm.isActive === false ? '#FFFFFF' : '#475569',
                border: currentFarm.isActive === false ? 'none' : '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Power size={14} color={currentFarm.isActive === false ? '#FFFFFF' : '#D97706'} />
              <span>{currentFarm.isActive === false ? 'Activate' : 'Deactivate'}</span>
            </button>

            <button
              onClick={handleOpenDeleteFarm}
              data-testid="delete-farm-btn"
              title="Delete Farm Estate (requires validation)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        </section>

        {/* 4. Main Dashboard Body */}
        <main style={{ flex: 1, padding: '24px', maxWidth: '1600px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {navTab === 'map' && (
            <>
              {/* 3D Farm Digital Twin Map with 1x1 Isometric Tile Grid, FarmVille Resizing & Multi-Farm Controls */}
              <FarmDigitalTwinMap
                farms={farms}
                activeFarmIndex={currentFarmIndex}
                onFarmChange={(idx) => setCurrentFarmIndex(idx)}
                onSelectStructure={(struct) => setSelectedStruct(struct)}
                selectedStructureId={selectedStruct?.id}
                onTriggerDose={onTriggerCommand}
                onSaveStructures={(farmId, updatedStructures, cols, rows) => {
                  setFarms((prev) =>
                    prev.map((f) =>
                      f.id === farmId
                        ? {
                            ...f,
                            gridCols: cols,
                            gridRows: rows,
                            structures: updatedStructures,
                            stats: {
                              ...f.stats,
                              totalAreaSqM: cols * rows * 40,
                              activeControllers: updatedStructures.reduce(
                                (sum, s) => sum + (s.controllers && s.controllers.length > 0 ? s.controllers.length : 1),
                                0
                              )
                            }
                          }
                        : f
                    )
                  );
                }}
              />

              {/* Executive Sensor Analytics & Crop Production Forecast (Divided by Location) */}
              <ExecutiveAnalyticsDashboard
                farm={currentFarm}
                onOpenControllersTab={() => setNavTab('controllers')}
                onOpenHarvestTab={() => setNavTab('harvest')}
              />
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

      {/* Add New Farm Estate Modal */}
      {isAddFarmModalOpen && (
        <div
          data-testid="add-farm-modal"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 120,
            padding: '20px'
          }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            maxWidth: '460px',
            width: '100%',
            border: '1px solid #CBD5E1',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} color="#10B981" />
                <span style={{ fontSize: '15px', fontWeight: 800 }}>Add New Farm Estate</span>
              </div>
              <button
                onClick={() => setIsAddFarmModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFarm} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {addFarmError && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  color: '#DC2626',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {addFarmError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Farm Estate Name *
                </label>
                <input
                  type="text"
                  value={newFarmName}
                  onChange={(e) => setNewFarmName(e.target.value)}
                  placeholder="e.g. Johor Commercial Hydroponics"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Location / Region *
                </label>
                <input
                  type="text"
                  value={newFarmLocation}
                  onChange={(e) => setNewFarmLocation(e.target.value)}
                  placeholder="e.g. Kluang, Johor"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Primary Crop *
                </label>
                <input
                  type="text"
                  value={newFarmCrop}
                  onChange={(e) => setNewFarmCrop(e.target.value)}
                  placeholder="e.g. Butterhead Lettuce & Sweet Basil"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Grid Width (6–30)
                  </label>
                  <input
                    type="number"
                    min={6}
                    max={30}
                    value={newFarmCols}
                    onChange={(e) => setNewFarmCols(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Grid Length (6–24)
                  </label>
                  <input
                    type="number"
                    min={6}
                    max={24}
                    value={newFarmRows}
                    onChange={(e) => setNewFarmRows(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Initial Layout Template
                </label>
                <select
                  value={newFarmPreset}
                  onChange={(e) => setNewFarmPreset(e.target.value as 'starter' | 'minimal')}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                >
                  <option value="starter">Starter Commercial Setup (Glasshouse + Packhouse)</option>
                  <option value="minimal">Minimal Logistics Hub (Packhouse only)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddFarmModalOpen(false)}
                  style={{ padding: '8px 14px', backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="confirm-add-farm-btn"
                  style={{ padding: '8px 16px', backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Create Farm Estate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Farm Validation Modal */}
      {isDeleteFarmModalOpen && (
        <div
          data-testid="delete-farm-modal"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 120,
            padding: '20px'
          }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            maxWidth: '460px',
            width: '100%',
            border: '1px solid #FCA5A5',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={20} color="#DC2626" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                  Validate Farm Deletion
                </h3>
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                  {currentFarm.name} · {currentFarm.stats.activeControllers} connected controllers
                </div>
              </div>
            </div>

            {currentFarm.isActive !== false && (
              <div style={{
                padding: '10px 12px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '8px',
                fontSize: '11.5px',
                color: '#92400E',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>This farm is currently <strong>ONLINE</strong>. Consider deactivating it instead to preserve telemetry history.</span>
                <button
                  type="button"
                  onClick={handleToggleFarmActive}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #F59E0B',
                    borderRadius: '6px',
                    color: '#B45309',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Deactivate Instead
                </button>
              </div>
            )}

            {deleteError && (
              <div
                data-testid="delete-farm-validation-error"
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  color: '#DC2626',
                  fontSize: '12px',
                  fontWeight: 700,
                  marginBottom: '12px'
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                Type <strong>{currentFarm.name}</strong> to confirm permanent deletion:
              </label>
              <input
                type="text"
                data-testid="delete-confirm-name-input"
                value={deleteConfirmText}
                onChange={(e) => {
                  setDeleteConfirmText(e.target.value);
                  if (deleteError) setDeleteError(null);
                }}
                placeholder={currentFarm.name}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11.5px', color: '#475569', marginBottom: '18px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                data-testid="delete-confirm-checkbox"
                checked={deleteConfirmChecked}
                onChange={(e) => {
                  setDeleteConfirmChecked(e.target.checked);
                  if (deleteError) setDeleteError(null);
                }}
                style={{ marginTop: '2px', accentColor: '#DC2626' }}
              />
              <span>I understand this will permanently disconnect {currentFarm.stats.activeControllers} controllers and remove the 3D layout.</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsDeleteFarmModalOpen(false)}
                style={{ padding: '8px 14px', backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-farm-btn"
                onClick={handleConfirmDeleteFarm}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Delete Farm Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
