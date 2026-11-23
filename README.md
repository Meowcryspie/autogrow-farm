# 🌱 Autogrow Farm OS (`autogrow-farm`)

> High-precision Local-First CEA (Controlled Environment Agriculture) Edge Engine, Diurnal Telemetry Simulator, and SCADA Farm Controller.

---

## 🏗️ Architecture Overview

`autogrow-farm` is built as an offline-resilient, local-first monorepo designed for commercial greenhouse and indoor hydroponic farming operations.

```
autogrow-farm/
├── shared/       # Shared TypeScript contracts, Zod schemas, SQLite & Postgres DDLs
├── edge/         # Local Edge Node daemon with SQLite WAL mode, rule engine, diurnal simulator, and WebSockets
├── dashboard/    # Vite + React SCADA controller & responsive mobile app view with 3D isometric models
└── mobile/       # Mobile application client (React Native / PWA)
```

---

## ✨ Features

- **Local-First Edge Reliability**: Powered by Node 22 native `node:sqlite` in WAL mode. Closed-loop nutrient dosing, irrigation valves, and safety interlocks run 24/7 on-site without requiring active internet connectivity.
- **Physical Diurnal Simulation**: Simulates solar radiation accumulation, temperature curve transitions, crop transpiration, EC consumption, and rockwool substrate dry-back.
- **Safety Interlocks & Bounded Commands**: Actuator commands have strict expiry windows (`expires_at <= created_at + 10s`) and duration caps (`<= 60s`) to prevent runaway dosing or flooding.
- **3D Isometric Greenhouses & Farms**: Interactive 2.5D visual representations of greenhouses, water storage tanks, and hydroponic gutter beds.
- **Curved Radial Sweep EC Gauge**: Sub-second telemetry needle rendering real-time electrical conductivity with target corridor tolerance bands.
- **Dual Form Factor SCADA**: One-click toggle between full desktop SCADA matrix mode and a high-fidelity mobile view (with automatic edge-to-edge rendering on physical smartphones over Wi-Fi/LAN).

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js >= 22.x
- npm >= 10.x

### 2. Install Dependencies & Build
```bash
# Clone the repository
git clone https://github.com/Meowcryspie/autogrow-farm.git
cd autogrow-farm

# Install all workspace dependencies
npm install

# Build shared contracts, edge engine, and dashboard
npm run build --workspaces
```

### 3. Run Edge Server & SCADA Dashboard
```bash
cd edge
npm start
```
The server will start on `http://0.0.0.0:8080`:
- **Desktop SCADA / Mobile Simulator**: [http://localhost:8080/](http://localhost:8080/)
- **Physical Phone View**: `http://<your-lan-ip>:8080/`
- **Real-Time Telemetry Stream**: `ws://localhost:8080/ws`
- **REST Endpoints**:
  - `GET /health` - System health, SQLite WAL size, connected clients
  - `GET /api/telemetry/latest` - Latest zone telemetry tick
  - `POST /api/commands` - Dispatch bounded actuator pulse commands

---

## 📜 Anti-AI Design Standard Compliance
Built adhering to the matte carbon surfaces, anodized titanium accents, hairline borders, and authentic CEA metrics (EC, pH, VPD, PPFD, VWC%) outlined in `DESIGN_RULEBOOK.md`.

---

## 📄 License
MIT © Autogrow
