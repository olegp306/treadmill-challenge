# Changelog

Short, operational record of what shipped in each **product version**.  
**Source of truth:** root `package.json` → `"version"` (`treadmill-challenge`).

Format: `[MAJOR.MINOR.PATCH]` — SemVer-ish (see `docs/VERSIONING.md`).

---

## [0.2.2] - 2026-04-19

### Fixed

- **Выбор формата забега (`/run-select`):** снова **«Привет, имя» на одной строке** — убран перенос после последнего изменения приветствия (лишний `<br />`; стиль **`greetingNameLine`** с **`display: block`** на общем красном `span` давал вторую строку). Обрезка имени до 15 символов не менялась.

---

## [0.2.1] - 2026-04-19

### Changed

- **Главная / карточки очереди:** ФИО по полям (фамилия, имя, отчество); **ellipsis отдельно на каждой строке**; колонка **`flex` + `gap: 0`** без `<br />` между блоками — убран лишний вертикальный зазор.
- **Выбор формата забега (`/run-select`):** приветствие **имя и фамилия** на отдельных строках; передача **`participantLastName`** после регистрации; обрезка **до 15 символов + `...` независимо для имени и фамилии**; стиль **`greetingNameLine`** для стабильной ширины.

---

## [0.2.0] - 2026-04-19

### Added

- **Главная → Принять участие:** если глобальная очередь полная (`queued` + `running` = лимит), показывается экран **`/register/queue-full`** с текстом про переполнение и кнопкой «На главную» — без входа в обычную регистрацию.
- **Компонент `WizardBlockedNotice`:** общая разметка предупреждения (как заблокированный шаг возраста); переиспользование в **`AgeStep`** и **`QueueFullPage`**.
- **API `GET /api/run/queue`:** в ответ добавлены **`maxGlobalQueueSize`** и **`activeSessionCount`** (глобальный пул).
- **`DEFAULT_MAX_GLOBAL_QUEUE_SIZE`** (`@treadmill-challenge/shared`): единый дефолт лимита очереди.
- **Backend:** миграция поднятия сохранённого лимита **3 → 4** для старых установок; **`openInMemoryDatabaseForTests`**; тесты **`globalQueueLimit.test.ts`** (npm script **`test`** в backend).
- **Queue control:** отображение заполнения пула **`activeSessionCount / maxGlobalQueueSize`**.
- **`.gitignore`:** `apps/backend/data/` (локальная SQLite).

### Changed

- **Глобальная очередь:** лимит по умолчанию **4** одновременных сессии (**1 running + до 3 queued**); настройка по-прежнему в админке (`maxGlobalQueueSize`).
- **Главная:** перед регистрацией выполняется актуальный запрос очереди; событие телеметрии при перенаправлении на экран переполнения.
- **Экран возраста (нет 18):** размер текста предупреждения **`w(45)`**.
- **Админка настроек:** дефолт числа лимита очереди через **`DEFAULT_MAX_GLOBAL_QUEUE_SIZE`**.

### Documentation

- **`screenPathLabels`:** подпись для **`/register/queue-full`**.

---

## [0.1.1] - 2026-04-19

### Added

- **Versioning:** `scripts/bump-version.mjs`, npm `release:patch|minor|major`; `docs/VERSIONING.md` (bump rules, checklist).
- **Main screen:** three consecutive taps on **AMAZING** (RED resets counter) shows **`vX.Y.Z`** top-right (gray) for field checks.
- **Queue control** (`/dev/queue-control`): **move current to end of global FIFO**; **remove queued** row action; backend `move-current-to-end`, `remove-queued`; DB `bumpRunSessionCreatedAtToGlobalQueueTail`, `cancelGlobalQueuedSessionById`.
- **Queue control page** `body.dev-queue-control-route` for document scroll (same pattern as admin).
- **Admin layouts:** `body.admin-route` restores document scroll where global `body { overflow: hidden }` blocked it.

### Changed

- **Queue control API** (`/api/dev/queue-control/*`): always available in production; removed `ALLOW_DEV_QUEUE_CONTROL` gate.
- **Queue control UI:** intro copy; removed **«Остановить и удалить запись»** and `POST .../cancel-current` + `cancelCurrentRunning` service.

### Documentation

- `docs/touchdesigner-integration-ru.md`: queue control + API availability.
- `apps/frontend/src/appVersion.ts` comments.

### Notes

- **Kiosk bundle version** comes from root `package.json` via Vite (`APP_VERSION`). **Admin footer** / **`GET /api/version`** stay aligned unless **`APP_VERSION`** overrides on server.

---

## Earlier (informal versions)

Earlier changelog entries used informal version labels before managed SemVer starting at **0.1.x**; kept for history only.

### [1.1.0] - 2026-04-18

#### Added

- Verification photo path via TouchDesigner + run result API; admin viewing; removed browser start-photo route.
- API: `GET /api/version`, `appVersion` in public settings; admin verification photo routes.

#### Documentation

- Initial `VERSIONING.md` mention.

### [1.0.0] — earlier

- Earlier tracked baseline before structured changelog.
