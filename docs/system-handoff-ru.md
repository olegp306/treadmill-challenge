# Treadmill Challenge — System Handoff (RU)

Этот документ — единая точка передачи проекта в другую систему/команду.

## 1) Назначение проекта

Приложение для регистрации участников и управления забегами на беговой дорожке с несколькими интерфейсами:

- киосковый frontend (регистрация, очередь, экраны перед стартом/после финиша),
- backend API для управления сессиями забегов и лидербордами,
- TouchDesigner-совместимые экраны и экспорт данных для внешнего потребителя.

Ключевая цель: обеспечить стабильный offline-friendly flow мероприятия и внешний вывод лидербордов/очереди.

## 2) Технологический стек

- Monorepo на npm workspaces
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Fastify + TypeScript
- База данных: SQLite (`apps/backend/data/treadmill.db`)
- Общие типы/контракты: `packages/shared`

## 3) Структура репозитория

- `apps/frontend` — UI (киоск, лидерборды, очереди, TD-экраны)
- `apps/backend` — API, сервисы, доступ к БД
- `packages/shared` — shared types/contracts
- `docs` — интеграционная/техническая документация
- `CHANGELOG.md` — релизные заметки по версиям
- `README.md` — общее описание, запуск, API overview

## 4) Основные пользовательские экраны (frontend)

- `/` — главная/стартовый пользовательский flow
- `/leaderboard` — основной leaderboard (ручное переключение, без автопрокрутки)
- `/td/leaderboard/waiting?sex=male|female` — waiting leaderboard для внешнего широкого экрана
- `/td/leaderboard/result` — финальный leaderboard внешнего широкого экрана
- `/run/prepare` — экран «Пройдите на дорожку» (тап в любое место или автозакрытие через 10 сек)
- `/run/queue/...` — экраны очереди (включая «Ваш номер в очереди»)

## 5) Ключевые backend endpoint’ы

Базовые run/queue endpoint’ы описаны в `README.md`.

Отдельно критичный endpoint для внешнего потребителя:

- `GET /api/run/queue.tsv`
  - Content-Type: `text/tab-separated-values; charset=utf-8`
  - Экспортирует только активные сессии: `queued`, `running`
  - Порядок: FIFO (`createdAt ASC`, затем `id ASC`)
  - Колонки (строго):
    - `runSessionId`
    - `participantId`
    - `firstName`
    - `lastName`
    - `phone`
    - `runTypeId`
    - `runTypeName`
    - `status`
    - `createdAt`
  - Если очередь пуста — возвращается только header-строка.

## 6) Текущее состояние UI/логики (последние изменения)

- Унифицирован формат отображения имени в правом верхнем углу через общий helper:
  - формат: `Имя Ф.`
  - единая нормализация пробелов/регистра
  - fallback: `Участник`
  - ограничение: максимум 35 символов, далее `…`
- На экране «Ваш номер в очереди» строка `Ваш номер в очереди: N` теперь всегда в одну строку (`nowrap`).
- Экран «Вы на дорожке. Забег идет.» выведен из текущего flow (переход на главную).
- На `/run/prepare`:
  - убрана кнопка `Ок`,
  - закрытие по тапу на форму,
  - автозакрытие через 10 секунд,
  - корректная защита от двойной навигации.
- Для внешних TD-лидербордов:
  - обновлена логика позиционирования красной строки в финальном leaderboard (window из 7 строк),
  - фикс отображения места, если rank отсутствует в данных,
  - waiting leaderboard переведен на параметр `sex=male|female` и доработан по типографике/лейауту.
- Убраны артефакты декоративных элементов, вызванные проблемными внешними Figma-ассетами (замены на локальную/inline реализацию).

## 7) Шрифты и типографика

Фокусные шрифты:

- `Proxima Nova`
- `Druk Wide Cyr`

Что приведено в порядок:

- стандартизация family-имен в токенах/использовании,
- проверка `@font-face` и fallback-цепочек,
- централизация font stacks в TD токенах (например `td.fontProxima`, `td.fontDruk`).

Важно для передачи:

- если конкретные файлы нужных весов отсутствуют физически, браузер использует fallback/closest weight;
- визуально «неотличимые веса» обычно означают отсутствие соответствующих font files, а не баг CSS сам по себе.

## 8) Ключевые файлы, где находится важная логика

### Frontend

- `apps/frontend/src/pages/LeaderboardPage.tsx` — основной leaderboard page
- `apps/frontend/src/pages/td/TdResultLeaderboardPage.tsx` — финальный TD leaderboard
- `apps/frontend/src/features/td/TdWaitingLeaderboardPage.tsx` — waiting TD leaderboard (лейаут/лейблы)
- `apps/frontend/src/features/td/TdWaitingBlocks.tsx` — форматирование/отрисовка waiting строк
- `apps/frontend/src/features/td/tdTokens.ts` — TD токены, в т.ч. font stacks
- `apps/frontend/src/pages/RunPreparePage.tsx` — «Пройдите на дорожку»
- `apps/frontend/src/pages/RunQueuePage.tsx` — основной queue flow
- `apps/frontend/src/pages/RunQueuePositionIntroPage.tsx` — «Ваш номер в очереди»
- `apps/frontend/src/features/run-queue/RunQueueScreenShell.tsx` — общий shell queue-экранов
- `apps/frontend/src/features/run-queue/participantDisplayName.ts` — единое правило форматирования имени в header
- `apps/frontend/src/index.css` — global styles, font-face и общие CSS правила

### Backend

- `apps/backend/src/routes/run.ts` — run-related routes (включая `queue.tsv`)
- `apps/backend/src/services/runService.ts` — бизнес-логика run, форматирование TSV
- `apps/backend/src/db/runSessions.ts` — SQL-запросы по run sessions/очереди
- `apps/backend/src/routes/leaderboard.ts` — endpoint’ы leaderboard

### Документация

- `README.md` — overview + endpoint catalog
- `docs/touchdesigner-integration-ru.md` — TD-интеграция и правила UI flow
- `CHANGELOG.md` — релизная история

## 9) Запуск и проверка

Базовые команды (из корня репо):

- установить зависимости: `npm install`
- frontend dev: `npm run dev -w apps/frontend`
- backend dev: `npm run dev -w apps/backend`
- production build frontend: `npm run build -w apps/frontend`
- production build backend: `npm run build -w apps/backend`

Релизный цикл, используемый в проекте:

1. `npm run release:patch`
2. обновить секцию версии в `CHANGELOG.md`
3. собрать frontend/backend
4. `git commit`
5. `git push origin <branch>`

## 10) Интеграция с TouchDesigner / внешним экраном

Минимальный набор для внешней системы:

- waiting leaderboard:
  - `/td/leaderboard/waiting?sex=male`
  - `/td/leaderboard/waiting?sex=female`
- result leaderboard:
  - `/td/leaderboard/result` (параметры контекста зависят от текущего flow backend/frontend)
- экспорт активной очереди:
  - `GET /api/run/queue.tsv`

Рекомендуется проверить, что внешний потребитель корректно обрабатывает:

- UTF-8 (кириллица),
- TSV escaping (таб/переносы строк в полях),
- пустую очередь (только header).

## 11) Операционные риски и что мониторить

- Риски внешних ассетов (Figma URL с expiring-токенами) — использовать локальные/inline ресурсы.
- Шрифты: отсутствие файлов отдельных весов = визуально некорректные `font-weight`.
- Стабильность kiosk-flow: не допускать race-condition между timeout и manual tap navigation.
- Следить, чтобы `dist/`, локальные DB-файлы и временные кэши не попадали в релизные коммиты без необходимости.

## 12) Версия и последний релиз

Текущая версия после последнего релизного цикла: `0.2.19`.

Последний релизный фокус:

- унификация отображения имени в header queue/prepare экранов,
- фиксация `Ваш номер в очереди: N` в одной строке,
- обновление release note.

---

Если нужен machine-readable handoff (JSON/YAML) для импортера другой системы, можно сгенерировать отдельный файл рядом с этим документом.
