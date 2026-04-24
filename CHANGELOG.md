# Changelog

Short, operational record of what shipped in each **product version**.  
**Source of truth:** root `package.json` → `"version"` (`treadmill-challenge`).

Format: `[MAJOR.MINOR.PATCH]` — SemVer-ish (see `docs/VERSIONING.md`).

---

## [0.4.0] - 2026-04-24

### Важно

- Изменен пароль в Панели администратора (god admin PIN): значение по умолчанию обновлено на `191181`.

### Панель администратора

- Добавлена вкладка **«Приостановка»**: создание backup на сервере + экспорт JSON в браузер, очистка после backup и восстановление последнего состояния.
- Добавлено полное удаление записи о забеге из «Истории очереди» (удаляется `runSession` и связанные `runs`), только для admin, с обязательным подтверждением PIN и логированием.
- Добавлены быстрые фильтры в «Истории очереди»: `5 мин` / `1 км` / `5 км` / `М` / `Ж`, работающие совместно с поиском.
- Унифицирована админ-панель с менеджерской: общая структура вкладок, очередь, поиск, редактирование, единая логика экрана.

### Панель менеджера

- Добавлены быстрые фильтры в «Истории очереди»: `5 мин` / `1 км` / `5 км` / `М` / `Ж` (совместно с поиском).
- Улучшен внутренний скроллинг таблицы истории без прокрутки header.

### Лидерборд ожидания

- Добавлен поиск участника по полному совпадению имени/фамилии.
- Добавлена навигация по нескольким найденным совпадениям (стрелки вверх/вниз в поле поиска).
- Изменена подсветка найденного участника: акцент на имени в списке, без лишних плашек.
- Центральный leaderboard показывает полный список участников с внутренним скроллом (ограничение top-10 снято для центральной колонки).
- Улучшены типографика и верстка (шрифты, размеры, выравнивание, header-плашки, слои колонок).
- Улучшен UI карусели: центральный leaderboard усилен визуально, боковые переведены в приглушенный grayscale-режим.

### Прочее

- Кнопка **«На главную»** перенесена в header панелей manager/admin и адаптирована по размеру.
- Обновлен визуал admin panel (фон, градиенты, красный header-бейдж «ПАНЕЛЬ АДМИНИСТРАТОРА»).
- Исправлены кнопки листания и направления стрелок в leaderboard по макету.
- Улучшен локальный скроллинг в экранах админок и leaderboard без прокрутки всей страницы.
- Добавлены API и backend-изменения для редактирования/удаления записей завершенных забегов, фильтрации по полу в истории и корректного логирования админ-действий.

---

## [0.3.6] - 2026-04-22

### Добавлено

- **Ручное восстановление очереди:** в панелях manager/admin добавлена заметная кнопка **«Запустить очередь»** для восстановления в состоянии, когда дорожка свободна (`running = 0`), но в очереди есть участники (`queued > 0`).
- **API восстановления очереди:** добавлены новые admin endpoint'ы для проверки состояния и безопасного ручного запуска:
  - `GET /api/admin/manager/queue-recovery-state`
  - `POST /api/admin/manager/queue-start`

### Изменено

- **UX восстановления очереди:** кнопка находится рядом с `Download Excel`; в невалидных состояниях она disabled и показывает корректное состояние без риска запуска второго `running`.
- **Кнопки управления очередью в manager:** `+1` / `-1` сделаны уже для более компактного интерфейса.
- **Экспорт данных (JSON backup):** из export snapshot удалены payload'ы логов (`events`), чтобы уменьшить размер файла при сохранении бизнес-данных восстановления (`participants`, `competitions`, `runSessions`, `runs`, `adminSettings`).

### Исправлено

- **Совместимость импорта:** JSON import остается обратно совместимым со старыми backup-файлами, где есть `events`, и корректно работает с новым компактным экспортом без `events`.

---

## [0.3.5] - 2026-04-22

### Fixed

- **Consent legal docs split:** registration now opens **different modal content** for each «Ознакомиться» button — «Правила участия» shows participation rules, while «Обработка перс. данных» shows the personal-data consent text.
- **Consent text source update:** replaced consent body with the latest approved wording and removed imported page markers/artifacts from the source text before publishing.

### Changed

- **Legal content structure:** moved participation rules into a dedicated source file (`participationRulesLegalRu.ts`) and updated `ConsentLegalModal` to accept injected content, so doc mapping is explicit and maintainable.

---

## [0.3.4] - 2026-04-21

### Added

- **Registration — consent legal text:** full Russian «Согласие на участие и обработку персональных данных…» for the «Ознакомиться» modal (`consentParticipationLegalRu.ts`), rendered in **Druk Wide Cyr** with **uppercase** body copy; body font size is driven by **`CONSENT_PARTICIPATION_LEGAL_FONT_SIZE_PX`** (18px).

### Changed

- **Consent step (register):** checkbox label **«Обработка перс. данных»** with non-breaking spaces; personal-data card uses **content-based width** so the full title stays on **one line** without reducing the card title font size; consent cards row **flex-wrap** and tighter padding/gaps where needed.
- **`ConsentLegalModal`:** scrollable body (**touch / iPad**), portal overlay unchanged.

---

## [0.3.3] - 2026-04-21

### Fixed

- **TD result leaderboard metric wrapping:** distance is now rendered with a non-breaking space (`1001 м`) and result metric cells use `white-space: nowrap`, so value and unit stay on one line on the finish leaderboard.
- **Queue prepare copy alignment:** subtitle “Забег сейчас начнется!” is centered as a full-width line on the “Пройдите на дорожку” screen.
- **Age gate blocked text readability:** the two warning lines now have a larger font (+25%) and a small vertical gap between lines.

### Changed

- **README:** added a short release note block describing backup scheduler, XLSX leaderboard export, and queue reliability improvements.

---

## [0.3.2] - 2026-04-21

### Added

- **Automatic JSON backup scheduler:** backend now writes hourly snapshots using the existing `dataSnapshot` export shape into `backup/YYYY-MM-DD/backup-HH-mm.json` (configurable via `DATA_SNAPSHOT_BACKUP_DIR`, `DATA_SNAPSHOT_BACKUP_INTERVAL_MINUTES`, `DATA_SNAPSHOT_BACKUP_ENABLED`). Write path is safe (`*.tmp` + atomic rename) with operational logs and startup auto-resume.
- **Leaderboard Excel export (`.xlsx`):** new admin endpoint `GET /api/admin/leaderboards/export-xlsx` builds one workbook with separate sheets per active leaderboard slot (male/female × run type), numeric sort column, run IDs, timestamps, and manager-readable headers.

### Changed

- **Admin UI and manager UI:** added `Download Excel` action in both `/admin` dashboard and `/manager` queue view to download one multi-sheet leaderboard workbook.

---

## [0.3.1] - 2026-04-20

### Fixed

- **Backend global queue after run result:** `submitRunSessionResult` now **awaits** promotion (no `void promote…`): guarded `Promise.race` with **`RUN_RESULT_PROMOTE_GUARD_MS`** (default 15s, clamped 2s–120s), optional second `promoteNextQueuedSessionAfterFinish` after guard timeout, **serialized** finish-promote chain to avoid overlapping HTTP/OSC/duplicate calls, **duplicate finish (200)** path calls **`ensurePromoteAfterDuplicateFinishIfIdle`** so a retried request can recover when the pool is idle but FIFO still has queued sessions. Added structured logs (`run_result_received`, `run_session_marked_finished`, `global_queue_*`, idle-with-queued warning). OSC stop handler logs **`td_runstate_stop_submit_completed`** when the async submit chain settles (UDP callback still non-blocking).

### Changed

- **Docs:** `docs/system-handoff-ru.md` — операторка (раздел 5a): JSON export/import в полной админке, панель менеджера `/manager`; `README.md` — ссылка на handoff; `docs/touchdesigner-integration-ru.md` — раздел про гонки finish/promote приведён в соответствие с текущим backend-поведением.

---

## [0.3.0] - 2026-04-20

### Added

- **Admin backup (JSON):** `GET /api/admin/data/export` (download snapshot with dated filename) and `POST /api/admin/data/import` (validated full replace in a transaction); service `apps/backend/src/services/dataSnapshot.ts`. **Настройки** админки: экспорт/импорт через UI.
- **Manager queue history:** `GET /api/admin/manager/queue-history` — до 20 строк: `running`, затем `queued`, затем недавние `finished`; поля для поиска и **`displayTime`** (ISO под именем).

### Changed

- **`GET /api/run/queue`:** в каждой записи добавлено **`participantPhone`** (из `participants.phone`, без смены схемы БД).
- **Manager (`/manager`) — вкладка «Очередь»:** заголовок «История очереди», поиск по имени/фамилии/телефону, время под ФИО; для **finished** только «Редактировать»; для **running** — «Сойти с забега» (`mark-cancelled`); для **queued** — прежние `-1` / `+1` / «В конец».
- **`POST …/mark-cancelled`:** если отменена сессия со статусом **`running`**, после перенумерации вызывается **`promoteNextQueuedSessionAfterFinish`** (следующий в глобальной очереди может стартовать на TD / demo), как после завершения забега.

---

## [0.2.23] - 2026-04-20

### Added

- **Druk Wide Cyr:** `@font-face` for weights **100–900** (`apps/frontend/src/index.css`) with matching `public/assets/fonts/DrukWideCyr-*.woff2` (placeholders duplicate Regular until replaced per `public/assets/fonts/README.md`).

### Changed

- **Home (`/`):** build **`v…`** always visible top-right at **half** the previous tap-reveal size; **triple tap «AMAZING»** opens **`/admin`** (god PIN gate) instead of toggling version visibility. **Triple tap «RED»** unchanged for manager modal.
- **`docs/VERSIONING.md`:** updated where version is shown and how to open full admin from the kiosk.

---

## [0.2.22] - 2026-04-20

### Changed

- **Full admin (`/admin/*`):** enter only by **opening the URL** in the browser — full-screen PIN gate (`AdminGodLoginScreen` + `GodAdminRoute`). Legacy path «god admin from the kiosk home» is gone on purpose; PIN `555555` / DB-configured god PIN via `POST /api/admin/login`.
- **Home logo gesture:** triple tap **RED** still opens the **manager** modal only (`AdminPinModal` → `managerLogin` → `/manager`); it no longer branches into a god-admin modal.

---

## [0.2.21] - 2026-04-20

### Fixed

- **Run queue / prepare sheet:** the grey panel stopped moonlighting as a narrow stripe — «Ваш номер в очереди», «дорожка занята», and «Пройдите на дорожку» fill the canvas again (stretch flex, full-width content).

### Changed

- **iPad kiosk:** after a finished run, no more full-screen TD completion leaderboard; jump home instead. Poll + `runSessionId` flow unchanged for future reuse. Other clients still open `/td/leaderboard/result` as before.

### Added / Changed

- **Manager vs god-admin PIN:** `POST /api/manager/login` (PIN `332277`) vs `POST /api/admin/login` (configured + legacy god pins only). Operator APIs still accept either PIN via headers. Frontend: `RequireAdmin` role gate, `managerLogin`, `AdminPinModal` access mode.
- **Manager panel:** «Вернуться на главную» on the queue tab; wider queue action buttons.

---

## [0.2.20] - 2026-04-20

### Added

- **Manager panel (`/manager`):** entry from home via **three taps on “Red”** in the logo, then PIN; tabs **Queue** (global list with `-1` / `+1` / **В конец** for queued rows; running row greyed, actions disabled), **Забеги** (six run-slot buttons with selection highlight; edit **фамилия / имя / телефон** per participant and save), **Система** (restart with PIN + confirm). Uses existing admin auth headers.
- **Handoff doc:** `docs/system-handoff-ru.md` (project overview for transfer).

### Changed

- **Admin PIN policy:** `POST /api/admin/login` and admin-scoped routes accept both the **legacy** PIN `555555` and **`332277`**, in addition to the PIN stored in settings; default DB fallback for admin PIN updated to `332277`.
- **Queue reorder (admin/manager):** `move-up` / `move-down` now reorder by swapping **`createdAt`** (FIFO source of truth) instead of only `queueNumber`; `move-tail` uses global tail bump + renumber.

### Fixed

- **Frontend `fetch` helper (`api/client.ts`):** merged `Content-Type: application/json` with `X-Admin-Pin` correctly so **PUT** bodies (e.g. `PUT /api/admin/participants/:id`) are parsed and **participant edits persist**.

---

## [0.2.19] - 2026-04-20

### Changed

- **Top-right participant label (queue/prepare screens):** unified display via single shared helper with one rule for all related screens — `Имя Ф.` format, whitespace normalization, edge-case fallback (`Участник`), and global cap **35 chars + ellipsis**.
- **Queue position intro screen (`/run/queue/position`):** fixed line wrapping so `Ваш номер в очереди: N` always stays on one line (number no longer drops to the next line).

---

## [0.2.18] - 2026-04-20

### Added

- **Queue export endpoint:** added `GET /api/run/queue.tsv` for TouchDesigner/external consumers. Response is `text/tab-separated-values` with columns: `runSessionId`, `participantId`, `firstName`, `lastName`, `phone`, `runTypeId`, `runTypeName`, `status`, `createdAt`; includes only active sessions (`queued` + `running`) in FIFO order (`createdAt ASC`, `id ASC`).

### Documentation

- Updated `README.md` with `/api/run/queue.tsv` format, sorting/filtering rules, and current kiosk flow notes.
- Updated `docs/touchdesigner-integration-ru.md` with TSV queue export section and current prepare/running UI-flow behavior.

---

## [0.2.17] - 2026-04-20

### Changed

- **Prepare screen (`/run/prepare`) polish:** right-top participant label now uses `Имя Ф.` format (e.g. `Олег П.`), background tuned to cooler blue Figma variant, and `Ок` button removed.
- **Prepare close behavior:** full form area is now tappable/clickable to close immediately to home; existing 10-second auto-close remains.
- **Run queue flow:** removed `Вы на дорожке. Забег идет.` state screen from kiosk path — when session becomes `running`, app now transitions directly to home.
- **Run queue shell reuse:** `RunQueueScreenShell` now supports optional right label override, optional footer, and prepare-specific sheet/overlay styling without affecting other queue screens.

---

## [0.2.16] - 2026-04-20

### Fixed

- **Registration wizard broken glyph artifacts:** removed expiring external Figma MCP asset links used by shared wizard backdrop and back button icon. Replaced with stable local rendering (inline SVG arrow + CSS backdrop layers), which restores the **Назад** arrow and removes widespread `?` placeholder squares on forms.
- **Main leaderboard (`/leaderboard`) rotation behavior:** disabled automatic background carousel switching; leaderboard now changes only by explicit user navigation.

---

## [0.2.15] - 2026-04-20

### Changed

- **Main leaderboard (`/leaderboard`):** added smooth fade out/in transition for carousel switching (auto-rotation, arrows, and gender tab switch) to avoid abrupt visual jumps.
- **TouchDesigner integration docs:** clarified waiting leaderboards as two explicit routes — male and female (`/td/leaderboard/waiting?sex=male|female`) with updated examples/checklist.

---

## [0.2.14] - 2026-04-20

### Changed

- **TD final leaderboard (`/td/leaderboard/result`):** reworked highlighted-runner placement to a deterministic **7-row sliding window**: rank 1/2/3/4 appears on row 1/2/3/4 respectively, and rank 5+ keeps the red row fixed on row 4 while surrounding rows slide.
- **Final leaderboard rank fallback:** when API rank is missing for synthetic highlighted row, displayed place is now derived from sliding-window position instead of `—`.
- **TD waiting leaderboard (`/td/leaderboard/waiting`):** side badges are vertically centered on screen for both `sex=male` and `sex=female`.
- **Typography configuration:** standardized TD font stacks via shared tokens (`td.fontDruk` / `td.fontProxima`) and declared `@font-face` for used Proxima Nova weights (400/700) with Oswald fallback.

---

## [0.2.13] - 2026-04-20

### Changed

- **TD waiting leaderboard (`/td/leaderboard/waiting`):** side badges (`мужской зачет` / `женский зачет`) tuned to Figma style with Proxima Nova typography, lighter/smaller corner frame elements, and increased internal label padding.
- **TD waiting leaderboard names:** participant full name (`Фамилия Имя`) is now hard-capped to **23 characters + ellipsis** to keep one-line rendering stable and prevent row/layout shifts.
- **TD result leaderboard (`/td/leaderboard/result`):** highlight strip vertical thickness adjusted to design (`padding: 30px 20px`).

### Notes

- **Available leaderboards (URLs):**
  - `/leaderboard` — main carousel leaderboard (all formats, male/female).
  - `/td/leaderboard/waiting?sex=male|female` — TD waiting leaderboard by gender.
  - `/td/leaderboard/result?runSessionId=<id>` — TD finish/result leaderboard for a run session.
- **URL params (examples):**
  - `sex`: `male` or `female` (example: `/td/leaderboard/waiting?sex=female`).
  - `runSessionId`: run session identifier (example: `/td/leaderboard/result?runSessionId=abc123`).

---

## [0.2.12] - 2026-04-19

### Changed

- **Prepare screen content alignment (`/run/prepare`):** grouped `Пройдите на дорожку` + `Забег сейчас начнется!` into a single centered content block for consistent intra-block alignment.
- **Vertical centering root cause fix:** run-queue shell now supports centering content against the entire card (`Sheet`), not only the area below the header; enabled for the immediate-start prepare screen.
- **Prepare screen placement parity:** switched prepare screen to sheet-wide centering mode so the full text block sits at true visual vertical center of the card/screen.

---

## [0.2.11] - 2026-04-19

### Changed

- **Consent cards interaction:** checkbox hit area expanded to the whole card (checkbox, title, text area, and empty card space toggle consent); `Ознакомиться` remains an exception and opens the modal without toggling.
- **Consent legal modal scroll behavior:** long document content now scrolls strictly inside the popup with background scroll lock while open and full style restoration on close to prevent overscroll leakage to subsequent registration steps.
- **Immediate-start treadmill screen (`/run/prepare`):** preserved Figma message screen (`Пройдите на дорожку, забег сейчас начнется!`) for the free-treadmill flow and removed auto-hop into the running queue screen for this case.
- **Run-prepare close policy:** added close-on-tap, auto-close after 10 seconds, and close on actual run start transition (`queued → running`) with a single-close guard to avoid repeated redirects.

### Fixed

- **Registration flow stability:** prevented popup/overlay scroll state from affecting the main form and later steps after closing consent documents.

---

## [0.2.10] - 2026-04-19

### Changed

- **Registration / Name step (`Как тебя зовут?`):** iPad keyboard behavior stabilized with a local keyboard-open state driven by `visualViewport`, no-scroll short-step mode, and content shift-up in keyboard state (instead of page/canvas scrolling).
- **Registration layout height behavior:** fullscreen fallback heights migrated from `100vh` to `100dvh` in the AR Ozio viewport/root containers to reduce iOS viewport jumpiness during keyboard open/close.
- **Name step card fit:** short wizard card minimum height tuned to better match Figma and avoid squeezed appearance.
- **Phone step underline:** removed duplicate underline from the input itself and kept a single long custom underline matching design.

### Fixed

- **iPad form UX regression:** prevented extra scroll areas and unstable vertical scrolling after focusing name fields and opening the software keyboard.

---

## [0.2.9] - 2026-04-19

### Changed

- **TouchDesigner result leaderboard (`/td/leaderboard/result`):** fullscreen shell now prioritizes **full-width** composition for external wide displays (2560×1120 target) while keeping vertical centering.
- **Final leaderboard spacing:** increased vertical gap between the top title/logo block and the leaderboard list; then tuned to **`top: calc(50% + 40px)`**.
- **Background decor (final leaderboard):** positions aligned closer to Figma — **7 dashes left + 7 dashes right** in mirrored vertical columns and **4 corner plus signs**.
- **Decor visual style:** plus/dash markers reworked from font glyphs to thin stroke-like shapes for cleaner Figma parity; thickness tuned to final value (**2.5px**).

---

## [0.2.8] - 2026-04-19

### Added

- **`/leaderboard`:** карусель из **6 зачётов** (3 формата × мужчины/женщины), автосмена слайда, боковые колонки — соседние зачёты; **подсветка участника** только при **`?runSessionId=`** (разбор через **`getRunSessionState`** + **`getParticipant`**, без неявного highlight из **`sessionStorage`**).

### Changed

- **Main:** кнопка **«Лидерборд»** ведёт на **`/leaderboard`** (общий просмотр).
- **Leaderboard:** не более **7** строк на колонку (**`MAX_LEADERBOARD_ROWS`**); убраны подзаголовок про форматы/карусель и строка переключения **«формат»** под колонками.

---

## [0.2.7] - 2026-04-19

### Added

- **Главная («Беги на максимум»):** фон — **loop video** **`public/assets/hero/bg ipad 2bit.mp4`** (`<video>`: **autoplay**, **muted**, **loop**, **playsInline**, **preload="auto"**); подложка **LQ blur** **`hero-bg-lq.jpg`** до появления кадра; плавное появление как у прежнего full-asset.

### Changed

- **Main:** вместо стека **WebP / JPEG** на full-слое — **одно видео**; **`video.play()`** как подстраховка автозапуска.

### Fixed

- **Видимость фонового видео:** у контейнера **`heroImageWrap`** убраны **`mixBlendMode: color-dodge`** и полупрозрачность — на тёмной пластине и с **`<video>`** слой иначе почти не виден; задан явный **z-index** (пластина **0**, видео **1**, контент **3**).

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
