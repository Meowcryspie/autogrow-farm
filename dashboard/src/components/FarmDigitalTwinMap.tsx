import React, { useState, useRef, useEffect } from 'react';
import { 
  RotateCcw, 
  Save, 
  ZoomIn, 
  ZoomOut, 
  CheckCircle2, 
  Eye, 
  Hammer,
  Trash2,
  Cpu,
  Move,
  RotateCw,
  ShoppingBag,
  X,
  Volume2,
  VolumeX,
  Sliders
} from 'lucide-react';

export interface TileStructure {
  id: string;
  name: string;
  type: 'greenhouse' | 'beds' | 'silos' | 'headhouse' | 'controller_station' | 'pathway' | 'water_tank' | 'polyhouse';
  tileX: number; // 0 to 11
  tileY: number; // 0 to 9
  wTiles: number; // width in tiles
  hTiles: number; // height in tiles
  rotation: 0 | 90 | 180 | 270;
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

export interface CatalogItem {
  type: TileStructure['type'];
  name: string;
  category: 'greenhouses' | 'silos' | 'hydro' | 'controllers' | 'infra';
  wTiles: number;
  hTiles: number;
  icon: string;
  desc: string;
  defaultController: 'Autogrow EC Mini' | 'MultiGrow MGC-Pro 16-Ch' | 'IntelliDose Hub';
  capacity: string;
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
  // Web Audio Synthesizer for FarmVille SFX
  const [soundEnabled, setSoundEnabled] = useState(true);

  const playSfx = (type: 'place' | 'rotate' | 'delete' | 'select' | 'error') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (type === 'place') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(760, now + 0.1);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'rotate') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(680, now + 0.05);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'delete') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.15);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'select') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'error') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Full FarmVille Market Catalog
  const catalog: CatalogItem[] = [
    {
      type: 'greenhouse',
      name: 'Venlo Glasshouse Bay',
      category: 'greenhouses',
      wTiles: 4,
      hTiles: 3,
      icon: '🏡',
      desc: 'Peaked commercial glasshouse with ridge ventilation & high-wire tomato vine rows.',
      defaultController: 'MultiGrow MGC-Pro 16-Ch',
      capacity: '650 kg/m² cycle'
    },
    {
      type: 'polyhouse',
      name: 'High-Tunnel Polyhouse',
      category: 'greenhouses',
      wTiles: 3,
      hTiles: 2,
      icon: '🏛️',
      desc: 'Curved hoop tunnel with anti-drip film for berries and summer bell peppers.',
      defaultController: 'MultiGrow MGC-Pro 16-Ch',
      capacity: '420 kg/m² cycle'
    },
    {
      type: 'headhouse',
      name: 'Propagation & Nursery Lab',
      category: 'greenhouses',
      wTiles: 4,
      hTiles: 2,
      icon: '🏢',
      desc: 'Enclosed germination chamber with solar array roof and logistics dock.',
      defaultController: 'IntelliDose Hub',
      capacity: '12,000 seedlings/wk'
    },
    {
      type: 'silos',
      name: 'Central Fertigation Silo Skid',
      category: 'silos',
      wTiles: 3,
      hTiles: 2,
      icon: '🛢️',
      desc: 'Twin stainless steel silos (Stock Tanks A & B) with acid dosing drum.',
      defaultController: 'Autogrow EC Mini',
      capacity: '5,000L Stock Solution'
    },
    {
      type: 'water_tank',
      name: 'Bulk RO Water Storage Silo',
      category: 'silos',
      wTiles: 2,
      hTiles: 2,
      icon: '💧',
      desc: 'Reverse osmosis fresh water buffering tank with UV sterilizer loop.',
      defaultController: 'Autogrow EC Mini',
      capacity: '15,000L Fresh RO'
    },
    {
      type: 'beds',
      name: 'NFT Hydroponic Gutter Beds',
      category: 'hydro',
      wTiles: 4,
      hTiles: 2,
      icon: '🌱',
      desc: 'White PVC NFT channels with continuous nutrient film and crisphead lettuce.',
      defaultController: 'Autogrow EC Mini',
      capacity: '380 heads/cycle'
    },
    {
      type: 'controller_station',
      name: 'Autogrow EC Mini Station',
      category: 'controllers',
      wTiles: 1,
      hTiles: 1,
      icon: '📟',
      desc: 'Pedestal-mounted EC Mini controller with dual peristaltic dosing pumps & sample pot.',
      defaultController: 'Autogrow EC Mini',
      capacity: '2 Dosing Pumps (24VDC)'
    },
    {
      type: 'pathway',
      name: 'Concrete Logistics Pathway',
      category: 'infra',
      wTiles: 1,
      hTiles: 1,
      icon: '🛣️',
      desc: 'Reinforced concrete pavers for automated guided harvest carts and forklifts.',
      defaultController: 'Autogrow EC Mini',
      capacity: 'Transport Access'
    }
  ];

  // Active farm structures state
  const [structures, setStructures] = useState<TileStructure[]>([
    {
      id: 'greenhouse-1',
      name: 'Venlo Bay 01 · Peaked Glasshouse',
      type: 'greenhouse',
      tileX: 1,
      tileY: 1,
      wTiles: 4,
      hTiles: 3,
      rotation: 0,
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
      rotation: 0,
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
      rotation: 0,
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
      rotation: 0,
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
      rotation: 0,
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
      rotation: 0,
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

  // Mode and Tools
  const [activeTab, setActiveTab] = useState<'view' | 'build'>('build');
  const [selectedId, setSelectedId] = useState<string>(externalSelectedId || 'greenhouse-1');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // FarmVille Builder Drawer & Placement State
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [activeShopCategory, setActiveShopCategory] = useState<CatalogItem['category']>('greenhouses');
  const [activePlacingItem, setActivePlacingItem] = useState<CatalogItem | null>(null);
  const [placingDimensions, setPlacingDimensions] = useState<{ w: number; h: number }>({ w: 4, h: 3 });
  
  // Moving existing structure mode
  const [movingStructureId, setMovingStructureId] = useState<string | null>(null);

  // Mouse hover tile
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [saveToast, setSaveToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Layout Synced to Edge Controllers!');

  // Hardware Diagnostic Modal for selected structure
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);

  // Layers
  const [layers, setLayers] = useState({
    controllers: true,
    sensors: true,
    pumps: true,
    irrigation: false,
    vpdHeatmap: true,
    alerts: true
  });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const selectedStructure = structures.find(s => s.id === selectedId) || structures[0];
  const hoveredStructure = structures.find(s => s.id === hoveredId);

  // Keyboard shortcut listener: 'R' to rotate footprint, 'Escape' to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setPlacingDimensions(prev => ({ w: prev.h, h: prev.w }));
        playSfx('rotate');
      } else if (e.key === 'Escape') {
        setActivePlacingItem(null);
        setMovingStructureId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [soundEnabled]);

  // Convert mouse coordinate to isometric tile
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

  // Check tile collision: Is target footprint clear of other structures?
  const checkTileCollision = (tx: number, ty: number, w: number, h: number, ignoreId?: string) => {
    if (tx < 0 || ty < 0 || tx + w > GRID_COLS || ty + h > GRID_ROWS) {
      return false; // Out of bounds
    }

    for (const struct of structures) {
      if (ignoreId && struct.id === ignoreId) continue;
      // Axis-aligned bounding box collision in tile grid
      const overlapX = tx < struct.tileX + struct.wTiles && tx + w > struct.tileX;
      const overlapY = ty < struct.tileY + struct.hTiles && ty + h > struct.tileY;
      if (overlapX && overlapY) {
        return false; // Collision detected
      }
    }
    return true; // Spot is valid
  };

  // Place or Move Object on Click
  const handleTileClick = (tx: number, ty: number) => {
    if (activeTab !== 'build') return;

    // Moving existing structure
    if (movingStructureId) {
      const moving = structures.find(s => s.id === movingStructureId);
      if (!moving) return;

      const isValid = checkTileCollision(tx, ty, moving.wTiles, moving.hTiles, moving.id);
      if (!isValid) {
        playSfx('error');
        return;
      }

      setStructures(prev =>
        prev.map(s => (s.id === moving.id ? { ...s, tileX: tx, tileY: ty } : s))
      );
      setMovingStructureId(null);
      setSelectedId(moving.id);
      playSfx('place');
      setToastMessage(`Moved ${moving.name} to Tile (${tx}, ${ty})`);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
      return;
    }

    // Placing new item from catalog
    if (!activePlacingItem) return;

    const w = placingDimensions.w;
    const h = placingDimensions.h;
    const isValid = checkTileCollision(tx, ty, w, h);

    if (!isValid) {
      playSfx('error');
      return;
    }

    const newId = `item-${Date.now().toString().slice(-4)}`;
    const newStruct: TileStructure = {
      id: newId,
      name: `${activePlacingItem.name} 0${structures.length + 1}`,
      type: activePlacingItem.type,
      tileX: tx,
      tileY: ty,
      wTiles: w,
      hTiles: h,
      rotation: 0,
      zone: `Zone 0${structures.length + 1}`,
      crop: activePlacingItem.category === 'greenhouses' ? 'Vine Tomatoes' : 'Salanova Greens',
      controller: {
        model: activePlacingItem.defaultController,
        serial: `AG-${Math.floor(2000 + Math.random() * 7000)}-NZ`,
        firmware: 'v5.0-Rev3',
        wifiSSID: 'Greenhouse_5G_Commercial',
        rssi: -50 - Math.floor(Math.random() * 18),
        ipAddress: `192.168.10.${45 + structures.length}`,
        status: 'ONLINE',
        doseCountHour: 22,
        doseCountTotal: 480
      },
      metrics: {
        ec: 2.25,
        targetEc: 2.30,
        ph: 5.82,
        targetPh: 5.80,
        vpd: 1.12,
        vwc: 65.0,
        waterTemp: 20.4
      },
      pumps: {
        pumpA: 'IDLE',
        pumpB: 'IDLE',
        acid: 'IDLE'
      }
    };

    setStructures([...structures, newStruct]);
    setSelectedId(newId);
    playSfx('place');
    setToastMessage(`Placed ${newStruct.name}!`);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  // Rotate existing selected structure
  const handleRotateSelected = () => {
    if (!selectedStructure) return;
    const newW = selectedStructure.hTiles;
    const newH = selectedStructure.wTiles;
    const isValid = checkTileCollision(selectedStructure.tileX, selectedStructure.tileY, newW, newH, selectedStructure.id);

    if (!isValid) {
      playSfx('error');
      setToastMessage('Cannot rotate here: Tile obstructed!');
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
      return;
    }

    setStructures(prev =>
      prev.map(s =>
        s.id === selectedStructure.id
          ? {
              ...s,
              wTiles: newW,
              hTiles: newH,
              rotation: ((s.rotation + 90) % 360) as 0 | 90 | 180 | 270
            }
          : s
      )
    );
    playSfx('rotate');
  };

  // Delete selected structure
  const handleDeleteSelected = () => {
    if (!selectedStructure || structures.length <= 1) return;
    playSfx('delete');
    const remaining = structures.filter(s => s.id !== selectedStructure.id);
    setStructures(remaining);
    setSelectedId(remaining[0].id);
    setToastMessage(`Removed ${selectedStructure.name}`);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  // Pick up structure to move
  const handleStartMove = (id: string) => {
    playSfx('select');
    setMovingStructureId(id);
    const target = structures.find(s => s.id === id);
    if (target) {
      setPlacingDimensions({ w: target.wTiles, h: target.hTiles });
    }
  };

  // Select Item from Shop
  const handleSelectShopItem = (item: CatalogItem) => {
    playSfx('select');
    setActivePlacingItem(item);
    setPlacingDimensions({ w: item.wTiles, h: item.hTiles });
    setMovingStructureId(null);
    setIsShopOpen(false);
  };

  // Render 3D Ground Base Slab & 1x1 Isometric Tile Grid
  const renderGroundSlab = () => {
    const pTop0 = tileToScreen(0, 0, 0);
    const pTop1 = tileToScreen(GRID_COLS, 0, 0);
    const pTop2 = tileToScreen(GRID_COLS, GRID_ROWS, 0);
    const pTop3 = tileToScreen(0, GRID_ROWS, 0);

    const SLAB_DEPTH = 18;
    const pBot1 = tileToScreen(GRID_COLS, 0, -SLAB_DEPTH);
    const pBot2 = tileToScreen(GRID_COLS, GRID_ROWS, -SLAB_DEPTH);
    const pBot3 = tileToScreen(0, GRID_ROWS, -SLAB_DEPTH);

    // Active footprint dimensions for placement ghost
    const activeW = movingStructureId 
      ? structures.find(s => s.id === movingStructureId)?.wTiles || 1
      : activePlacingItem ? placingDimensions.w : 0;
    const activeH = movingStructureId
      ? structures.find(s => s.id === movingStructureId)?.hTiles || 1
      : activePlacingItem ? placingDimensions.h : 0;

    const isHoverValid = hoveredTile && (activePlacingItem || movingStructureId)
      ? checkTileCollision(hoveredTile.x, hoveredTile.y, activeW, activeH, movingStructureId || undefined)
      : false;

    return (
      <g id="ground-slab">
        {/* Soft Ambient Ground Shadow */}
        <polygon
          points={`${ptStr(tileToScreen(-0.5, -0.5, -SLAB_DEPTH - 8))} ${ptStr(tileToScreen(GRID_COLS + 0.5, -0.5, -SLAB_DEPTH - 8))} ${ptStr(tileToScreen(GRID_COLS + 0.5, GRID_ROWS + 0.5, -SLAB_DEPTH - 8))} ${ptStr(tileToScreen(-0.5, GRID_ROWS + 0.5, -SLAB_DEPTH - 8))}`}
          fill="rgba(15, 23, 42, 0.08)"
          filter="blur(10px)"
        />

        {/* Front-Right Slab Beveled Face */}
        <polygon
          points={`${ptStr(pTop1)} ${ptStr(pTop2)} ${ptStr(pBot2)} ${ptStr(pBot1)}`}
          fill="#CBD5E1"
          stroke="#94A3B8"
          strokeWidth="0.8"
        />

        {/* Front-Left Slab Beveled Face */}
        <polygon
          points={`${ptStr(pTop3)} ${ptStr(pTop2)} ${ptStr(pBot2)} ${ptStr(pBot3)}`}
          fill="#94A3B8"
          stroke="#64748B"
          strokeWidth="0.8"
        />

        {/* Top Slab Surface (Clean Light Farm Base) */}
        <polygon
          points={`${ptStr(pTop0)} ${ptStr(pTop1)} ${ptStr(pTop2)} ${ptStr(pTop3)}`}
          fill="#F8FAFC"
          stroke="#E2E8F0"
          strokeWidth="1.2"
        />

        {/* 1x1 Isometric Tile Grid Lines */}
        {Array.from({ length: GRID_COLS }).map((_, cx) =>
          Array.from({ length: GRID_ROWS }).map((_, cy) => {
            const t0 = tileToScreen(cx, cy, 0);
            const t1 = tileToScreen(cx + 1, cy, 0);
            const t2 = tileToScreen(cx + 1, cy + 1, 0);
            const t3 = tileToScreen(cx, cy + 1, 0);

            // Is this tile inside hovered placement footprint?
            const inFootprint = hoveredTile && (activePlacingItem || movingStructureId) &&
              cx >= hoveredTile.x && cx < hoveredTile.x + activeW &&
              cy >= hoveredTile.y && cy < hoveredTile.y + activeH;

            return (
              <polygon
                key={`tile-${cx}-${cy}`}
                points={`${ptStr(t0)} ${ptStr(t1)} ${ptStr(t2)} ${ptStr(t3)}`}
                fill={
                  inFootprint 
                    ? (isHoverValid ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.4)')
                    : 'none'
                }
                stroke={
                  inFootprint
                    ? (isHoverValid ? '#10B981' : '#EF4444')
                    : '#E2E8F0'
                }
                strokeWidth={inFootprint ? 1.6 : 0.6}
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

  // Render Venlo Glasshouse Bay
  const renderGreenhouse = (s: TileStructure) => {
    const isSelected = selectedId === s.id;
    const isHovered = hoveredId === s.id;
    const isBeingMoved = movingStructureId === s.id;

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
        opacity={isBeingMoved ? 0.35 : 1}
        onClick={() => {
          setSelectedId(s.id);
          playSfx('select');
          onSelectStructure?.(s);
        }}
        onMouseEnter={() => setHoveredId(s.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{ cursor: 'pointer' }}
      >
        {/* Footprint highlight */}
        <polygon
          points={`${ptStr(p0)} ${ptStr(p1)} ${ptStr(p2)} ${ptStr(p3)}`}
          fill={isSelected ? 'rgba(16, 185, 129, 0.25)' : isHovered ? 'rgba(56, 189, 248, 0.15)' : 'rgba(241, 245, 249, 0.8)'}
          stroke={isSelected ? '#10B981' : isHovered ? '#38BDF8' : '#CBD5E1'}
          strokeWidth={isSelected ? 2 : 1}
        />

        {/* Crops */}
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

        {/* Glass walls */}
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

        {/* Peaked roofs */}
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

        {/* Mounted MultiGrow Controller on external wall */}
        {layers.controllers && (
          <g transform={`translate(${p2[0] - 12}, ${p2[1] - 28})`}>
            <rect x="0" y="0" width="24" height="18" rx="3" fill="#0F172A" stroke="#10B981" strokeWidth="1" />
            <circle cx="5" cy="5" r="1.5" fill="#10B981" />
            <rect x="9" y="3" width="11" height="5" rx="1" fill="#1E293B" />
            <line x1="18" y1="0" x2="18" y2="-5" stroke="#38BDF8" strokeWidth="1" />
            <circle cx="18" cy="-5" r="1.2" fill="#38BDF8" />
          </g>
        )}

        {/* Floating Telemetry Tag */}
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

  // Render NFT Gutter Beds
  const renderGutterBeds = (s: TileStructure) => {
    const isSelected = selectedId === s.id;
    const isHovered = hoveredId === s.id;
    const isBeingMoved = movingStructureId === s.id;

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
        opacity={isBeingMoved ? 0.35 : 1}
        onClick={() => {
          setSelectedId(s.id);
          playSfx('select');
          onSelectStructure?.(s);
        }}
        onMouseEnter={() => setHoveredId(s.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{ cursor: 'pointer' }}
      >
        <polygon
          points={`${ptStr(p0)} ${ptStr(p1)} ${ptStr(p2)} ${ptStr(p3)}`}
          fill={isSelected ? 'rgba(16, 185, 129, 0.25)' : isHovered ? 'rgba(56, 189, 248, 0.15)' : 'rgba(241, 245, 249, 0.8)'}
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

        {/* Mounted Autogrow EC Mini Controller on Post */}
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

  // Render Fertigation Silos Skid
  const renderSilos = (s: TileStructure) => {
    const isSelected = selectedId === s.id;
    const isHovered = hoveredId === s.id;
    const isBeingMoved = movingStructureId === s.id;

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
        opacity={isBeingMoved ? 0.35 : 1}
        onClick={() => {
          setSelectedId(s.id);
          playSfx('select');
          onSelectStructure?.(s);
        }}
        onMouseEnter={() => setHoveredId(s.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{ cursor: 'pointer' }}
      >
        <polygon
          points={`${ptStr(p0)} ${ptStr(p1)} ${ptStr(p2)} ${ptStr(p3)}`}
          fill={isSelected ? 'rgba(16, 185, 129, 0.25)' : isHovered ? 'rgba(56, 189, 248, 0.15)' : 'rgba(241, 245, 249, 0.8)'}
          stroke={isSelected ? '#10B981' : isHovered ? '#38BDF8' : '#CBD5E1'}
          strokeWidth={isSelected ? 2 : 1}
        />

        {/* Tank A */}
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

        {/* Tank B */}
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

        {/* Manifold Pipe */}
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

  // Render Headhouse Facility
  const renderHeadhouse = (s: TileStructure) => {
    const isSelected = selectedId === s.id;
    const isHovered = hoveredId === s.id;
    const isBeingMoved = movingStructureId === s.id;

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
        opacity={isBeingMoved ? 0.35 : 1}
        onClick={() => {
          setSelectedId(s.id);
          playSfx('select');
          onSelectStructure?.(s);
        }}
        onMouseEnter={() => setHoveredId(s.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{ cursor: 'pointer' }}
      >
        <polygon
          points={`${ptStr(p0)} ${ptStr(p1)} ${ptStr(p2)} ${ptStr(p3)}`}
          fill={isSelected ? 'rgba(16, 185, 129, 0.25)' : isHovered ? 'rgba(56, 189, 248, 0.15)' : 'rgba(241, 245, 249, 0.8)'}
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

  // Render Standalone EC Mini Controller Station
  const renderControllerStation = (s: TileStructure) => {
    const isSelected = selectedId === s.id;
    const isHovered = hoveredId === s.id;
    const isBeingMoved = movingStructureId === s.id;

    const baseZ = 2;
    const center = tileToScreen(s.tileX + 0.5, s.tileY + 0.5, baseZ);

    return (
      <g
        key={s.id}
        opacity={isBeingMoved ? 0.35 : 1}
        onClick={() => {
          setSelectedId(s.id);
          playSfx('select');
          onSelectStructure?.(s);
        }}
        onMouseEnter={() => setHoveredId(s.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{ cursor: 'pointer' }}
      >
        <circle 
          cx={center[0]} 
          cy={center[1]} 
          r="14" 
          fill={isSelected ? 'rgba(16, 185, 129, 0.3)' : (isHovered ? 'rgba(241, 245, 249, 1)' : 'rgba(241, 245, 249, 0.8)')} 
          stroke="#10B981" 
          strokeWidth={isSelected ? 2.5 : (isHovered ? 2 : 1.5)} 
        />
        {/* Pedestal */}
        <line x1={center[0]} y1={center[1]} x2={center[0]} y2={center[1] - 22} stroke="#475569" strokeWidth="2.5" />
        {/* EC Mini Box */}
        <g transform={`translate(${center[0] - 10}, ${center[1] - 38})`}>
          <rect x="0" y="0" width="20" height="16" rx="3" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))" />
          <rect x="3" y="3" width="14" height="6" rx="1" fill="#0F2B1D" />
          <text x="10" y="8" fill="#10B981" fontSize="5" fontFamily="monospace" textAnchor="middle">1.8EC</text>
          <circle cx="16" cy="12" r="1" fill="#F59E0B" />
        </g>
      </g>
    );
  };

  // Render WarehouseOS Miniature Delivery Truck
  const renderDeliveryTruck = (key: string, tx: number, ty: number) => {
    const pA = tileToScreen(tx, ty, 0);
    const pD = tileToScreen(tx, ty + 0.9, 0);

    const trailerH = 18;
    const cabH = 14;

    const trailerA = tileToScreen(tx, ty, trailerH);
    const trailerB = tileToScreen(tx + 1.1, ty, trailerH);
    const trailerC = tileToScreen(tx + 1.1, ty + 0.9, trailerH);
    const trailerD = tileToScreen(tx, ty + 0.9, trailerH);

    const cabA = tileToScreen(tx + 1.1, ty + 0.1, cabH);
    const cabB = tileToScreen(tx + 1.7, ty + 0.1, cabH);
    const cabC = tileToScreen(tx + 1.7, ty + 0.8, cabH);
    const cabD = tileToScreen(tx + 1.1, ty + 0.8, cabH);

    return (
      <g key={key} id={`truck-${key}`} style={{ pointerEvents: 'none' }}>
        {/* Soft Shadow */}
        <polygon
          points={`${ptStr(tileToScreen(tx - 0.1, ty - 0.1, 0))} ${ptStr(tileToScreen(tx + 1.8, ty - 0.1, 0))} ${ptStr(tileToScreen(tx + 1.8, ty + 1.0, 0))} ${ptStr(tileToScreen(tx - 0.1, ty + 1.0, 0))}`}
          fill="rgba(15, 23, 42, 0.2)"
        />
        {/* Blue Cargo Container Box */}
        <polygon
          points={`${ptStr(tileToScreen(tx, ty + 0.9, 0))} ${ptStr(tileToScreen(tx + 1.1, ty + 0.9, 0))} ${ptStr(trailerC)} ${ptStr(trailerD)}`}
          fill="#2563EB"
          stroke="#1D4ED8"
          strokeWidth="0.5"
        />
        <polygon
          points={`${ptStr(trailerA)} ${ptStr(trailerB)} ${ptStr(trailerC)} ${ptStr(trailerD)}`}
          fill="#3B82F6"
          stroke="#2563EB"
          strokeWidth="0.5"
        />
        <polygon
          points={`${ptStr(pA)} ${ptStr(pD)} ${ptStr(trailerD)} ${ptStr(trailerA)}`}
          fill="#1E40AF"
          stroke="#1E3A8A"
          strokeWidth="0.5"
        />

        {/* White Tractor Cab */}
        <polygon
          points={`${ptStr(tileToScreen(tx + 1.1, ty + 0.8, 0))} ${ptStr(tileToScreen(tx + 1.7, ty + 0.8, 0))} ${ptStr(cabC)} ${ptStr(cabD)}`}
          fill="#E2E8F0"
          stroke="#94A3B8"
          strokeWidth="0.5"
        />
        <polygon
          points={`${ptStr(cabA)} ${ptStr(cabB)} ${ptStr(cabC)} ${ptStr(cabD)}`}
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="0.5"
        />
        {/* Windshield */}
        <polygon
          points={`${ptStr(tileToScreen(tx + 1.65, ty + 0.2, cabH - 2))} ${ptStr(tileToScreen(tx + 1.65, ty + 0.7, cabH - 2))} ${ptStr(tileToScreen(tx + 1.5, ty + 0.7, cabH + 1))} ${ptStr(tileToScreen(tx + 1.5, ty + 0.2, cabH + 1))}`}
          fill="#0284C7"
        />
        {/* Headlights */}
        <circle cx={tileToScreen(tx + 1.7, ty + 0.25, 3)[0]} cy={tileToScreen(tx + 1.7, ty + 0.25, 3)[1]} r="1.5" fill="#FEF08A" />
        <circle cx={tileToScreen(tx + 1.7, ty + 0.65, 3)[0]} cy={tileToScreen(tx + 1.7, ty + 0.65, 3)[1]} r="1.5" fill="#FEF08A" />
      </g>
    );
  };

  // Render Miniature Cypress/Conifer Perimeter Trees
  const renderTree = (key: string, tx: number, ty: number) => {
    const base = tileToScreen(tx + 0.5, ty + 0.5, 0);
    const mid = tileToScreen(tx + 0.5, ty + 0.5, 14);
    const tip = tileToScreen(tx + 0.5, ty + 0.5, 26);

    return (
      <g key={key} id={`tree-${key}`} style={{ pointerEvents: 'none' }}>
        <ellipse cx={base[0]} cy={base[1]} rx="7" ry="4" fill="rgba(15, 23, 42, 0.15)" />
        <line x1={base[0]} y1={base[1]} x2={mid[0]} y2={mid[1]} stroke="#78350F" strokeWidth="2.5" />
        <polygon
          points={`${base[0] - 8},${base[1] - 4} ${base[0] + 8},${base[1] - 4} ${mid[0]},${mid[1] - 8}`}
          fill="#15803D"
          stroke="#166534"
          strokeWidth="0.5"
        />
        <polygon
          points={`${mid[0] - 6},${mid[1] - 2} ${mid[0] + 6},${mid[1] - 2} ${tip[0]},${tip[1]}`}
          fill="#22C55E"
          stroke="#15803D"
          strokeWidth="0.5"
        />
      </g>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '640px', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
      
      {/* 1. Top Map Toolbar with FarmVille Mode Switcher & Market Shop Button */}
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
        {/* Mode Toggle: View Digital Twin vs FarmVille Builder */}
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
            onClick={() => {
              setActiveTab('view');
              setActivePlacingItem(null);
              setMovingStructureId(null);
              setIsShopOpen(false);
              playSfx('select');
            }}
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
            Digital Twin View
          </button>
          <button
            onClick={() => {
              setActiveTab('build');
              playSfx('select');
            }}
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
            FarmVille 1x1 Builder
          </button>
        </div>

        {/* Action Buttons: Sound, Shop, Save Layout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
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
              {toastMessage}
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
            style={{
              padding: '8px',
              backgroundColor: '#FFFFFF',
              color: '#64748B',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
            }}
          >
            {soundEnabled ? <Volume2 size={15} color="#10B981" /> : <VolumeX size={15} color="#94A3B8" />}
          </button>

          {/* FarmVille Market Shop Button */}
          {activeTab === 'build' && (
            <button
              onClick={() => {
                setIsShopOpen(!isShopOpen);
                playSfx('select');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: isShopOpen ? '#0F172A' : '#10B981',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
              }}
            >
              <ShoppingBag size={14} />
              <span>{isShopOpen ? 'Close Market' : 'Farm Market Shop'}</span>
            </button>
          )}

          <button
            onClick={() => {
              playSfx('place');
              setToastMessage('Farm Floorplan Saved & Dispatched to Edge Hardware!');
              setSaveToast(true);
              setTimeout(() => setSaveToast(false), 2200);
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

      {/* 2. FarmVille Placement Status Bar (When an item is ready to drop on tiles) */}
      {activeTab === 'build' && (activePlacingItem || movingStructureId) && (
        <div style={{
          position: 'absolute',
          top: '64px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 25,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 18px',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          borderRadius: '30px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          border: '1px solid #10B981'
        }}>
          <span style={{ fontSize: '13px' }}>
            {movingStructureId ? '✋ Moving:' : activePlacingItem?.icon}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 800 }}>
            {movingStructureId 
              ? structures.find(s => s.id === movingStructureId)?.name 
              : activePlacingItem?.name}
          </span>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>
            Footprint: {placingDimensions.w} × {placingDimensions.h} Tiles
          </span>
          
          <button
            onClick={() => {
              setPlacingDimensions(prev => ({ w: prev.h, h: prev.w }));
              playSfx('rotate');
            }}
            title="Press 'R' key to rotate"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              backgroundColor: '#1E293B',
              color: '#FFFFFF',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <RotateCw size={12} color="#10B981" />
            Rotate (R)
          </button>

          <button
            onClick={() => {
              setActivePlacingItem(null);
              setMovingStructureId(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: 'transparent',
              color: '#94A3B8',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            <X size={14} />
            Cancel
          </button>
        </div>
      )}

      {/* 3. FarmVille Market Shop Drawer (Slide-up modal with categorized farm buildings & silos) */}
      {isShopOpen && activeTab === 'build' && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '860px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #CBD5E1',
          padding: '20px',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)',
          zIndex: 35
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={18} color="#10B981" />
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                FarmVille Market · Commercial Farm Builder Catalog
              </span>
            </div>
            <button
              onClick={() => setIsShopOpen(false)}
              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
            {[
              { id: 'greenhouses', label: '🏡 Greenhouses', count: 3 },
              { id: 'silos', label: '🛢️ Silos & Storage', count: 2 },
              { id: 'hydro', label: '🌱 Hydro & Gutters', count: 1 },
              { id: 'controllers', label: '📟 Autogrow Controllers', count: 1 },
              { id: 'infra', label: '🛣️ Roads & Pavers', count: 1 }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveShopCategory(cat.id as any);
                  playSfx('select');
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeShopCategory === cat.id ? '#0F172A' : '#F1F5F9',
                  color: activeShopCategory === cat.id ? '#FFFFFF' : '#475569',
                  fontSize: '12px',
                  fontWeight: activeShopCategory === cat.id ? 800 : 600,
                  cursor: 'pointer'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', maxHeight: '240px', overflowY: 'auto' }}>
            {catalog.filter(item => item.category === activeShopCategory).map(item => (
              <div
                key={item.name}
                onClick={() => handleSelectShopItem(item)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  fontSize: '24px',
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>{item.name}</span>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      {item.wTiles}x{item.hTiles}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0', fontSize: '11px', color: '#64748B', lineHeight: '1.3' }}>
                    {item.desc}
                  </p>
                  <div style={{ fontSize: '10px', color: '#0284C7', fontWeight: 700 }}>
                    {item.capacity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Floating Left Zones Card (WarehouseOS Layout) */}
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
                  playSfx('select');
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

      {/* 5. Floating Right Layers Card & Zoom Controls */}
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
            onClick={() => {
              setZoomLevel(Math.min(1.4, zoomLevel + 0.1));
              playSfx('select');
            }}
            style={{ padding: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', cursor: 'pointer' }}
          >
            <ZoomIn size={14} color="#64748B" />
          </button>
          <button
            onClick={() => {
              setZoomLevel(Math.max(0.7, zoomLevel - 0.1));
              playSfx('select');
            }}
            style={{ padding: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', cursor: 'pointer' }}
          >
            <ZoomOut size={14} color="#64748B" />
          </button>
          <button
            onClick={() => {
              setZoomLevel(1);
              playSfx('select');
            }}
            style={{ padding: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', cursor: 'pointer' }}
          >
            <RotateCcw size={14} color="#64748B" />
          </button>
        </div>
      </div>

      {/* 6. FarmVille Action Toolbar for Selected Structure (Move, Rotate, Remove, Inspect) */}
      {selectedStructure && !isShopOpen && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #CBD5E1',
          padding: '12px 20px',
          boxShadow: '0 12px 30px -5px rgba(0,0,0,0.12)',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          {/* Structure Name & Hardware Badge */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={14} color="#10B981" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                {selectedStructure.name}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'monospace',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981'
              }}>
                {selectedStructure.controller.model}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11px', color: '#64748B' }}>
              <span>Serial: {selectedStructure.controller.serial}</span>
              <span>Wi-Fi: {selectedStructure.controller.rssi} dBm</span>
              <span>EC: <strong style={{ color: '#10B981' }}>{selectedStructure.metrics.ec.toFixed(2)}</strong></span>
            </div>
          </div>

          <div style={{ height: '32px', width: '1px', backgroundColor: '#E2E8F0' }} />

          {/* FarmVille Object Manipulation Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeTab === 'build' && (
              <>
                <button
                  onClick={() => handleStartMove(selectedStructure.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0F172A',
                    cursor: 'pointer'
                  }}
                >
                  <Move size={13} color="#2563EB" />
                  <span>Move</span>
                </button>

                <button
                  onClick={handleRotateSelected}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0F172A',
                    cursor: 'pointer'
                  }}
                >
                  <RotateCw size={13} color="#10B981" />
                  <span>Rotate</span>
                </button>

                <button
                  onClick={handleDeleteSelected}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    backgroundColor: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#B91C1C',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
              </>
            )}

            {/* Hardware Diagnostic Inspect Modal Trigger */}
            <button
              onClick={() => {
                setIsHardwareModalOpen(true);
                playSfx('select');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: '#0F172A',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#FFFFFF',
                cursor: 'pointer'
              }}
            >
              <Sliders size={13} color="#10B981" />
              <span>Inspect Controller</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. Central SVG 3D Isometric Canvas */}
      <svg
        ref={svgRef}
        viewBox="0 0 1080 620"
        onMouseMove={handleSvgMouseMove}
        onClick={() => {
          if (hoveredTile && (activePlacingItem || movingStructureId)) {
            handleTileClick(hoveredTile.x, hoveredTile.y);
          }
        }}
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

        {/* Concrete Roadway */}
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
          {/* Dashed Center Road Divider */}
          {Array.from({ length: GRID_COLS }).map((_, rx) => {
            const pMidA = tileToScreen(rx + 0.2, 4.5, 0.6);
            const pMidB = tileToScreen(rx + 0.8, 4.5, 0.6);
            return (
              <line
                key={`road-stripe-${rx}`}
                x1={pMidA[0]}
                y1={pMidA[1]}
                x2={pMidB[0]}
                y2={pMidB[1]}
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeDasharray="4,3"
              />
            );
          })}
        </g>

        {/* Docked Delivery Trucks at Packhouse (WarehouseOS Style) */}
        {renderDeliveryTruck('truck-1', 4.3, 6.2)}
        {renderDeliveryTruck('truck-2', 4.3, 7.6)}

        {/* Ornamental Perimeter Trees (WarehouseOS Style) */}
        {renderTree('tree-1', 0.1, 0.1)}
        {renderTree('tree-2', 11.2, 0.1)}
        {renderTree('tree-3', 11.2, 9.1)}
        {renderTree('tree-4', 0.1, 4.8)}

        {/* Render all Farm Structures */}
        {structures.map(struct => {
          if (struct.type === 'greenhouse' || struct.type === 'polyhouse') return renderGreenhouse(struct);
          if (struct.type === 'beds') return renderGutterBeds(struct);
          if (struct.type === 'silos' || struct.type === 'water_tank') return renderSilos(struct);
          if (struct.type === 'headhouse') return renderHeadhouse(struct);
          if (struct.type === 'controller_station') return renderControllerStation(struct);
          return null;
        })}
      </svg>

      {/* 8. Interactive Hover Tooltip over Farm Buildings & Controller Nodes */}
      {hoveredStructure && !activePlacingItem && !movingStructureId && (() => {
        const [hx, hy] = tileToScreen(
          hoveredStructure.tileX + hoveredStructure.wTiles / 2, 
          hoveredStructure.tileY, 
          50
        );
        const isNearTop = hy < 170;
        const clampedX = Math.min(Math.max(150, hx), 920);

        return (
          <div
            style={{
              position: 'absolute',
              left: `${clampedX}px`,
              top: isNearTop ? `${hy + 24}px` : `${hy - 12}px`,
              transform: isNearTop ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.4)',
              border: '1px solid #10B981',
              zIndex: 45,
              pointerEvents: 'none',
              width: '240px',
              transition: 'left 0.1s ease-out, top 0.1s ease-out'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>{hoveredStructure.name}</div>
                <div style={{ fontSize: '10px', color: '#94A3B8' }}>{hoveredStructure.zone} · {hoveredStructure.crop}</div>
              </div>
              <span style={{ fontSize: '9px', fontWeight: 800, fontFamily: 'monospace', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                {hoveredStructure.controller.status}
              </span>
            </div>

            {/* Hardware & WiFi */}
            <div style={{ fontSize: '11px', color: '#CBD5E1', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#34D399', marginBottom: '2px' }}>
                <Cpu size={12} />
                <span>{hoveredStructure.controller.model}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#94A3B8' }}>
                <span>📶 {hoveredStructure.controller.wifiSSID}</span>
                <span style={{ color: '#34D399', fontFamily: 'monospace' }}>{hoveredStructure.controller.rssi} dBm (95%)</span>
              </div>
            </div>

            {/* Live Sensor Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', backgroundColor: '#1E293B', padding: '6px', borderRadius: '6px', marginBottom: '8px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#94A3B8' }}>LIVE EC</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#34D399', fontFamily: 'monospace' }}>{hoveredStructure.metrics.ec.toFixed(2)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#94A3B8' }}>LIVE pH</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#60A5FA', fontFamily: 'monospace' }}>{hoveredStructure.metrics.ph.toFixed(2)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#94A3B8' }}>VPD</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#FBBF24', fontFamily: 'monospace' }}>{hoveredStructure.metrics.vpd.toFixed(2)}k</div>
              </div>
            </div>

            {/* Dose Velocity */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#CBD5E1' }}>
              <span>Dose Velocity: <strong style={{ color: '#34D399' }}>{hoveredStructure.controller.doseCountHour} DC/h</strong></span>
              <span>Total: <strong style={{ color: '#93C5FD' }}>{hoveredStructure.controller.doseCountTotal} DCT</strong></span>
            </div>
          </div>
        );
      })()}

      {/* 9. Autogrow Hardware Diagnostic Modal (User Guide & Controller Specs) */}
      {isHardwareModalOpen && selectedStructure && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={18} color="#10B981" />
                <span style={{ fontSize: '15px', fontWeight: 800 }}>
                  {selectedStructure.controller.model} Hardware Panel
                </span>
              </div>
              <button
                onClick={() => setIsHardwareModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>SERIAL NUMBER</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', marginTop: '2px' }}>
                    {selectedStructure.controller.serial}
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>IP & FIRMWARE</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {selectedStructure.controller.ipAddress} · {selectedStructure.controller.firmware}
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>HOURLY DOSE COUNT (DC/h)</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981', fontFamily: 'monospace', marginTop: '2px' }}>
                    {selectedStructure.controller.doseCountHour} doses/hr
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>TOTAL DOSE COUNT (DCT)</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563EB', fontFamily: 'monospace', marginTop: '2px' }}>
                    {selectedStructure.controller.doseCountTotal} lifetime
                  </div>
                </div>
              </div>

              {/* Dosing Test Action */}
              <div style={{ padding: '14px', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#065F46', marginBottom: '4px' }}>
                  Autogrow Direct-Drive Peristaltic Dosing (24VDC)
                </div>
                <div style={{ fontSize: '11px', color: '#047857' }}>
                  Forces Nutrient Pump A and B pulse shot into mixing sample pot with instant flow verification.
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    onClick={() => {
                      playSfx('place');
                      onTriggerDose?.('pump-nutrient-a', 5);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Pulse Pump A (5s)
                  </button>
                  <button
                    onClick={() => {
                      playSfx('place');
                      onTriggerDose?.('pump-nutrient-b', 5);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Pulse Pump B (5s)
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setIsHardwareModalOpen(false)}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0F172A',
                    cursor: 'pointer'
                  }}
                >
                  Close Hardware Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
