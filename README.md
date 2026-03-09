# Treadmill Challenge – Local MVP Monorepo

**Requires Node.js 20 LTS** (use Node ≥ 20).

Interactive treadmill challenge installation for a retail store. Local-first: React + Vite frontend, Node + Fastify backend, SQLite database. TouchDesigner integration is abstracted behind an adapter (mock implementation included).

## Tech stack

- **Frontend:** React 18, TypeScript, Vite
- **Backend:** Node.js, TypeScript, Fastify
- **Database:** SQLite via **sql.js** (no native compilation; works on Windows without Visual Studio)
- **Monorepo:** npm workspaces with shared types in `packages/shared`

## Repository structure

```
root/
  apps/
    frontend/     # React + Vite
    backend/      # Fastify + SQLite
  packages/
    shared/       # Types, DTOs, constants
  package.json
  README.md
```

## Prerequisites

- **Node.js 20 LTS** (required; use Node ≥ 20; Node 16 and 18 are not supported)
- **npm** 9+ (for workspaces)

## Setup

1. **Clone and install dependencies (from repo root):**

   ```bash
   cd treadmill-challenge
   npm install
   ```

2. **Build the shared package** (required before running backend/frontend):

   ```bash
   npm run build:shared
   ```

## Run locally

### Option A: Two terminals

**Terminal 1 – Backend**

```bash
npm run dev:backend
```

- API: http://localhost:3001  
- Health: http://localhost:3001/health  
- SQLite DB file: `apps/backend/data/treadmill.db` (created on first run; persisted by sql.js)

**Terminal 2 – Frontend**

```bash
npm run dev:frontend
```

- App: http://localhost:5173  
- Vite proxies `/api` to the backend at http://localhost:3001.

### Option B: Run both (if your setup supports it)

```bash
npm run dev
```

This runs `dev` in all workspaces that define it (frontend and backend).

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/register` | Register participant (body: `{ name, phone }`) |
| GET    | `/api/leaderboard` | Top runs with participant names |
| GET    | `/api/participants/:id` | Participant details and runs |
| POST   | `/api/run-result` | Submit run result (body: `{ participantId, resultTime, distance, speed }`) |

## End-to-end flow

1. Open http://localhost:5173 (frontend).
2. Click **Register now** and submit **name** and **phone**.
3. Backend saves the participant in SQLite and calls the **TouchDesigner integration adapter** (mock logs the payload).
4. **Leaderboard** shows runs from SQLite (empty until run results are submitted).
5. **POST /api/run-result** stores a run and sets participant status to `finished`. Use this (e.g. via curl or Postman) to add leaderboard data.

### Example: submit a run result

After registering, copy the participant `id` from the response or from the DB. Then:

```bash
curl -X POST http://localhost:3001/api/run-result \
  -H "Content-Type: application/json" \
  -d "{\"participantId\":\"<PARTICIPANT_ID>\",\"resultTime\":120,\"distance\":500,\"speed\":15}"
```

Replace `<PARTICIPANT_ID>` with a real UUID from a registered participant.

## TouchDesigner integration

- **Boundary:** Backend only. No TouchDesigner or OSC code in this repo.
- **Adapter:** `apps/backend/src/integrations/touchdesigner/`
  - **Interface:** `TouchDesignerIntegration` – `sendParticipantRegistered(payload)`.
  - **Mock:** `mockTouchDesignerAdapter` – logs the payload to stdout. Easy to replace with a real OSC/WebSocket/TCP client later.

## NPM scripts (from root)

| Script | Description |
|--------|-------------|
| `npm run build:shared` | Build `packages/shared` |
| `npm run dev:backend` | Start backend (tsx watch) |
| `npm run dev:frontend` | Start frontend (Vite dev server) |
| `npm run dev` | Run dev in all workspaces |
| `npm run build` | Build all workspaces |
| `npm run start:backend` | Run backend from `dist` (run `build:backend` first) |
| `npm run preview:frontend` | Vite preview (run `build:frontend` first) |

## Data model

- **Participant:** `id`, `name`, `phone`, `status` (`registered` \| `queued` \| `running` \| `finished`), `createdAt`
- **Run:** `id`, `participantId`, `resultTime`, `distance`, `speed`, `createdAt`

## Environment (optional)

- **Backend**
  - `PORT` – default `3001`
  - `HOST` – default `0.0.0.0`
  - `DB_PATH` – path to SQLite file; default `./data/treadmill.db` (relative to backend process cwd)

Copy `apps/backend/.env.example` to `apps/backend/.env` to override (e.g. `PORT=3001`).

No authentication, Docker, or cloud services; everything runs locally.
