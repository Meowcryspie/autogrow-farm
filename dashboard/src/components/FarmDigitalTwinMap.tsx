import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCcw,
  Save,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  Hammer,
  Trash2,
  Cpu,
  Move,
  RotateCw,
  X,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  ArrowLeft,
  Plus,
  AlertTriangle,
  ArrowLeftRight
} from 'lucide-react';

export interface AttachedSensor {
  id: string;
  name: string;
  type: 'ec' | 'ph' | 'vpd' | 'vwc' | 'temp' | 'co2' | 'par';
  value: number;
  unit: string;
  pin: string;
  status: 'NORMAL' | 'ALERT' | 'CALIBRATING';
}

export interface AttachedController {
  id?: string;
  model: 'Autogrow EC Mini' | 'MultiGrow MGC-Pro 16-Ch' | 'IntelliDose Hub' | 'IntelliClimate Pro';
  serial: string;
  firmware: string;
  wifiSSID: string;
  rssi: number;
  ipAddress: string;
  status: 'ONLINE' | 'DOSING' | 'ATTENTION';
  doseCountHour: number;
  doseCountTotal: number;
  sensors?: AttachedSensor[];
}

export interface TileStructure {
  id: string;
  name: string;
  type: 'greenhouse' | 'beds' | 'silos' | 'headhouse' | 'controller_station' | 'pathway' | 'water_tank' | 'polyhouse';
  tileX: number;
  tileY: number;
  wTiles: number;
  hTiles: number;
  rotation: 0 | 90 | 180 | 270;
  zone: string;
  crop: string;
  controllers?: AttachedController[];
  controller: AttachedController;
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

export function ensureControllers(struct: TileStructure): AttachedController[] {
  if (struct.controllers && struct.controllers.length > 0) {
    return struct.controllers;
  }
  const baseSensors: AttachedSensor[] = [
    { id: `${struct.id}-s-ec`, name: 'EC Substrate Probe', type: 'ec', value: struct.metrics.ec, unit: 'mS/cm', pin: 'AN-01', status: 'NORMAL' },
    { id: `${struct.id}-s-ph`, name: 'Glass pH Electrode', type: 'ph', value: struct.metrics.ph, unit: 'pH', pin: 'AN-02', status: 'NORMAL' },
    { id: `${struct.id}-s-vpd`, name: 'Air Temp & VPD Sensor', type: 'vpd', value: struct.metrics.vpd, unit: 'kPa', pin: 'I2C-1', status: 'NORMAL' },
    { id: `${struct.id}-s-vwc`, name: 'Substrate VWC% Moisture', type: 'vwc', value: struct.metrics.vwc, unit: '%', pin: 'AN-03', status: 'NORMAL' }
  ];
  return [{
    id: struct.controller.serial || `ctrl-${struct.id}-1`,
    model: struct.controller.model as any,
    serial: struct.controller.serial,
    firmware: struct.controller.firmware,
    wifiSSID: struct.controller.wifiSSID,
    rssi: struct.controller.rssi,
    ipAddress: struct.controller.ipAddress,
    status: struct.controller.status,
    doseCountHour: struct.controller.doseCountHour,
    doseCountTotal: struct.controller.doseCountTotal,
    sensors: baseSensors
  }];
}

export interface FarmLocationData {
  id: string;
  name: string;
  location: string;
  tag: string;
  gridCols: number;
  gridRows: number;
  structures: TileStructure[];
  stats: {
    totalAreaSqM: number;
    activeControllers: number;
    crop: string;
    avgEc: string;
    status: 'ALL ONLINE' | '1 ATTENTION';
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
  defaultController: AttachedController['model'];
  capacity: string;
}

export interface FarmDigitalTwinMapProps {
  activeFarmIndex?: number;
  onFarmChange?: (index: number) => void;
  onSelectStructure?: (struct: TileStructure) => void;
  selectedStructureId?: string;
  onTriggerDose?: (actuatorId: string, durationSec: number) => Promise<boolean>;
}

// 1x1 Isometric Projection Math
const TILE_W = 64;
const TILE_H = 32;

export function tileToScreen(tx: number, ty: number, z: number = 0, cols: number = 12, rows: number = 10): [number, number] {
  const originX = 540;
  const originY = 115 - ((cols + rows) - 22) * 5;
  const x = originX + (tx - ty) * (TILE_W / 2);
  const y = originY + (tx + ty) * (TILE_H / 2) - z;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

export function ptStr(p: [number, number]): string {
  return `${p[0]},${p[1]}`;
}

// ==============================================================================
// 3 REALISTIC COMMERCIAL FARM ESTATES PRESETS
// ==============================================================================
export const FARMS_DATA: FarmLocationData[] = [
  {
    id: 'farm-cameron-01',
    name: 'Highlands Commercial Glasshouses',
    location: 'Cameron Highlands, Pahang',
    tag: 'Zone 01 · High-Wire Commercial',
    gridCols: 12,
    gridRows: 10,
    stats: {
      totalAreaSqM: 4800,
      activeControllers: 14,
      crop: 'Vine Tomatoes & Snack Peppers',
      avgEc: '2.35 mS/cm',
      status: 'ALL ONLINE'
    },
    structures: [
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
        metrics: { ec: 2.35, targetEc: 2.40, ph: 5.82, targetPh: 5.80, vpd: 1.15, vwc: 64.5, waterTemp: 20.8 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
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
        metrics: { ec: 2.40, targetEc: 2.40, ph: 5.85, targetPh: 5.80, vpd: 1.18, vwc: 62.0, waterTemp: 21.0 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
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
        crop: 'Crisphead Butter Lettuce',
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
        metrics: { ec: 1.65, targetEc: 1.60, ph: 5.88, targetPh: 5.85, vpd: 0.95, vwc: 78.0, waterTemp: 19.5 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
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
        metrics: { ec: 1.52, targetEc: 1.65, ph: 6.12, targetPh: 5.85, vpd: 1.05, vwc: 74.0, waterTemp: 20.2 },
        pumps: { pumpA: 'DOSING', pumpB: 'IDLE', acid: 'DOSING' }
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
        metrics: { ec: 2.80, targetEc: 2.80, ph: 5.75, targetPh: 5.75, vpd: 1.00, vwc: 85.0, waterTemp: 19.8 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
      },
      {
        id: 'packhouse-facility',
        name: 'Central Packing & Cold Headhouse Facility',
        type: 'headhouse',
        tileX: 5,
        tileY: 7,
        wTiles: 4,
        hTiles: 3,
        rotation: 0,
        zone: 'Zone Logistics',
        crop: 'Graded Packout & QC',
        controller: {
          model: 'MultiGrow MGC-Pro 16-Ch',
          serial: 'AG-8840-NZ',
          firmware: 'v2.4.1-LTS',
          wifiSSID: 'Greenhouse_5G_Commercial',
          rssi: -42,
          ipAddress: '192.168.10.10',
          status: 'ONLINE',
          doseCountHour: 0,
          doseCountTotal: 0
        },
        metrics: { ec: 0.00, targetEc: 0.00, ph: 7.00, targetPh: 7.00, vpd: 0.85, vwc: 0.0, waterTemp: 16.5 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
      },
      {
        id: 'ec-mini-station-standalone',
        name: 'Direct-Drive EC Mini Station #01',
        type: 'controller_station',
        tileX: 5,
        tileY: 4,
        wTiles: 1,
        hTiles: 1,
        rotation: 0,
        zone: 'Zone 01 · Gutter Header',
        crop: 'Nutrient Delivery Header',
        controller: {
          model: 'Autogrow EC Mini',
          serial: 'EM-4405-MY',
          firmware: 'v5.0-Rev3',
          wifiSSID: 'Greenhouse_5G_Commercial',
          rssi: -58,
          ipAddress: '192.168.10.55',
          status: 'ONLINE',
          doseCountHour: 28,
          doseCountTotal: 840
        },
        metrics: { ec: 2.10, targetEc: 2.20, ph: 5.80, targetPh: 5.80, vpd: 1.05, vwc: 68.0, waterTemp: 20.0 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
      }
    ]
  },
  {
    id: 'farm-genting-02',
    name: 'Pahang Berry Bay Hydro NFT Estate',
    location: 'Genting Valley, Pahang',
    tag: 'Zone 02 · Large-Scale Estate',
    gridCols: 16,
    gridRows: 12,
    stats: {
      totalAreaSqM: 8200,
      activeControllers: 10,
      crop: 'Alpine Strawberries & Japanese Melons',
      avgEc: '2.15 mS/cm',
      status: 'ALL ONLINE'
    },
    structures: [
      {
        id: 'poly-1',
        name: 'High-Tunnel Strawberry Polyhouse Bay A',
        type: 'polyhouse',
        tileX: 1,
        tileY: 1,
        wTiles: 5,
        hTiles: 3,
        rotation: 0,
        zone: 'Zone A · Berry Polyhouse',
        crop: 'Albion Everbearing Strawberries',
        controller: {
          model: 'MultiGrow MGC-Pro 16-Ch',
          serial: 'AG-9101-NZ',
          firmware: 'v2.4.1-LTS',
          wifiSSID: 'BerryBay_Mesh_5G',
          rssi: -48,
          ipAddress: '192.168.20.11',
          status: 'ONLINE',
          doseCountHour: 42,
          doseCountTotal: 2180
        },
        metrics: { ec: 1.95, targetEc: 2.00, ph: 5.75, targetPh: 5.75, vpd: 1.05, vwc: 68.0, waterTemp: 19.2 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
      },
      {
        id: 'poly-2',
        name: 'High-Tunnel Strawberry Polyhouse Bay B',
        type: 'polyhouse',
        tileX: 7,
        tileY: 1,
        wTiles: 5,
        hTiles: 3,
        rotation: 0,
        zone: 'Zone B · Berry Polyhouse',
        crop: 'Albion Everbearing Strawberries',
        controller: {
          model: 'MultiGrow MGC-Pro 16-Ch',
          serial: 'AG-9102-NZ',
          firmware: 'v2.4.1-LTS',
          wifiSSID: 'BerryBay_Mesh_5G',
          rssi: -51,
          ipAddress: '192.168.20.12',
          status: 'ONLINE',
          doseCountHour: 36,
          doseCountTotal: 1840
        },
        metrics: { ec: 1.98, targetEc: 2.00, ph: 5.78, targetPh: 5.75, vpd: 1.10, vwc: 66.5, waterTemp: 19.4 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
      },
      {
        id: 'poly-3',
        name: 'Japanese Rockmelon High-Tunnel Bay C',
        type: 'greenhouse',
        tileX: 1,
        tileY: 5,
        wTiles: 5,
        hTiles: 3,
        rotation: 0,
        zone: 'Zone C · Melon Dutch Buckets',
        crop: 'Shizuoka Crown Melon',
        controller: {
          model: 'MultiGrow MGC-Pro 16-Ch',
          serial: 'AG-9103-NZ',
          firmware: 'v2.4.1-LTS',
          wifiSSID: 'BerryBay_Mesh_5G',
          rssi: -54,
          ipAddress: '192.168.20.13',
          status: 'ONLINE',
          doseCountHour: 30,
          doseCountTotal: 1560
        },
        metrics: { ec: 2.45, targetEc: 2.50, ph: 5.85, targetPh: 5.80, vpd: 1.25, vwc: 60.0, waterTemp: 21.2 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
      },
      {
        id: 'nft-berry-gutter',
        name: 'Precision NFT Gutter Nursery',
        type: 'beds',
        tileX: 7,
        tileY: 5,
        wTiles: 5,
        hTiles: 2,
        rotation: 0,
        zone: 'Zone D · Gutter Runners',
        crop: 'Strawberry Runner Propagation',
        controller: {
          model: 'Autogrow EC Mini',
          serial: 'EM-5510-MY',
          firmware: 'v5.0-Rev3',
          wifiSSID: 'BerryBay_Mesh_5G',
          rssi: -60,
          ipAddress: '192.168.20.21',
          status: 'ONLINE',
          doseCountHour: 22,
          doseCountTotal: 790
        },
        metrics: { ec: 1.45, targetEc: 1.50, ph: 5.90, targetPh: 5.85, vpd: 0.90, vwc: 80.0, waterTemp: 18.8 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
      },
      {
        id: 'silo-berry-bulk',
        name: 'Twin Rainwater & Fertigation Silos',
        type: 'silos',
        tileX: 1,
        tileY: 9,
        wTiles: 4,
        hTiles: 2,
        rotation: 0,
        zone: 'Central Water Hub',
        crop: 'RO & Concentrated A/B',
        controller: {
          model: 'Autogrow EC Mini',
          serial: 'EM-5500-HQ',
          firmware: 'v5.0-Rev3',
          wifiSSID: 'BerryBay_Mesh_5G',
          rssi: -45,
          ipAddress: '192.168.20.10',
          status: 'ONLINE',
          doseCountHour: 48,
          doseCountTotal: 3120
        },
        metrics: { ec: 2.60, targetEc: 2.60, ph: 5.70, targetPh: 5.70, vpd: 0.95, vwc: 88.0, waterTemp: 18.5 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
      },
      {
        id: 'packhouse-berry',
        name: 'Berry Sorting, Packing & Coldstore Bay',
        type: 'headhouse',
        tileX: 7,
        tileY: 8,
        wTiles: 5,
        hTiles: 3,
        rotation: 0,
        zone: 'Logistics Bay',
        crop: 'Cold Chain Shipping',
        controller: {
          model: 'MultiGrow MGC-Pro 16-Ch',
          serial: 'AG-9100-NZ',
          firmware: 'v2.4.1-LTS',
          wifiSSID: 'BerryBay_Mesh_5G',
          rssi: -40,
          ipAddress: '192.168.20.05',
          status: 'ONLINE',
          doseCountHour: 0,
          doseCountTotal: 0
        },
        metrics: { ec: 0.0, targetEc: 0.0, ph: 7.0, targetPh: 7.0, vpd: 0.75, vwc: 0.0, waterTemp: 14.0 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
      }
    ]
  },
  {
    id: 'farm-kinabalu-03',
    name: 'Kundasang Alpine Nursery Complex',
    location: 'Mount Kinabalu Alpine Station, Sabah',
    tag: 'Zone 03 · High-Altitude Propagation',
    gridCols: 14,
    gridRows: 10,
    stats: {
      totalAreaSqM: 3600,
      activeControllers: 8,
      crop: 'Seedling Nursery & Microgreens',
      avgEc: '1.45 mS/cm',
      status: 'ALL ONLINE'
    },
    structures: [
      {
        id: 'nursery-chamber-1',
        name: 'Germination & Propagation Chamber A',
        type: 'greenhouse',
        tileX: 1,
        tileY: 1,
        wTiles: 4,
        hTiles: 3,
        rotation: 0,
        zone: 'Nursery Lab 01',
        crop: 'High-Density Seedling Plugs',
        controller: {
          model: 'IntelliDose Hub',
          serial: 'ID-9901-NZ',
          firmware: 'v3.1.0',
          wifiSSID: 'Kundasang_Alpine_WiFi',
          rssi: -44,
          ipAddress: '192.168.30.15',
          status: 'ONLINE',
          doseCountHour: 16,
          doseCountTotal: 720
        },
        metrics: { ec: 1.25, targetEc: 1.20, ph: 5.85, targetPh: 5.85, vpd: 0.85, vwc: 82.0, waterTemp: 17.5 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
      },
      {
        id: 'nursery-beds-flood',
        name: 'Ebb & Flow Flood Benches',
        type: 'beds',
        tileX: 6,
        tileY: 1,
        wTiles: 4,
        hTiles: 2,
        rotation: 0,
        zone: 'Flood Zone A',
        crop: 'Butterhead Lettuce Seedlings',
        controller: {
          model: 'Autogrow EC Mini',
          serial: 'EM-6601-MY',
          firmware: 'v5.0-Rev3',
          wifiSSID: 'Kundasang_Alpine_WiFi',
          rssi: -58,
          ipAddress: '192.168.30.22',
          status: 'ONLINE',
          doseCountHour: 20,
          doseCountTotal: 610
        },
        metrics: { ec: 1.50, targetEc: 1.50, ph: 5.80, targetPh: 5.80, vpd: 0.90, vwc: 75.0, waterTemp: 17.8 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
      },
      {
        id: 'microgreens-vertical',
        name: 'Microgreens High-Density Rack Bay',
        type: 'beds',
        tileX: 6,
        tileY: 4,
        wTiles: 4,
        hTiles: 2,
        rotation: 0,
        zone: 'Rack Zone B',
        crop: 'Red Amaranth & Pea Shoots',
        controller: {
          model: 'Autogrow EC Mini',
          serial: 'EM-6602-MY',
          firmware: 'v5.0-Rev3',
          wifiSSID: 'Kundasang_Alpine_WiFi',
          rssi: -52,
          ipAddress: '192.168.30.24',
          status: 'ONLINE',
          doseCountHour: 26,
          doseCountTotal: 840
        },
        metrics: { ec: 1.35, targetEc: 1.40, ph: 5.82, targetPh: 5.80, vpd: 0.92, vwc: 76.0, waterTemp: 18.0 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
      },
      {
        id: 'nursery-silo',
        name: 'Pure Stock Solution Mixing Silo',
        type: 'silos',
        tileX: 1,
        tileY: 5,
        wTiles: 3,
        hTiles: 2,
        rotation: 0,
        zone: 'Alpine Fertigation Skid',
        crop: 'Seedling Nutrient Formula',
        controller: {
          model: 'Autogrow EC Mini',
          serial: 'EM-6600-HQ',
          firmware: 'v5.0-Rev3',
          wifiSSID: 'Kundasang_Alpine_WiFi',
          rssi: -49,
          ipAddress: '192.168.30.10',
          status: 'ONLINE',
          doseCountHour: 32,
          doseCountTotal: 1290
        },
        metrics: { ec: 2.20, targetEc: 2.20, ph: 5.75, targetPh: 5.75, vpd: 0.95, vwc: 84.0, waterTemp: 16.8 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
      },
      {
        id: 'nursery-lab',
        name: 'Alpine Research Logistics Station',
        type: 'headhouse',
        tileX: 4,
        tileY: 7,
        wTiles: 5,
        hTiles: 2,
        rotation: 0,
        zone: 'Research Wing',
        crop: 'Tissue Culture & Germination',
        controller: {
          model: 'MultiGrow MGC-Pro 16-Ch',
          serial: 'AG-9500-NZ',
          firmware: 'v2.4.1-LTS',
          wifiSSID: 'Kundasang_Alpine_WiFi',
          rssi: -40,
          ipAddress: '192.168.30.01',
          status: 'ONLINE',
          doseCountHour: 0,
          doseCountTotal: 0
        },
        metrics: { ec: 0.0, targetEc: 0.0, ph: 7.0, targetPh: 7.0, vpd: 0.80, vwc: 0.0, waterTemp: 15.0 },
        pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
      }
    ]
  }
];

export const FarmDigitalTwinMap: React.FC<FarmDigitalTwinMapProps> = ({
  activeFarmIndex = 0,
  onFarmChange,
  onSelectStructure,
  selectedStructureId: externalSelectedId,
  onTriggerDose
}) => {
  // Active Farm selection state
  const [currentFarmIdx, setCurrentFarmIdx] = useState<number>(activeFarmIndex);

  useEffect(() => {
    setCurrentFarmIdx(activeFarmIndex);
  }, [activeFarmIndex]);

  const currentFarm = FARMS_DATA[currentFarmIdx] || FARMS_DATA[0];

  // Farm Land Dynamic Grid Sizing (Grower can expand/shrink just like FarmVille)
  const [gridCols, setGridCols] = useState<number>(currentFarm.gridCols);
  const [gridRows, setGridRows] = useState<number>(currentFarm.gridRows);

  // Sync grid dimensions and structures when farm changes
  useEffect(() => {
    setGridCols(currentFarm.gridCols);
    setGridRows(currentFarm.gridRows);
    setStructures(currentFarm.structures);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    if (currentFarm.structures.length > 0) {
      setSelectedId(currentFarm.structures[0].id);
    }
  }, [currentFarmIdx]);

  // SFX handler (Audio muted / disabled as requested)
  const playSfx = (_type: 'place' | 'rotate' | 'delete' | 'error' | 'select') => { };

  // Farm Navigation
  const handlePrevFarm = () => {
    const nextIdx = (currentFarmIdx - 1 + FARMS_DATA.length) % FARMS_DATA.length;
    setCurrentFarmIdx(nextIdx);
    onFarmChange?.(nextIdx);
    playSfx('select');
  };

  const handleNextFarm = () => {
    const nextIdx = (currentFarmIdx + 1) % FARMS_DATA.length;
    setCurrentFarmIdx(nextIdx);
    onFarmChange?.(nextIdx);
    playSfx('select');
  };

  // Farm Market Catalog
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
      defaultController: 'MultiGrow MGC-Pro 16-Ch',
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
  const [structures, setStructures] = useState<TileStructure[]>(currentFarm.structures);

  // Mode and Tools
  const [activeTab, setActiveTab] = useState<'view' | 'build'>('view');
  const [selectedId, setSelectedId] = useState<string | null>(externalSelectedId || (structures[0]?.id || 'greenhouse-1'));
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Builder Container Context: 'farm_layout' | 'add_structure' | 'building_info'
  const [builderContainerView, setBuilderContainerView] = useState<'farm_layout' | 'add_structure' | 'building_info'>('farm_layout');
  const [isAddingControllerOpen, setIsAddingControllerOpen] = useState(false);

  // FarmVille Builder Placement State
  const [activePlacingItem, setActivePlacingItem] = useState<CatalogItem | null>(null);
  const [placingDimensions, setPlacingDimensions] = useState<{ w: number; h: number }>({ w: 4, h: 3 });

  // Moving existing structure mode
  const [movingStructureId, setMovingStructureId] = useState<string | null>(null);

  // Mouse hover tile & Viewport Zoom/Pan (FarmVille camera navigation)
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const contentAreaRef = useRef<HTMLDivElement | null>(null);
  const panStateRef = useRef<{
    active: boolean;
    button: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    didDrag: boolean;
  }>({ active: false, button: -1, startX: 0, startY: 0, startPanX: 0, startPanY: 0, didDrag: false });
  const suppressClickRef = useRef<boolean>(false);

  const [saveToast, setSaveToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Layout Synced to Edge Controllers!');

  // Facilities sub-panel dock position: 'right' (default) or 'left' (toggleable)
  const [facilitiesPosition, setFacilitiesPosition] = useState<'right' | 'left'>('right');

  // Track unsaved changes in builder mode
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isExitPromptOpen, setIsExitPromptOpen] = useState<boolean>(false);

  // Save layout action
  const handleSaveLayout = () => {
    setToastMessage('Farm Floorplan Saved & Dispatched to Edge Hardware!');
    setSaveToast(true);
    setHasUnsavedChanges(false);
    playSfx('place');
    setTimeout(() => setSaveToast(false), 2200);
  };

  // Exit builder mode cleanly
  const exitBuilderMode = () => {
    setActiveTab('view');
    setActivePlacingItem(null);
    setMovingStructureId(null);
    setBuilderContainerView('farm_layout');
    setIsExitPromptOpen(false);
    setHasUnsavedChanges(false);
  };

  // Toggle builder mode with unsaved changes guard
  const handleToggleBuilderMode = () => {
    if (activeTab === 'build') {
      if (hasUnsavedChanges) {
        setIsExitPromptOpen(true);
      } else {
        exitBuilderMode();
      }
    } else {
      setActiveTab('build');
      setBuilderContainerView('farm_layout');
      setHasUnsavedChanges(false);
    }
  };

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
  const [isLayersOpen, setIsLayersOpen] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const selectedStructure = structures.find(s => s.id === selectedId) || structures[0];
  const hoveredStructure = structures.find(s => s.id === hoveredId);

  // Camera pan limits: tight wiggle when zoomed out, full exploration when zoomed in or on large grids
  const getPanLimits = (zoom: number, cols: number = gridCols, rows: number = gridRows) => {
    const rect = contentAreaRef.current?.getBoundingClientRect();
    const viewW = rect?.width || 900;
    const viewH = rect?.height || 660;

    // Gentle wiggle room when fully zoomed out
    const wiggleX = 48;
    const wiggleY = 36;

    // Extra travel if grid is larger than baseline 12x10
    const extraGridX = Math.max(0, (cols - 12) * 22) * zoom;
    const extraGridY = Math.max(0, (rows - 10) * 14) * zoom;

    // Proportional overflow travel when zoomed in (> 1.0)
    const zoomedSpanX = Math.max(0, (zoom - 1) * (viewW * 0.55));
    const zoomedSpanY = Math.max(0, (zoom - 1) * (viewH * 0.55));

    return {
      maxX: Math.round(wiggleX + zoomedSpanX + extraGridX),
      maxY: Math.round(wiggleY + zoomedSpanY + extraGridY)
    };
  };

  const clampPan = (x: number, y: number, zoom: number, cols: number = gridCols, rows: number = gridRows) => {
    const { maxX, maxY } = getPanLimits(zoom, cols, rows);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y))
    };
  };

  const updateZoom = (nextZoom: number, pivotClient?: { x: number; y: number }) => {
    const clampedZoom = Math.max(0.65, Math.min(2.5, Math.round(nextZoom * 100) / 100));
    if (clampedZoom === zoomLevel) return;

    const rect = contentAreaRef.current?.getBoundingClientRect();
    if (pivotClient && rect) {
      const cx = pivotClient.x - (rect.left + rect.width / 2);
      const cy = pivotClient.y - (rect.top + rect.height / 2);
      const ratio = clampedZoom / zoomLevel;
      const nextPanX = cx - (cx - panOffset.x) * ratio;
      const nextPanY = cy - (cy - panOffset.y) * ratio;
      setPanOffset(clampPan(nextPanX, nextPanY, clampedZoom));
    } else {
      setPanOffset(prev => clampPan(prev.x, prev.y, clampedZoom));
    }
    setZoomLevel(clampedZoom);
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Re-clamp pan if grid size changes
  useEffect(() => {
    setPanOffset(prev => clampPan(prev.x, prev.y, zoomLevel, gridCols, gridRows));
  }, [gridCols, gridRows]);

  // Attach native wheel zoom (non-passive) on the map viewport
  useEffect(() => {
    const el = contentAreaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement)?.closest('[data-map-hud="true"]')) return;
      e.preventDefault();
      const step = e.deltaY < 0 ? 0.15 : -0.15;
      updateZoom(zoomLevel + step, { x: e.clientX, y: e.clientY });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomLevel, panOffset, gridCols, gridRows]);

  // Global mousemove / mouseup for smooth FarmVille panning (Right-click, Middle-click, or Left-drag)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const p = panStateRef.current;
      if (!p.active) return;

      const dx = e.clientX - p.startX;
      const dy = e.clientY - p.startY;
      if (!p.didDrag && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        p.didDrag = true;
        setIsPanning(true);
      }

      if (p.didDrag || p.button === 2 || p.button === 1) {
        setPanOffset(clampPan(p.startPanX + dx, p.startPanY + dy, zoomLevel));
      }
    };

    const onMouseUp = () => {
      const p = panStateRef.current;
      if (!p.active) return;
      if (p.didDrag) {
        suppressClickRef.current = true;
        setTimeout(() => {
          suppressClickRef.current = false;
        }, 50);
      }
      p.active = false;
      p.didDrag = false;
      setIsPanning(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [zoomLevel, gridCols, gridRows]);

  const handleMapMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-map-hud="true"]')) return;
    // Allow right-click (2), middle-click (1), or left-click drag (0)
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
    if (e.button === 1) e.preventDefault();

    panStateRef.current = {
      active: true,
      button: e.button,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
      didDrag: false
    };
    if (e.button === 2 || e.button === 1) {
      setIsPanning(true);
    }
  };

  // Farmland Grid W x L Control Handlers
  const handleGridColsChange = (delta: number) => {
    const nextCols = gridCols + delta;
    if (nextCols < 6 || nextCols > 30) return;
    if (delta < 0) {
      const wouldClip = structures.some(s => s.tileX + s.wTiles > nextCols);
      if (wouldClip) {
        setToastMessage(`Cannot shrink width: structures extend to column ${nextCols + 1}`);
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 2500);
        return;
      }
    }
    setGridCols(nextCols);
    currentFarm.gridCols = nextCols;
    setHasUnsavedChanges(true);
    setToastMessage(`Farmland Grid resized to ${nextCols}×${gridRows} Tiles`);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleGridRowsChange = (delta: number) => {
    const nextRows = gridRows + delta;
    if (nextRows < 6 || nextRows > 24) return;
    if (delta < 0) {
      const wouldClip = structures.some(s => s.tileY + s.hTiles > nextRows);
      if (wouldClip) {
        setToastMessage(`Cannot shrink length: structures extend to row ${nextRows + 1}`);
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 2500);
        return;
      }
    }
    setGridRows(nextRows);
    currentFarm.gridRows = nextRows;
    setHasUnsavedChanges(true);
    setToastMessage(`Farmland Grid resized to ${gridCols}×${nextRows} Tiles`);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  // Controller & Sensor CRUD Handlers
  const handleAddController = (structId: string, model: AttachedController['model']) => {
    setStructures(prev => prev.map(s => {
      if (s.id !== structId) return s;
      const ctrls = ensureControllers(s);
      const newCtrlId = `ctrl-${Date.now().toString().slice(-4)}`;
      const newCtrl: AttachedController = {
        id: newCtrlId,
        model: model,
        serial: `AG-${Math.floor(2000 + Math.random() * 7000)}-NZ`,
        firmware: 'v3.1.0-Edge',
        wifiSSID: 'Greenhouse_5G_Commercial',
        rssi: -50 - Math.floor(Math.random() * 15),
        ipAddress: `192.168.10.${50 + ctrls.length}`,
        status: 'ONLINE',
        doseCountHour: 12,
        doseCountTotal: 340,
        sensors: [
          { id: `${newCtrlId}-s1`, name: 'EC Conductivity Sensor', type: 'ec', value: 2.30, unit: 'mS/cm', pin: 'AN-01', status: 'NORMAL' },
          { id: `${newCtrlId}-s2`, name: 'pH Precision Electrode', type: 'ph', value: 5.80, unit: 'pH', pin: 'AN-02', status: 'NORMAL' }
        ]
      };
      const updatedCtrls = [...ctrls, newCtrl];
      return {
        ...s,
        controllers: updatedCtrls,
        controller: updatedCtrls[0]
      };
    }));
    setHasUnsavedChanges(true);
    setToastMessage(`Assigned new ${model}`);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleRemoveController = (structId: string, ctrlId: string) => {
    setStructures(prev => prev.map(s => {
      if (s.id !== structId) return s;
      const ctrls = ensureControllers(s);
      if (ctrls.length <= 1) {
        setToastMessage('A building must retain at least one controller');
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 2200);
        return s;
      }
      const updatedCtrls = ctrls.filter(c => c.id !== ctrlId);
      return {
        ...s,
        controllers: updatedCtrls,
        controller: updatedCtrls[0]
      };
    }));
    setHasUnsavedChanges(true);
    setToastMessage('Controller removed from building');
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 1800);
  };

  const handleAddSensor = (structId: string, ctrlId: string, sensorType: AttachedSensor['type']) => {
    const sensorSpecs: Record<AttachedSensor['type'], { name: string; unit: string; defaultVal: number; pin: string }> = {
      ec: { name: 'EC Substrate Probe', unit: 'mS/cm', defaultVal: 2.35, pin: 'AN-01' },
      ph: { name: 'Glass pH Electrode', unit: 'pH', defaultVal: 5.85, pin: 'AN-02' },
      vpd: { name: 'Leaf VPD Hygrometer', unit: 'kPa', defaultVal: 1.15, pin: 'I2C-1' },
      vwc: { name: 'Substrate VWC% Moisture', unit: '%', defaultVal: 65.0, pin: 'AN-03' },
      temp: { name: 'Water Temperature Probe', unit: '°C', defaultVal: 21.0, pin: 'AN-04' },
      co2: { name: 'Ambient CO2 NDIR Sensor', unit: 'ppm', defaultVal: 850, pin: 'UART-1' },
      par: { name: 'PAR Quantum Light Meter', unit: 'µmol/m²/s', defaultVal: 480, pin: 'SDI-12' }
    };

    const spec = sensorSpecs[sensorType] || sensorSpecs.ec;
    setStructures(prev => prev.map(s => {
      if (s.id !== structId) return s;
      const ctrls = ensureControllers(s);
      const updatedCtrls = ctrls.map(c => {
        if (c.id !== ctrlId) return c;
        const currSensors = c.sensors || [];
        const newSensor: AttachedSensor = {
          id: `sens-${Date.now().toString().slice(-4)}`,
          name: spec.name,
          type: sensorType,
          value: spec.defaultVal,
          unit: spec.unit,
          pin: `${spec.pin}-${currSensors.length + 1}`,
          status: 'NORMAL'
        };
        return { ...c, sensors: [...currSensors, newSensor] };
      });
      return { ...s, controllers: updatedCtrls, controller: updatedCtrls[0] };
    }));
    setHasUnsavedChanges(true);
    setToastMessage(`Attached ${spec.name} to controller`);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 1800);
  };

  const handleRemoveSensor = (structId: string, ctrlId: string, sensorId: string) => {
    setStructures(prev => prev.map(s => {
      if (s.id !== structId) return s;
      const ctrls = ensureControllers(s);
      const updatedCtrls = ctrls.map(c => {
        if (c.id !== ctrlId) return c;
        return { ...c, sensors: (c.sensors || []).filter(sens => sens.id !== sensorId) };
      });
      return { ...s, controllers: updatedCtrls, controller: updatedCtrls[0] };
    }));
    setHasUnsavedChanges(true);
    setToastMessage('Sensor detached from controller');
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 1600);
  };

  const handlePickCatalogItem = (item: CatalogItem) => {
    setActivePlacingItem(item);
    setPlacingDimensions({ w: item.wTiles, h: item.hTiles });
    setBuilderContainerView('farm_layout');
    setToastMessage(`Selected ${item.name} (${item.wTiles}×${item.hTiles}). Click any empty tile to drop.`);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleStructureClick = (s: TileStructure) => {
    if (suppressClickRef.current) return;
    setSelectedId(s.id);
    onSelectStructure?.(s);
    if (activeTab === 'build') {
      setBuilderContainerView('building_info');
    }
  };

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
  }, []);

  // Convert mouse coordinate to isometric tile (accounting for SVG viewBox, zoom, and pan via CTM)
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTab !== 'build' || isPanning) return;
    const svg = svgRef.current;
    if (!svg) return;

    const ctm = svg.getScreenCTM();
    let svgX = 0;
    let svgY = 0;
    if (ctm) {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPt = pt.matrixTransform(ctm.inverse());
      svgX = svgPt.x;
      svgY = svgPt.y;
    } else {
      const rect = svg.getBoundingClientRect();
      svgX = e.clientX - rect.left;
      svgY = e.clientY - rect.top;
    }

    const originX = 540;
    const originY = 115 - ((gridCols + gridRows) - 22) * 5;

    const dx = svgX - originX;
    const dy = svgY - originY;

    const tx = Math.floor((dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2);
    const ty = Math.floor((dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2);

    if (tx >= 0 && tx < gridCols && ty >= 0 && ty < gridRows) {
      setHoveredTile({ x: tx, y: ty });
    } else {
      setHoveredTile(null);
    }
  };

  // Check tile collision: Is target footprint clear of other structures?
  const checkTileCollision = (tx: number, ty: number, w: number, h: number, ignoreId?: string) => {
    if (tx < 0 || ty < 0 || tx + w > gridCols || ty + h > gridRows) {
      return false; // Out of bounds
    }

    for (const struct of structures) {
      if (ignoreId && struct.id === ignoreId) continue;
      const overlapX = tx < struct.tileX + struct.wTiles && tx + w > struct.tileX;
      const overlapY = ty < struct.tileY + struct.hTiles && ty + h > struct.tileY;
      if (overlapX && overlapY) {
        return false;
      }
    }
    return true;
  };

  // Resizing Selected Structure (FarmVille Scalable Buildings)
  const handleResizeSelected = (deltaW: number, deltaH: number) => {
    if (!selectedStructure) return;
    const newW = selectedStructure.wTiles + deltaW;
    const newH = selectedStructure.hTiles + deltaH;
    if (newW < 1 || newH < 1) return;

    const isValid = checkTileCollision(
      selectedStructure.tileX,
      selectedStructure.tileY,
      newW,
      newH,
      selectedStructure.id
    );

    if (!isValid) {
      playSfx('error');
      setToastMessage('Cannot expand building: Space obstructed or border reached!');
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
      return;
    }

    setStructures(prev =>
      prev.map(s =>
        s.id === selectedStructure.id
          ? { ...s, wTiles: newW, hTiles: newH }
          : s
      )
    );
    setHasUnsavedChanges(true);
    playSfx('rotate');
    setToastMessage(`Resized ${selectedStructure.name} to ${newW} × ${newH} Tiles`);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 1800);
  };


  // Place or Move Object on Click
  const handleTileClick = (tx: number, ty: number) => {
    if (activeTab !== 'build' || suppressClickRef.current) return;

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
      setHasUnsavedChanges(true);
      playSfx('place');
      setToastMessage(`Moved ${moving.name} to Tile (${tx}, ${ty})`);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
      return;
    }

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
      metrics: { ec: 2.25, targetEc: 2.30, ph: 5.82, targetPh: 5.80, vpd: 1.12, vwc: 65.0, waterTemp: 20.4 },
      pumps: { pumpA: 'IDLE', pumpB: 'IDLE', acid: 'IDLE' }
    };

    setStructures([...structures, newStruct]);
    setSelectedId(newId);
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
    playSfx('rotate');
  };

  // Delete selected structure
  const handleDeleteSelected = () => {
    if (!selectedStructure || structures.length <= 1) return;
    playSfx('delete');
    const remaining = structures.filter(s => s.id !== selectedStructure.id);
    setStructures(remaining);
    setSelectedId(remaining[0].id);
    setHasUnsavedChanges(true);
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


  // Render 3D Ground Base Slab & 1x1 Isometric Tile Grid
  const renderGroundSlab = () => {
    const pTop0 = tileToScreen(0, 0, 0, gridCols, gridRows);
    const pTop1 = tileToScreen(gridCols, 0, 0, gridCols, gridRows);
    const pTop2 = tileToScreen(gridCols, gridRows, 0, gridCols, gridRows);
    const pTop3 = tileToScreen(0, gridRows, 0, gridCols, gridRows);

    const SLAB_DEPTH = 18;
    const pBot1 = tileToScreen(gridCols, 0, -SLAB_DEPTH, gridCols, gridRows);
    const pBot2 = tileToScreen(gridCols, gridRows, -SLAB_DEPTH, gridCols, gridRows);
    const pBot3 = tileToScreen(0, gridRows, -SLAB_DEPTH, gridCols, gridRows);

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
          points={`${ptStr(tileToScreen(-0.5, -0.5, -SLAB_DEPTH - 8, gridCols, gridRows))} ${ptStr(tileToScreen(gridCols + 0.5, -0.5, -SLAB_DEPTH - 8, gridCols, gridRows))} ${ptStr(tileToScreen(gridCols + 0.5, gridRows + 0.5, -SLAB_DEPTH - 8, gridCols, gridRows))} ${ptStr(tileToScreen(-0.5, gridRows + 0.5, -SLAB_DEPTH - 8, gridCols, gridRows))}`}
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

        {/* Top Slab Surface */}
        <polygon
          points={`${ptStr(pTop0)} ${ptStr(pTop1)} ${ptStr(pTop2)} ${ptStr(pTop3)}`}
          fill="#F8FAFC"
          stroke="#E2E8F0"
          strokeWidth="1.2"
        />

        {/* 1x1 Isometric Tile Grid Lines */}
        {Array.from({ length: gridCols }).map((_, cx) =>
          Array.from({ length: gridRows }).map((_, cy) => {
            const t0 = tileToScreen(cx, cy, 0, gridCols, gridRows);
            const t1 = tileToScreen(cx + 1, cy, 0, gridCols, gridRows);
            const t2 = tileToScreen(cx + 1, cy + 1, 0, gridCols, gridRows);
            const t3 = tileToScreen(cx, cy + 1, 0, gridCols, gridRows);

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

  // Render Venlo Glasshouse Bay (Parametric to wTiles and hTiles)
  const renderGreenhouse = (s: TileStructure) => {
    const isSelected = selectedId === s.id;
    const isHovered = hoveredId === s.id;
    const isBeingMoved = movingStructureId === s.id;

    const baseZ = 2;
    const wallH = 34;
    const ridgeH = 50;

    const p0 = tileToScreen(s.tileX, s.tileY, baseZ, gridCols, gridRows);
    const p1 = tileToScreen(s.tileX + s.wTiles, s.tileY, baseZ, gridCols, gridRows);
    const p2 = tileToScreen(s.tileX + s.wTiles, s.tileY + s.hTiles, baseZ, gridCols, gridRows);
    const p3 = tileToScreen(s.tileX, s.tileY + s.hTiles, baseZ, gridCols, gridRows);

    const w0Top = tileToScreen(s.tileX, s.tileY, wallH, gridCols, gridRows);
    const w1Top = tileToScreen(s.tileX + s.wTiles, s.tileY, wallH, gridCols, gridRows);
    const w2Top = tileToScreen(s.tileX + s.wTiles, s.tileY + s.hTiles, wallH, gridCols, gridRows);
    const w3Top = tileToScreen(s.tileX, s.tileY + s.hTiles, wallH, gridCols, gridRows);

    const midY1 = s.tileY + s.hTiles * 0.25;
    const midY2 = s.tileY + s.hTiles * 0.75;
    const r1Start = tileToScreen(s.tileX, midY1, ridgeH, gridCols, gridRows);
    const r1End = tileToScreen(s.tileX + s.wTiles, midY1, ridgeH, gridCols, gridRows);
    const r2Start = tileToScreen(s.tileX, midY2, ridgeH, gridCols, gridRows);
    const r2End = tileToScreen(s.tileX + s.wTiles, midY2, ridgeH, gridCols, gridRows);

    const centerPoint = tileToScreen(s.tileX + s.wTiles / 2, s.tileY + s.hTiles / 2, ridgeH + 16, gridCols, gridRows);

    return (
      <g
        key={s.id}
        opacity={isBeingMoved ? 0.35 : 1}
        onClick={() => handleStructureClick(s)}
        onMouseEnter={() => setHoveredId(s.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{ cursor: 'pointer' }}
      >
        <polygon
          points={`${ptStr(p0)} ${ptStr(p1)} ${ptStr(p2)} ${ptStr(p3)}`}
          fill={isSelected ? 'rgba(16, 185, 129, 0.22)' : isHovered ? 'rgba(56, 189, 248, 0.15)' : 'rgba(240, 253, 244, 0.75)'}
          stroke={isSelected ? '#10B981' : isHovered ? '#38BDF8' : '#CBD5E1'}
          strokeWidth={isSelected ? 2 : 1}
        />
        <polygon
          points={`${ptStr(p1)} ${ptStr(p2)} ${ptStr(w2Top)} ${ptStr(w1Top)}`}
          fill="rgba(241, 245, 249, 0.6)"
          stroke="#94A3B8"
          strokeWidth="0.8"
        />
        <polygon
          points={`${ptStr(p3)} ${ptStr(p2)} ${ptStr(w2Top)} ${ptStr(w3Top)}`}
          fill="rgba(203, 213, 225, 0.7)"
          stroke="#64748B"
          strokeWidth="0.8"
        />
        <line x1={w0Top[0]} y1={w0Top[1]} x2={w1Top[0]} y2={w1Top[1]} stroke="#64748B" strokeWidth="1" />
        <line x1={w1Top[0]} y1={w1Top[1]} x2={w2Top[0]} y2={w2Top[1]} stroke="#64748B" strokeWidth="1" />
        <line x1={w2Top[0]} y1={w2Top[1]} x2={w3Top[0]} y2={w3Top[1]} stroke="#64748B" strokeWidth="1" />
        <line x1={w3Top[0]} y1={w3Top[1]} x2={w0Top[0]} y2={w0Top[1]} stroke="#64748B" strokeWidth="1" />

        <polygon points={`${ptStr(w0Top)} ${ptStr(w1Top)} ${ptStr(r1End)} ${ptStr(r1Start)}`} fill="rgba(186, 230, 253, 0.45)" stroke="#38BDF8" strokeWidth="0.8" />
        <polygon points={`${ptStr(r1Start)} ${ptStr(r1End)} ${ptStr(r2End)} ${ptStr(r2Start)}`} fill="rgba(224, 242, 254, 0.35)" stroke="#38BDF8" strokeWidth="0.8" />
        <polygon points={`${ptStr(r2Start)} ${ptStr(r2End)} ${ptStr(w2Top)} ${ptStr(w3Top)}`} fill="rgba(186, 230, 253, 0.45)" stroke="#38BDF8" strokeWidth="0.8" />

        {layers.controllers && (
          <g transform={`translate(${centerPoint[0]}, ${centerPoint[1] + 10})`}>
            <circle cx="0" cy="0" r="10" fill="#0F172A" stroke="#10B981" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="3.5" fill="#10B981" />
            <line x1="0" y1="-10" x2="0" y2="-17" stroke="#10B981" strokeWidth="1.2" />
            <circle cx="0" cy="-18" r="1.5" fill="#34D399" />
          </g>
        )}

        {layers.sensors && (
          <g transform={`translate(${centerPoint[0]}, ${centerPoint[1] - 8})`}>
            <rect
              x="-36"
              y="-10"
              width="72"
              height="20"
              rx="10"
              fill="#FFFFFF"
              stroke={isSelected ? '#10B981' : '#E2E8F0'}
              strokeWidth={isSelected ? 1.5 : 1}
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
            />
            <circle cx="-28" cy="0" r="3" fill="#10B981" />
            <text x="-21" y="3.5" fill="#0F172A" fontSize="9" fontWeight="800" fontFamily="monospace">
              EC {s.metrics.ec.toFixed(2)}
            </text>
            <text x="18" y="3" fill="#64748B" fontSize="8" fontFamily="monospace">
              pH {s.metrics.ph.toFixed(1)}
            </text>
          </g>
        )}
      </g>
    );
  };

  // Render Hydroponic Gutter Beds (Parametric to wTiles and hTiles)
  const renderGutterBeds = (s: TileStructure) => {
    const isSelected = selectedId === s.id;
    const isHovered = hoveredId === s.id;
    const isBeingMoved = movingStructureId === s.id;

    const p0 = tileToScreen(s.tileX, s.tileY, 1, gridCols, gridRows);
    const p1 = tileToScreen(s.tileX + s.wTiles, s.tileY, 1, gridCols, gridRows);
    const p2 = tileToScreen(s.tileX + s.wTiles, s.tileY + s.hTiles, 1, gridCols, gridRows);
    const p3 = tileToScreen(s.tileX, s.tileY + s.hTiles, 1, gridCols, gridRows);

    const centerPoint = tileToScreen(s.tileX + s.wTiles / 2, s.tileY + s.hTiles / 2, 22, gridCols, gridRows);

    return (
      <g
        key={s.id}
        opacity={isBeingMoved ? 0.35 : 1}
        onClick={() => handleStructureClick(s)}
        onMouseEnter={() => setHoveredId(s.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{ cursor: 'pointer' }}
      >
        <polygon
          points={`${ptStr(p0)} ${ptStr(p1)} ${ptStr(p2)} ${ptStr(p3)}`}
          fill={isSelected ? 'rgba(16, 185, 129, 0.25)' : isHovered ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.95)'}
          stroke={isSelected ? '#10B981' : isHovered ? '#38BDF8' : '#CBD5E1'}
          strokeWidth={isSelected ? 2 : 1}
        />

        {Array.from({ length: Math.max(3, s.hTiles * 3) }).map((_, gi) => {
          const stepY = s.tileY + (gi + 0.5) * (s.hTiles / (s.hTiles * 3));
          const gStart = tileToScreen(s.tileX + 0.1, stepY, 2, gridCols, gridRows);
          const gEnd = tileToScreen(s.tileX + s.wTiles - 0.1, stepY, 2, gridCols, gridRows);
          return (
            <line
              key={`channel-${gi}`}
              x1={gStart[0]}
              y1={gStart[1]}
              x2={gEnd[0]}
              y2={gEnd[1]}
              stroke="#E2E8F0"
              strokeWidth="4"
              strokeLinecap="round"
            />
          );
        })}

        {Array.from({ length: s.wTiles * 2 }).map((_, ci) =>
          Array.from({ length: s.hTiles * 2 }).map((_, rj) => {
            const cropPt = tileToScreen(s.tileX + (ci + 0.5) * 0.5, s.tileY + (rj + 0.5) * 0.5, 5, gridCols, gridRows);
            return (
              <circle
                key={`crop-${ci}-${rj}`}
                cx={cropPt[0]}
                cy={cropPt[1]}
                r="3.5"
                fill="#10B981"
                stroke="#047857"
                strokeWidth="0.5"
              />
            );
          })
        )}

        {layers.sensors && (
          <g transform={`translate(${centerPoint[0]}, ${centerPoint[1]})`}>
            <rect
              x="-45"
              y="-10"
              width="90"
              height="20"
              rx="10"
              fill="#FFFFFF"
              stroke={s.controller.status === 'ATTENTION' ? '#F59E0B' : '#E2E8F0'}
              strokeWidth="1.2"
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
            />
            <circle cx="-36" cy="0" r="3" fill={s.controller.status === 'ATTENTION' ? '#F59E0B' : '#10B981'} />
            <text x="-29" y="3.5" fill="#0F172A" fontSize="9" fontWeight="800" fontFamily="monospace">
              EC {s.metrics.ec.toFixed(2)}
            </text>
            <text x="18" y="3" fill="#64748B" fontSize="7.5" fontFamily="monospace">
              NFT
            </text>
          </g>
        )}
      </g>
    );
  };

  // Render Silos & Tank Station
  const renderSilos = (s: TileStructure) => {
    const isSelected = selectedId === s.id;
    const isHovered = hoveredId === s.id;
    const isBeingMoved = movingStructureId === s.id;

    const p0 = tileToScreen(s.tileX, s.tileY, 1, gridCols, gridRows);
    const p1 = tileToScreen(s.tileX + s.wTiles, s.tileY, 1, gridCols, gridRows);
    const p2 = tileToScreen(s.tileX + s.wTiles, s.tileY + s.hTiles, 1, gridCols, gridRows);
    const p3 = tileToScreen(s.tileX, s.tileY + s.hTiles, 1, gridCols, gridRows);

    const silo1Base = tileToScreen(s.tileX + 0.8, s.tileY + s.hTiles / 2, 2, gridCols, gridRows);
    const silo2Base = tileToScreen(s.tileX + s.wTiles - 0.8, s.tileY + s.hTiles / 2, 2, gridCols, gridRows);
    const siloHeight = 42;

    const centerPoint = tileToScreen(s.tileX + s.wTiles / 2, s.tileY + s.hTiles / 2, siloHeight + 14, gridCols, gridRows);

    return (
      <g
        key={s.id}
        opacity={isBeingMoved ? 0.35 : 1}
        onClick={() => handleStructureClick(s)}
        onMouseEnter={() => setHoveredId(s.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{ cursor: 'pointer' }}
      >
        <polygon
          points={`${ptStr(p0)} ${ptStr(p1)} ${ptStr(p2)} ${ptStr(p3)}`}
          fill={isSelected ? 'rgba(16, 185, 129, 0.25)' : isHovered ? 'rgba(56, 189, 248, 0.15)' : 'rgba(226, 232, 240, 0.8)'}
          stroke={isSelected ? '#10B981' : isHovered ? '#38BDF8' : '#94A3B8'}
          strokeWidth={isSelected ? 2 : 1}
        />

        {/* Silo Tank 1 */}
        <g transform={`translate(${silo1Base[0]}, ${silo1Base[1]})`}>
          <ellipse cx="0" cy="0" rx="14" ry="7" fill="#64748B" opacity="0.4" />
          <path d={`M -13,0 L -13,-${siloHeight} A 13,6.5 0 0,1 13,-${siloHeight} L 13,0 A 13,6.5 0 0,1 -13,0 Z`} fill="url(#siloGradient)" stroke="#64748B" strokeWidth="0.8" />
          <ellipse cx="0" cy={`-${siloHeight}`} rx="13" ry="6.5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="0.8" />
          <rect x="-1" y={`-${siloHeight * 0.7}`} width="2" height={siloHeight * 0.6} fill="#38BDF8" rx="1" />
        </g>

        {/* Silo Tank 2 */}
        <g transform={`translate(${silo2Base[0]}, ${silo2Base[1]})`}>
          <ellipse cx="0" cy="0" rx="14" ry="7" fill="#64748B" opacity="0.4" />
          <path d={`M -13,0 L -13,-${siloHeight} A 13,6.5 0 0,1 13,-${siloHeight} L 13,0 A 13,6.5 0 0,1 -13,0 Z`} fill="url(#siloGradient)" stroke="#64748B" strokeWidth="0.8" />
          <ellipse cx="0" cy={`-${siloHeight}`} rx="13" ry="6.5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="0.8" />
          <rect x="-1" y={`-${siloHeight * 0.85}`} width="2" height={siloHeight * 0.8} fill="#F59E0B" rx="1" />
        </g>

        {layers.sensors && (
          <g transform={`translate(${centerPoint[0]}, ${centerPoint[1]})`}>
            <rect
              x="-40"
              y="-10"
              width="80"
              height="20"
              rx="10"
              fill="#FFFFFF"
              stroke={isSelected ? '#10B981' : '#E2E8F0'}
              strokeWidth="1.2"
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
            />
            <circle cx="-32" cy="0" r="3" fill="#10B981" />
            <text x="-25" y="3.5" fill="#0F172A" fontSize="9" fontWeight="800" fontFamily="monospace">
              SILOS 85%
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

    const p0 = tileToScreen(s.tileX, s.tileY, baseZ, gridCols, gridRows);
    const p1 = tileToScreen(s.tileX + s.wTiles, s.tileY, baseZ, gridCols, gridRows);
    const p2 = tileToScreen(s.tileX + s.wTiles, s.tileY + s.hTiles, baseZ, gridCols, gridRows);
    const p3 = tileToScreen(s.tileX, s.tileY + s.hTiles, baseZ, gridCols, gridRows);

    const w0Top = tileToScreen(s.tileX, s.tileY, houseH, gridCols, gridRows);
    const w1Top = tileToScreen(s.tileX + s.wTiles, s.tileY, houseH, gridCols, gridRows);
    const w2Top = tileToScreen(s.tileX + s.wTiles, s.tileY + s.hTiles, houseH, gridCols, gridRows);
    const w3Top = tileToScreen(s.tileX, s.tileY + s.hTiles, houseH, gridCols, gridRows);

    const centerPoint = tileToScreen(s.tileX + s.wTiles / 2, s.tileY + s.hTiles / 2, houseH + 16, gridCols, gridRows);

    return (
      <g
        key={s.id}
        opacity={isBeingMoved ? 0.35 : 1}
        onClick={() => handleStructureClick(s)}
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
            <text x="-30" y="3" fill="#0F172A" fontSize="10" fontWeight="700" fontFamily="monospace">
              PACKHOUSE
            </text>
            <text x="25" y="3" fill="#10B981" fontSize="9" fontFamily="monospace">
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
    const center = tileToScreen(s.tileX + 0.5, s.tileY + 0.5, baseZ, gridCols, gridRows);

    return (
      <g
        key={s.id}
        opacity={isBeingMoved ? 0.35 : 1}
        onClick={() => handleStructureClick(s)}
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
        <line x1={center[0]} y1={center[1]} x2={center[0]} y2={center[1] - 22} stroke="#475569" strokeWidth="2.5" />
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
    const pA = tileToScreen(tx, ty, 0, gridCols, gridRows);
    const pD = tileToScreen(tx, ty + 0.9, 0, gridCols, gridRows);

    const trailerH = 18;
    const cabH = 14;

    const trailerA = tileToScreen(tx, ty, trailerH, gridCols, gridRows);
    const trailerB = tileToScreen(tx + 1.1, ty, trailerH, gridCols, gridRows);
    const trailerC = tileToScreen(tx + 1.1, ty + 0.9, trailerH, gridCols, gridRows);
    const trailerD = tileToScreen(tx, ty + 0.9, trailerH, gridCols, gridRows);

    const cabA = tileToScreen(tx + 1.1, ty + 0.1, cabH, gridCols, gridRows);
    const cabB = tileToScreen(tx + 1.7, ty + 0.1, cabH, gridCols, gridRows);
    const cabC = tileToScreen(tx + 1.7, ty + 0.8, cabH, gridCols, gridRows);
    const cabD = tileToScreen(tx + 1.1, ty + 0.8, cabH, gridCols, gridRows);

    return (
      <g key={key} id={`truck-${key}`} style={{ pointerEvents: 'none' }}>
        <polygon
          points={`${ptStr(tileToScreen(tx - 0.1, ty - 0.1, 0, gridCols, gridRows))} ${ptStr(tileToScreen(tx + 1.8, ty - 0.1, 0, gridCols, gridRows))} ${ptStr(tileToScreen(tx + 1.8, ty + 1.0, 0, gridCols, gridRows))} ${ptStr(tileToScreen(tx - 0.1, ty + 1.0, 0, gridCols, gridRows))}`}
          fill="rgba(15, 23, 42, 0.2)"
        />
        <polygon points={`${ptStr(tileToScreen(tx, ty + 0.9, 0, gridCols, gridRows))} ${ptStr(tileToScreen(tx + 1.1, ty + 0.9, 0, gridCols, gridRows))} ${ptStr(trailerC)} ${ptStr(trailerD)}`} fill="#2563EB" stroke="#1D4ED8" strokeWidth="0.5" />
        <polygon points={`${ptStr(trailerA)} ${ptStr(trailerB)} ${ptStr(trailerC)} ${ptStr(trailerD)}`} fill="#3B82F6" stroke="#2563EB" strokeWidth="0.5" />
        <polygon points={`${ptStr(pA)} ${ptStr(pD)} ${ptStr(trailerD)} ${ptStr(trailerA)}`} fill="#1E40AF" stroke="#1E3A8A" strokeWidth="0.5" />
        <polygon points={`${ptStr(tileToScreen(tx + 1.1, ty + 0.8, 0, gridCols, gridRows))} ${ptStr(tileToScreen(tx + 1.7, ty + 0.8, 0, gridCols, gridRows))} ${ptStr(cabC)} ${ptStr(cabD)}`} fill="#E2E8F0" stroke="#94A3B8" strokeWidth="0.5" />
        <polygon points={`${ptStr(cabA)} ${ptStr(cabB)} ${ptStr(cabC)} ${ptStr(cabD)}`} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.5" />
      </g>
    );
  };

  // Render Miniature Cypress/Conifer Perimeter Trees
  const renderTree = (key: string, tx: number, ty: number) => {
    const base = tileToScreen(tx + 0.5, ty + 0.5, 0, gridCols, gridRows);
    const mid = tileToScreen(tx + 0.5, ty + 0.5, 14, gridCols, gridRows);
    const tip = tileToScreen(tx + 0.5, ty + 0.5, 26, gridCols, gridRows);

    return (
      <g key={key} id={`tree-${key}`} style={{ pointerEvents: 'none' }}>
        <ellipse cx={base[0]} cy={base[1]} rx="7" ry="4" fill="rgba(15, 23, 42, 0.15)" />
        <line x1={base[0]} y1={base[1]} x2={mid[0]} y2={mid[1]} stroke="#78350F" strokeWidth="2.5" />
        <polygon points={`${base[0] - 8},${base[1] - 4} ${base[0] + 8},${base[1] - 4} ${mid[0]},${mid[1] - 8}`} fill="#15803D" stroke="#166534" strokeWidth="0.5" />
        <polygon points={`${mid[0] - 6},${mid[1] - 2} ${mid[0] + 6},${mid[1] - 2} ${tip[0]},${tip[1]}`} fill="#22C55E" stroke="#15803D" strokeWidth="0.5" />
      </g>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: facilitiesPosition === 'right' ? 'row' : 'row-reverse',
      width: '100%',
      height: '660px',
      borderRadius: '16px',
      overflow: 'hidden',
      backgroundColor: '#F8FAFC',
      border: '1px solid #E2E8F0',
      position: 'relative',
      boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
    }}>

      {/* Main Content Area (~80% map, filters, HUD and builder) */}
      <div
        ref={contentAreaRef}
        onMouseDown={handleMapMouseDown}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          cursor: isPanning ? 'grabbing' : (zoomLevel > 1 || gridCols > 14 || gridRows > 12 ? 'grab' : 'default'),
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      >

      {/* 1. Top Map Toolbar with Multi-Farm Navigator & FarmVille Mode Switcher */}
      <div
        data-map-hud="true"
        style={{
          position: 'absolute',
          top: '16px',
          left: '20px',
          right: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 20,
          pointerEvents: 'none'
        }}
      >
        {/* Left: Live Status Mode Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #CBD5E1',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          pointerEvents: 'auto'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: activeTab === 'build' ? '#F59E0B' : '#10B981',
            boxShadow: `0 0 6px ${activeTab === 'build' ? '#F59E0B' : '#10B981'}`
          }} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
            {activeTab === 'build' ? 'Layout Builder Active' : 'Live Sensor Monitoring'}
          </span>
          <span style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>
            ({structures.length} bays)
          </span>
        </div>

        {/* Center: Multi-Farm Navigator Pill (Arrow Switcher directly on the Farm) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          borderRadius: '30px',
          padding: '4px 16px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
          border: '1px solid #CBD5E1',
          pointerEvents: 'auto'
        }}>
          <button
            onClick={handlePrevFarm}
            title="Previous Farm Estate"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: '#0F172A',
              padding: '4px'
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#0F172A' }}>
                {currentFarm.name}
              </span>
              <span style={{
                fontSize: '9px',
                fontWeight: 800,
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                fontFamily: 'monospace'
              }}>
                FARM {currentFarmIdx + 1}/{FARMS_DATA.length}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#64748B' }}>
              {currentFarm.location} · {gridCols}×{gridRows} Grid · {currentFarm.stats.crop}
            </div>
          </div>

          <button
            onClick={handleNextFarm}
            title="Next Farm Estate"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: '#0F172A',
              padding: '4px'
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Right: Map Layers Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
          {/* Map Layers Dropdown Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsLayersOpen(!isLayersOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                backgroundColor: isLayersOpen ? '#0F172A' : '#FFFFFF',
                color: isLayersOpen ? '#FFFFFF' : '#0F172A',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease'
              }}
            >
              <Layers size={14} color={isLayersOpen ? '#10B981' : '#64748B'} />
              <span>Map Layers</span>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                fontFamily: 'monospace',
                color: isLayersOpen ? '#34D399' : '#64748B',
                backgroundColor: isLayersOpen ? 'rgba(16, 185, 129, 0.2)' : '#F1F5F9',
                padding: '1px 5px',
                borderRadius: '4px'
              }}>
                {Object.values(layers).filter(Boolean).length}/6
              </span>
              <ChevronDown size={14} color={isLayersOpen ? '#FFFFFF' : '#64748B'} style={{ transform: isLayersOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {/* Dropdown Menu */}
            {isLayersOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                width: '210px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '14px',
                boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                zIndex: 60
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>
                    Active Overlays
                  </span>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#10B981', fontWeight: 700 }}>
                    {Object.values(layers).filter(Boolean).length} / 6
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        transition: 'background 0.1s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={(layers as any)[item.key]}
                        onChange={() => setLayers({ ...layers, [item.key]: !(layers as any)[item.key] })}
                        style={{ accentColor: '#10B981', cursor: 'pointer', width: '15px', height: '15px' }}
                      />
                    </label>
                  ))}
                </div>

                {/* Zoom Controls inside Dropdown */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid #F1F5F9'
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B' }}>
                    Zoom ({Math.round(zoomLevel * 100)}%):
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => updateZoom(zoomLevel + 0.2)}
                      title="Zoom In"
                      style={{ padding: '5px 8px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <ZoomIn size={13} color="#64748B" />
                    </button>
                    <button
                      onClick={() => updateZoom(zoomLevel - 0.2)}
                      title="Zoom Out"
                      style={{ padding: '5px 8px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <ZoomOut size={13} color="#64748B" />
                    </button>
                    <button
                      onClick={handleResetView}
                      title="Reset Zoom & Center Map"
                      style={{ padding: '5px 8px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <RotateCcw size={13} color="#64748B" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. FarmVille Placement Status Bar (When an item is ready to drop on tiles) */}
      {activeTab === 'build' && (activePlacingItem || movingStructureId) && (
        <div
          data-map-hud="true"
          style={{
            position: 'absolute',
            top: '68px',
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
          }}
        >
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



      {/* 4B. Floating Pan Mode Badge (Top-Left below status pill when zoomed/expanded) */}
      {(zoomLevel > 1 || gridCols > 14 || gridRows > 12) && (
        <div
          data-map-hud="true"
          style={{
            position: 'absolute',
            top: '70px',
            left: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            color: '#F8FAFC',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            zIndex: 20,
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          <Move size={11} color="#10B981" />
          <span>Drag or Right-Click to Pan</span>
        </div>
      )}

      {/* 4C. Floating Bottom-Left Camera Zoom Pill */}
      <div
        data-map-hud="true"
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #CBD5E1',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          zIndex: 25,
          pointerEvents: 'auto'
        }}
      >
        <button
          onClick={() => updateZoom(zoomLevel - 0.2)}
          disabled={zoomLevel <= 0.65}
          title="Zoom Out (or scroll wheel down)"
          style={{
            padding: '5px 7px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            cursor: zoomLevel <= 0.65 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            opacity: zoomLevel <= 0.65 ? 0.5 : 1
          }}
        >
          <ZoomOut size={14} color="#0F172A" />
        </button>

        <button
          onClick={handleResetView}
          title="Reset Zoom (100%) & Center Camera"
          style={{
            padding: '4px 8px',
            backgroundColor: zoomLevel !== 1 || panOffset.x !== 0 || panOffset.y !== 0 ? '#F1F5F9' : 'transparent',
            border: 'none',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 800,
            fontFamily: 'monospace',
            color: '#0F172A',
            cursor: 'pointer',
            minWidth: '46px',
            textAlign: 'center'
          }}
        >
          {Math.round(zoomLevel * 100)}%
        </button>

        <button
          onClick={() => updateZoom(zoomLevel + 0.2)}
          disabled={zoomLevel >= 2.5}
          title="Zoom In (or scroll wheel up)"
          style={{
            padding: '5px 7px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            cursor: zoomLevel >= 2.5 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            opacity: zoomLevel >= 2.5 ? 0.5 : 1
          }}
        >
          <ZoomIn size={14} color="#0F172A" />
        </button>
      </div>

      {/* 5. Floating Bottom-Right Controls: Save Layout (Builder Mode only) & Builder/Exit Toggle */}
      <div
        data-map-hud="true"
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 30,
          pointerEvents: 'auto'
        }}
      >
        {saveToast && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
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

        {/* Save Layout Button: Active & visible ONLY in Builder Mode */}
        {activeTab === 'build' && (
          <button
            onClick={handleSaveLayout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              backgroundColor: hasUnsavedChanges ? '#10B981' : '#FFFFFF',
              color: hasUnsavedChanges ? '#FFFFFF' : '#0F172A',
              borderRadius: '8px',
              border: hasUnsavedChanges ? 'none' : '1px solid #CBD5E1',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: hasUnsavedChanges ? '0 4px 14px rgba(16, 185, 129, 0.35)' : '0 4px 12px rgba(0,0,0,0.06)',
              transition: 'all 0.15s ease'
            }}
            title="Save farm layout and dispatch to edge hardware"
          >
            <Save size={15} color={hasUnsavedChanges ? '#FFFFFF' : '#10B981'} />
            <span>Save Layout</span>
            {hasUnsavedChanges && (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FFFFFF' }} />
            )}
          </button>
        )}

        {/* Builder / Exit Toggle Button */}
        <button
          onClick={handleToggleBuilderMode}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            backgroundColor: activeTab === 'build' ? '#EF4444' : '#0F172A',
            color: '#FFFFFF',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: activeTab === 'build' ? '0 4px 14px rgba(239, 68, 68, 0.35)' : '0 4px 14px rgba(0,0,0,0.15)',
            transition: 'all 0.15s ease'
          }}
          title={activeTab === 'build' ? 'Exit Builder mode' : 'Enter Farm Layout Builder mode'}
        >
          {activeTab === 'build' ? <X size={16} /> : <Hammer size={16} />}
          <span>{activeTab === 'build' ? 'Exit' : 'Builder'}</span>
        </button>
      </div>

      {/* 6A. Builder Mode Contextual Bottom Container (activeTab === 'build') */}
      {activeTab === 'build' && (
        <div
          data-map-hud="true"
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: 'calc(100% - 280px)',
            minWidth: '400px',
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #CBD5E1',
            padding: '12px 18px',
            boxShadow: '0 12px 30px -5px rgba(0,0,0,0.12)',
            zIndex: 25,
            pointerEvents: 'auto'
          }}
        >
          {/* VIEW 1: FARM LAYOUT */}
          {builderContainerView === 'farm_layout' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.01em' }}>
                    Farm Layout
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    {structures.length} structures placed
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Farmland Grid Width x Length steppers */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#F8FAFC',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>Grid:</span>

                    {/* Width Stepper */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>W:</span>
                      <button
                        onClick={() => handleGridColsChange(-1)}
                        style={{
                          padding: '1px 6px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          color: '#0F172A'
                        }}
                        title="Decrease Farmland Grid Width"
                      >
                        -
                      </button>
                      <span style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', minWidth: '18px', textAlign: 'center', color: '#0F172A' }}>
                        {gridCols}
                      </span>
                      <button
                        onClick={() => handleGridColsChange(1)}
                        style={{
                          padding: '1px 6px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          color: '#10B981'
                        }}
                        title="Increase Farmland Grid Width"
                      >
                        +
                      </button>
                    </div>

                    <span style={{ color: '#94A3B8', fontWeight: 700 }}>×</span>

                    {/* Length Stepper */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>L:</span>
                      <button
                        onClick={() => handleGridRowsChange(-1)}
                        style={{
                          padding: '1px 6px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          color: '#0F172A'
                        }}
                        title="Decrease Farmland Grid Length"
                      >
                        -
                      </button>
                      <span style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', minWidth: '18px', textAlign: 'center', color: '#0F172A' }}>
                        {gridRows}
                      </span>
                      <button
                        onClick={() => handleGridRowsChange(1)}
                        style={{
                          padding: '1px 6px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          color: '#10B981'
                        }}
                        title="Increase Farmland Grid Length"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Add Structure Button */}
                  <button
                    onClick={() => {
                      setBuilderContainerView('add_structure');
                      playSfx('select');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <Plus size={14} />
                    <span>Add Structure</span>
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748B' }}>
                💡 Click any structure on the map to resize, rotate, move, or configure controllers & sensors.
              </div>
            </div>
          )}

          {/* VIEW 2: ADD STRUCTURE (CATALOG) */}
          {builderContainerView === 'add_structure' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A' }}>
                    Add Structure
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Select an item to place on the farmland grid
                  </span>
                </div>

                {/* Back button to Farm Layout */}
                <button
                  onClick={() => setBuilderContainerView('farm_layout')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#0F172A',
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={13} />
                  <span>Back to Farm Layout</span>
                </button>
              </div>

              {/* Structure Catalog Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '8px',
                maxHeight: '220px',
                overflowY: 'auto'
              }}>
                {catalog.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handlePickCatalogItem(item)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'flex-start'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#10B981';
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }}
                  >
                    <div style={{ fontSize: '20px' }}>{item.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </span>
                        <span style={{ fontSize: '9px', fontWeight: 800, fontFamily: 'monospace', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '1px 4px', borderRadius: '3px', flexShrink: 0, marginLeft: '4px' }}>
                          {item.wTiles}×{item.hTiles}
                        </span>
                      </div>
                      <div style={{ fontSize: '9px', color: '#64748B', marginTop: '2px', lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 3: BUILDING INFO & CONFIG (CRUD CONTROLLERS & SENSORS) */}
          {builderContainerView === 'building_info' && selectedStructure && (
            <div>
              {/* Top Header: Structure Name, Coordinates, Back button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={14} color="#10B981" />
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A' }}>
                    {selectedStructure.name}
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', fontFamily: 'monospace', backgroundColor: '#F1F5F9', padding: '1px 5px', borderRadius: '4px' }}>
                    Pos: ({selectedStructure.tileX}, {selectedStructure.tileY})
                  </span>
                </div>

                {/* Back button to Farm Layout */}
                <button
                  onClick={() => setBuilderContainerView('farm_layout')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#0F172A',
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={12} />
                  <span>Back to Farm Layout</span>
                </button>
              </div>

              {/* Building Geometry Controls: Size W x L, Move, Rotate, Remove (NO Inspect Controller here!) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '10px', backgroundColor: '#F8FAFC', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                {/* Size W x L steppers */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800 }}>Size:</span>

                  {/* Width */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '10px', color: '#94A3B8' }}>W:</span>
                    <button
                      onClick={() => handleResizeSelected(-1, 0)}
                      disabled={selectedStructure.wTiles <= 1}
                      style={{ padding: '1px 5px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '3px', cursor: selectedStructure.wTiles <= 1 ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '11px' }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', color: '#0F172A', minWidth: '16px', textAlign: 'center' }}>
                      {selectedStructure.wTiles}
                    </span>
                    <button
                      onClick={() => handleResizeSelected(1, 0)}
                      disabled={selectedStructure.tileX + selectedStructure.wTiles >= gridCols}
                      style={{ padding: '1px 5px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '3px', cursor: selectedStructure.tileX + selectedStructure.wTiles >= gridCols ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '11px', color: '#10B981' }}
                    >
                      +
                    </button>
                  </div>

                  <span style={{ color: '#CBD5E1' }}>×</span>

                  {/* Length */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '10px', color: '#94A3B8' }}>L:</span>
                    <button
                      onClick={() => handleResizeSelected(0, -1)}
                      disabled={selectedStructure.hTiles <= 1}
                      style={{ padding: '1px 5px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '3px', cursor: selectedStructure.hTiles <= 1 ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '11px' }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', color: '#0F172A', minWidth: '16px', textAlign: 'center' }}>
                      {selectedStructure.hTiles}
                    </span>
                    <button
                      onClick={() => handleResizeSelected(0, 1)}
                      disabled={selectedStructure.tileY + selectedStructure.hTiles >= gridRows}
                      style={{ padding: '1px 5px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '3px', cursor: selectedStructure.tileY + selectedStructure.hTiles >= gridRows ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '11px', color: '#10B981' }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Action buttons: Move, Rotate, Remove */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => handleStartMove(selectedStructure.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#0F172A',
                      cursor: 'pointer'
                    }}
                  >
                    <Move size={11} color="#2563EB" />
                    <span>Move</span>
                  </button>

                  <button
                    onClick={handleRotateSelected}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#0F172A',
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCw size={11} color="#10B981" />
                    <span>Rotate</span>
                  </button>

                  <button
                    onClick={() => {
                      handleDeleteSelected();
                      setBuilderContainerView('farm_layout');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      backgroundColor: '#FEE2E2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#B91C1C',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={11} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>

              {/* Controllers & Sensors CRUD Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A' }}>
                      Assigned Controllers ({ensureControllers(selectedStructure).length})
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748B' }}>
                      (Multi-controller architecture)
                    </span>
                  </div>

                  {/* + Assign Controller Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setIsAddingControllerOpen(!isAddingControllerOpen)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        borderRadius: '5px',
                        border: 'none',
                        fontSize: '10px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={11} />
                      <span>Assign Controller</span>
                    </button>

                    {isAddingControllerOpen && (
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        bottom: '100%',
                        marginBottom: '4px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '8px',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                        border: '1px solid #CBD5E1',
                        padding: '4px',
                        zIndex: 30,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        width: '190px'
                      }}>
                        {[
                          'MultiGrow MGC-Pro 16-Ch',
                          'Autogrow EC Mini',
                          'IntelliDose Hub',
                          'IntelliClimate Pro'
                        ].map((m) => (
                          <button
                            key={m}
                            onClick={() => {
                              handleAddController(selectedStructure.id, m as any);
                              setIsAddingControllerOpen(false);
                            }}
                            style={{
                              padding: '5px 8px',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: '4px',
                              textAlign: 'left',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#0F172A',
                              cursor: 'pointer'
                            }}
                          >
                            + {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* List of Controllers and their attached sensors */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {ensureControllers(selectedStructure).map((ctrl) => (
                    <div
                      key={ctrl.id}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      {/* Controller Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A' }}>
                            {ctrl.model}
                          </span>
                          <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#64748B' }}>
                            [{ctrl.serial}]
                          </span>
                          <span style={{ fontSize: '9px', color: '#2563EB', fontWeight: 700, backgroundColor: 'rgba(37, 99, 235, 0.1)', padding: '1px 4px', borderRadius: '3px' }}>
                            {(ctrl.sensors || []).length} sensors
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {/* Add Sensor to this controller */}
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {(['ec', 'ph', 'vpd', 'vwc', 'temp'] as AttachedSensor['type'][]).map(stype => (
                              <button
                                key={stype}
                                onClick={() => handleAddSensor(selectedStructure.id, ctrl.id || ctrl.serial, stype)}
                                title={`Attach ${stype.toUpperCase()} sensor to ${ctrl.model}`}
                                style={{
                                  padding: '1px 4px',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '3px',
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  color: '#475569',
                                  cursor: 'pointer'
                                }}
                              >
                                +{stype.toUpperCase()}
                              </button>
                            ))}
                          </div>

                          {/* Delete Controller Button */}
                          <button
                            onClick={() => handleRemoveController(selectedStructure.id, ctrl.id || ctrl.serial)}
                            title="Remove Controller"
                            style={{
                              padding: '2px 4px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={11} color="#EF4444" />
                          </button>
                        </div>
                      </div>

                      {/* Attached Sensors Chips */}
                      {ctrl.sensors && ctrl.sensors.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          {ctrl.sensors.map((sens) => (
                            <div
                              key={sens.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '1px 5px',
                                backgroundColor: '#FFFFFF',
                                borderRadius: '4px',
                                border: '1px solid #CBD5E1',
                                fontSize: '9px'
                              }}
                            >
                              <span style={{ fontWeight: 700, color: '#0F172A' }}>
                                {sens.name.split(' ')[0]} ({sens.pin}):
                              </span>
                              <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#10B981' }}>
                                {sens.value} {sens.unit}
                              </span>
                              <button
                                onClick={() => handleRemoveSensor(selectedStructure.id, ctrl.id || ctrl.serial, sens.id)}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  color: '#94A3B8',
                                  cursor: 'pointer',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Detach sensor"
                              >
                                <X size={9} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6B. Live Reading Sensor Mode Telemetry Bar for Selected Structure (activeTab === 'view') - CENTERED */}
      {activeTab === 'view' && selectedStructure && (
        <div
          data-map-hud="true"
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: 'calc(100% - 280px)',
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #CBD5E1',
            padding: '10px 20px',
            boxShadow: '0 12px 30px -5px rgba(0,0,0,0.12)',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            pointerEvents: 'auto',
            textAlign: 'center'
          }}
        >
          {/* Facility Name & Hardware Badge - CENTERED */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Cpu size={14} color="#10B981" />
            <span style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A', whiteSpace: 'nowrap' }}>
              {selectedStructure.name}
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: 'monospace',
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              flexShrink: 0
            }}>
              {selectedStructure.controller.model}
            </span>
          </div>

          {/* Real-time Telemetry Metrics - CENTERED */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '11px', color: '#64748B', flexWrap: 'wrap' }}>
            <span>Serial: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{selectedStructure.controller.serial}</strong></span>
            <span>Wi-Fi: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{selectedStructure.controller.rssi} dBm</strong></span>
            <span>EC: <strong style={{ color: '#10B981', fontFamily: 'monospace' }}>{selectedStructure.metrics.ec.toFixed(2)} mS</strong></span>
            <span>pH: <strong style={{ color: '#2563EB', fontFamily: 'monospace' }}>{selectedStructure.metrics.ph.toFixed(2)}</strong></span>
            <span>VPD: <strong style={{ color: '#D97706', fontFamily: 'monospace' }}>{selectedStructure.metrics.vpd.toFixed(2)} kPa</strong></span>
          </div>

          {/* Inspect Controller Button - CENTERED */}
          <button
            onClick={() => {
              setIsHardwareModalOpen(true);
              playSfx('select');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 16px',
              backgroundColor: '#0F172A',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#FFFFFF',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(15,23,42,0.15)',
              marginTop: '2px'
            }}
          >
            <Sliders size={12} color="#10B981" />
            <span>Inspect Controller</span>
          </button>
        </div>
      )}

      {/* 7. Central SVG 3D Isometric Canvas */}
      <svg
        ref={svgRef}
        viewBox="0 0 1080 620"
        onMouseMove={handleSvgMouseMove}
        onClick={() => {
          if (suppressClickRef.current) return;
          if (hoveredTile && (activePlacingItem || movingStructureId)) {
            handleTileClick(hoveredTile.x, hoveredTile.y);
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.15s ease-out'
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

        {/* Concrete Access Roadway */}
        <g id="access-road">
          {Array.from({ length: gridCols }).map((_, rx) => {
            const pA = tileToScreen(rx, 4, 0.5, gridCols, gridRows);
            const pB = tileToScreen(rx + 1, 4, 0.5, gridCols, gridRows);
            const pC = tileToScreen(rx + 1, 5, 0.5, gridCols, gridRows);
            const pD = tileToScreen(rx, 5, 0.5, gridCols, gridRows);
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
          {Array.from({ length: gridCols }).map((_, rx) => {
            const pMidA = tileToScreen(rx + 0.2, 4.5, 0.6, gridCols, gridRows);
            const pMidB = tileToScreen(rx + 0.8, 4.5, 0.6, gridCols, gridRows);
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
        {renderTree('tree-2', gridCols - 0.8, 0.1)}
        {renderTree('tree-3', gridCols - 0.8, gridRows - 0.9)}
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
      {hoveredStructure && !activePlacingItem && !movingStructureId && !isPanning && (() => {
        const [hx, hy] = tileToScreen(
          hoveredStructure.tileX + hoveredStructure.wTiles / 2,
          hoveredStructure.tileY,
          50,
          gridCols,
          gridRows
        );
        let domX = hx;
        let domY = hy;
        const svg = svgRef.current;
        const containerRect = contentAreaRef.current?.getBoundingClientRect();
        const ctm = svg?.getScreenCTM();
        if (svg && ctm && containerRect) {
          const pt = svg.createSVGPoint();
          pt.x = hx;
          pt.y = hy;
          const screenPt = pt.matrixTransform(ctm);
          domX = screenPt.x - containerRect.left;
          domY = screenPt.y - containerRect.top;
        }
        const maxDomX = (containerRect?.width || 900) - 135;
        const isNearTop = domY < 180;
        const clampedX = Math.min(Math.max(135, domX), maxDomX);

        return (
          <div
            style={{
              position: 'absolute',
              left: `${clampedX}px`,
              top: isNearTop ? `${Math.max(70, domY + 24)}px` : `${Math.max(70, domY - 12)}px`,
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
      </div> {/* End Main Content Area (~80%) */}

      {/* 8. Docked Full-Height Facilities Submenu Panel (~20%, 100% height from top to bottom) */}
      <div style={{
        width: '260px',
        minWidth: '260px',
        height: '100%',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: facilitiesPosition === 'right' ? '1px solid #E2E8F0' : 'none',
        borderRight: facilitiesPosition === 'left' ? '1px solid #E2E8F0' : 'none',
        zIndex: 10,
        boxShadow: facilitiesPosition === 'right' ? '-4px 0 15px rgba(0,0,0,0.02)' : '4px 0 15px rgba(0,0,0,0.02)'
      }}>
        {/* Submenu Header with Dock Left/Right Switcher */}
        <div style={{
          padding: '16px 16px 12px 16px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.01em' }}>
              Facilities · {currentFarm.name.split(' ')[0]}
            </span>
            <button
              onClick={() => setFacilitiesPosition(p => p === 'right' ? 'left' : 'right')}
              title={`Dock Facilities to ${facilitiesPosition === 'right' ? 'Left' : 'Right'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 7px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <ArrowLeftRight size={11} />
              <span>{facilitiesPosition === 'right' ? 'Dock Left' : 'Dock Right'}</span>
            </button>
          </div>
          <div style={{ fontSize: '11px', color: '#64748B' }}>
            {structures.length} active bays · {currentFarm.stats.status}
          </div>
        </div>

        {/* Scrollable List of Farm Facilities */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {structures.map(struct => {
            const isSel = selectedId === struct.id;
            const isAttn = struct.controller.status === 'ATTENTION';

            return (
              <div
                key={struct.id}
                onClick={() => handleStructureClick(struct)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: isSel ? '#F1F5F9' : '#FFFFFF',
                  border: `1px solid ${isSel ? '#10B981' : '#E2E8F0'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSel ? '0 2px 8px rgba(16,185,129,0.12)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <div style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: isAttn ? '#F59E0B' : '#10B981',
                      flexShrink: 0
                    }} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {struct.name.split('·')[0].trim()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', color: isAttn ? '#F59E0B' : '#10B981' }}>
                      {struct.metrics.ec.toFixed(1)} mS
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#64748B' }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                    {struct.crop.split('(')[0].trim()}
                  </span>
                  <span style={{ fontFamily: 'monospace' }}>{struct.controller.doseCountHour} DC/h</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 9. Unsaved Changes Prompt Confirmation Modal */}
      {isExitPromptOpen && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 70,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #CBD5E1',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto'
            }}>
              <AlertTriangle size={24} color="#D97706" />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>
              Unsaved Layout Changes
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5', marginBottom: '20px' }}>
              You have modified the farm layout in Builder Mode. Would you like to save your changes before exiting to Live Sensor Monitoring?
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  handleSaveLayout();
                  exitBuilderMode();
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Save size={13} />
                <span>Save & Exit</span>
              </button>
              <button
                onClick={() => {
                  exitBuilderMode();
                }}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  border: '1px solid #FCA5A5',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Discard & Exit
              </button>
              <button
                onClick={() => setIsExitPromptOpen(false)}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Autogrow Hardware Diagnostic Modal */}
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
