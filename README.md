# Treadmill Challenge – Local MVP Monorepo

**Requires Node.js 20 LTS** (use Node ≥ 20).

Interactive treadmill challenge installation for a retail store. Local-first: React + Vite frontend, Node + Fastify backend, SQLite database. TouchDesigner integration is abstracted behind an adapter (mock implementation included).

---

## Quick start (simple guide)

### 1. Set up your environment

- Install **Node.js 20** or newer on your computer. Check: open a terminal and type `node -v`. You should see a number like 20.x.x.
- Open a terminal and go to the project folder: `cd treadmill-challenge`.
- Install dependencies: run `npm install`.
- Build the shared package (you need to do this once): run `npm run build:shared`.

### 2. Run the app

You need the backend and the frontend running.

**Easy way – one command:**  
Run `npm run dev`. This starts both. Wait a few seconds.

**Or use two terminals:**

- **Terminal 1:** run `npm run dev:backend`. Leave it open. Backend will run on port 3001.
- **Terminal 2:** run `npm run dev:frontend`. Leave it open. Frontend will run on port 5173.

When you see “ready” or “listening” in the terminal, the app is running.

### 3. Open the app and see all pages

Open your browser and go to: **http://localhost:5173**

You can visit these pages:

| Page            | URL                         | What you see                          |
|-----------------|-----------------------------|----------------------------------------|
| Welcome         | http://localhost:5173/      | Home page with “Register now” link    |
| Registration    | http://localhost:5173/register | Form to add your name and phone     |
| Leaderboard     | http://localhost:5173/leaderboard | List of best runs and participants |
| Result          | http://localhost:5173/result | Run result page                      |
| Start running   | http://localhost:5173/start | Name, phone, sex → TouchDesigner     |

Click the links in the app or type the URLs in the browser to open each page.  
If the page does not load, check that the frontend is running (Terminal 2 or `npm run dev`).

---

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

This runs the backend and frontend together in parallel (backend on port 3001, frontend on 5173).

### Run automatically after reboot (Windows)

To start the app when you log in to Windows:

**Option A – Startup folder (easiest)**

1. Create a **shortcut** to the script `start-app.bat` in the project root:
   - Right‑click `start-app.bat` → **Create shortcut**.
2. Press **Win + R**, type `shell:startup`, press Enter. A folder opens.
3. Move or copy the shortcut into that folder.
4. After the next reboot (or logoff/logon), the app will start when you log in. A console window will open and run backend + frontend. Close the window to stop the app.

**Option B – Task Scheduler**

1. Open **Task Scheduler** (search in Start menu).
2. Click **Create Basic Task**. Name it e.g. “Treadmill Challenge”, click Next.
3. Trigger: **When I log on**, Next.
4. Action: **Start a program**, Next.
5. Program: click **Browse** and choose `start-app.bat` in your project folder (e.g. `C:\Repos\treadmill-challenge\start-app.bat`). Leave arguments empty. Next → Finish.
6. Optional: right‑click the task → Properties → **Run whether user is logged on or not** if you want it to run before you log in (you may need to enter your password).

The script `start-app.bat` runs `npm run dev` from the project folder. Make sure Node.js 20 is installed and you have run `npm install` and `npm run build:shared` at least once before using autorun.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/register` | Register participant (body: `{ name, phone, sex?, runMode?, runName? }`) |
| GET    | `/api/leaderboard` | Top runs with participant names |
| GET    | `/api/participants/:id` | Participant details and runs |
| POST   | `/api/run-result` | Submit run result (body: `{ participantId, resultTime, distance, speed }`) |
| GET    | `/api/touchdesigner/run-result` | Get run result data from TouchDesigner (204 if none) |

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

## TouchDesigner integration (e.g. connection by OCR)

- **Boundary:** Backend only. No TouchDesigner or OSC code in this repo.
- **Adapter:** `apps/backend/src/integrations/touchdesigner/`
  - **Interface:** `TouchDesignerIntegration`:
    1. **`sendParticipantRegistered(payload)`** — send to TouchDesigner: `login` (participant id), `name`, `phone`, `sex`, `runMode` (`time` \| `1km` \| `5km`), `runName`. Called after registration.
    2. **`getRunResultFromTouchDesigner()`** — get run result data from TouchDesigner (returns `RunResultDto | null`). Use **GET /api/touchdesigner/run-result** to poll, or have TouchDesigner push via **POST /api/run-result**.
  - **Mock:** `mockTouchDesignerAdapter` – logs outgoing payload.
  - **OSC:** `oscTouchDesignerAdapter` – sends OSC message via UDP.

### TouchDesigner quick setup (comfortable mode)

Use env vars in backend terminal before `npm run dev:backend` (PowerShell):

```bash
$env:TD_ADAPTER="osc"
$env:TD_OSC_HOST="127.0.0.1"
$env:TD_OSC_PORT="7000"
$env:TD_OSC_START_ADDRESS="/treadmill/start"
```

Then open `http://localhost:5173/start`, fill form, choose mode (**time / 1km / 5km**), click **Start**.

Backend sends one OSC message:

- **Address:** `/treadmill/start` (or `TD_OSC_START_ADDRESS`)
- **Args order (all strings):**
  1. `login`
  2. `name`
  3. `phone`
  4. `sex`
  5. `runMode` (`time` \| `1km` \| `5km`)
  6. `runName`

For local verification without TouchDesigner, set `TD_ADAPTER=mock` and check backend log line:
`[TouchDesigner Mock] sendParticipantRegistered: ...`

### Quick check with TouchDesigner developer

1. Run backend + frontend: `npm run dev`
2. Open: `http://localhost:5173/start`
3. Fill Name + Phone, pick Sex, pick mode (**Time / 1 km / 5 km**), click **Start**
4. In backend terminal, check log line: `[TouchDesigner Mock] sendParticipantRegistered: ...`
5. Verify payload contains:
   - `login`
   - `name`
   - `phone`
   - `sex`
   - `runMode` (`time` / `1km` / `5km`)
   - `runName`

If you replace mock adapter with OSC sender, keep the same payload fields to validate protocol mapping on TouchDesigner side.

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
