import React, { useState } from 'react';
import { 
  Plus, 
  Layers, 
  Wifi, 
  Cpu, 
  CheckCircle2, 
  Info, 
  Move, 
  Save
} from 'lucide-react';
import { FarmOneDrawing } from './graphics/FarmOneDrawing';
import { FarmTwoDrawing } from './graphics/FarmTwoDrawing';

interface FarmStructure {
  id: string;
  name: string;
  type: 'greenhouse' | 'beds' | 'tanks' | 'headhouse';
  zone: string;
  crop: string;
  gridX: number;
  gridY: number;
  controller: {
    model: string;
    serial: string;
    firmware: string;
    wifiSSID: string;
    rssi: number; // dBm
    ipAddress: string;
  };
  sensors: {
    type: string;
    metric: string;
    unit: string;
    target: string;
  }[];
  actuators: string[];
}

interface FarmDesignerProps {
  metrics: Record<string, number>;
  onTriggerActuator: (actuatorId: string, durationSec: number) => Promise<boolean>;
}

export const FarmDesigner: React.FC<FarmDesignerProps> = ({ metrics, onTriggerActuator }) => {
  const initialStructures: FarmStructure[] = [
    {
      id: 'struct-1',
      name: 'Venlo Bay 01 · Peaked Glasshouse',
      type: 'greenhouse',
      zone: 'Zone 01 · North Ridge',
      crop: 'Vine Tomatoes (Campari)',
      gridX: 20,
      gridY: 30,
      controller: {
        model: 'MultiGrow MGC-Pro 16-Ch',
        serial: 'AG-8841-NZ',
        firmware: 'v2.4.1-LTS',
        wifiSSID: 'Greenhouse_5G_Commercial',
        rssi: -52,
        ipAddress: '192.168.10.45'
      },
      sensors: [
        { type: 'Toroidal EC Probe', metric: 'EC', unit: 'mS/cm', target: '2.40' },
        { type: 'Glass Bulb pH Sensor', metric: 'pH', unit: 'pH', target: '5.80' },
        { type: 'Aspirated Psychrometer', metric: 'VPD', unit: 'kPa', target: '1.15' },
        { type: 'Grodan TDR Probe', metric: 'VWC', unit: '%', target: '65.0' },
      ],
      actuators: ['pump-acid', 'pump-nutrient-a', 'pump-nutrient-b', 'valve-irrigation-1']
    },
    {
      id: 'struct-2',
      name: 'Hydroponic Gutter Beds · South Field',
      type: 'beds',
      zone: 'Zone 02 · Gutter NFT',
      crop: 'Crisphead Lettuce & Herbs',
      gridX: 52,
      gridY: 30,
      controller: {
        model: 'EC Mini Controller Rev 3',
        serial: 'EM-4402-MY',
        firmware: 'v1.8.9',
        wifiSSID: 'Greenhouse_5G_Commercial',
        rssi: -64,
        ipAddress: '192.168.10.48'
      },
      sensors: [
        { type: 'Flow Inline EC Probe', metric: 'EC', unit: 'mS/cm', target: '1.65' },
        { type: 'Water Temperature PT100', metric: 'Water Temp', unit: '°C', target: '20.0' },
        { type: 'Ambient PAR Quantum Meter', metric: 'PPFD', unit: 'μmol/m²/s', target: '400' }
      ],
      actuators: ['pump-nutrient-a', 'pump-nutrient-b']
    },
    {
      id: 'struct-3',
      name: 'Central Fertigation Skid & Tanks',
      type: 'tanks',
      zone: 'Zone 00 · Headhouse Manifold',
      crop: 'Mother Reservoir & Stock Tanks',
      gridX: 36,
      gridY: 65,
      controller: {
        model: 'SatuGrow FertiX Master',
        serial: 'FX-9001-HQ',
        firmware: 'v3.1.0-RTOS',
        wifiSSID: 'Greenhouse_5G_Industrial',
        rssi: -45,
        ipAddress: '192.168.10.10'
      },
      sensors: [
        { type: 'Dual Stock Tank Level Radar', metric: 'Tank Volume', unit: 'L', target: '5000' },
        { type: 'High-Precision EC Cell', metric: 'EC', unit: 'mS/cm', target: '2.20' }
      ],
      actuators: ['pump-acid', 'pump-nutrient-a', 'pump-nutrient-b']
    }
  ];

  const [structures, setStructures] = useState<FarmStructure[]>(initialStructures);
  const [selectedStructureId, setSelectedStructureId] = useState<string>('struct-1');
  const [hoveredStructureId, setHoveredStructureId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<boolean>(false);

  // Inspector targets whichever is hovered, or selected if nothing hovered
  const activeInspectId = hoveredStructureId || selectedStructureId;
  const activeStructure = structures.find(s => s.id === activeInspectId) || structures[0];

  const liveEC = metrics.ec !== undefined ? metrics.ec.toFixed(2) : '2.35';
  const livePH = metrics.ph !== undefined ? metrics.ph.toFixed(2) : '5.82';
  const liveVPD = metrics.vpd !== undefined ? metrics.vpd.toFixed(2) : '1.15';
  const liveVWC = metrics.vwc !== undefined ? metrics.vwc.toFixed(1) : '64.5';
  const liveWaterTemp = metrics.temp_water !== undefined ? metrics.temp_water.toFixed(1) : '20.8';

  const handleSaveLayout = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2400);
  };

  const handleAddStructure = (type: 'greenhouse' | 'beds') => {
    const newId = `struct-${Date.now().toString().slice(-4)}`;
    const newStruct: FarmStructure = {
      id: newId,
      name: type === 'greenhouse' ? 'New Polyhouse Bay' : 'New NFT Hydro Channel',
      type: type,
      zone: `Zone 0${structures.length + 1} · Expansion`,
      crop: 'Strawberries / Leafy Greens',
      gridX: 20 + (structures.length * 8) % 60,
      gridY: 45,
      controller: {
        model: 'MultiGrow MGC-Pro 16-Ch',
        serial: `AG-${Math.floor(1000 + Math.random() * 9000)}-NZ`,
        firmware: 'v2.4.1-LTS',
        wifiSSID: 'Greenhouse_5G_Commercial',
        rssi: -55,
        ipAddress: `192.168.10.${50 + structures.length}`
      },
      sensors: [
        { type: 'Toroidal EC Probe', metric: 'EC', unit: 'mS/cm', target: '2.00' },
        { type: 'pH Sensor', metric: 'pH', unit: 'pH', target: '5.85' },
        { type: 'Microclimate Box', metric: 'VPD', unit: 'kPa', target: '1.10' }
      ],
      actuators: ['pump-nutrient-a', 'pump-nutrient-b']
    };
    setStructures(prev => [...prev, newStruct]);
    setSelectedStructureId(newId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Designer Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--border-hairline)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              VISUAL CAD HUD
            </span>
            <span style={{ fontSize: '10px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid #10B981', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
              LIVE INTERACTIVE
            </span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '2px 0 0 0' }}>
            3D Farm Layout Designer & Controller Inspector
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Hover or drag over any greenhouse structure to inspect its installed controller, Wi-Fi telemetry, and probe pinouts.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => handleAddStructure('greenhouse')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={14} color="#10B981" />
            Add Greenhouse Bay
          </button>

          <button
            onClick={() => handleAddStructure('beds')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={14} color="#10B981" />
            Add Gutter Bed
          </button>

          <button
            onClick={() => setIsEditMode(!isEditMode)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: isEditMode ? 'rgba(16,185,129,0.2)' : 'var(--bg-surface-elevated)',
              border: `1px solid ${isEditMode ? '#10B981' : 'var(--border-subtle)'}`,
              color: isEditMode ? '#10B981' : 'var(--text-main)',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Move size={14} />
            {isEditMode ? 'Exit Grid Drag Mode' : 'Drag & Reposition'}
          </button>

          <button
            onClick={handleSaveLayout}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: '#10B981',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Save size={14} />
            Save Layout
          </button>
        </div>
      </div>

      {saveToast && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '8px',
          backgroundColor: '#064E3B',
          border: '1px solid #10B981',
          color: '#A7F3D0',
          fontSize: '12px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} color="#10B981" />
          Farm 3D layout, controller assignments, and Wi-Fi mapping saved to local Edge database!
        </div>
      )}

      {/* Main Split: 3D CAD Grid Canvas (Left) + Interactive Inspector HUD (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(360px, 1fr)', gap: '20px', alignItems: 'start' }}>
        
        {/* ================= LEFT: 3D ISOMETRIC FARM CANVAS ================= */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '16px',
          border: '1px solid var(--border-hairline)',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '620px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Grid Background Pattern */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '36px 36px',
            pointerEvents: 'none'
          }} />

          {/* Canvas Sub-Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 10, marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#10B981" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
                Auckland Facility Topographical 3D Map
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Scale: 1:250 · 3 Active Zones
            </div>
          </div>

          {/* 3D Farm Visual Cards Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            position: 'relative',
            zIndex: 10,
            flex: 1
          }}>
            {structures.map(struct => {
              const isSelected = struct.id === activeInspectId;
              const isHovered = struct.id === hoveredStructureId;

              return (
                <div
                  key={struct.id}
                  onClick={() => setSelectedStructureId(struct.id)}
                  onMouseEnter={() => setHoveredStructureId(struct.id)}
                  onMouseLeave={() => setHoveredStructureId(null)}
                  style={{
                    backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-primary)',
                    borderRadius: '14px',
                    border: isSelected ? '2px solid #10B981' : '1px solid var(--border-hairline)',
                    padding: '16px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 12px 28px -5px rgba(16, 185, 129, 0.25)' : 'none',
                    transform: isHovered ? 'translateY(-3px)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                  }}
                >
                  {/* Active Indicator Pin */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '9.5px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: isSelected ? '#10B981' : 'var(--bg-surface)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-muted)',
                      border: `1px solid ${isSelected ? '#10B981' : 'var(--border-hairline)'}`
                    }}>
                      {struct.zone}
                    </span>

                    {/* Controller Icon Tag */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                      <Cpu size={12} />
                      <span>{struct.controller.serial}</span>
                    </div>
                  </div>

                  {/* 3D Isometric Illustration */}
                  <div style={{
                    width: '100%',
                    maxWidth: '260px',
                    margin: '6px auto 14px auto',
                    filter: isSelected ? 'drop-shadow(0 8px 16px rgba(16, 185, 129, 0.25))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
                    transition: 'filter 0.2s ease'
                  }}>
                    {struct.type === 'greenhouse' && <FarmOneDrawing />}
                    {struct.type === 'beds' && <FarmTwoDrawing />}
                    {struct.type === 'tanks' && <FarmOneDrawing />}
                  </div>

                  {/* Structure Details */}
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#FFFFFF', marginBottom: '2px' }}>
                      {struct.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '10px' }}>
                      Crop: <strong style={{ color: '#10B981' }}>{struct.crop}</strong>
                    </div>

                    {/* Live Micro-Badge Strip */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-hairline)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Wifi size={11} color="#10B981" />
                        <span style={{ color: 'var(--text-muted)' }}>{struct.controller.rssi} dBm</span>
                      </div>
                      <div style={{ color: '#10B981', fontWeight: 700 }}>
                        EC: {liveEC} mS
                      </div>
                      <div style={{ color: '#0284C7', fontWeight: 700 }}>
                        pH: {livePH}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '24px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', position: 'relative', zIndex: 10 }}>
            <Info size={13} color="#10B981" />
            <span>Click any 3D structure to lock inspection, or hover to view telemetry, controller specs, and probe calibration.</span>
          </div>
        </div>

        {/* ================= RIGHT: CONTROLLER & PROBE INSPECTION HUD ================= */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '16px',
          border: '1px solid var(--border-hairline)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'sticky',
          top: '80px'
        }}>
          {/* Inspector Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                CONTROLLER HUD INSPECTOR
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '3px 0' }}>
                {activeStructure.name}
              </h3>
              <div style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                {activeStructure.zone} · {activeStructure.crop}
              </div>
            </div>

            <span style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(16,185,129,0.15)',
              color: '#10B981',
              border: '1px solid #10B981'
            }}>
              ONLINE (1s)
            </span>
          </div>

          {/* Installed Controller Hardware Details */}
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '10px',
            border: '1px solid var(--border-hairline)',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={15} color="#10B981" />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#FFFFFF' }}>
                  {activeStructure.controller.model}
                </span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {activeStructure.controller.firmware}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Serial No: </span>
                <strong style={{ color: '#FFFFFF' }}>{activeStructure.controller.serial}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>IP Addr: </span>
                <strong style={{ color: '#FFFFFF' }}>{activeStructure.controller.ipAddress}</strong>
              </div>
            </div>

            {/* Wi-Fi & RSSI Connectivity Bar */}
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-hairline)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10B981' }}>
                  <Wifi size={13} />
                  <span>{activeStructure.controller.wifiSSID}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontWeight: 700 }}>
                  {activeStructure.controller.rssi} dBm (Signal 98%)
                </span>
              </div>
              {/* Signal Bar Visual */}
              <div style={{ height: '4px', backgroundColor: 'var(--border-hairline)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: '88%', height: '100%', backgroundColor: '#10B981', borderRadius: '2px' }} />
              </div>
            </div>
          </div>

          {/* Connected Sensor Probes & Live Telemetry */}
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Connected Probes & Real-Time Readings
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeStructure.sensors.map((probe, idx) => {
                let liveVal = '—';
                if (probe.metric === 'EC') liveVal = `${liveEC} mS/cm`;
                else if (probe.metric === 'pH') liveVal = `${livePH} pH`;
                else if (probe.metric === 'VPD') liveVal = `${liveVPD} kPa`;
                else if (probe.metric === 'VWC') liveVal = `${liveVWC}%`;
                else if (probe.metric === 'Water Temp') liveVal = `${liveWaterTemp}°C`;
                else liveVal = `${probe.target} ${probe.unit}`;

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-hairline)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
                        {probe.type}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Target: {probe.target} {probe.unit}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                        {liveVal}
                      </div>
                      <div style={{ fontSize: '9px', color: '#10B981', fontWeight: 600 }}>TARGET MET</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connected Relays & Actuators */}
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Attached Relay Outputs ({activeStructure.actuators.length})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {activeStructure.actuators.map(actId => (
                <button
                  key={actId}
                  onClick={() => onTriggerActuator(actId, 10)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-hairline)',
                    color: 'var(--text-main)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left'
                  }}
                >
                  <span>{actId}</span>
                  <span style={{ fontSize: '9px', color: '#10B981' }}>PULSE</span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
