## Prompt for Cursor: Health Monitoring + Audit Log (host backend)

Нужно реализовать / доработать систему Health Monitoring + Audit Log согласно требованиям ниже.

ВАЖНО:
Мы НЕ реализуем локальный PC Agent, TouchDesigner-часть и iPad-приложение внутри backend.
Backend должен только принимать данные, валидировать, сохранять, анализировать критичность и отправлять алерты.

### Зоны ответственности

**1. Backend / Host Monitoring API — реализуем**
- API endpoint для приёма health payload от локального агента.
- Валидацию структуры payload.
- Сохранение последнего состояния устройства.
- Ограниченное хранение истории health events.
- Анализ критичности на стороне хоста.
- Telegram alerts.
- Email alerts.
- Deduplication / cooldown алертов.
- Audit log для пользовательских и административных действий.

**2. Локальный PC Agent — НЕ реализуем**
- Сбор CPU/RAM/disk/internet.
- Генерацию PCHealth.json.
- Чтение TDHealth.json.
- Получение/чтение IPADHealth.json.
- Отправку общего payload на backend.

Backend только ожидает, что локальный агент будет присылать готовый payload.

**3. TouchDesigner — НЕ реализуем**
- Генерацию TDHealth.json.
- FPS / cook time.
- TD errors.
- Kinect status.
- Screen / LED output status.
- Race result status.

Backend только принимает эти данные в payload.

**4. iPad — НЕ реализуем**
- iPad heartbeat.
- iPad HTTP endpoint.
- Проверку battery/appActive.

Backend только принимает iPad health данные, если они пришли от локального агента или напрямую от iPad.

---

### Нужный health payload

Добавить endpoint:

`POST /api/monitoring/health`

Ожидаемый payload:

```json
{
  "projectId": "project-01",
  "locationId": "munich-01",
  "deviceId": "pc-01",
  "timestamp": "2026-04-28T13:00:00+02:00",
  "agent": {
    "version": "1.0.0",
    "startedAt": "2026-04-28T12:30:00+02:00",
    "lastSuccessfulPostAt": "2026-04-28T12:59:30+02:00",
    "errors": []
  },
  "pc": {
    "status": "ok",
    "cpu": 32,
    "ram": 58,
    "diskFreeGb": 120,
    "appRunning": true,
    "internet": true,
    "errors": []
  },
  "touchDesigner": {
    "fileExists": true,
    "lastUpdatedAt": "2026-04-28T13:00:00+02:00",
    "appRunning": true,
    "projectLoaded": true,
    "fps": 60,
    "cookTimeMs": 12,
    "kinectUpdating": true,
    "outputAvailable": true,
    "backendReachable": true,
    "landingReachable": true,
    "raceResultCreated": true,
    "errors": []
  },
  "ipad": {
    "ipadId": "ipad-01",
    "ip": "192.168.1.50",
    "online": true,
    "lastSeen": "2026-04-28T13:00:00+02:00",
    "battery": 84,
    "appActive": true,
    "errors": []
  }
}
```

Поля `touchDesigner` и `ipad` могут быть `null` или отсутствовать, если локальный агент их пока не поддерживает.
Но backend должен корректно обработать отсутствие этих блоков.

---

### Защита от больших JSON и переполнения

Обязательно реализовать лимиты:

**1. Максимальный размер health payload**
- 64 KB максимум.
- Если payload больше — вернуть **413 Payload Too Large**.

**2. Ограничение errors**
- Максимум 20 ошибок на каждый блок: `agent.errors`, `pc.errors`, `touchDesigner.errors`, `ipad.errors`.
- Максимальная длина одной ошибки: 500 символов.
- Всё лишнее обрезать или отклонять через validation.

**3. Не хранить все JSON бесконечно**

Нужны две сущности:

**A. LatestHealthState**
Хранит только последнее состояние по ключу: `projectId + locationId + deviceId`.

**B. HealthEvent / HealthHistory**
Хранит историю ограниченно.

Retention policy:
- Хранить detailed health events максимум 7 дней.
- Либо максимум 10 000 health events на `deviceId`.
- Старые записи удалять scheduled job-ом.
- Если scheduled job уже есть в проекте — использовать его.
- Если нет — добавить простой cleanup job.

**4. Не сохранять огромные raw payload без необходимости**
- latest state можно хранить как normalized fields + compact JSON snapshot.
- history хранить compact JSON snapshot.
- Не хранить stack traces огромного размера.
- Не хранить binary/base64/log files в health payload.

**5. Rate limit**
- На один `deviceId` принимать не чаще 1 раза в 5 секунд.
- Если чаще — можно либо игнорировать, либо вернуть 429.
- Лучше вернуть **429 Too Many Requests**.

---

### Критичность на backend

Локальный агент НЕ определяет critical/warning.
Backend сам считает статус.

Правила:

**Critical**
- device не присылал health больше 2 минут.
- `pc.internet === false`.
- `pc.diskFreeGb < 5`.
- `touchDesigner.fileExists === false`.
- `touchDesigner.lastUpdatedAt` старше 1 минуты.
- `touchDesigner.appRunning === false`.
- `touchDesigner.projectLoaded === false`.
- `ipad.online === false`.
- `ipad.lastSeen` старше 1 минуты.
- `ipad.appActive === false`.

**Warning**
- `pc.cpu > 90`.
- `pc.ram > 90`.
- `pc.diskFreeGb < 20`.
- `touchDesigner.fps < 30`.
- `touchDesigner.cookTimeMs > 50`.
- `ipad.battery < 20`.
- есть `errors`, но система ещё online.

**OK**
- нет critical/warning условий.

Сделать функцию:

`calculateHealthSeverity(payload, previousState) => { severity: "ok" | "warning" | "critical", problems: [...] }`

---

### Алерты

При critical/warning отправлять Telegram и Email.

Защита от спама:

**Alert deduplication**
- одинаковый `alertKey` не отправлять чаще 1 раза в 10 минут.
- `alertKey` формировать так: `projectId + locationId + deviceId + problemCode`.

Пример `problemCode`:
- `PC_INTERNET_OFFLINE`
- `PC_LOW_DISK`
- `TD_FILE_STALE`
- `TD_APP_NOT_RUNNING`
- `IPAD_OFFLINE`
- `IPAD_APP_INACTIVE`

Alert должен содержать:
- `projectId`
- `locationId`
- `deviceId`
- `severity`
- `problem`
- last successful signal time
- `timestamp`
- краткое описание

Пример текста:

```text
[CRITICAL] project-01 / munich-01 / pc-01
Problem: TouchDesigner health file is stale
Last TD update: 2026-04-28T12:58:00+02:00
Detected at: 2026-04-28T13:00:00+02:00
```

---

### Audit log

Добавить / проверить Audit Log для действий в админке.

Audit log должен фиксировать:
- `userId`
- `userEmail` / `username`, если есть
- `action`
- `entityType`
- `entityId`
- `ip`
- `userAgent`
- `timestamp`
- `metadata`

Примеры `action`:
- `ADMIN_LOGIN`
- `ADMIN_LOGOUT`
- `DATABASE_RECORD_CREATED`
- `DATABASE_RECORD_UPDATED`
- `DATABASE_RECORD_DELETED`
- `RACE_CYCLE_COMPLETED`
- `SETTINGS_CHANGED`
- `HEALTH_ALERT_ACKNOWLEDGED`

Audit log НЕ смешивать с health monitoring.
Это отдельная таблица / коллекция.

Ограничения:
- `metadata` max 16 KB.
- хранить audit log дольше, например 90 дней или согласно текущим настройкам проекта.
- не писать sensitive данные, пароли, токены.

---

### API response

`POST /api/monitoring/health` должен возвращать:

```json
{
  "success": true,
  "severity": "ok",
  "problems": [],
  "receivedAt": "2026-04-28T13:00:01+02:00"
}
```

Если есть проблемы:

```json
{
  "success": true,
  "severity": "critical",
  "problems": [
    {
      "code": "TD_FILE_STALE",
      "message": "TouchDesigner health file was not updated for more than 1 minute"
    }
  ],
  "receivedAt": "2026-04-28T13:00:01+02:00"
}
```

---

### Security

Добавить авторизацию для health endpoint.

Варианты:
- API key в header: `X-Health-Api-Key`
- или Bearer token.

Минимально:
- endpoint не должен принимать данные без валидного ключа.
- ключ должен храниться в env.
- не логировать ключ.

---

### Что нужно проверить в текущем проекте (перед реализацией)

Проверь:
- есть ли уже backend API routes;
- есть ли база данных и ORM;
- есть ли notification service;
- есть ли email service;
- есть ли Telegram bot integration;
- есть ли cron/scheduled jobs;
- есть ли audit log;
- есть ли rate limiter;
- есть ли validation library, например zod/yup/joi.

Используй существующую архитектуру проекта.
Не создавай новую архитектуру, если уже есть текущий стиль.

---

### Итоговые задачи

1. Добавить health endpoint.
2. Добавить schema validation.
3. Добавить размерные лимиты payload/errors/metadata.
4. Добавить latest health state storage.
5. Добавить limited health history storage.
6. Добавить cleanup старых health events.
7. Добавить severity calculation.
8. Добавить alert deduplication.
9. Добавить Telegram/email alert trigger.
10. Добавить audit log, если его нет.
11. Добавить тесты на:
   - valid payload
   - missing optional touchDesigner/ipad
   - too large payload
   - stale TDHealth
   - iPad offline
   - low disk
   - alert deduplication
   - cleanup old events
   - unauthorized request

Не реализовывать:
- локальный PC Agent;
- TouchDesigner TDHealth.json generator;
- iPad heartbeat sender;
- ping iPad из backend;
- чтение файлов с локального ПК из backend.

