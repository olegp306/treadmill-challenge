# TouchDesigner: взаимодействие с бэкендом

Инструкция для разработчика сцены в TouchDesigner: **когда** сервер обращается к TD, **что уходит** по OSC, **что нужно вернуть** (OSC ack, HTTP с результатом), и как связать это с **веб-экранами лидербордов**.

---

## Общая схема

Бэкенд (Node.js) не встраивается в TD. Связь такая:

1. **Исходящие OSC (UDP)** — с машины бэкенда **на** процесс TouchDesigner (по умолчанию `127.0.0.1:7000`), когда включён адаптер `osc`.
2. **Входящие OSC (UDP)** — с TouchDesigner **на** бэкенд: классическое подтверждение **`/treadmill/ack`** или единый канал **`/treadmill/runState`** (start / busy / stop с метриками).
3. **HTTP POST** — с TouchDesigner (или скрипта) **на** бэкенд: передача результата забега (`resultTime`, `distance`) по завершении; опционально — **JPEG верификации** (`verificationPhotoBase64`) в том же теле (см. п. 3.1).

Пуллинг результата с бэкенда (`GET /api/touchdesigner/run-result`) в текущей реализации **не используется** — адатер возвращает пусто; основной путь — **POST результата** на бэкенд.

**Режим без реального TD (разработка):** в админке включается **TouchDesigner demo mode**. Тогда сервер **не отправляет** OSC на старт/продвижение очереди и может подменять метрики на демо; для проверки очереди есть страница `/dev/queue-control` (тот же API в dev и production).

---

## Переменные окружения бэкенда (OSC)

| Переменная | Назначение | По умолчанию |
|------------|------------|--------------|
| `TD_ADAPTER` | `mock` — только лог в консоль; `osc` — реальная отправка OSC | `mock` |
| `TD_OSC_HOST` | IP/хост, куда слать OSC (машина с TD) | `127.0.0.1` |
| `TD_OSC_PORT` | UDP-порт приёмника OSC в TD | `7000` |
| `TD_OSC_START_ADDRESS` | OSC-адрес регистрации участника | `/treadmill/start` |
| `TD_OSC_RUN_SESSION_ADDRESS` | OSC-адрес старта забега (сессии) | `/treadmill/runSession` |
| `TD_OSC_ACK_ADDRESS` | OSC-адрес ответа TD о дорожке (legacy) | `/treadmill/ack` |
| `TD_OSC_RUN_STATE_ADDRESS` | Единый канал состояния: start, busy, stop | `/treadmill/runState` |
| `TD_OSC_RUN_STATE_DISABLED` | Отключить разбор `runState` | выкл. |
| `TD_OSC_ACK_LOCAL_PORT` | UDP-порт **на бэкенде**, куда TD шлёт ack и runState | `7001` |
| `TD_OSC_ACK_TIMEOUT_MS` | Таймаут ожидания ответа после `/treadmill/runSession` (мс) | `30000` |
| `TD_OSC_ACK_TIMEOUT_RESOLVES_TO` | При таймауте: `busy` (очередь сохраняется), `unknown` (как раньше) или `free` | `busy` |
| `TD_OSC_ACK_DISABLED` | `1` / `true` — не ждать ответ (сразу `unknown`) | выкл. |
| `TD_CALLBACK_TOKEN` | Если задан — endpoint `POST /api/touchdesigner/run-result` требует заголовок `X-TD-Token` или `Authorization: Bearer …` | не задан |

Поля **host/port в админке** хранятся в БД для справки; **реальный** адрес OSC для адаптера задаётся **переменными окружения** `TD_OSC_HOST` / `TD_OSC_PORT` при запуске бэкенда.

---

## Полный цикл: регистрация → очередь → старт → финиш → лидерборд

### 1. Регистрация участника

**Когда:** успешный `POST /api/register` с киоска (имя, телефон, пол и т.д.).

**Что делает бэкенд:** создаёт участника в БД и вызывает **OSC** (если `TD_ADAPTER=osc`):

| OSC address (по умолчанию) | Аргументы по порядку (типы) |
|----------------------------|-------------------------------|
| `/treadmill/start` | `login` (s), `name` (s), `phone` (s), `sex` (s), `runMode` (s), `runName` (s) |

- `login` — UUID участника (`participantId`).
- `name` — полное имя (как в БД).
- `runMode` — одно из: `time`, `1km`, `5km` (как пришло с формы; по умолчанию `time`).
- `runName` — строка (по умолчанию `Run`).

**Обратно от TD на этом шаге ничего не ожидается** — это уведомление для сцены.

---

### 2. Выбор формата и постановка в глобальную очередь

**Когда:** участник нажимает старт забега: `POST /api/run/start` с `participantId` и `runTypeId` (`0` | `1` | `2`).

**Смысл `runTypeId`:**

| ID | Ключ (`runTypeKey`) | Название для UI / OSC |
|----|---------------------|------------------------|
| 0 | `max_5_min` | Максимум за 5 минут |
| 1 | `golden_km` | Золотой километр |
| 2 | `stayer_sprint_5km` | Стайер-спринт на 5 км |

Создаётся сессия `runSession` в статусе `queued` или сразу `running`, если дорожка свободна и участник первый в глобальной FIFO.

---

### 3. Старт забега на дорожке (главное OSC-сообщение)

**Когда:** сессия становится **текущей** на дорожке: первый в очереди при свободной дорожке, либо после завершения/отмены предыдущей сессии (автопродвижение очереди).

**Что делает бэкенд:** отправляет **OSC** (если не включён demo mode в админке и `TD_ADAPTER=osc`):

| OSC address (по умолчанию) | Аргументы по порядку (типы) |
|----------------------------|------------------------------|
| `/treadmill/runSession` | `runSessionId` (s), `participantId` (s), `firstName` (s), `lastName` (s), `phone` (s), `runTypeId` (i), `runTypeName` (s), `runTypeKey` (s) |

- `runSessionId` — основной идентификатор забега для всей цепочки (результат, лидерборд «завершения»).
- `runTypeId` — целое **0, 1 или 2**.

**Ожидается ответ от TouchDesigner (OSC ack):**

Бэкенд слушает **UDP на порту `TD_OSC_ACK_LOCAL_PORT`** (по умолчанию **7001**). Нужно отправить сообщение **на этот порт** на хост, где запущен бэкенд (часто тот же ПК, `127.0.0.1`).

| OSC address (по умолчанию) | Аргументы |
|----------------------------|-----------|
| `/treadmill/ack` | `runSessionId` (s), `status` (s) |

`status` распознаётся так:

- **free** — дорожка приняла старт, можно считать участника запущенным (или аналог вашей логики «ок»).
- **busy** — дорожка занята; бэкенд **не** переведёт сессию в `running` и оставит очередь в согласованном состоянии.

Также допускаются варианты вроде `1`/`true`/`f` для free и `0`/`false`/`b` для busy (см. код парсера на бэкенде).

**Альтернатива — `/treadmill/runState`:** на тот же UDP-порт можно слать `state=start` (как успешный free), `state=busy` или после финиша `state=stop` с `resultTime` и `distance`. Подробно: [touchdesigner-compat-ru.md](touchdesigner-compat-ru.md).

**Таймаут ответа:** если за время `TD_OSC_ACK_TIMEOUT_MS` (по умолчанию 30 с) не пришло ни `/treadmill/ack`, ни `runState` для этой `runSessionId`, по умолчанию бэкенд считает дорожку **занятой/недоступной** (`busy`), и сессия **остаётся в очереди**. Иначе: переменная `TD_OSC_ACK_TIMEOUT_RESOLVES_TO` (`busy` · `unknown` · `free`).

---

### 3.1. Фото для верификации (только от TouchDesigner, вместе с результатом)

**Зачем:** снимок для ручной проверки в админке (анти-фрод: кто реально бежал, пол, подмена). **Киоск/браузер фото не делает** — снимок формирует **TouchDesigner** (камера, сцена, тайминг — на стороне TD, обычно в **начале или в середине** забега, а не в конце). Бэкенд **только принимает** JPEG в **том же HTTP-запросе**, что и метрики финиша, и сохраняет его **для конкретного `runSessionId`** (через строку `runs` в БД, не как «вечное» фото участника).

**Как:** в одном **POST** `/api/run-result` или `/api/touchdesigner/run-result` (см. п. 4) в JSON добавьте поле с **base64** кадра (опционально):

- `verificationPhotoBase64` — приоритетно, **или**
- `imageBase64` (синоним), **или** вложенно: `verificationPhoto: { "imageBase64": "..." }`

Значение: **сырая base64-строка** или `data:image/jpeg;base64,...`. Только **JPEG** (по сигнатуре), размер декодированного файла до **~6 МБ**; тело JSON — в лимите **10 МБ** (см. настройки Fastify на бэкенде).

Повторный `POST` с тем же `runSessionId` после уже сохранённого результата **не прикрепит** новое фото (дубликат обрабатывается отдельно; фото в повторе игнорируется, смотрите логи `run_result_duplicate_photo_ignored`).

Когда снимок **не** передавать: бэкенд всё равно сохраняет результат; в лог пишется `verification_photo_missing_for_run_session` — в админке фото для этого забега не появится.

---

### 4. Финиш забега и запись результата

**Когда:** дорожка/логика TD знает, что забег окончен.

**Варианты:**

1. **HTTP POST** на бэкенд (как ниже), или  
2. **OSC `/treadmill/runState`** с `state=stop` и метриками — эквивалент сохранения результата (сессия должна быть `running`).

**Что должен сделать TD при использовании HTTP:** отправить **POST** с JSON:

**Варианты URL:**

| Endpoint | Аутентификация |
|----------|----------------|
| `POST /api/run-result` | Без токена (для внутренней сети / отладки) |
| `POST /api/touchdesigner/run-result` | Если задан `TD_CALLBACK_TOKEN` — заголовок `X-TD-Token: <token>` **или** `Authorization: Bearer <token>` |

**Тело (JSON):**

```json
{
  "runSessionId": "<uuid сессии из /treadmill/runSession>",
  "resultTime": 300.5,
  "distance": 1200.3,
  "verificationPhotoBase64": "/9j/4AAQSkZJRgABAQ... (опционально, JPEG в base64)"
}
```

- `resultTime` — секунды (число).
- `distance` — метры (число).
- `verificationPhotoBase64` — опционально, **один** снимок на **этот** `runSessionId` (см. п. 3.1). **OSC `runState` с `stop` фото не передаёт** — для кадра используйте **HTTP**.

Бэкенд сохраняет результат, обновляет лидерборд соревнования и при необходимости **запускает следующего** из глобальной очереди (снова уходит `/treadmill/runSession` и ожидается ack).

**Альтернатива:** киоск в режиме demo может завершить забег через публичный API без TD — для продакшена целевой путь — **POST от TD**.

---

### 5. Лидерборды на фронтенде (URL для Web Render / браузера)

Витрина верстки под разрешение **2560×1120** (масштабируется в компоненте). На маршрутах `/td/...` у киоска скрыты лишние баннеры.

| Тип | Назначение | URL (относительно origin фронта, например `http://localhost:5173`) |
|-----|------------|-------------------------------------------------------------------|
| **Ожидание** | Топ по каждому формату, смена пола male/female, обновление по опросу API | `/td/leaderboard/waiting` |
| **Завершение** | Лидерборд по **тому же** забегу, подсветка текущего участника; до `finished` опрашивается состояние сессии | `/td/leaderboard/result?runSessionId=<UUID>` |

Примеры полных URL:

```text
http://localhost:5173/td/leaderboard/waiting
http://localhost:5173/td/leaderboard/result?runSessionId=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

В продакшене вместо `localhost:5173` — ваш домен и порт HTTPS.

**Откуда взять `runSessionId` для экрана завершения:** тот же UUID, что уходил в OSC в `/treadmill/runSession` и в POST `/api/run-result`. Киоск после финиша пользователя может сам открывать эту страницу с query-параметром (так настроен фронт).

---

## Краткий чеклист для TD

1. Принимать **`/treadmill/start`** при регистрации (опционально для визуала).
2. Принимать **`/treadmill/runSession`** — запускать сцену забега, запоминать `runSessionId`.
3. Отправлять **`/treadmill/ack`** на `127.0.0.1:7001` (или иной хост/порт бэкенда) с тем же `runSessionId` и статусом `free` или `busy`.
4. По окончании забега отправить **`POST /api/run-result`** (или защищённый `/api/touchdesigner/run-result`) с `runSessionId`, `resultTime`, `distance`, при необходимости — **`verificationPhotoBase64`** (JPEG одного забега, см. п. 3.1).
5. Для больших экранов вывести веб-клиент: **ожидание** — `/td/leaderboard/waiting`, **после забега** — `/td/leaderboard/result?runSessionId=...`.

---

## См. также

- Кратко про **новый канал `/treadmill/runState`**, таймаут и обратную совместимость: [touchdesigner-compat-ru.md](touchdesigner-compat-ru.md)
- Код OSC исходящий: `apps/backend/src/integrations/touchdesigner/oscTouchDesignerAdapter.ts`
- Входящий ack/runState: `apps/backend/src/integrations/touchdesigner/oscTouchDesignerAck.ts`, разбор runState: `touchDesignerProtocolCompat.ts`
- Обработка результата и приём JPEG с TD: `apps/backend/src/routes/runResult.ts`, сохранение файлов: `apps/backend/src/services/runPhotoStorage.ts`
