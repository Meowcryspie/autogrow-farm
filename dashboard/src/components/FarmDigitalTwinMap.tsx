import React, { useState, useRef } from 'react';
import { 
  RotateCcw, 
  Save, 
  ZoomIn, 
  ZoomOut, 
  CheckCircle2, 
  Eye, 
  Hammer,
  Trash2,
  Droplet,
  Wifi,
  Cpu
} from 'lucide-react';

export interface TileStructure {
  id: string;
  name: string;
  type: 'greenhouse' | 'beds' | 'silos' | 'headhouse' | 'controller_station' | 'pathway';
  tileX: number; // 0 to 11
  tileY: number; // 0 to 9
  wTiles: number; // width in tiles
  hTiles: number; // height in tiles
  zone: string;
  crop: string;
  controller: {
    model: 'Autogrow EC Mini' | 'MultiGrow MGC-Pro 16-Ch' | 'IntelliDose Hub';
    serial: string;
    firmware: string;
    wifiSSID: string;
    rssi: number; // dBm e.g. -52
    ipAddress: string;
    status: 'ONLINE' | 'DOSING' | 'ATTENTION';
    doseCountHour: number; // DC/h
    doseCountTotal: number; // DCT
  };
  metrics: {
    ec: number;
    targetEc: number;
    ph: number;
    targetPh: number;
    vpd: number;
    vwc: number;
    waterTemp: number;
  };
  pumps: {
    pumpA: 'IDLE' | 'DOSING';
    pumpB: 'IDLE' | 'DOSING';
    acid: 'IDLE' | 'DOSING';
  };
}

interface FarmDigitalTwinMapProps {
  onSelectStructure?: (struct: TileStructure) => void;
  selectedStructureId?: string;
  onTriggerDose?: (actuatorId: string, durationSec: number) => Promise<boolean>;
}

// 1x1 Isometric Projection Math
const TILE_W = 64; // Isometric tile width in pixels
const TILE_H = 32; // Isometric tile height in pixels
const ORIGIN_X = 540;
const ORIGIN_Y = 110;
const GRID_COLS = 12;
const GRID_ROWS = 10;

export function tileToScreen(tx: number, ty: number, z: number = 0): [number, number] {
  const x = ORIGIN_X + (tx - ty) * (TILE_W / 2);
  const y = ORIGIN_Y + (tx + ty) * (TILE_H / 2) - z;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

export function ptStr(p: [number, number]): string {
  return `${p[0]},${p[1]}`;
}

export const FarmDigitalTwinMap: React.FC<FarmDigitalTwinMapProps> = ({
  onSelectStructure,
  selectedStructureId: externalSelectedId,
  onTriggerDose
}) => {
  const [structures, setStructures] = useState<TileStructure[]>([
    {
      id: 'greenhouse-1',
      name: 'Venlo Bay 01 · Peaked Glasshouse',
      type: 'greenhouse',
      tileX: 1,
      tileY: 1,
      wTiles: 4,
      hTiles: 3,
      zone: 'Zone 01 · North Ridge',
      crop: 'Vine Tomatoes (Campari F1)',
      controller: {
        model: 'MultiGrow MGC-Pro 16-Ch',
        serial: 'AG-8841-NZ',
        firmware: 'v2.4.1-LTS',
        wifiSSID: 'Greenhouse_5G_Commercial',
        rssi: -52,
        ipAddress: '192.168.10.45',
        status: 'ONLINE',
        doseCountHour: 38,
        doseCountTotal: 1420
      },
      metrics: {
        ec: 2.35,
        targetEc: 2.40,
        ph: 5.82,
        targetPh: 5.80,
        vpd: 1.15,
        vwc: 64.5,
        waterTemp: 20.8
      },
      pumps: {
        pumpA: 'IDLE',
        pumpB: 'IDLE',
        acid: 'IDLE'
      }
    },
    {
      id: 'greenhouse-2',
      name: 'Venlo Bay 02 · Peaked Glasshouse',
      type: 'greenhouse',
      tileX: 6,
      tileY: 1,
      wTiles: 4,
      hTiles: 3,
      zone: 'Zone 01 · North Ridge',
      crop: 'Snack Peppers & Cucumbers',
      controller: {
        model: 'MultiGrow MGC-Pro 16-Ch',
        serial: 'AG-8842-NZ',
        firmware: 'v2.4.1-LTS',
        wifiSSID: 'Greenhouse_5G_Commercial',
        rssi: -55,
        ipAddress: '192.168.10.46',
        status: 'ONLINE',
        doseCountHour: 24,
        doseCountTotal: 980
      },
      metrics: {
        ec: 2.40,
        targetEc: 2.40,
        ph: 5.79,
        targetPh: 5.80,
        vpd: 1.20,
        vwc: 62.0,
        waterTemp: 21.0
      },
      pumps: {
        pumpA: 'IDLE',
        pumpB: 'IDLE',
        acid: 'IDLE'
      }
    },
    {
      id: 'nft-beds-1',
      name: 'Hydroponic Gutter Beds · NFT Field A',
      type: 'beds',
      tileX: 1,
      tileY: 5,
      wTiles: 4,
      hTiles: 2,
      zone: 'Zone 02 · Gutter NFT',
      crop: 'Crisphead Lettuce (Salanova)',
      controller: {
        model: 'Autogrow EC Mini',
        serial: 'EM-4401-MY',
        firmware: 'v5.0-Rev3',
        wifiSSID: 'Greenhouse_5G_Commercial',
        rssi: -62,
        ipAddress: '192.168.10.51',
        status: 'ONLINE',
        doseCountHour: 18,
        doseCountTotal: 640
      },
      metrics: {
        ec: 1.65,
        targetEc: 1.60,
        ph: 5.88,
        targetPh: 5.85,
        vpd: 0.95,
        vwc: 78.0,
        waterTemp: 19.5
      },
      pumps: {
        pumpA: 'IDLE',
        pumpB: 'IDLE',
        acid: 'IDLE'
      }
    },
    {
      id: 'nft-beds-2',
      name: 'Hydroponic Gutter Beds · NFT Field B',
      type: 'beds',
      tileX: 6,
      tileY: 5,
      wTiles: 4,
      hTiles: 2,
      zone: 'Zone 02 · Gutter NFT',
      crop: 'Fresh Culinary Herbs (Basil/Mint)',
      controller: {
        model: 'Autogrow EC Mini',
        serial: 'EM-4402-MY',
        firmware: 'v5.0-Rev3',
        wifiSSID: 'Greenhouse_5G_Commercial',
        rssi: -66,
        ipAddress: '192.168.10.52',
        status: 'ATTENTION',
        doseCountHour: 44,
        doseCountTotal: 1850
      },
      metrics: {
        ec: 1.52,
        targetEc: 1.65,
        ph: 6.12,
        targetPh: 5.85,
        vpd: 1.05,
        vwc: 74.0,
        waterTemp: 20.2
      },
      pumps: {
        pumpA: 'DOSING',
        pumpB: 'IDLE',
        acid: 'DOSING'
      }
    },
    {
      id: 'silos-station',
      name: 'Central Fertigation Silos & Mixing Skid',
      type: 'silos',
      tileX: 1,
      tileY: 8,
      wTiles: 3,
      hTiles: 2,
      zone: 'Zone 00 · Fertigation Skid',
      crop: 'Nutrient Stock Tanks A & B',
      controller: {
        model: 'Autogrow EC Mini',
        serial: 'EM-4400-HQ',
        firmware: 'v5.0-Rev3',
        wifiSSID: 'Greenhouse_5G_Commercial',
        rssi: -48,
        ipAddress: '192.168.10.40',
        status: 'ONLINE',
        doseCountHour: 52,
        doseCountTotal: 3410
      },
      metrics: {
        ec: 2.80,
        targetEc: 2.80,
        ph: 5.75,
        targetPh: 5.75,
        vpd: 1.00,
        vwc: 85.0,
        waterTemp: 19.8
      },
      pumps: {
        pumpA: 'IDLE',
        pumpB: 'IDLE',
        acid: 'IDLE'
      }
    },
    {
      id: 'headhouse-1',
      name: 'Central Packing & Agronomy Lab',
      type: 'headhouse',
      tileX: 6,
      tileY: 8,
      wTiles: 4,
      hTiles: 2,
      zone: 'Zone 00 · Headhouse Logistics',
      crop: 'Seedling Germination & Packout',
      controller: {
        model: 'IntelliDose Hub',
        serial: 'ID-9901-NZ',
        firmware: 'v3.1.0',
        wifiSSID: 'Greenhouse_5G_Commercial',
        rssi: -45,
        ipAddress: '192.168.10.35',
        status: 'ONLINE',
        doseCountHour: 12,
        doseCountTotal: 490
      },
      metrics: {
        ec: 1.20,
        targetEc: 1.20,
        ph: 5.90,
        targetPh: 5.85,
        vpd: 0.85,
        vwc: 80.0,
        waterTemp: 20.0
      },
      pumps: {
        pumpA: 'IDLE',
        pumpB: 'IDLE',
        acid: 'IDLE'
      }
    }
  ]);

  const [activeTab, setActiveTab] = useState<'view' | 'build'>('view');
  const [selectedId, setSelectedId] = useState<string>(externalSelectedId || 'greenhouse-1');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [selectedBuildType, setSelectedBuildType] = useState<'greenhouse' | 'beds' | 'silos' | 'controller_station'>('greenhouse');
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [saveToast, setSaveToast] = useState(false);

  const [layers, setLayers] = useState({
    controllers: true,
    sensors: true,
    pumps: true,
    irrigation: false,
    vpdHeatmap: true,
    alerts: true
  });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const activeStructure = structures.find(s => s.id === (hoveredId || selectedId)) || structures[0];

  const buildSpecs: Record<string, { w: number; h: number; label: string; icon: string }> = {
    greenhouse: { w: 4, h: 3, label: 'Venlo Glasshouse Bay (4x3)', icon: '🏡' },
    beds: { w: 4, h: 2, label: 'Hydro Gutter Beds (4x2)', icon: '🌱' },
    silos: { w: 3, h: 2, label: 'Nutrient Silos & Tanks (3x2)', icon: '🛢️' },
    controller_station: { w: 1, h: 1, label: 'EC Mini Controller Hub (1x1)', icon: '📟' }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTab !== 'build') return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - ORIGIN_X;
    const dy = mouseY - ORIGIN_Y;

    const tx = Math.floor((dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2);
    const ty = Math.floor((dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2);

    if (tx >= 0 && tx < GRID_COLS && ty >= 0 && ty < GRID_ROWS) {
      setHoveredTile({ x: tx, y: ty });
    } else {
      setHoveredTile(null);
    }
  };

  const handleTileClick = (tx: number, ty: number) => {
    if (activeTab !== 'build') return;
    const spec = buildSpecs[selectedBuildType];
    const newId = `farm-item-${Date.now().toString().slice(-4)}`;

    const newStruct: TileStructure = {
      id: newId,
      name: selectedBuildType === 'greenhouse' 
        ? `Venlo Bay 0${structures.length + 1} · Glasshouse`
        : selectedBuildType === 'beds'
        ? `Hydro Gutter Beds 0${structures.length + 1}`
        : selectedBuildType === 'silos'
        ? `Nutrient Silos Skid 0${structures.length + 1}`
        : `EC Mini Station 0${structures.length + 1}`,
      type: selectedBuildType,
      tileX: Math.min(tx, GRID_COLS - spec.w),
      tileY: Math.min(ty, GRID_ROWS - spec.h),
      wTiles: spec.w,
      hTiles: spec.h,
      zone: `Zone 0${structures.length + 1}`,
      crop: selectedBuildType === 'greenhouse' ? 'Vine Tomatoes' : 'Leafy Greens',
      controller: {
        model: selectedBuildType === 'greenhouse' ? 'MultiGrow MGC-Pro 16-Ch' : 'Autogrow EC Mini',
        serial: `AG-${Math.floor(1000 + Math.random() * 9000)}-NZ`,
        firmware: 'v5.0-Rev3',
        wifiSSID: 'Greenhouse_5G_Commercial',
        rssi: -54,
        ipAddress: `192.168.10.${40 + structures.length}`,
        status: 'ONLINE',
        doseCountHour: 20,
        doseCountTotal: 450
      },
      metrics: {
        ec: 2.20,
        targetEc: 2.30,
        ph: 5.85,
        targetPh: 5.80,
        vpd: 1.10,
        vwc: 65.0,
        waterTemp: 20.5
      },
      pumps: {
        pumpA: 'IDLE',
        pumpB: 'IDLE',
        acid: 'IDLE'
      }
    };

    setStructures([...structures, newStruct]);
    setSelectedId(newId);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2200);
  };

  const handleDeleteStructure = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (structures.length <= 1) return;
    const remaining = structures.filter(s => s.id !== id);
    setStructures(remaining);
    setSelectedId(remaining[0].id);
  };

  const renderGroundSlab = () => {
    const pTop0 = tileToScreen(0, 0, 0);
    const pTop1 = tileToScreen(GRID_COLS, 0, 0);
    const pTop2 = tileToScreen(GRID_COLS, GRID_ROWS, 0);
    const pTop3 = tileToScreen(0, GRID_ROWS, 0);

    const SLAB_DEPTH = 18;
    const pBot1 = tileToScreen(GRID_COLS, 0, -SLAB_DEPTH);
    const pBot2 = tileToScreen(GRID_COLS, GRID_ROWS, -SLAB_DEPTH);
    const pBot3 = tileToScreen(0, GRID_ROWS, -SLAB_DEPTH);

    return (
      <g id="ground-slab">
        <polygon
          points={`${ptStr(tileToScreen(-0.5, -0.5, -SLAB_DEPTH - 8))} ${ptStr(tileToScreen(GRID_COLS + 0.5, -0.5, -SLAB_DEPTH - 8))} ${ptStr(tileToScreen(GRID_COLS + 0.5, GRID_ROWS + 0.5, -SLAB_DEPTH - 8))} ${ptStr(tileToScreen(-0.5, GRID_ROWS + 0.5, -SLAB_DEPTH - 8))}`}
          fill="rgba(15, 23, 42, 0.08)"
          filter="blur(10px)"
        />
        <polygon
          points={`${ptStr(pTop1)} ${ptStr(pTop2)} ${ptStr(pBot2)} ${ptStr(pBot1)}`}
          fill="#CBD5E1"
          stroke="#94A3B8"
          strokeWidth="0.8"
        />
        <polygon
          points={`${ptStr(pTop3)} ${ptStr(pTop2)} ${ptStr(pBot2)} ${ptStr(pBot3)}`}
          fill="#94A3B8"
          stroke="#64748B"
          strokeWidth="0.8"
        />
        <polygon
          points={`${ptStr(pTop0)} ${ptStr(pTop1)} ${ptStr(pTop2)} ${ptStr(pTop3)}`}
          fill="#F8FAFC"
          stroke="#E2E8F0"
          strokeWidth="1.2"
        />

        {Array.from({ length: GRID_COLS }).map((_, cx) =>
          Array.from({ length: GRID_ROWS }).map((_, cy) => {
            const t0 = tileToScreen(cx, cy, 0);
            const t1 = tileToScreen(cx + 1, cy, 0);
            const t2 = tileToScreen(cx + 1, cy + 1, 0);
            const t3 = tileToScreen(cx, cy + 1, 0);

            const isHovered = hoveredTile && hoveredTile.x === cx && hoveredTile.y === cy;

            return (
              <polygon
                key={`tile-${cx}-${cy}`}
                points={`${ptStr(t0)} ${ptStr(t1)} ${ptStr(t2)} ${ptStr(t3)}`}
                fill={isHovered && activeTab === 'build' ? 'rgba(16, 185, 129, 0.25)' : 'none'}
                stroke="#E2E8F0"
                strokeWidth={isHovered ? 1.5 : 0.6}
                strokeDasharray={activeTab === 'build' ? '2,2' : undefined}
                style={{ cursor: activeTab === 'build' ? 'crosshair' : 'default' }}
                onClick={() => handleTileClick(cx, cy)}
              />
            );
          })
        )}
      </g>
    );
  };

  const renderGreenhouse = (s: TileStructure) => {
    const isSelected = selectedId === s.id;
    const isHovered = hoveredId === s.id;

    const baseZ = 2;
    const wallH = 34;
    const ridgeH = 50;

    const p0 = tileToScreen(s.tileX, s.tileY, baseZ);
    const p1 = tileToScreen(s.tileX + s.wTiles, s.tileY, baseZ);
    const p2 = tileToScreen(s.tileX + s.wTiles, s.tileY + s.hTiles, baseZ);
    const p3 = tileToScreen(s.tileX, s.tileY + s.hTiles, baseZ);

    const w0Top = tileToScreen(s.tileX, s.tileY, wallH);
    const w1Top = tileToScreen(s.tileX + s.wTiles, s.tileY, wallH);
    const w2Top = tileToScreen(s.tileX + s.wTiles, s.tileY + s.hTiles, wallH);
    const w3Top = tileToScreen(s.tileX, s.tileY + s.hTiles, wallH);

    const midY1 = s.tileY + s.hTiles * 0.25;
    const midY2 = s.tileY + s.hTiles * 0.75;
    const r1Start = tileToScreen(s.tileX, midY1, ridgeH);
    const r1End = tileToScreen(s.tileX + s.wTiles, midY1, ridgeH);
    const r2Start = tileToScreen(s.tileX, midY2, ridgeH);
    const r2End = tileToScreen(s.tileX + s.wTiles, midY2, ridgeH);

    const centerPoint = tileToScreen(s.tileX + s.wTiles / 2, s.tileY + s.hTiles / 2, ridgeH + 16);

    return (
      <g
        key={s.id}
        onClick={() => {
          setSelectedId(s.id);
          onSelectStructure?.(s);
        }}
        onMouseEnter={() => setHoveredId(s.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{ cursor: 'pointer' }}
      >
        <polygon
          points={`${ptStr(p0)} ${ptStr(p1)} ${ptStr(p2)} ${ptStr(p3)}`}
          fill={isSelected ? 'rgba(16, 185, 129, 0.2)' : isHovered ? 'rgba(56, 189, 248, 0.15)' : 'rgba(241, 245, 249, 0.8)'}
          stroke={isSelected ? '#10B981' : isHovered ? '#38BDF8' : '#CBD5E1'}
          strokeWidth={isSelected ? 2 : 1}
        />

        {Array.from({ length: 3 }).map((_, i) => {
          const rowY = s.tileY + 0.5 + i * 0.7;
          const rA = tileToScreen(s.tileX + 0.3, rowY, baseZ + 3);
          const rB = tileToScreen(s.tileX + s.wTiles - 0.3, rowY, baseZ + 3);
          return (
            <line
              key={`crop-${i}`}
              x1={rA[0]}
              y1={rA[1]}
              x2={rB[0]}
              y2={rB[1]}
              stroke="#10B981"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.85"
            />
          );
        })}

        <polygon
          points={`${ptStr(p1)} ${ptStr(p2)} ${ptStr(w2Top)} ${ptStr(w1Top)}`}
          fill="rgba(203, 213, 225, 0.45)"
          stroke="#64748B"
          strokeWidth="1"
        />
        <polygon
          points={`${ptStr(p3)} ${ptStr(p2)} ${ptStr(w2Top)} ${ptStr(w3Top)}`}
          fill="rgba(148, 163, 184, 0.5)"
          stroke="#64748B"
          strokeWidth="1"
        />
        <polygon
          points={`${ptStr(r1Start)} ${ptStr(r1End)} ${ptStr(w1Top)} ${ptStr(w0Top)}`}
          fill="rgba(241, 245, 249, 0.75)"
          stroke="#64748B"
          strokeWidth="0.8"
        />
        <polygon
          points={`${ptStr(r1Start)} ${ptStr(r1End)} ${ptStr(r2End)} ${ptStr(r2Start)}`}
          fill="rgba(226, 232, 240, 0.8)"
          stroke="#64748B"
          strokeWidth="0.8"
        />
        <polygon
          points={`${ptStr(r2Start)} ${ptStr(r2End)} ${ptStr(w2Top)} ${ptStr(w3Top)}`}
          fill="rgba(203, 213, 225, 0.75)"
          stroke="#64748B"
          strokeWidth="0.8"
        />

        <line x1={r1Start[0]} y1={r1Start[1]} x2={r1End[0]} y2={r1End[1]} stroke="#334155" strokeWidth="1.2" />
        <line x1={r2Start[0]} y1={r2Start[1]} x2={r2End[0]} y2={r2End[1]} stroke="#334155" strokeWidth="1.2" />

        {layers.controllers && (
          <g transform={`translate(${p2[0] - 12}, ${p2[1] - 28})`}>
            <rect x="0" y="0" width="24" height="18" rx="3" fill="#0F172A" stroke="#10B981" strokeWidth="1" />
            <circle cx="5" cy="5" r="1.5" fill="#10B981" />
            <rect x="9" y="3" width="11" height="5" rx="1" fill="#1E293B" />
            <line x1="18" y1="0" x2="18" y2="-5" stroke="#38BDF8" strokeWidth="1" />
            <circle cx="18" cy="-5" r="1.2" fill="#38BDF8" />
          </g>
        )}

        {layers.sensors && (
          <g transform={`translate(${centerPoint[0]}, ${centerPoint[1]})`}>
            <rect
              x="-48"
              y="-12"
              width="96"
              height="22"
              rx="11"
              fill="#FFFFFF"
              stroke={isSelected ? '#10B981' : '#E2E8F0'}
              strokeWidth={isSelected ? 1.5 : 1}
              filter="drop-shadow(0 2px 5px rgba(0,0,0,0.1))"
            />
            <circle cx="-38" cy="-1" r="3" fill={s.controller.status === 'ATTENTION' ? '#F59E0B' : '#10B981'} />
            <text
              x="-30"
              y="3"
              fill="#0F172A"
              fontSize="10"
              fontWeight="700"
              fontFamily="monospace"
            >
              EC {s.metrics.ec.toFixed(2)}
            </text>
            <text
              x="14"
              y="3"
              fill="#64748B"
              fontSize="9"
              fontFamily="monospace"
            >
              pH {s.metrics.ph.toFixed(1)}
            </text>
          </g>
        )}
      </g>
    );
  };

  const renderGutterBeds = (s: TileStructure) => {
    const isSelected = selectedId === s.id;
    const isHovered = hoveredId === s.id;

    const baseZ = 2;
    const bedH = 12;

    const p0 = tileToScreen(s.tileX, s.tileY, baseZ);
    const p1 = tileToScreen(s.tileX + s.wTiles, s.tileY, baseZ);
    const p2 = tileToScreen(s.tileX + s.wTiles, s.tileY + s.hTiles, baseZ);
    const p3 = tileToScreen(s.tileX, s.tileY + s.hTiles, baseZ);

    const centerPoint = tileToScreen(s.tileX + s.wTiles / 2, s.tileY + s.hTiles / 2, bedH + 16);

    return (
      <g
        key={s.id}
        onClick={() => {
          setSelectedId(s.id);
          onSelectStructure?.(s);
        }}
        onMouseEnter={() => setHoveredId(s.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{ cursor: 'pointer' }}
      >
        <polygon
          points={`${ptStr(p0)} ${ptStr(p1)} ${ptStr(p2)} ${ptStr(p3)}`}
          fill={isSelected ? 'rgba(16, 185, 129, 0.2)' : isHovered ? 'rgba(56, 189, 248, 0.15)' : 'rgba(241, 245, 249, 0.8)'}
          stroke={isSelected ? '#10B981' : isHovered ? '#38BDF8' : '#CBD5E1'}
          strokeWidth={isSelected ? 2 : 1}
        />

        {Array.from({ length: 4 }).map((_, i) => {
          const gy = s.tileY + 0.3 + i * 0.42;
          const gStart = tileToScreen(s.tileX + 0.2, gy, bedH);
          const gEnd = tileToScreen(s.tileX + s.wTiles - 0.2, gy, bedH);

          return (
            <g key={`gutter-${i}`}>
              <line
                x1={gStart[0]}
                y1={gStart[1]}
                x2={gEnd[0]}
                y2={gEnd[1]}
                stroke="#FFFFFF"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <line
                x1={gStart[0]}
                y1={gStart[1]}
                x2={gEnd[0]}
                y2={gEnd[1]}
                stroke="#CBD5E1"
                strokeWidth="7.8"
                strokeLinecap="round"
                opacity="0.5"
              />
              {Array.from({ length: 5 }).map((_, lx) => {
                const lp = tileToScreen(s.tileX + 0.4 + lx * 0.7, gy, bedH + 2);
                return (
                  <circle
                    key={`lettuce-${i}-${lx}`}
                    cx={lp[0]}
                    cy={lp[1]}
                    r="3.5"
                    fill="#10B981"
                    stroke="#059669"
                    strokeWidth="0.6"
                  />
                );
              })}
            </g>
          );
        })}

        {layers.controllers && (
          <g transform={`translate(${p1[0] - 8}, ${p1[1] - 32})`}>
            <line x1="8" y1="20" x2="8" y2="30" stroke="#64748B" strokeWidth="2" />
            <rect x="0" y="0" width="16" height="22" rx="3" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1" />
            <rect x="3" y="4" width="10" height="6" rx="1" fill="#0F2B1D" stroke="#10B981" strokeWidth="0.5" />
            <circle cx="12" cy="13" r="1.2" fill="#F59E0B" />
            <rect x="3" y="19" width="10" height="3" fill="#10B981" />
          </g>
        )}

        {layers.sensors && (
          <g transform={`translate(${centerPoint[0]}, ${centerPoint[1]})`}>
            <rect
              x="-48"
              y="-12"
              width="96"
              height="22"
              rx="11"
              fill="#FFFFFF"
              stroke={isSelected ? '#10B981' : '#E2E8F0'}
              strokeWidth={isSelected ? 1.5 : 1}
              filter="drop-shadow(0 2px 5px rgba(0,0,0,0.1))"
            />
            <circle cx="-38" cy="-1" r="3" fill={s.controller.status === 'ATTENTION' ? '#F59E0B' : '#10B981'} />
            <text
              x="-30"
              y="3"
              fill="#0F172A"
              fontSize="10"
              fontWeight="700"
              fontFamily="monospace"
            >
              EC {s.metrics.ec.toFixed(2)}
            </text>
            <text
              x="14"
              y="3"
              fill="#64748B"
              fontSize="9"
              fontFamily="monospace"
            >
              NFT 1.6mS
            </text>
          </g>
        )}
      </g>
    );
  };

  const renderSilos = (s: TileStructure) => {
    const isSelected = selectedId === s.id;
    const isHovered = hoveredId === s.id;

    const baseZ = 2;
    const tankH = 38;

    const p0 = tileToScreen(s.tileX, s.tileY, baseZ);
    const p1 = tileToScreen(s.tileX + s.wTiles, s.tileY, baseZ);
    const p2 = tileToScreen(s.tileX + s.wTiles, s.tileY + s.hTiles, baseZ);
    const p3 = tileToScreen(s.tileX, s.tileY + s.hTiles, baseZ);

    const tankA_base = tileToScreen(s.tileX + 0.8, s.tileY + 0.9, baseZ);
    const tankA_top = tileToScreen(s.tileX + 0.8, s.tileY + 0.9, tankH);

    const tankB_base = tileToScreen(s.tileX + 2.0, s.tileY + 0.9, baseZ);
    const tankB_top = tileToScreen(s.tileX + 2.0, s.tileY + 0.9, tankH);

    const centerPoint = tileToScreen(s.tileX + s.wTiles / 2, s.tileY + s.hTiles / 2, tankH + 16);

    return (
      <g
        key={s.id}
        onClick={() => {
          setSelectedId(s.id);
          onSelectStructure?.(s);
        }}
        onMouseEnter={() => setHoveredId(s.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{ cursor: 'pointer' }}
      >
        <polygon
          points={`${ptStr(p0)} ${ptStr(p1)} ${ptStr(p2)} ${ptStr(p3)}`}
          fill={isSelected ? 'rgba(16, 185, 129, 0.2)' : isHovered ? 'rgba(56, 189, 248, 0.15)' : 'rgba(241, 245, 249, 0.8)'}
          stroke={isSelected ? '#10B981' : isHovered ? '#38BDF8' : '#CBD5E1'}
          strokeWidth={isSelected ? 2 : 1}
        />

        <g>
          <rect
            x={tankA_top[0] - 16}
            y={tankA_top[1]}
            width="32"
            height={tankA_base[1] - tankA_top[1]}
            fill="url(#siloGradient)"
            stroke="#64748B"
            strokeWidth="1"
          />
          <ellipse cx={tankA_top[0]} cy={tankA_top[1]} rx="16" ry="8" fill="#E2E8F0" stroke="#64748B" strokeWidth="1" />
          <ellipse cx={tankA_base[0]} cy={tankA_base[1]} rx="16" ry="8" fill="#94A3B8" opacity="0.4" />
          <rect x={tankA_top[0] - 3} y={tankA_top[1] + 6} width="6" height="24" rx="2" fill="#0F172A" />
          <rect x={tankA_top[0] - 2} y={tankA_top[1] + 10} width="4" height="18" rx="1" fill="#38BDF8" />
          <text x={tankA_top[0]} y={tankA_top[1] - 10} fill="#0F172A" fontSize="9" fontWeight="800" textAnchor="middle">
            TANK A
          </text>
        </g>

        <g>
          <rect
            x={tankB_top[0] - 16}
            y={tankB_top[1]}
            width="32"
            height={tankB_base[1] - tankB_top[1]}
            fill="url(#siloGradient)"
            stroke="#64748B"
            strokeWidth="1"
          />
          <ellipse cx={tankB_top[0]} cy={tankB_top[1]} rx="16" ry="8" fill="#E2E8F0" stroke="#64748B" strokeWidth="1" />
          <ellipse cx={tankB_base[0]} cy={tankB_base[1]} rx="16" ry="8" fill="#94A3B8" opacity="0.4" />
          <rect x={tankB_top[0] - 3} y={tankB_top[1] + 6} width="6" height="24" rx="2" fill="#0F172A" />
          <rect x={tankB_top[0] - 2} y={tankB_top[1] + 14} width="4" height="14" rx="1" fill="#F59E0B" />
          <text x={tankB_top[0]} y={tankB_top[1] - 10} fill="#0F172A" fontSize="9" fontWeight="800" textAnchor="middle">
            TANK B
          </text>
        </g>

        <line
          x1={tankA_base[0] + 16}
          y1={tankA_base[1] - 4}
          x2={tankB_base[0] - 16}
          y2={tankB_base[1] - 4}
          stroke="#0284C7"
          strokeWidth="3"
        />

        {layers.sensors && (
          <g transform={`translate(${centerPoint[0]}, ${centerPoint[1]})`}>
            <rect
              x="-48"
              y="-12"
              width="96"
              height="22"
              rx="11"
              fill="#FFFFFF"
              stroke={isSelected ? '#10B981' : '#E2E8F0'}
              strokeWidth={isSelected ? 1.5 : 1}
              filter="drop-shadow(0 2px 5px rgba(0,0,0,0.1))"
            />
            <circle cx="-38" cy="-1" r="3" fill="#10B981" />
            <text
              x="-30"
              y="3"
              fill="#0F172A"
              fontSize="10"
              fontWeight="700"
              fontFamily="monospace"
            >
              SILOS 85%
            </text>
            <text
              x="22"
              y="3"
              fill="#64748B"
              fontSize="9"
              fontFamily="monospace"
            >
              2.8mS
            </text>
          </g>
        )}
      </g>
    );
  };

  const renderHeadhouse = (s: TileStructure) => {
    const isSelected = selectedId === s.id;
    const isHovered = hoveredId === s.id;

    const baseZ = 2;
    const houseH = 30;

    const p0 = tileToScreen(s.tileX, s.tileY, baseZ);
    const p1 = tileToScreen(s.tileX + s.wTiles, s.tileY, baseZ);
    const p2 = tileToScreen(s.tileX + s.wTiles, s.tileY + s.hTiles, baseZ);
    const p3 = tileToScreen(s.tileX, s.tileY + s.hTiles, baseZ);

    const w0Top = tileToScreen(s.tileX, s.tileY, houseH);
    const w1Top = tileToScreen(s.tileX + s.wTiles, s.tileY, houseH);
    const w2Top = tileToScreen(s.tileX + s.wTiles, s.tileY + s.hTiles, houseH);
    const w3Top = tileToScreen(s.tileX, s.tileY + s.hTiles, houseH);

    const centerPoint = tileToScreen(s.tileX + s.wTiles / 2, s.tileY + s.hTiles / 2, houseH + 16);

    return (
      <g
        key={s.id}
        onClick={() => {
          setSelectedId(s.id);
          onSelectStructure?.(s);
        }}
        onMouseEnter={() => setHoveredId(s.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{ cursor: 'pointer' }}
      >
        <polygon
          points={`${ptStr(p0)} ${ptStr(p1)} ${ptStr(p2)} ${ptStr(p3)}`}
          fill={isSelected ? 'rgba(16, 185, 129, 0.2)' : isHovered ? 'rgba(56, 189, 248, 0.15)' : 'rgba(241, 245, 249, 0.8)'}
          stroke={isSelected ? '#10B981' : isHovered ? '#38BDF8' : '#CBD5E1'}
          strokeWidth={isSelected ? 2 : 1}
        />
        <polygon
          points={`${ptStr(p1)} ${ptStr(p2)} ${ptStr(w2Top)} ${ptStr(w1Top)}`}
          fill="#E2E8F0"
          stroke="#94A3B8"
          strokeWidth="1"
        />
        <polygon
          points={`${ptStr(p3)} ${ptStr(p2)} ${ptStr(w2Top)} ${ptStr(w3Top)}`}
          fill="#CBD5E1"
          stroke="#94A3B8"
          strokeWidth="1"
        />
        <polygon
          points={`${ptStr(w0Top)} ${ptStr(w1Top)} ${ptStr(w2Top)} ${ptStr(w3Top)}`}
          fill="#F1F5F9"
          stroke="#94A3B8"
          strokeWidth="1"
        />
        <rect
          x={w0Top[0] + 10}
          y={w0Top[1] + 4}
          width="28"
          height="14"
          rx="1"
          fill="#1E293B"
          stroke="#38BDF8"
          strokeWidth="0.8"
        />
        <rect
          x={p2[0] - 22}
          y={p2[1] - 16}
          width="18"
          height="14"
          fill="#475569"
          stroke="#334155"
          strokeWidth="0.8"
        />

        {layers.sensors && (
          <g transform={`translate(${centerPoint[0]}, ${centerPoint[1]})`}>
            <rect
              x="-48"
              y="-12"
              width="96"
              height="22"
              rx="11"
              fill="#FFFFFF"
              stroke={isSelected ? '#10B981' : '#E2E8F0'}
              strokeWidth={isSelected ? 1.5 : 1}
              filter="drop-shadow(0 2px 5px rgba(0,0,0,0.1))"
            />
            <circle cx="-38" cy="-1" r="3" fill="#10B981" />
            <text
              x="-30"
              y="3"
              fill="#0F172A"
              fontSize="10"
              fontWeight="700"
              fontFamily="monospace"
            >
              PACKHOUSE
            </text>
            <text
              x="25"
              y="3"
              fill="#10B981"
              fontSize="9"
              fontFamily="monospace"
            >
              95%
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '620px', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
      {/* Top Map Toolbar with FarmVille Mode Switcher */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '20px',
        right: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 20,
        pointerEvents: 'none'
      }}>
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '4px',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
          pointerEvents: 'auto'
        }}>
          <button
            onClick={() => setActiveTab('view')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'view' ? '#0F172A' : 'transparent',
              color: activeTab === 'view' ? '#FFFFFF' : '#64748B',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Eye size={14} />
            Digital Twin Inspect
          </button>
          <button
            onClick={() => setActiveTab('build')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'build' ? '#10B981' : 'transparent',
              color: activeTab === 'build' ? '#FFFFFF' : '#64748B',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Hammer size={14} />
            FarmVille 1x1 Tile Builder
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
          {saveToast && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <CheckCircle2 size={14} />
              Layout Synced to Edge Controllers!
            </div>
          )}
          <button
            onClick={() => {
              setSaveToast(true);
              setTimeout(() => setSaveToast(false), 2000);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <Save size={14} color="#10B981" />
            Save Layout
          </button>
        </div>
      </div>

      {activeTab === 'build' && (
        <div style={{
          position: 'absolute',
          top: '64px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 25,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #10B981',
          boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.2)'
        }}>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, color: '#10B981', marginRight: '6px' }}>
            SELECT ITEM TO DROP ON 1x1 TILES:
          </span>
          {(['greenhouse', 'beds', 'silos', 'controller_station'] as const).map(bType => (
            <button
              key={bType}
              onClick={() => setSelectedBuildType(bType)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: `1px solid ${selectedBuildType === bType ? '#10B981' : '#E2E8F0'}`,
                backgroundColor: selectedBuildType === bType ? 'rgba(16, 185, 129, 0.1)' : '#F8FAFC',
                color: selectedBuildType === bType ? '#0F172A' : '#64748B',
                fontSize: '12px',
                fontWeight: selectedBuildType === bType ? 800 : 500,
                cursor: 'pointer'
              }}
            >
              <span>{buildSpecs[bType].icon}</span>
              <span>{buildSpecs[bType].label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Floating Left Zones Card (Exact Layout from WarehouseOS Reference Image) */}
      <div style={{
        position: 'absolute',
        top: '68px',
        left: '20px',
        width: '240px',
        maxHeight: '480px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '16px',
        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.06)',
        zIndex: 15,
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>
            Zones · Farm Complex 1
          </span>
        </div>
        <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '12px' }}>
          {structures.length} active · 1 needs attention
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {structures.map(struct => {
            const isSel = selectedId === struct.id;
            const isAttn = struct.controller.status === 'ATTENTION';

            return (
              <div
                key={struct.id}
                onClick={() => {
                  setSelectedId(struct.id);
                  onSelectStructure?.(struct);
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: isSel ? '#F1F5F9' : '#F8FAFC',
                  border: `1px solid ${isSel ? '#10B981' : '#E2E8F0'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: isAttn ? '#F59E0B' : '#10B981'
                    }} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                      {struct.name.split('·')[0].trim()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', color: isAttn ? '#F59E0B' : '#10B981' }}>
                      {struct.metrics.ec.toFixed(1)} mS
                    </span>
                    {activeTab === 'build' && (
                      <button
                        onClick={(e) => handleDeleteStructure(struct.id, e)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#64748B' }}>
                  <span>{struct.crop.split('(')[0].trim()}</span>
                  <span>{struct.controller.doseCountHour} DC/h</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Right Layers Card & Zoom Controls */}
      <div style={{
        position: 'absolute',
        top: '68px',
        right: '20px',
        width: '180px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '16px',
        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.06)',
        zIndex: 15
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>
            Map Layers
          </span>
          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748B' }}>
            5/6
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { key: 'controllers', label: 'Controllers' },
            { key: 'sensors', label: 'EC / pH Tags' },
            { key: 'pumps', label: 'Dosing Pumps' },
            { key: 'irrigation', label: 'Irrigation Lines' },
            { key: 'vpdHeatmap', label: 'VPD Heatmap' },
            { key: 'alerts', label: 'Alert Chips' }
          ].map(item => (
            <label
              key={item.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              <span>{item.label}</span>
              <input
                type="checkbox"
                checked={(layers as any)[item.key]}
                onChange={() => setLayers({ ...layers, [item.key]: !(layers as any)[item.key] })}
                style={{ accentColor: '#10B981', cursor: 'pointer' }}
              />
            </label>
          ))}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #E2E8F0'
        }}>
          <button
            onClick={() => setZoomLevel(Math.min(1.4, zoomLevel + 0.1))}
            style={{ padding: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', cursor: 'pointer' }}
          >
            <ZoomIn size={14} color="#64748B" />
          </button>
          <button
            onClick={() => setZoomLevel(Math.max(0.7, zoomLevel - 0.1))}
            style={{ padding: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', cursor: 'pointer' }}
          >
            <ZoomOut size={14} color="#64748B" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            style={{ padding: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', cursor: 'pointer' }}
          >
            <RotateCcw size={14} color="#64748B" />
          </button>
        </div>
      </div>

      {/* Floating Bottom Inspector Card for Selected Structure (Controller Info, Wi-Fi, Sensor Telemetry) */}
      {activeStructure && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '12px 20px',
          boxShadow: '0 10px 30px -5px rgba(0,0,0,0.08)',
          zIndex: 15,
          display: 'flex',
          alignItems: 'center',
          gap: '24px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={14} color="#10B981" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                {activeStructure.name}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'monospace',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: activeStructure.controller.status === 'ATTENTION' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: activeStructure.controller.status === 'ATTENTION' ? '#F59E0B' : '#10B981'
              }}>
                {activeStructure.controller.model} [{activeStructure.controller.serial}]
              </span>
            </div>
            <div style={{ display: 'flex', gap: '14px', marginTop: '4px', fontSize: '11px', color: '#64748B' }}>
              <span>IP: {activeStructure.controller.ipAddress}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Wifi size={11} color="#10B981" />
                {activeStructure.controller.rssi} dBm
              </span>
              <span>Crop: <strong>{activeStructure.crop}</strong></span>
            </div>
          </div>

          <div style={{ height: '32px', width: '1px', backgroundColor: '#E2E8F0' }} />

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace' }}>LIVE EC</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981', fontFamily: 'monospace' }}>
                {activeStructure.metrics.ec.toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace' }}>LIVE pH</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#38BDF8', fontFamily: 'monospace' }}>
                {activeStructure.metrics.ph.toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace' }}>VPD</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#F59E0B', fontFamily: 'monospace' }}>
                {activeStructure.metrics.vpd.toFixed(2)} kPa
              </div>
            </div>

            {onTriggerDose && (
              <button
                onClick={() => onTriggerDose('pump-acid', 5)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Droplet size={12} color="#10B981" />
                Test Dose 5s
              </button>
            )}
          </div>
        </div>
      )}

      {/* Central SVG 3D Isometric Canvas */}
      <svg
        ref={svgRef}
        viewBox="0 0 1080 620"
        onMouseMove={handleSvgMouseMove}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: 'transform 0.15s ease-out'
        }}
      >
        <defs>
          <linearGradient id="siloGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#CBD5E1" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>
        </defs>

        {renderGroundSlab()}

        <g id="access-road">
          {Array.from({ length: GRID_COLS }).map((_, rx) => {
            const pA = tileToScreen(rx, 4, 0.5);
            const pB = tileToScreen(rx + 1, 4, 0.5);
            const pC = tileToScreen(rx + 1, 5, 0.5);
            const pD = tileToScreen(rx, 5, 0.5);
            return (
              <polygon
                key={`road-${rx}`}
                points={`${ptStr(pA)} ${ptStr(pB)} ${ptStr(pC)} ${ptStr(pD)}`}
                fill="#E2E8F0"
                stroke="#CBD5E1"
                strokeWidth="0.5"
              />
            );
          })}
        </g>

        {structures.map(struct => {
          if (struct.type === 'greenhouse') return renderGreenhouse(struct);
          if (struct.type === 'beds') return renderGutterBeds(struct);
          if (struct.type === 'silos') return renderSilos(struct);
          if (struct.type === 'headhouse') return renderHeadhouse(struct);
          return null;
        })}
      </svg>
    </div>
  );
};
