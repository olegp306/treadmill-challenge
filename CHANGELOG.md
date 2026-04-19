# Changelog

Short, operational record of what shipped in each **product version**.  
**Source of truth:** root `package.json` → `"version"` (`treadmill-challenge`).

Format: `[MAJOR.MINOR.PATCH]` — SemVer-ish (see `docs/VERSIONING.md`).

---

## [0.2.6] - 2026-04-19

### Added

- **Очередь после выбора формата (`treadmill_busy`):** экран **«Дорожка пока занята»** — «перед тобой» и **примерное время ожидания** по глобальному FIFO и реальным форматам забега; хелперы **`computeAheadFromGlobalQueueEntries`**, **`packages/shared`** **`queueEstimate`** (**`estimatedRunDurationMinutes`**, **`sumEstimatedWaitMinutesForRunTypes`**).
- **`QueueBusyEstimateLines`:** две **однострочные** строки подписей (серый префикс / белый акцент), **`formatAheadPeopleAccentSlice`**, **`formatEstimatedWaitAccentSlice`** в **`russianPlural`**.
- **`RunQueuePositionIntroPage`** (**`/run/queue/position`**): **«Ваш номер в очереди»**; по **«Ок»** — **главная** **`/`** (без повторного decision-экрана).
- **Роутер:** маршрут **`/run/queue/position`** (объявлен **перед** **`/run/queue`**).

### Changed

- **`/run-select` + `queue_full`:** переход на **`/register/queue-full`** (с **`fromRunSelectionQueueFull`**) вместо сценария **«дорожка занята»**; **`QueueFullPage`** принимает оба токена входа.
- **`RunQueueBusyPage` / `RunQueuePage`:** кнопки футера **`rq.btnWide` / `btnWideSolid`** — **больше минимальная высота** (**`h(188)`**), **`flexShrink: 0`**; **«Сойти с забега»** → **`/run/leave-queue`** с возвратом **«Нет»** на busy при **`cancelNavigate`**.
- **`RunLeaveQueueConfirmPage`:** формулировка **«Вы уверены, что хотите сойти с забега?»**.

---

## [0.2.5] - 2026-04-19

### Changed

- **Регистрация — шаг телефона (`PhoneStep`):** надёжнее **автофокус и клавиатура на iPad / iOS** — функция **`scheduleWizardStepPhoneFocus`** (несколько попыток **`focus`** после кадров и с задержками **80 / 220 / 420 ms** поверх существующего **`focusInputForMobileKeyboard`** с **`preventScroll`**). Явно заданы **`type="tel"`**, **`inputMode="tel"`**, **`autoComplete="tel"`**, **`autoCapitalize="off"`** (и в **`useInput`**).

---

## [0.2.4] - 2026-04-19

### Fixed

- **Главная → Принять участие** при **пуле не полном:** убран переход сразу на **`/run-select`** («Привет, участник!») по старому **`participantId`** в **`sessionStorage`**. Добавлен **`clearLoggedParticipantId()`**; при **`total < max`** после **`clearLoggedRunSessionId()`** всегда **`/register`** — новый проход анкеты после снятия переполнения очереди или смены участника на киоске.
- **Главная:** не открываем экран **«Дорожка занята…»** при **1+2=3** за счёт убранного **resume** в **`/run/queue`** по **`runSessionId`**, если в пуле ещё есть место; сброс **`runSessionId`** при входе в новую регистрацию.

### Changed

- **Queue control (dev, `/dev/queue-control`):** кнопки **Поставить следующего / Добежал / Переставить в конец** вверху; плашка **текущего runSession** с **форматом, полом, статусом** (и ФИО при **running**); убраны **обе таблицы** (детали бегуна и **нижняя** таблица очереди); кнопка **«Перезапустить»** удалена; служебный текст про URL и API — в **footer**.

### Added

- **`logEvent`:** **`clearLoggedParticipantId()`** — очистка **`participantId`** в **`sessionStorage`**.

---

## [0.2.3] - 2026-04-19

### Fixed

- **Главная → Принять участие при полном глобальном пуле (`queued` + `running` = лимит):** сначала **`GET /api/run/queue`**; затем переход на **`/register/queue-full`** (экран **«Очередь переполнена…»**, кнопка на главную). Убран прежний порядок, когда возобновление по **`runSessionId`** отправляло на **`/run/queue`** — там другой сценарий (**«Дорожка занята» / Сойти с забега / ОК**), он для этого кейса не показывается.
- **`QueueFullPage`:** редирект на главную только без **`location.state.fromMainParticipateQueueFull`** (закладка / обновление без state); при входе с главной экран переполнения не отменяется из‑за **`participantId` / `runSessionId`** в **`sessionStorage`**.
- **Зарегистрированный участник при полном пуле:** после актуального **`getRunQueue`** показывается **`queue-full`**, а не обход в **`/run-select`** без проверки заполнения.

### Changed

- **Выбор формата забега (`/run-select`):** расширена доступная ширина блока приветствия (**«Привет + имя»**): **`maxWidth: 100%`**, **`runSelectTopBlock` → `alignItems: stretch`**, отдельный рендер одной строки с **`whiteSpace: nowrap`**; колонка табов **по центру** при срабатывании **`maxWidth`**.

### Added

- **`logEvent`:** публичные геттеры **`getLoggedParticipantId`**, **`getLoggedRunSessionId`** (для согласованных проверок с **`sessionStorage`**).

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
