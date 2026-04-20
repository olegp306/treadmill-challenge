# Treadmill Challenge – Local MVP Monorepo

**Requires Node.js 20 LTS** (use Node ≥ 20).

Interactive treadmill challenge installation for a retail store. Local-first: React + Vite frontend, Node + Fastify backend, SQLite database. TouchDesigner integration is abstracted behind an adapter (mock implementation included).

**Интеграция TouchDesigner (RU):** полный цикл OSC/HTTP, URL лидербордов — [docs/touchdesigner-integration-ru.md](docs/touchdesigner-integration-ru.md). Совместимость **ack / runState / HTTP** и таймауты — [docs/touchdesigner-compat-ru.md](docs/touchdesigner-compat-ru.md).

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

### 3a. Open the app on your phone (same Wi‑Fi)

1. Connect your **phone and laptop to the same Wi‑Fi** network.
2. From the repo root, run `npm install` (once), then `npm run dev` (starts backend + frontend).
3. When the Vite dev server is ready, the **frontend** terminal prints a **LAN URL** (for example `http://192.168.x.x:5173`) and an **ASCII QR code**. Scan the QR with your phone’s camera, or type the URL in the mobile browser.
4. Optional: run `npm run print-dev-qr` in another terminal to print the same URL and QR again (default port **5173**; override with `PORT=5174 npm run print-dev-qr` on Unix, or `set PORT=5174&& npm run print-dev-qr` on Windows if you use a different port).

The dev server listens on all interfaces (`host: true` / `vite --host`), so the app is available at your machine’s local IP, not only `localhost`. API calls from the phone go to `/api` on the Vite dev server, which **proxies** to the backend on `localhost:3001`. The backend listens on `0.0.0.0:3001`; CORS in development allows requests from your phone’s origin.

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
| GET    | `/api/run/queue` | Active global queue (`queued` + `running`) in JSON |
| GET    | `/api/run/queue.tsv` | Active global queue export in TSV (`text/tab-separated-values`) |
| GET    | `/api/participants/:id` | Participant details and runs |
| POST   | `/api/run-result` | Submit run result (body: `{ participantId, resultTime, distance, speed }`) |
| GET    | `/api/touchdesigner/run-result` | Get run result data from TouchDesigner (204 if none) |

### `/api/run/queue.tsv` format

TSV export returns **header + rows** in this strict column order:

```text
runSessionId	participantId	firstName	lastName	phone	runTypeId	runTypeName	status	createdAt
```

Rules:

- Includes only active sessions: `queued` and `running`
- Excludes `finished`, `cancelled`, and other non-active statuses
- Uses queue/FIFO order: `createdAt ASC, id ASC`
- If queue is empty, returns only header row

Example:

```text
runSessionId	participantId	firstName	lastName	phone	runTypeId	runTypeName	status	createdAt
2f1f6f1d-2a4d-4af2-a7f9-5b6d4f6e5b1a	9d7fcd8e-e1f2-4a6c-9f7a-1f0d2b8e3c10	Олег	Петров	+79990001122	1	Золотой километр	running	2026-04-20T18:12:10.123Z
6df8a3f9-3b5d-4f5a-b2c1-4d8f9a2e7b12	a2b9c3d4-e5f6-47a8-b9c0-1234567890ab	Иван	Сидоров	+79990003344	0	Максимум за 5 минут	queued	2026-04-20T18:13:41.552Z
```

## Current kiosk flow notes

- **Prepare screen (`/run/prepare`)**:
  - top-right label format is `Имя Ф.` (example: `Олег П.`),
  - closes by tap/click on any point of the form,
  - auto-closes after 10 seconds to home,
  - no `Ок` button.
- **Running state screen** (`Вы на дорожке. Забег идет.`) is removed from kiosk flow:
  - when session becomes `running`, app navigates directly to home.

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

**Старт забега (run session) и OSC-ack «дорожка свободна / занята»**

После `POST /api/run/start` backend шлёт **UDP OSC** на `TD_OSC_HOST`:`TD_OSC_PORT` (по умолчанию `127.0.0.1:7000`):

- **Адрес:** `TD_OSC_RUN_SESSION_ADDRESS` (по умолчанию `/treadmill/runSession`)
- **Аргументы (по порядку):** `runSessionId`, `participantId`, `firstName`, `lastName`, `phone`, `runTypeId` (int), `runTypeName`, `runTypeKey`

TouchDesigner должен ответить **отдельным UDP OSC** на хост backend-машины, на порт **`TD_OSC_ACK_LOCAL_PORT`** (по умолчанию **7001**):

- **Адрес:** `TD_OSC_ACK_ADDRESS` (по умолчанию `/treadmill/ack`)
- **Аргументы:** `runSessionId` (string, тот же UUID), `status` (string) — **`free`** или **`busy`** (допускаются `1`/`0`, `true`/`false`)

Таймаут ожидания ack: **`TD_OSC_ACK_TIMEOUT_MS`** (по умолчанию 8000 ms). Если ack не пришёл — статус **`unknown`**; сессия тогда обрабатывается как не **`busy`** (переходит в **running**). Явный **`busy`** оставляет сессию в очереди.

Отключить ожидание ack (локальная отладка): **`TD_OSC_ACK_DISABLED=1`** — сразу **`unknown`** (то же поведение, что после таймаута).

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

### TouchDesigner finish callback (recommended)

When TouchDesigner finishes a run, post result data to backend:

- **Primary endpoint:** `POST /api/touchdesigner/run-result`
- **Body (JSON):**
  - `runSessionId` (string, required)
  - `resultTime` (number, seconds, required)
  - `distance` (number, meters, required)

If `TD_CALLBACK_TOKEN` is configured on backend, send one of:

- `X-TD-Token: <token>`
- `Authorization: Bearer <token>`

Idempotency behavior:

- If the same `runSessionId` finish callback is sent twice, backend returns existing saved result for the already finished session instead of failing.

Quick curl example:

```bash
curl -X POST "http://localhost:3001/api/touchdesigner/run-result" \
  -H "Content-Type: application/json" \
  -H "X-TD-Token: <TD_CALLBACK_TOKEN>" \
  -d "{\"runSessionId\":\"<RUN_SESSION_ID>\",\"resultTime\":312.5,\"distance\":1000}"
```

Optional local smoke script:

```bash
npm run td:callback:smoke -- --runSessionId <RUN_SESSION_ID> --resultTime 312.5 --distance 1000
```

If token is enabled:

```bash
npm run td:callback:smoke -- --runSessionId <RUN_SESSION_ID> --resultTime 312.5 --distance 1000 --token <TD_CALLBACK_TOKEN>
```

Auto-pick a real queue session (prefers `running`, then first `queued`):

```bash
npm run td:callback:smoke -- --autoFromQueue --resultTime 312.5 --distance 1000
```

Optional filters:

```bash
npm run td:callback:smoke -- --autoFromQueue --runTypeId 1 --sex female --resultTime 312.5 --distance 1000 --token <TD_CALLBACK_TOKEN>
```

## API-контракт: приложение ↔ TouchDesigner

### 1. Краткое описание

- Система запускает забег, отправляет данные участника/забега в TouchDesigner и принимает результат финиша обратно в backend.
- Взаимодействие с TouchDesigner:
  - при старте забега (backend -> TD, через адаптер/OSC),
  - при финише (TD -> backend, HTTP callback).
- Общий flow: **запуск забега -> отправка данных в TD -> TD возвращает результат -> backend сохраняет и считает место**.

### 2. Base URL / Endpoint

- Callback от TouchDesigner в backend:
  - **Method:** `POST`
  - **URL:** `https://<BACKEND_HOST>/api/touchdesigner/run-result`
- Если включен `TD_CALLBACK_TOKEN`, передать один из заголовков:
  - `X-TD-Token: <token>`
  - `Authorization: Bearer <token>`

### 3. Request: что отправляем в TouchDesigner (старт забега)

> Отправка старта идет через интеграционный адаптер (обычно OSC), не через публичный HTTP endpoint.

| Поле | Тип | Обяз. | Описание |
|---|---|---:|---|
| `runSessionId` | `string` | да | Уникальный ID забега |
| `participant.firstName` | `string` | да | Имя участника |
| `participant.lastName` | `string` | да | Фамилия участника |
| `participant.phone` | `string` | да | Телефон участника |
| `run.runTypeId` | `number` (`0/1/2`) | да | Тип забега |
| `run.runTypeName` | `string` | да | Название типа забега |
| `timestamp` | `string` | нет | В текущем контракте не передается (опционально на стороне TD) |

Пример payload (логический JSON-эквивалент старт-сообщения):

```json
{
  "runSessionId": "b2d2b5da-7b40-4e56-9ab7-4f5df06b5f87",
  "participant": {
    "firstName": "Иван",
    "lastName": "Петров",
    "phone": "+79991234567"
  },
  "run": {
    "runTypeId": 1,
    "runTypeName": "Золотой километр"
  }
}
```

### 4. Response: что ожидаем от TouchDesigner (финиш)

| Поле | Тип | Обяз. | Описание |
|---|---|---:|---|
| `runSessionId` | `string` | да | ID забега для сопоставления |
| `participant.firstName` | `string` | да | Имя участника |
| `participant.lastName` | `string` | да | Фамилия участника |
| `participant.phone` | `string` | да | Телефон участника |
| `run.runTypeId` | `number` (`0/1/2`) | да | Тип забега |
| `run.runTypeName` | `string` | да | Название типа забега |
| `result.resultTime` | `number` | да | Время в секундах |
| `result.distance` | `number` | да | Дистанция в метрах |
| `result.rank` | `number` | да | Место в рейтинге |

Ожидаемый self-contained callback:

```json
{
  "runSessionId": "b2d2b5da-7b40-4e56-9ab7-4f5df06b5f87",
  "participant": {
    "firstName": "Иван",
    "lastName": "Петров",
    "phone": "+79991234567"
  },
  "run": {
    "runTypeId": 1,
    "runTypeName": "Золотой километр"
  },
  "result": {
    "resultTime": 243.7,
    "distance": 1000,
    "rank": 3
  }
}
```

### 5. Важные правила

- `runSessionId` обязателен для связи старта и финиша.
- Результат должен приходить только для ранее отправленного `runSessionId`.
- Callback должен быть self-contained: participant + run + result в одном payload.
- Формат чисел:
  - `result.resultTime` — секунды (`number`),
  - `result.distance` — метры (`number`),
  - `result.rank` — целое место (`number`).
- Если пришли невалидные данные, backend вернет `400` и результат не сохранится.
- Повторная отправка того же финиша обрабатывается идемпотентно (`duplicate: true` в ответе).

### 6. Error handling (кратко)

- TouchDesigner не отвечает / callback не пришел:
  - забег остается без финального результата до получения callback или ручного действия оператора.
- Некорректный callback:
  - `400` (ошибка валидации),
  - `401` (если неверный token при включенной защите),
  - `404` (если `runSessionId` не найден).

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
