# Health Monitoring

## Общая идея

- Локальный backend агрегирует техническое состояние приложения, интеграций и хоста.
- Внешний monitoring host принимает health payload, анализирует его и принимает решение по алертам.
- Локальный проект не отправляет Telegram/email alerts напрямую.

## Endpoint

- `GET /api/health/status`

Ответ содержит:

- `appVersion`
- `backendOnline`
- `timestamp`
- `ipad`:
  - `deviceId`
  - `lastHeartbeatAt`
  - `online`
  - `onlineThresholdSec`
- `td`:
  - `lastTdEventAt`
  - `lastTdSyncOk`
  - `lastTdSyncError`
  - `healthFile`
- `queue`:
  - `runningCount`
  - `queuedCount`
- `runs`:
  - `lastSuccessfulRunAt`
- `system`:
  - `cpuPct`
  - `ramPct`
  - `diskFreeGb`
  - `uptimeSec`
  - `internetOk`
- `warnings`
- `errors`

## TDHealth.json

- Путь по умолчанию: `./runtime/health/TDHealth.json`
- Переопределение пути: `TD_HEALTH_FILE_PATH`
- Backend читает файл безопасно:
  - если файл отсутствует -> `td.healthFile = null`
  - если JSON невалидный -> warning в логах, `td.healthFile = null`
  - ошибки чтения не роняют backend

Ожидаемый формат:

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

Рекомендация:

- TouchDesigner side обновляет файл регулярно (интервал 1-2 секунды).

## iPad monitoring

- Источник: heartbeat события через `POST /api/events` (`type = heartbeat`).
- Для идентификации устройства используется `deviceId` в payload heartbeat.
- Онлайн-статус iPad вычисляется по свежести последнего heartbeat (`onlineThresholdSec`).

## Системные метрики

В `system` публикуются:

- `cpuPct` — загрузка CPU, %
- `ramPct` — использование RAM, %
- `diskFreeGb` — свободное место на диске, GB
- `uptimeSec` — uptime backend процесса, секунды
- `internetOk` — доступность интернета (быстрая проверка DNS с таймаутом)

Если метрику не удалось получить, возвращается `null` без падения backend.

## Host push (optional)

Параметры:

- `HEALTH_PUSH_URL`
- `HEALTH_PUSH_INTERVAL_MS`
- `HEALTH_PUSH_TIMEOUT_MS`
- `HEALTH_PUSH_AUTH_TOKEN`

Поведение:

- Если `HEALTH_PUSH_URL` не задан, push scheduler отключен.
- Если URL задан, backend периодически отправляет на host тот же payload, что возвращает `GET /api/health/status`.
- Ошибки отправки логируются и не роняют backend.

## Warnings

Текущие правила:

- `high_cpu` — `cpuPct > 85`
- `high_ram` — `ramPct > 85`
- `low_disk` — `diskFreeGb < 5`
- `no_internet` — `internetOk === false`
- `td_errors` — `td.healthFile.errors.length > 0`

Дополнительно могут появляться operational warnings, например stale heartbeat.

## Summary

- Схемы состояния TD зафиксированы через `td` секцию и optional `TDHealth.json`.
- Backend реализует сбор и агрегацию состояния iPad, TD, очереди, результатов и системных метрик.
- Система готова к подключению внешнего monitoring/alerts хоста.

## Related docs

- Host/backend spec for external monitoring, alerts, audit log: `docs/remote-health-monitoring-host-spec-ru.md`
