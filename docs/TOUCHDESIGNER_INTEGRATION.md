## TouchDesigner Integration — Quick Guide

Этот документ предназначен только для разработчика TouchDesigner сцены. Полная версия интеграции: `docs/touchdesigner-integration-ru.md`.

---

## Что запускается локально (store PC)

- **Local backend** (`apps/backend`) — API и интеграция с TD
- **Local frontend** (`apps/frontend`) — киоск UI / экраны
- **TouchDesigner** — сцена/визуализация

Рекомендуемые dev порты:
- Local backend: **3001** (`BACKEND_PORT`)
- Local frontend: **5173** (`FRONTEND_PORT`)

---

## Как запустить local product (без remote backend)

Из корня репозитория:

```bash
./scripts/start-local-product.sh
```

С кастомными портами:

```bash
LOCAL_BACKEND_PORT=3001 LOCAL_FRONTEND_PORT=5173 ./scripts/start-local-product.sh
```

Скрипт выводит итоговые URL в консоль и запускает backend + frontend.

---

## OSC порты и адреса (TD ↔ backend)

Задаются через env в backend:

- **Backend → TD (outbound UDP)**
  - `TD_OSC_HOST` (default `127.0.0.1`)
  - `TD_OSC_PORT` (default **7000**)
  - `TD_OSC_START_ADDRESS` (default `/treadmill/start`)
  - `TD_OSC_RUN_SESSION_ADDRESS` (default `/treadmill/runSession`)

- **TD → Backend (inbound UDP)**
  - `TD_OSC_ACK_LOCAL_PORT` (default **7001**) — backend слушает этот порт
  - `TD_OSC_ACK_ADDRESS` (default `/treadmill/ack`)
  - `TD_OSC_RUN_STATE_ADDRESS` (default `/treadmill/runState`)

---

## HTTP callback результата забега

TouchDesigner должен отправлять результат по HTTP в local backend:

- `POST http://localhost:3001/api/run-result` (для внутренней сети/dev)
- или `POST http://localhost:3001/api/touchdesigner/run-result` (может требовать токен)

Если включён токен:
- env: `TD_CALLBACK_TOKEN`
- заголовок: `X-TD-Token: <token>` или `Authorization: Bearer <token>`

Тело (пример):

```json
{
  "runSessionId": "<uuid>",
  "resultTime": 300.5,
  "distance": 1200.3,
  "verificationPhotoBase64": "data:image/jpeg;base64,..."
}
```

---

## TDHealth.json (для локального health status)

Local backend умеет читать **опциональный** файл здоровья TD.

- Default path (относительно cwd backend): `./runtime/health/TDHealth.json`
- Override: `TD_HEALTH_FILE_PATH`

Если файл отсутствует/невалидный — backend не падает, `td.healthFile = null`.

Формат (пример):

```json
{
  "timestamp": "2026-04-29T10:00:00.000Z",
  "tdRunning": true,
  "projectLoaded": true,
  "fps": 60,
  "cookTimeMs": 12,
  "kinectOnline": true,
  "displayOnline": true,
  "backendConnected": true,
  "lastRunSessionId": "run-session-id",
  "lastResultSentAt": "2026-04-29T10:00:00.000Z",
  "errors": []
}
```

---

## Куда local PC Agent отправляет health payload (внешний monitoring)

Это делает **не TouchDesigner**.

Основная модель:
- Local PC Agent формирует payload и отправляет **наружу** на remote backend:
  - `POST https://<remote-backend>/api/monitoring/health`

TouchDesigner **не должен**:
- отправлять Telegram/email alerts
- определять severity (critical/warning)
- пытаться “доставать” remote backend для админки

