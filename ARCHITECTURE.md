# Autogrow Ecosystem Architecture & Implementation Blueprint

**Version:** 1.0  
**Target Environment:** Multi-Package Monorepo (Edge Mini-PC, Local Farm SCADA Dashboard, Cloud VPS, Mobile App)  
**Primary Region:** Malaysia, New Zealand & ASEAN Commercial CEA / AgTech Deployments  

---

## 1. Repository Strategy (Strict Two-Repo Isolation)

To enforce a hard boundary between public marketing operations and live agricultural control systems, the ecosystem is split into two distinct repositories:

1. **`autogrow-web` (Existing Repository)**
   - **Scope:** Public marketing website, admin content management (CMS), and customer Request-for-Quotation (RFQ) portal.
   - **Hosting:** Static CDN / Vercel / GitHub Pages (`autogrow.my`).
   - **Integration Point:** Contains a single **"Farm Login"** navigation link pointing to `app.autogrow.my`. Shares zero operational code or control databases with the farm.

2. **`autogrow-farm` (This Monorepo)**
   - **Scope:** All operational farm software—shared contracts, edge mini-PC engine, central cloud relay, unified web dashboard, and mobile app.
   - **Why a Monorepo:** TypeScript interfaces, validation schemas, and database definitions are written once in `shared/` and imported by `edge/`, `cloud/`, `dashboard/`, and `mobile/`. A change in a sensor metric cannot accidentally break the API or mobile app.

---

## 2. Monorepo Directory Structure

```text
autogrow-farm/
├── shared/                  # Single source of truth for types, Zod schemas, MQTT topics & DB DDLs
│   ├── src/
│   │   ├── types/           # SensorReading, DeviceState, ActuatorCommand, AlarmEvent
│   │   ├── schemas/         # Runtime payload validation (Zod)
│   │   ├── constants/       # MQTT topic builders, safety limits, metric units
│   │   └── db/              # SQLite (Edge) & PostgreSQL (Cloud) schema definitions
│   ├── package.json
│   └── tsconfig.json
├── edge/                    # On-site Linux Mini-PC software (Docker Compose & Node edge daemon)
│   ├── mosquitto/           # Local MQTT broker config
│   ├── worker/              # Ingestion, local automation rules, SQLite WAL writer, cloud sync
│   └── docker-compose.yml
├── cloud/                   # Central Cloud VPS backend (PostgreSQL + Cloud MQTTS + API)
├── dashboard/               # Unified Web Dashboard (served locally on Edge & hosted at app.autogrow.my)
├── mobile/                  # React Native + Expo SDK (TypeScript) iOS & Android App
├── package.json             # Workspace configuration (npm/pnpm workspaces)
└── ARCHITECTURE.md          # This specification document
```

---

## 3. Core Operational Mechanics

1. **Offline-First Edge Execution**:
   - The mini-PC inside the greenhouse is the primary operational brain.
   - Sensors publish readings (EC, pH, VPD, Substrate VWC%, Light PPFD) to a local Mosquitto MQTT Broker on the farm LAN.
   - The Edge Worker writes raw sensor readings into SQLite (WAL mode) and evaluates automation rules (dosing pumps, irrigation valves, vents) with zero internet dependency.

2. **Store-and-Forward + Idempotent Upserts**:
   - The mini-PC initiates an **outbound** encrypted connection to the cloud server (bypassing rural 4G CGNAT).
   - High-frequency raw readings remain stored locally on the mini-PC.
   - 1-minute rollups are synced to cloud PostgreSQL with `ON CONFLICT (farm_id, sensor_id, bucket_minute) DO UPDATE`, guaranteeing zero duplicate data spikes.

3. **Command Safety & Expiry**:
   - Every remote command includes `command_id` (UUID), bounded `duration_sec` (e.g. 15s), and `expires_at` (UTC timestamp).
   - If a command is delayed in transit, the mini-PC drops it immediately once expired.
   - Hardware max-runtime caps are enforced on the edge box.
