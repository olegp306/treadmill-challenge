## Architecture — Treadmill Challenge (Local + Remote Admin + Monitoring)

Этот документ описывает систему целиком (локальный продукт в магазине + удалённая админка + контур мониторинга/аудита).

---

## 1) Общая архитектура (компоненты)

### Локальный контур (installation / store PC)
- **Local frontend (kiosk UI)**: `apps/frontend` (React + Vite)
- **Local backend (product server)**: `apps/backend` (Fastify + SQLite/sql.js)
- **TouchDesigner**: внешний процесс (визуализация/сцена/железо)
- **iPad app**: клиентский UI/сценарий на iPad (вне репозитория)
- **Local PC Agent**: локальный агент мониторинга (вне репозитория)

### Удалённый контур (internet / remote hosting)
- **Remote backend**: `apps/remote-backend` (Fastify)
  - Remote Admin API (JWT)
  - Proxy к local backend (в dev может ходить напрямую; в production чаще нужно решение для сети)
  - Health Monitoring ingest (API key)
  - Latest health state / limited history / cleanup
  - Severity calculation
  - Telegram/email alerts + dedup/cooldown
  - Audit log + retention
- **Remote frontend (Remote Administrator UI)**: `apps/remote-frontend` (React + Vite + MUI)

---

## 2) Схема взаимодействия

### 2.1 Health monitoring ingest (основная модель)

```text
[iPad]
   ↓ (опционально) heartbeat / app health
[Local PC Agent]
   ├─ собирает PC health (PCHealth.json)            (вне backend)
   ├─ читает TDHealth.json                          (вне backend)
   ├─ читает/получает IPADHealth.json               (вне backend)
   ↓ POST /api/monitoring/health  (API key)
[Remote Backend]
   ├─ latest health state
   ├─ health history (JSONL)
   ├─ severity calculation (ok/warning/critical)
   ├─ alerts dedup/cooldown
   ├─ audit log
   ↓
[Telegram / Email]
   +
[Remote Admin UI] (просмотр данных/состояния)
```

### 2.2 Основной product flow (store)

```text
[Landing / Kiosk UI (apps/frontend)]
   ↓ POST /api/register, /api/run/start
[Local Backend (apps/backend)]
   ↔ TouchDesigner (OSC UDP)  start/runSession + ack/runState
   ← TouchDesigner (HTTP POST) /api/run-result или /api/touchdesigner/run-result
   ↓
[Leaderboard / Queue screens (apps/frontend)]
```

### 2.3 Remote Admin (управление удалённо)

```text
[Remote Admin UI (apps/remote-frontend)]
   ↓ Authorization: Bearer <remote-jwt>
[Remote Backend (apps/remote-backend)]
   ├─ выдаёт JWT по PIN
   ├─ пишет audit log (login/logout/export/import/edit/delete/view)
   └─ proxy → [Local Backend (apps/backend)] (Authorization: Bearer <local token> в dev)
```

---

## 3) Ответственность компонентов

### Local server (apps/backend)
**Что делает**
- Обслуживает локальный продукт (регистрация, очередь, результаты, лидерборды).
- Интеграция с TouchDesigner через адаптер (OSC/HTTP).
- Предоставляет health status (локальная агрегация): `GET /api/health/status`.
- Предоставляет admin/manager endpoints для управления забегами и данными.

**Порты**
- Default: `3001` (env: `BACKEND_PORT`, fallback `PORT`)

**Примеры endpoint’ов**
- Public/product:
  - `POST /api/register`
  - `POST /api/run/start`
  - `GET /api/run/queue`
  - `POST /api/run-result`
  - `GET /api/leaderboard`
- TouchDesigner:
  - `POST /api/touchdesigner/run-result` (может быть защищён `TD_CALLBACK_TOKEN`)
- Health:
  - `GET /api/health/status`
- Admin (часть):
  - `GET /api/admin/manager/queue-history`
  - `PUT /api/admin/manager/queue-history/:runSessionId/result`
  - `DELETE /api/admin/manager/queue-history/:runSessionId/entry`

**Что НЕ делает**
- Не отправляет Telegram/email alerts из production monitoring контура.
- Не является “host monitoring” сервером с дедупом алертов (это remote backend).
- Не читает внешние PCHealth.json/TDHealth.json/IPADHealth.json из “локального агента” (у local backend своя `GET /api/health/status` агрегация).

### TouchDesigner (external)
**Что делает**
- Запускает визуальную часть, взаимодействует с Kinect/output, генерирует результаты забега.
- Шлёт/принимает OSC:
  - Backend → TD (UDP): `/treadmill/start`, `/treadmill/runSession`
  - TD → Backend (UDP): `/treadmill/ack` или `/treadmill/runState`
- Отправляет результат по HTTP POST в local backend:
  - `POST /api/run-result` или `POST /api/touchdesigner/run-result`
- (Опционально) может генерировать и обновлять `TDHealth.json` для локального health status (локальный backend читает файл по пути).

**Что НЕ делает**
- Не отправляет Telegram/email alerts.
- Не определяет severity уровня “critical/warning” на стороне host monitoring.

### iPad app (external)
**Что делает**
- Показывает UI/управляет пользовательским сценарием.
- Может отправлять heartbeat/app health (в текущем проекте локальный backend использует heartbeat events).

**Что НЕ делает**
- Не определяет critical/warning.
- Не отправляет Telegram/email.

### Local PC Agent (external)
**Что делает**
- Собирает PC health (CPU/RAM/disk/internet/appRunning).
- Читает `TDHealth.json` и `IPADHealth.json` (или получает iPad health иначе).
- Формирует единый health payload и отправляет его наружу:
  - `POST https://<remote-backend>/api/monitoring/health`

**Что НЕ делает**
- Не определяет critical/warning (backend делает расчёт).
- Не отправляет Telegram/email.

### Remote backend (apps/remote-backend)
**Что делает**
- **Remote Admin**:
  - PIN → JWT login: `POST /api/remote/admin/login`
  - Proxy endpoints для действий в локальном backend (runs/export/import/health/recent, и т.д.)
  - Audit log событий admin действий (login/logout/view/export/import/edit/delete)
- **Health Monitoring (host monitoring)**:
  - `POST /api/monitoring/health` с API key auth
  - Валидация payload (zod)
  - Ограничения размера + rate limit
  - Latest state + limited history (JSONL) + cleanup
  - Severity calculation (ok/warning/critical) + problems codes
  - Telegram/email alerts + dedup/cooldown
  - Audit log (отдельно от monitoring)

**Порты**
- Default: `3002` (env: `REMOTE_BACKEND_PORT`)

**Что НЕ делает**
- Не читает локальные файлы `PCHealth.json/TDHealth.json/IPADHealth.json` на машине магазина.
- Не пингует iPad напрямую.
- Не генерирует `TDHealth.json`.

### Remote frontend/admin (apps/remote-frontend)
**Что делает**
- UI удалённого администратора (Мониторинг/Экспорт-импорт/Забеги/Система)
- Авторизация по JWT, хранение токена в `sessionStorage`
- Делает запросы **только** в remote backend (`/api/remote/...`)

**Что НЕ делает**
- Не является источником health data.
- Не обращается напрямую к local backend.

---

## 4) Данные и форматы

Ниже форматы, которые участвуют в системе (часть — “вне backend”, но описаны как контракт).

### 4.1 PCHealth.json (external; Local PC Agent)
**Кто создаёт**: Local PC Agent  
**Кто читает**: Local PC Agent (для формирования payload)  
**Где хранится**: локально на store PC (по соглашению агента)  
**Частота**: обычно 1–5 секунд  
**Лимиты**: не должен включать бинарные данные/логи/stack traces

Пример (концептуальный):

```json
{
  "status": "ok",
  "cpu": 32,
  "ram": 58,
  "diskFreeGb": 120,
  "appRunning": true,
  "internet": true,
  "errors": []
}
```

### 4.2 TDHealth.json (external; TouchDesigner)
**Кто создаёт**: TouchDesigner  
**Кто читает**: local backend (`GET /api/health/status`)  
**Где хранится**: по умолчанию `./runtime/health/TDHealth.json` относительно cwd backend; override: `TD_HEALTH_FILE_PATH`  
**Частота**: 1–2 секунды (рекомендация)  

Пример: см. `docs/health-monitoring.md` (раздел **TDHealth.json**).

### 4.3 IPADHealth.json (external; iPad/Agent)
**Кто создаёт**: iPad app или Local PC Agent  
**Кто читает**: Local PC Agent  
**Где хранится**: локально на store PC (по соглашению агента)  
**Частота**: 5–15 секунд (примерно)

Пример (концептуальный):

```json
{
  "ipadId": "ipad-01",
  "ip": "192.168.1.50",
  "online": true,
  "lastSeen": "2026-04-28T13:00:00+02:00",
  "battery": 84,
  "appActive": true,
  "errors": []
}
```

### 4.4 Health Payload (Remote monitoring ingest)
**Кто создаёт**: Local PC Agent  
**Кто читает**: Remote backend (`POST /api/monitoring/health`)  
**Где хранится (remote)**:
- latest state: `${REMOTE_RUNTIME_DIR}/monitoring/latest/<hash>.json`
- history: `${REMOTE_RUNTIME_DIR}/monitoring/events/YYYY-MM-DD/events.jsonl`

Пример (сокращённо; `touchDesigner`/`ipad` optional):

```json
{
  "projectId": "project-01",
  "locationId": "munich-01",
  "deviceId": "pc-01",
  "timestamp": "2026-04-28T13:00:00+02:00",
  "agent": { "version": "1.0.0", "startedAt": "...", "lastSuccessfulPostAt": "...", "errors": [] },
  "pc": { "status": "ok", "cpu": 32, "ram": 58, "diskFreeGb": 120, "appRunning": true, "internet": true, "errors": [] },
  "touchDesigner": null,
  "ipad": null
}
```

**Текущие лимиты (enforced)**
- health payload max: **64 KB**
- errors max: **20** на блок
- error string max: **500** символов
- rate limit: **1 запрос / device / 5 сек**
- health history retention: **7 дней**
- alert cooldown: **10 минут** per `(project, location, device, problemCode)`

### 4.5 Audit Log Event (Remote backend)
**Кто создаёт**: Remote backend (на admin actions + monitoring-related service events при необходимости)  
**Где хранится**: `${REMOTE_RUNTIME_DIR}/audit/YYYY-MM-DD/audit.jsonl`  
**Retention**: **90 дней** (cleanup job)
**Лимит**: `metadata` max **16 KB** (truncate-safe)

Пример:

```json
{
  "userId": null,
  "userEmail": null,
  "action": "EXPORT_COMPLETED",
  "entityType": "backup_json",
  "entityId": null,
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0 ...",
  "timestamp": "2026-05-06T11:10:00.000Z",
  "metadata": { "hours": 48, "bytes": 123456 }
}
```

---

## 5) Запуск системы

### 5.1 Local development (repo)

**Базовый запуск local продукта**
- `npm run dev:local` (backend + frontend)

**Запуск remote admin**
- `npm run dev:remote` (remote-backend + remote-frontend)

**Запуск всего вместе**
- `npm run dev:all`

**Остановить dev порты (Windows-friendly)**
- `npm run dev:stop`

### 5.2 Production / installation (рекомендованная модель)

**На локальном ПК инсталляции**
- Local backend + local frontend (kiosk)
- TouchDesigner (сцена)
- iPad app
- Local PC Agent (monitoring payload sender)

**На remote hosting**
- Remote backend (admin + monitoring + alerts + audit)
- Remote frontend (Remote Administrator UI)

**Что должен знать TouchDesigner developer**
- локальные UDP/HTTP порты (OSC + callback)
- куда писать `TDHealth.json` (если используется)
- что TD не занимается алертами и не определяет severity

**Что должен знать backend/admin developer**
- портовая схема
- env variables для auth (admin pins/tokens; monitoring API key)
- ограничения payload и cooldown/dedup

---

## 6) Порты (таблица)

| Component | Default port | Env variable | Who uses it | Notes |
|----------|--------------|--------------|------------|------|
| Local backend (apps/backend) | 3001 | `BACKEND_PORT` (fallback `PORT`) | local frontend, TD callbacks | Fastify |
| Local frontend (apps/frontend) | 5173 | `FRONTEND_PORT` | kiosk browser, iPad browser | Vite `strictPort: true` |
| Remote backend (apps/remote-backend) | 3002 | `REMOTE_BACKEND_PORT` | remote frontend, agents | Fastify |
| Remote frontend (apps/remote-frontend) | 5174 | `REMOTE_FRONTEND_PORT` | browser | Vite `strictPort: true` |
| TouchDesigner OSC inbound (TD) | 7000/UDP | `TD_OSC_PORT` | local backend → TD | TD listens here |
| Backend OSC inbound (ack/runState) | 7001/UDP | `TD_OSC_ACK_LOCAL_PORT` | TD → local backend | backend listens here |

Если порт задаётся через env — используйте `.env`/shell vars (см. `apps/backend/.env.example`).

---

## 7) Скрипт запуска local продукта (настраиваемые порты)

Добавлен скрипт: `scripts/start-local-product.sh`

Он запускает **только** local backend + local frontend (remote backend не запускает).
Поддерживает параметры или env:
- `LOCAL_BACKEND_PORT` (default 3001)
- `LOCAL_FRONTEND_PORT` (default 5173)
- `REMOTE_BACKEND_URL` (только печать/информирование; default пусто)

Пример:

```bash
LOCAL_BACKEND_PORT=3001 LOCAL_FRONTEND_PORT=5173 REMOTE_BACKEND_URL=https://remote.example.com ./scripts/start-local-product.sh
```

---

## 8) Remote server connectivity (NAT / firewall)

Remote backend **не должен** “сам доставать” локальный сервер, если локальный сервер за NAT/firewall.

**Основная модель для Health Monitoring**
- Local PC Agent сам отправляет данные наружу:
  - исходящий HTTPS `POST /api/monitoring/health` на remote backend URL
- Remote backend принимает входящие POST запросы.

**Входящий доступ с хостинга к локальному ПК для monitoring не нужен.**
Нужен только исходящий доступ store PC в интернет к remote backend URL.

Если потребуется доступ из облака к локальному серверу (не для monitoring), это отдельная задача и потребует:
- public static IP + port forwarding, или
- VPN, или
- reverse tunnel, или
- Tailscale/ZeroTier, или
- cloud relay.

---

## 9) Not implemented / out of scope

- backend не читает локальные файлы `PCHealth.json / TDHealth.json / IPADHealth.json` на store PC (это зона local PC agent)
- backend не пингует iPad
- backend не подключается к локальному TouchDesigner процессу напрямую (кроме OSC/HTTP в local контуре)
- backend не запускает local product
- local agent не отправляет Telegram/email
- alert acknowledgment пока не реализован (нет UI/workflow)

