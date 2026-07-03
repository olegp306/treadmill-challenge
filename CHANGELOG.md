# Changelog

Short, operational record of what shipped in each **product version**.  
**Source of truth:** root `package.json` → `"version"` (`treadmill-challenge`).

Format: `[MAJOR.MINOR.PATCH]` — SemVer-ish (see `docs/VERSIONING.md`).

---

## [0.5.126] - 2026-07-03

### Remote system

- **Remote Leaderboard landing mobile visuals:** fixed the mobile discipline-card background images by moving the image layer above the card background and below the dark overlay/content.
- **Remote Leaderboard landing mobile visuals:** replaced the hidden `color-dodge` background blend with a normal image layer so the three discipline images are visible behind the text.
- **Remote versions:** `remote-frontend` raised to `0.1.119`.

### Verification

- `pnpm run build:remote-frontend`
- Playwright mobile viewport check verified all three discipline cards at `390px`, with image layer `z-index: 0`, overlay `z-index: 1`, content controls above it, and no horizontal overflow.

## [0.5.125] - 2026-07-02

### Remote system

- **Remote Leaderboard landing version badge:** made the centered top version label twice as small and twice as muted.
- **Remote versions:** `remote-frontend` raised to `0.1.118`.

### Verification

- `pnpm run build:remote-frontend`
- Playwright viewport checks verified the version label remains centered at `390px` and `1364px`.

## [0.5.124] - 2026-07-02

### Remote system

- **Remote Leaderboard landing hero:** removed the trailing full stop from the first-screen `Беги на максимум` headline across mobile and desktop layouts.
- **Remote versions:** `remote-frontend` raised to `0.1.117`.

### Verification

- `pnpm run build:remote-frontend`
- Playwright checks verified the hero headline at `390px` and `1364px` renders without the trailing full stop while the "Максимум за 5 минут" discipline description keeps its full stop.

## [0.5.123] - 2026-07-02

### Remote system

- **Remote Leaderboard landing disciplines:** restored the full stop in the "Максимум за 5 минут" description.
- **Remote Leaderboard landing disciplines:** shortened the golden kilometer copy to `1 км.` and tightened the mobile stayer title so it fits inside the card.
- **Remote Leaderboard landing mobile visuals:** aligned the mode-card mobile corner marks and made the mobile background image more visible without changing the desktop layout.
- **Remote versions:** `remote-frontend` raised to `0.1.116`.

### Verification

- `pnpm run build:remote-frontend`
- Playwright mobile viewport check verified the three discipline cards at `390px`, including symmetric corner marks, no horizontal overflow, and the updated discipline copy.

## [0.5.122] - 2026-07-02

### Remote system

- **Remote Leaderboard landing copy:** changed the third step heading from position tracking to result tracking and updated the supporting sentence accordingly.
- **Remote Leaderboard landing disciplines:** shortened the "Максимум за 5 минут" description by removing the extra power tagline and trailing full stop.
- **Remote Leaderboard landing intro:** changed the monthly prize copy to "Каждый месяц лучшие атлеты в каждой дисциплине выигрывают новые кроссовки."
- **Remote versions:** `remote-frontend` raised to `0.1.115`.

### Verification

- `pnpm run build:remote-frontend`
- Text search verified the old copy no longer exists in the landing page source.

## [0.5.121] - 2026-07-01

### Remote system

- **Amazing Red mobile embed handoff:** restored mobile edge handoff from the `800px` iframe to the parent page using passive touch listeners, so users can continue scrolling below the iframe without blocking native iframe scroll.
- **Remote versions:** `remote-frontend` raised to `0.1.114`.

### Verification

- `pnpm --dir apps/remote-frontend exec vitest run src/pages/iframeResizeMessenger.test.ts` *(blocked by local `vitest@4` / `vite@5.4.21` `./module-runner` export mismatch before tests run)*
- `pnpm run build:remote-frontend`

## [0.5.120] - 2026-07-01

### Remote system

- **Amazing Red mobile embed scroll:** stopped installing iframe scroll-handoff touch listeners on mobile/tablet so native iframe scrolling stays smooth; desktop sheet mode is unchanged.
- **Remote versions:** `remote-frontend` raised to `0.1.113`.

### Verification

- `pnpm --dir apps/remote-frontend exec vitest run src/pages/iframeResizeMessenger.test.ts` *(blocked by local `vitest@4` / `vite@5.4.21` `./module-runner` export mismatch before tests run)*
- `pnpm run build:remote-frontend`

## [0.5.119] - 2026-07-01

### Remote system

- **Amazing Red embed hybrid mode:** desktop embeds (`1025px+`) report the full landing height for one-page scrolling, while mobile/tablet embeds keep the stable fixed `800px` iframe scroll window.
- **Remote versions:** `remote-frontend` raised to `0.1.112`.

### Verification

- `pnpm run build:shared`
- `pnpm run build:remote-backend`
- `pnpm run build:remote-frontend`
- `pnpm --dir apps/remote-frontend exec vitest run src/pages/iframeResizeMessenger.test.ts` *(blocked by local `vitest@4` / `vite@5.4.21` `./module-runner` export mismatch before tests run)*

## [0.5.118] - 2026-07-01

### Remote system

- **Amazing Red embed rollback:** reverted the experimental full-height iframe sheet mode because it performs poorly on mobile; the embed is back to the fixed `800px` internal scroll window with scroll handoff messages.
- **Remote versions:** `remote-frontend` raised to `0.1.111`.

### Verification

- `pnpm run build:shared`
- `pnpm run build:remote-backend`
- `pnpm run build:remote-frontend`

## [0.5.117] - 2026-07-01

### Remote system

- **Amazing Red embed sheet mode:** changed the embedded landing resize message to report the full content height instead of a fixed `800px`, so the parent page can stretch the iframe into one long page for native page scrolling.
- **Remote versions:** `remote-frontend` raised to `0.1.110`.

### Verification

- `pnpm run build:shared`
- `pnpm run build:remote-backend`
- `pnpm run build:remote-frontend`
- `pnpm --dir apps/remote-frontend exec vitest run src/pages/iframeResizeMessenger.test.ts` *(blocked by local `vitest@4` / `vite@5.4.21` `./module-runner` export mismatch before tests run)*

## [0.5.116] - 2026-07-01

### Remote system

- **Remote Leaderboard landing history:** normalize monthly history to always render all three discipline cards for each month/gender; missing winners or missing discipline entries now show the discipline label with a single `—` result.
- **Remote versions:** `remote-frontend` raised to `0.1.109`.

### Verification

- `pnpm run build:shared`
- `pnpm run build:remote-backend`
- `pnpm run build:remote-frontend`

## [0.5.115] - 2026-07-01

### Remote system

- **Remote Leaderboard landing history:** kept monthly history discipline cards visible when a gender/month has no winner yet, showing the run label with a single `—` result instead of dropping the card.
- **Remote Leaderboard join popup:** render the address popup outside the scaled landing container so it stays centered on desktop and keeps the address/route controls visible on mobile.
- **Remote versions:** `remote-frontend` raised to `0.1.108`.

### Verification

- `pnpm run build:shared`
- `pnpm run build:remote-backend`
- `pnpm run build:remote-frontend`

## [0.5.114] - 2026-07-01

### Remote system

- **Amazing Red embed scroll bridge:** fixed downward scroll handoff by treating only real `overflow-y: auto|scroll|overlay` elements as nested scrollers; regular tall content blocks no longer suppress `running-challenge:scroll` messages.
- **Remote versions:** `remote-frontend` raised to `0.1.107`.

### Verification

- `pnpm run build:remote-frontend`

## [0.5.113] - 2026-07-01

### Remote system

- **Amazing Red embed scroll bridge:** added `running-challenge:scroll` messages when the embedded leaderboard reaches the top or bottom of its internal scroll area, so the parent page can continue scrolling with `window.scrollBy(...)`.
- **Amazing Red embed scrollbar:** hide the internal iframe scrollbar in Amazing Red embed mode while keeping wheel/touch scrolling active, removing the double-scrollbar visual.
- **Remote versions:** `remote-frontend` raised to `0.1.106`.

### Verification

- `pnpm run build:shared`
- `pnpm run build:remote-backend`
- `pnpm run build:remote-frontend`

## [0.5.112] - 2026-07-01

### Remote system

- **Amazing Red embed scrolling:** switched the Amazing Red iframe integration to an internal `800px` scroll window instead of resizing the cross-origin iframe to the full landing height, so wheel/touch scrolling works when the pointer is over the challenge content.
- **Remote versions:** `remote-frontend` raised to `0.1.105`.

### Verification

- Reproduced on `https://amazingred.ru/promo/running_challenge/`: wheel over the iframe body did not move the page while wheel at the edge did, confirming the full-height cross-origin iframe scroll trap.
- `pnpm run build:remote-frontend`

## [0.5.111] - 2026-07-01

### Remote system

- **Remote Leaderboard landing responsive:** moved the desktop-to-mobile layout switch to `1024px` and below, keeping narrowed desktop windows on the scaled desktop layout until the tablet/mobile breakpoint.
- **Remote Leaderboard landing prize block:** forced the PUMA prize card to use the real mobile composition through the full mobile/tablet range so the shoe and model text no longer enter a broken intermediate state.
- **Remote Leaderboard landing history:** forced the monthly result cards and gender tabs to use the same mobile width through the full mobile/tablet range so the cards no longer clip in narrowed desktop windows.
- **Remote Leaderboard embedded rating:** aligned the embedded leaderboard narrow layout breakpoint with the landing page at `1024px`.
- **Remote versions:** `remote-frontend` raised to `0.1.104`.

### Verification

- `pnpm run build:remote-frontend`
- Playwright viewport checks verified `390px`, `450px`, `520px`, `640px`, `769px`, and `1024px` render the PUMA prize card in mobile composition with no horizontal overflow, while `1025px` and `1364px` use the desktop prize layout.
- Playwright viewport checks verified the monthly history cards at `390px`, `450px`, `520px`, `640px`, `730px`, `900px`, and `1024px` stay inside the mobile card width with no horizontal overflow.

## [0.5.110] - 2026-07-01

### Remote system

- **Remote Leaderboard landing responsive:** removed the narrow desktop transition state by switching the landing and embedded leaderboard to the same mobile layout below the full desktop width.
- **Remote Leaderboard landing responsive:** centered the mobile layout inside narrowed desktop windows from `521px` to `1363px`.
- **Remote Leaderboard landing rating:** switched the embedded leaderboard controls to narrow/mobile mode at `1363px` and below so gender tabs and search controls no longer overflow.
- **Remote versions:** `remote-frontend` raised to `0.1.103`.

### Verification

- `pnpm run build:remote-frontend`
- Playwright viewport checks verified `390px`, `640px`, `1025px`, and `1363px` use mobile/narrow layout without desktop scaling or horizontal overflow, while `1364px` uses the full desktop path.
- Visual Playwright screenshots checked the prize and rating blocks at `640px`.

## [0.5.109] - 2026-07-01

### Remote system

- **Remote Leaderboard landing history:** restored month selection with `Июнь 2026` as the current default and `Май 2026` available for review.
- **Remote Leaderboard landing history:** filled June winners from the June export: `Петров Сергей 18:42.28`, `Петров Сергей 02:59.30`, `Лукин Александр 1562 м`, `Димитрова Валерия 24:04.94`, `Ильченко Алена 03:52.36`, and `Димитрова Валерия 1246 м`.
- **Remote Leaderboard landing history:** hidden empty dash-only result cards from monthly history.
- **Remote Leaderboard landing responsive:** switched narrow desktop windows to the mobile/tablet layout at `900px` and below so the prize shoe block no longer stays in the broken scaled desktop state.
- **Remote Leaderboard landing version badge:** moved the version badge back to the top-right corner and reduced its opacity.
- **Remote versions:** `remote-frontend` raised to `0.1.102`.

### Local registration

- **Participation rules:** replaced the registration rules text with the latest DOCX copy from `Правила участия (2).docx`, preserving the existing modal style.

### Verification

- `pnpm run build:remote-frontend`
- Playwright DOM check verified the history month selector, June default winners, May selectable winners, hidden May dash card, and the top-right muted version badge.
- Playwright viewport check verified `640px` and `900px` use mobile layout instead of desktop scaling, while `901px` keeps the scaled desktop path.
- `pnpm run build:frontend` was attempted but remains blocked by existing missing frontend type dependencies for `vitest` and Node built-ins.

## [0.5.108] - 2026-06-30

### Remote system

- **Remote Leaderboard landing history:** updated May history cards to use confirmed leaderboard leaders for the full period from launch through the end of May.
- **Remote Leaderboard landing history:** set men to `Лобов Костя 19:56.45`, `Князев Максим 03:34.22`, and `Минаков Иван 1244 м`.
- **Remote Leaderboard landing history:** set women to `—`, `Старк Мария 05:08.50`, and `Агафонова Надежда 907 м`.
- **Remote versions:** `remote-frontend` raised to `0.1.101`.

### Verification

- `pnpm run build:remote-frontend`
- Playwright DOM check verified the history block renders the confirmed men/women results on `/leaderboard2`.

## [0.5.107] - 2026-06-30

### Remote system

- **Remote Leaderboard landing embed:** added iframe resize messaging so the landing posts its real height to the Amazing Red host via `running-challenge:resize`.
- **Remote Leaderboard landing history:** removed month selection and locked race history to `Май 2026`.
- **Remote Leaderboard landing history:** filled May results from the exported leaderboard data using discipline rules: fastest valid time for `Золотой километр`, longest valid distance for `Максимум за 5 минут`, and placeholder `—` cards for invalid/missing `Стайер-спринт на 5 км` results.
- **Remote versions:** `remote-frontend` raised to `0.1.100`.

### Verification

- `pnpm run build:remote-frontend`
- Playwright DOM checks verified the May-only history block has no month selector, renders three cards for men and women, and leaves 5 km cards without a name and with `—`.
- Playwright iframe harness verified the landing sends `running-challenge:resize` to `https://amazingred.ru` and the host iframe height updates from `800px` to the landing height.

## [0.5.106] - 2026-06-30

### Remote system

- **Remote Leaderboard landing mobile CTA:** tightened the gap between the red `DEVIATE NITRO 4?` model line and the CTA description to match the mobile composition.
- **Remote Leaderboard landing mobile CTA:** vertically centered the red coordinate labels inside their corner brackets.
- **Remote Leaderboard landing mobile rating:** added extra frame height so the last leaderboard result is not covered by the iPhone browser bottom bar.
- **Remote Leaderboard landing mobile FAQ:** normalized `[01]` numeric labels and centered them against FAQ question rows.
- **Remote versions:** `remote-frontend` raised to `0.1.99`.

### Verification

- Mobile Playwright check at `393x852` verified the CTA description gap, centered coordinate labels, and extra leaderboard frame room above the iPhone browser bottom bar.

## [0.5.105] - 2026-06-30

### Remote system

- **Remote Leaderboard landing prizes:** updated the `Призы месяца` / PUMA card to use the Figma `DEVIATE NITRO 4` shoe artwork and model text across desktop and mobile.
- **Remote Leaderboard landing CTA:** restored the final CTA treadmill background from Figma as a soft-light overlay on both desktop and mobile while keeping CTA text, coordinates, and button layered above it.
- **Remote Leaderboard landing CTA:** aligned the final CTA height with the 500px Figma background layer and kept the mobile CTA content inside the card without overflow.
- **Remote versions:** `remote-frontend` raised to `0.1.98`.

### Workspace

- **Package manager:** added pnpm workspace metadata and lockfile, removed the stale npm lockfile, switched internal `@treadmill-challenge/shared` dependencies to `workspace:*`, and updated setup/run docs plus local startup scripts for pnpm.
- **Remote frontend tooling:** added the missing `vitest` dev dependency so the remote frontend TypeScript build can type-check its existing test file.

### Verification

- `pnpm exec vite build` from `apps/remote-frontend`
- Browser checks verified `/leaderboard2` renders the updated PUMA prize block and final CTA background on desktop and 390px mobile.
- GitHub API check found no open PRs to merge before publishing `main`.

## [0.5.104] - 2026-06-29

### Remote system

- **Remote Leaderboard landing:** changed the `people already participating` counter to use the unique participant count from the active remote leaderboard data instead of summing leaderboard rows across all disciplines.
- **Remote versions:** `remote-frontend` raised to `0.1.97`.

### Verification

- `npm run build:remote-frontend`
- Local API/page check verified the active leaderboard data has 35 unique participants and the landing counter renders `35`.

---

## [0.5.103] - 2026-06-29

### Remote system

- **Remote routes:** changed the remote frontend root URL (`/`) to open the landing page.
- **Remote routes:** kept the public remote leaderboard available at `/leaderboard`; `/leaderboard2` remains as a landing alias for compatibility.
- **Remote versions:** `remote-frontend` raised to `0.1.96`.

### Verification

- `npm run build:frontend`
- `npm run build:remote-frontend`
- Local route check verified `/` renders the landing page and `/leaderboard` renders the public remote leaderboard.

---

## [0.5.102] - 2026-06-29

### Remote system

- **Remote Leaderboard landing responsive:** added a dedicated desktop scaling stage so the desktop layout stays centered and compresses symmetrically between desktop and phone widths.
- **Remote Leaderboard landing responsive:** restricted the tablet/mobile `900px` layout rules to coarse pointer touch devices, preventing narrow desktop windows from falling into the intermediate mobile-like layout.
- **Remote versions:** `remote-frontend` raised to `0.1.95`.

### Verification

- `npm run build:remote-frontend`
- Local preview DOM checks verified `1440px` renders normal desktop, `768px` renders scaled desktop, and `390px` renders mobile.

---

## [0.5.101] - 2026-06-29

### Remote system

- **Remote Leaderboard landing mobile:** restored the prize shoe image in the `Prizes of the month` / PUMA card background while keeping the mobile carousel controls and extra decorative corners hidden.
- **Remote versions:** `remote-frontend` raised to `0.1.94`.

### Verification

- `npm run build:remote-frontend`
- Playwright mobile smoke check verified the prize shoe image is visible again, while the hidden mobile prize controls remain hidden.

---

## [0.5.100] - 2026-06-29

### Remote system

- **Remote Leaderboard landing:** added a `/leaderboard2` font gate so the landing waits for critical Druk/Proxima fonts before revealing the page, reducing visible font jumps on reload.
- **Remote Leaderboard landing:** preloaded critical Druk/Proxima font files from the remote frontend HTML entry point.
- **Remote Leaderboard landing mobile:** simplified the `Призы месяца` card by hiding mobile carousel arrows, decorative brackets, and the prize shoe image while keeping a small red globe marker.
- **Remote Leaderboard landing mobile:** removed the background image from the lower `Готов попасть в топ-10...` CTA block while keeping the coordinate digits.
- **Remote versions:** `remote-frontend` raised to `0.1.93`.

### Verification

- `npm run build:remote-frontend`
- Playwright mobile smoke check verified the font gate reaches `leaderboard2--fontGateReady`, critical fonts are loaded, prize arrows/brackets/image are hidden, the small globe is visible, and the lower CTA no longer has a background image.

---

## [0.5.99] - 2026-06-29

### Remote system

- **Remote Leaderboard landing desktop:** rebuilt the `Призы месяца` / PUMA prize card from the Figma assets, including the shoe artwork, ring overlay, corner marks, globe mark, and desktop typography.
- **Remote Leaderboard landing desktop:** tightened the hero `Беги на максимум.` headline to `scaleX(0.32)`.
- **Remote Leaderboard landing desktop:** tightened both `Частые` and `вопросы` FAQ title lines to `scaleX(0.32)`.
- **Remote Leaderboard landing desktop:** kept the intro `Каждый месяц лучшие...` title at the requested `45px` desktop size.
- **Remote versions:** `remote-frontend` raised to `0.1.92`.

### Verification

- `npm run build:remote-frontend`
- Local dev check verified `/leaderboard2` responds on `http://127.0.0.1:5174/leaderboard2` with the remote backend health endpoint responding on `http://127.0.0.1:3002/health`.

---

## [0.5.98] - 2026-06-29

### Remote system

- **Remote Leaderboard landing fonts:** added temporary bundled `ProximaNova-*.woff2` placeholder files for production testing until licensed Proxima Nova files arrive from design.
- **Remote Leaderboard landing fonts:** declared `Proxima Nova` weights `400`, `500`, `600`, and `700` through explicit `@font-face` URLs so production no longer depends on locally installed fonts for this family.

### Verification

- `npm run build:shared`
- `npm run build:remote-frontend`
- Production CSS check verifies Proxima Nova is loaded through `/assets/fonts/proxima-nova/*.woff2` and no `src: local(...)` is used.

---

## [0.5.97] - 2026-06-29

### Remote system

- **Remote Leaderboard landing desktop race modes:** tightened the large race mode titles and refreshed the desktop mode backgrounds from Figma assets for all three disciplines.
- **Remote Leaderboard landing race mode copy:** updated the desktop descriptions for `Максимум за 5 минут` and `Золотой километр` to match the Figma text, including the bold emphasis on the 1 km distance.
- **Remote Leaderboard desktop rating:** removed result truncation in compact leaderboard rows so distance results such as `1230 м` and `1225 м` render without ellipses.
- **Remote versions:** `remote-frontend` raised to `0.1.91`.

### Verification

- `npm run build:frontend`
- `npm run build:remote-frontend`
- Chrome/Playwright desktop checks verified the updated race mode typography/backgrounds and leaderboard results without ellipses.
- Chrome/Playwright mobile checks verified the mobile race mode title scale remained isolated from the desktop tightening.

---

## [0.5.96] - 2026-06-29

### Remote system

- **Remote Leaderboard landing history:** aligned the desktop race history cards so all three cards use equal grid columns, matching height, and consistent result positioning.
- **Remote Leaderboard landing history names:** split participant surname and first name into separate desktop lines while keeping mobile-specific layout rules isolated.
- **Remote Leaderboard landing history results:** tightened the visual result typography, kept results centered, and prevented distance results such as `1242 м` from wrapping onto a second line.
- **Remote versions:** `remote-frontend` raised to `0.1.90`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright desktop checks verified equal `423 × 300` history cards, two-line names, and centered results.
- Chrome/Playwright mobile checks verified centered history results, no result wrapping, and the narrower result scale.

---

## [0.5.95] - 2026-06-29

### Remote system

- **Remote Leaderboard landing mobile:** aligned `/leaderboard2` mobile spacing with the Figma `375px` layout while keeping responsive `16px` side margins on wider phones.
- **Remote Leaderboard landing mobile:** widened the race mode card internals: the carousel controls, top strip, title/description block, and CTA controls now follow the card width instead of staying on the old fixed `311px` layout.
- **Remote Leaderboard history:** added a real month selector for May-December 2026, kept the gender tabs full-width, and matched history card typography for race name, participant name, and result.
- **Remote Leaderboard mobile history:** fixed the mobile order so the month selector sits directly under `История забегов`, before the gender tabs.
- **Remote Leaderboard fonts:** prepared licensed Proxima Nova asset folders and wired existing Proxima stacks to use `Proxima Nova` first with safe fallbacks.
- **Remote versions:** `remote-frontend` raised to `0.1.89`.

### Verification

- `npm run build:frontend`
- `npm run build:remote-frontend`
- Chrome/Playwright mobile checks verified `16px` side margins, no horizontal overflow, widened race mode internals, history selector order, month options, and applied history card typography.

---

## [0.5.94] - 2026-06-28

### Remote system

- **Remote Leaderboard landing mobile:** added a lightweight mobile-only page reveal animation for `/leaderboard2`, so the landing fades in smoothly instead of appearing with a small visual jerk.
- **Remote Leaderboard motion safety:** the reveal respects `prefers-reduced-motion`, does not apply on desktop, and clears transform state after the animation to avoid affecting scroll and overlays.
- **Remote versions:** `remote-frontend` raised to `0.1.88`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright checks verified the reveal is active only on mobile width, disabled on desktop and reduced-motion, and does not introduce horizontal overflow.

---

## [0.5.93] - 2026-06-28

### Remote system

- **Remote Leaderboard landing fonts:** removed reintroduced Proxima Nova references from `/leaderboard2` styles so production no longer depends on locally installed font discovery.
- **Remote versions:** `remote-frontend` remains `0.1.87`.

### Verification

- `npm run build:shared`
- `npm run build:remote-frontend`
- Production CSS check verified no `Proxima Nova`, `ProximaNova`, `Inter Tight`, or `src: local(...)` remains in the remote frontend bundle.

---

## [0.5.92] - 2026-06-28

### Remote system

- **Remote Leaderboard landing mobile:** polished the Puma prize card on `/leaderboard2`: the mobile prize model now renders as separate fitted `DEVIATE NITRO` and `ELITE TRAIL` lines with intentional right-side breathing room.
- **Remote Leaderboard landing mobile CTA:** aligned the final CTA headline to three fixed lines and tightened `DEVIATE NITRO?` so the question mark fits on mobile without clipping.
- **Remote versions:** `remote-frontend` raised to `0.1.87`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright mobile checks verified no horizontal overflow, fitted Puma model lines, and a visible `DEVIATE NITRO?` question mark.
- Chrome/Playwright desktop smoke checks verified the desktop prize and final CTA text remain unchanged.

---

## [0.5.91] - 2026-06-28

### Remote system

- **Remote Leaderboard landing version labels:** added the product version to `/leaderboard2` near the top `AMAZING RED` logo and in the footer, so mobile/desktop checks can immediately confirm which product build is open.
- **Remote Leaderboard version source:** wired the label to the root product `package.json` version instead of a fallback dev value.
- **Remote versions:** `remote-frontend` raised to `0.1.86`.

### Verification

- Chrome/Playwright desktop and mobile checks verified both visible labels render as the current product version and no horizontal overflow appears.

## [0.5.90] - 2026-06-28

### Remote system

- **Remote Leaderboard landing mobile:** fixed the mobile “Беги на максимум” hero title so both lines fit inside the hero card without clipping or overlapping the location labels.
- **Desktop safety:** kept the desktop hero typography unchanged while applying the fix only inside the narrow mobile breakpoint.
- **Remote versions:** `remote-frontend` raised to `0.1.85`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright mobile check verified no horizontal overflow, both hero title lines stay inside the card, and location labels do not overlap the title.
- Chrome/Playwright desktop check verified the desktop hero transform remained unchanged.

---

## [0.5.89] - 2026-06-28

### Remote system

- **Remote Leaderboard landing desktop:** made the race mode title in the desktop “Режимы забега” card 10% narrower while preserving the same font size, height, and mobile layout.
- **Remote versions:** `remote-frontend` raised to `0.1.84`.

### Verification

- Chrome/Playwright desktop element check verified the title uses `scaleX(0.45)` with unchanged `180px` font size and `162px` line-height.
- Chrome/Playwright mobile check verified the mobile title keeps its separate `scaleX(0.38)` rule and no horizontal overflow appears.

---

## [0.5.88] - 2026-06-28

### Remote system

- **Remote Leaderboard landing fonts:** bundled Druk Wide Cyr weights `100-900` into `remote-frontend` and switched landing typography away from local-only font discovery, so dev and production render the hero/title widths consistently.
- **Frontend font stability:** removed local-only Proxima/Inter fallbacks from shared frontend styles that are imported by the remote bundle.
- **Remote versions:** `remote-frontend` remains `0.1.83`.

### Verification

- `npm run build:remote-frontend`
- `npm run build:frontend`
- Production CSS check verified no `Proxima Nova`, `ProximaNova`, `Inter Tight`, or `src: local(...)` remains in the remote frontend bundle.

---

## [0.5.87] - 2026-06-28

### Remote system

- **Remote Leaderboard landing desktop:** aligned the desktop rating block on `/leaderboard2` with the Figma reference: participant search now sits below the gender tabs, the rating table uses the centered overlay stack with dimmed side lists, and the section heading marker is placed on the right.
- **Remote versions:** `remote-frontend` raised to `0.1.83`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright desktop and mobile checks verified the rating block layout and no horizontal overflow.

---

## [0.5.86] - 2026-06-28

### Remote system

- **Remote Leaderboard landing mobile CTA:** aligned the final “ready for top-10” card with the mobile design: Proxima Nova 16px/130% three-line helper text, two separate bracketed coordinate groups, and the requested spacing before the final CTA button.
- **Remote versions:** `remote-frontend` raised to `0.1.82`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright mobile check verified the three text lines, typography, two coordinate groups on one row, 40px text-to-coordinates spacing, 20px coordinates-to-button spacing, and no horizontal overflow.

---

## [0.5.85] - 2026-06-28

### Remote system

- **Remote Leaderboard landing mobile search:** fixed iOS auto-zoom after focusing the participant search by keeping the input technically at 16px while preserving the compact visual size.
- **Remote Leaderboard landing stability:** stopped embedded search highlighting from scrolling the landing page and removed the loading-state reset during background leaderboard polling, preventing periodic visual jumps.
- **Remote versions:** `remote-frontend` raised to `0.1.81`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright mobile check verified search submit keeps `scrollY` stable, keeps the input at 16px for mobile browsers, and avoids horizontal overflow.

---

## [0.5.84] - 2026-06-28

### Remote system

- **Remote Leaderboard landing checkpoint:** prepared a clean `main` checkpoint after restoring the mobile participant search in the rating block, so the local and remote branches can be tested from the same version.
- **Remote versions:** `remote-frontend` raised to `0.1.80`.

### Verification

- `npm run build:remote-frontend`
- Local branch sync checked against `origin/main`.

---

## [0.5.83] - 2026-06-28

### Remote system

- **Remote Leaderboard landing mobile rating:** restored participant search in the mobile rating block on `/leaderboard2` and placed it after the red race selector, before the bordered results list.
- **Remote versions:** `remote-frontend` raised to `0.1.79`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright mobile check verified the order: gender tabs, race selector, search field with `Найти`, then the bordered participant list; search activates after two entered characters and no horizontal overflow appears.

---

## [0.5.82] - 2026-06-28

### Remote system

- **Remote Leaderboard landing mobile copy:** updated the mobile intro text on `/leaderboard2` to the new line-by-line wording about monthly winners receiving a pair of new sneakers.
- **Remote versions:** `remote-frontend` raised to `0.1.78`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright mobile check verified the new copy renders with the requested line breaks and no horizontal overflow.

---

## [0.5.81] - 2026-06-28

### Remote system

- **Remote Leaderboard landing mobile scroll:** fixed unstable touch scrolling on `/leaderboard2` around the first hero screen, embedded rating area and Puma prize/CTA cards by removing the nested page scroll container and forcing vertical pan passthrough on the embedded leaderboard frame.
- **Remote versions:** `remote-frontend` raised to `0.1.77`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright mobile touch checks verified vertical swipes from the hero, rating, Puma prize and CTA areas change the page scroll position; mobile and desktop smoke checks confirmed no horizontal overflow.

---

## [0.5.80] - 2026-06-27

### Remote system

- **Remote Leaderboard landing mobile:** completed the 100% mobile checkpoint for `/leaderboard2` against the supplied Figma mobile frame, including section geometry from hero through copyright and the final scroll/overflow audit.
- **Remote versions:** `remote-frontend` raised to `0.1.76`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright final mobile geometry audit confirmed the main mobile sections align to the Figma frame positions and desktop/mobile views have no horizontal overflow.

---

## [0.5.79] - 2026-06-27

### Remote system

- **Remote Leaderboard landing mobile:** polished the Puma CTA product heading so `PUMA MAGMAX` fits the mobile card without clipping while keeping the Figma-sized card and mobile scroll behavior.
- **Remote versions:** `remote-frontend` raised to `0.1.75`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright mobile and desktop smoke checks confirmed no horizontal overflow after the CTA typography polish.

---

## [0.5.78] - 2026-06-27

### Remote system

- **Remote Leaderboard landing mobile:** refined the lower `/leaderboard2` mobile Figma pass: FAQ, history of runs, footer and copyright now use the mobile frame geometry, spacing and typography closer to the supplied Figma nodes.
- **Remote Leaderboard landing layout:** restored the Figma vertical rhythm from intro through footer so the mobile sections line up at the intended y-positions without horizontal overflow.
- **Remote versions:** `remote-frontend` raised to `0.1.74`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright mobile and desktop checks confirmed no horizontal overflow; mobile screenshot verified the FAQ/history/footer/copyright pass.

---

## [0.5.77] - 2026-06-27

### Remote system

- **Remote Leaderboard landing mobile:** completed the next `/leaderboard2` mobile Figma pass through the rating, prize and CTA area: the embedded rating hides the mobile-only search field where the landing mockup does not show it, the prize card keeps the 343px Figma geometry, and the Puma CTA now matches the mobile card height, spacing, typography and call-to-action placement more closely.
- **Remote Leaderboard landing scroll:** rechecked mobile and desktop rendering after the pass; both stay vertically scrollable without horizontal overflow.
- **Remote versions:** `remote-frontend` raised to `0.1.73`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright mobile and desktop checks confirmed `/leaderboard2` has no horizontal overflow at the 70% checkpoint.

---

## [0.5.76] - 2026-06-27

### Remote system

- **Remote Leaderboard landing mobile:** refined the `/leaderboard2` mobile rating block: the section now uses the three-line mobile heading rhythm (`[ 04 ]`, `Рейтинг`, `участников`), the gender switcher, run selector and search field follow the mobile order, and the search field no longer overlaps the first leaderboard row.
- **Remote Leaderboard landing scroll:** rechecked page scrolling on mobile and desktop so the embedded rating block does not create horizontal overflow or trap the page scroll.
- **Remote versions:** `remote-frontend` raised to `0.1.72`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright mobile and desktop checks confirmed `/leaderboard2` has no horizontal overflow and remains scrollable through the rating section.

---

## [0.5.75] - 2026-06-27

### Remote system

- **Remote Leaderboard landing mobile:** refined the `/leaderboard2` mobile timer and run-mode card: the top countdown row is 15% narrower without changing height, the run-mode background is more muted, the Figma strip replaces mobile globes, and the mode arrows are wider and positioned below the description.
- **Remote Leaderboard landing assets:** added the mobile run-mode Figma strip and run-mode visual assets used by the refreshed mobile/desktop landing card.
- **Remote versions:** `remote-frontend` raised to `0.1.71`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright mobile and desktop checks confirmed the mobile-only timer/card changes do not affect the desktop run-mode card.

---

## [0.5.74] - 2026-06-21

### Remote system

- **Remote Leaderboard landing mobile:** refined the 361-480px mobile Figma pass for `/leaderboard2`: the run-mode card now has the larger reference-like title/card rhythm, the timer participant caption no longer clips, the FAQ section has cleaner mobile spacing, and the prize shoe sits closer to the supplied mobile comparison.
- **Remote Leaderboard landing scroll:** kept page scrolling active over the embedded rating block and made the mobile footer visible instead of clipping its subscription content.
- **Remote versions:** `remote-frontend` raised to `0.1.70`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright mobile checks at 320px, 375px, and 444px confirmed no horizontal overflow, full reach to page bottom, and touch scrolling over the embedded rating block.

---

## [0.5.73] - 2026-06-21

### Remote system

- **Remote Leaderboard landing mobile:** refined the lower mobile prize/CTA area: the prize shoe now sits closer to the reference card, and the mobile CTA no longer keeps the extra coordinate caption layer.
- **Scroll verification:** rechecked page scrolling on `/leaderboard2`, including gestures over the embedded leaderboard area, to make sure the rating block does not trap wheel or touch scrolling.
- **Remote versions:** `remote-frontend` raised to `0.1.69`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright checks at 320px, 375px, 444px, and desktop width confirmed no horizontal overflow, full wheel/touch reach to page bottom, and page scroll passthrough over the embedded rating block.

---

## [0.5.72] - 2026-06-21

### Remote system

- **Remote Leaderboard landing mobile:** changed the embedded rating block into a mobile showcase view that exposes only the top of the leaderboard list, keeps the long black reference-style tail before prizes, and preserves page scrolling across the whole rating area.
- **Remote versions:** `remote-frontend` raised to `0.1.68`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright checks at 320px, 375px, and 444px confirmed no horizontal overflow and verified that wheel scrolling over the rating tail still scrolls the page.

---

## [0.5.71] - 2026-06-21

### Remote system

- **Remote Leaderboard landing mobile:** refined the middle mobile sections so the How It Works heading stays on one line, the instruction cards keep the reference-like visual weight, and the run-mode card/rating transition moves closer to the provided mobile Figma comparison.
- **Remote versions:** `remote-frontend` raised to `0.1.67`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright checks at 320px, 375px, and 444px confirmed no horizontal overflow and stable mobile positions for the How, run-mode, and rating sections.

---

## [0.5.70] - 2026-06-21

### Remote system

- **Remote Leaderboard landing mobile:** aligned the 361-480px mobile layout with the Figma reference grid by restoring the 343px content width cap and compacting the hero/timer/intro area so the first screen sits closer to the provided mobile reference.
- **Remote versions:** `remote-frontend` raised to `0.1.66`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright screenshot at 444px confirmed the mobile blocks use the reference-width grid, no horizontal overflow appears, and the top section is more compact against the provided comparison screenshot.

---

## [0.5.69] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** removed the empty black tail under the embedded rating list on mobile and expanded page-scroll passthrough to the whole embedded leaderboard card so touch/scroll gestures do not get trapped around the rating block.
- **Remote versions:** `remote-frontend` raised to `0.1.65`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright checks at 320px, 375px, and 444px confirmed no horizontal overflow, page scrolling over the rating block, and the prize block moving directly after the mobile rating card.

---

## [0.5.68] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** reduced the embedded rating frame height on mobile so the leaderboard no longer leaves a large empty black tail before the prizes block, while keeping page scroll-through over rating rows.
- **Remote versions:** `remote-frontend` raised to `0.1.64`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright checks at 320px, 375px, and 444px confirmed no horizontal overflow, reduced rating frame height, prizes move closer to the reference position, and wheel scrolling over rating rows still scrolls the page.

---

## [0.5.67] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** changed the run-mode carousel arrows on 361-480px mobile screens back to the reference-style round buttons in the top-right of the card.
- **Remote versions:** `remote-frontend` raised to `0.1.63`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright checks at 375px and 444px confirmed the round mode arrows, bottom CTA placement, and no horizontal overflow.

---

## [0.5.66] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** aligned the 361-480px mobile layout with the reference viewport by removing the 343px width cap, tightening the hero/timer intro area, and resizing the red stats card.
- **Remote Leaderboard landing mobile:** fixed the mobile FAQ title so it no longer clips on wider mobile screenshots.
- **Remote versions:** `remote-frontend` raised to `0.1.62`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright screenshots at 375px and 444px confirmed no horizontal overflow; the 444px mobile page height moved closer to the provided reference screenshot.

---

## [0.5.65] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** adjusted the FAQ heading and question rows to better match the mobile reference: one-line title, larger question typography, and cleaner open-answer spacing.
- **Remote Leaderboard landing content:** updated prize and CTA copy to use the reference `PUMA DEVIATE NITRO ELITE TRAIL` / `DEVIATE NITRO?` naming.
- **Remote versions:** `remote-frontend` raised to `0.1.61`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright checks at 320px and 444px confirmed no horizontal overflow after the FAQ typography update.

---

## [0.5.64] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** moved the embedded rating search above the gender tabs to match the mobile reference flow.
- **Remote Leaderboard landing mobile:** enlarged the mobile rating frame so the leaderboard block has the same long-page presence as the Figma mobile layout instead of feeling clipped.
- **Remote Leaderboard landing mobile:** removed footer service captions/legal copy on mobile, leaving the compact logo/social/subscription block.
- **Remote versions:** `remote-frontend` raised to `0.1.60`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright mobile audit at 320px and 375px confirmed no horizontal overflow, rating-row scroll still passes through to the page, footer service captions are hidden, and the page reaches the bottom by real wheel scrolling.

---

## [0.5.63] - 2026-06-20

### Remote system

- **Remote Leaderboard landing scroll:** fixed a scroll trap on `/leaderboard2` where the embedded rating list could intercept wheel/touch scrolling and make the landing page feel stuck.
- **Remote versions:** `remote-frontend` raised to `0.1.59`.

### Verification

- `npm run build:remote-frontend`
- Chrome/Playwright scroll audit at 375px and 1440px confirmed page scrolling works over the hero, embedded rating wrapper, rating rows, prize block, FAQ, and reaches the page bottom without horizontal overflow.

---

## [0.5.62] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** adjusted the embedded `/leaderboard2` rating controls to match the landing layout more closely: the internal compact brand is hidden and search now sits inside the leaderboard card below the run selector.
- **Remote versions:** `remote-frontend` raised to `0.1.58`.

### Verification

- `npm run build:remote-frontend`
- Chrome mobile screenshot/metrics at 375px confirmed the embedded rating no longer renders its own wordmark, keeps width at `343px`, and page width stays `375px`.

---

## [0.5.61] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** restored the "Принять вызов" CTA inside the `/leaderboard2` mobile run-mode card and adjusted the card body spacing so the CTA and carousel controls fit together.
- **Remote versions:** `remote-frontend` raised to `0.1.57`.

### Verification

- `npm run build:remote-frontend`
- Chrome mobile metrics at 375px confirmed the mode CTA is visible, the carousel controls remain below it, and page width stays `375px`.

---

## [0.5.60] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** adjusted the `/leaderboard2` red Amazing Red stats card spacing and mobile stat text alignment closer to the Figma mobile reference.
- **Remote versions:** `remote-frontend` raised to `0.1.56`.

### Verification

- `npm run build:remote-frontend`
- Chrome mobile screenshot at 375px confirmed the page width remains `375px` after the stats-card adjustment.

---

## [0.5.59] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** constrained the embedded rating canvas on `/leaderboard2` to the mobile content column so the leaderboard no longer renders wider than its card after the iframe removal.
- **Remote versions:** `remote-frontend` raised to `0.1.55`.

### Verification

- `npm run build:remote-frontend`
- Chrome mobile metrics at 375px confirmed the embedded rating wrapper and canvas are both `343px` wide, with page width remaining `375px`.

---

## [0.5.58] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** fixed the `/leaderboard2` mobile scroll trap by embedding the remote leaderboard as a React component instead of an iframe, so swiping over the rating block continues scrolling the landing page.
- **Remote versions:** `remote-frontend` raised to `0.1.54`.

### Verification

- `npm run build:remote-frontend`
- Chrome mobile touch simulation at 375px confirmed swipes over the rating area now move the page, while `/leaderboard` remains reachable.

---

## [0.5.57] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** aligned the `/leaderboard2` "История забегов" mobile section with the Figma structure by moving the month selector into its own full-width control and restoring footer social/newsletter support text.
- **Remote versions:** `remote-frontend` raised to `0.1.53`.

### Verification

- `npm run build:remote-frontend`
- Chrome mobile screenshot at 375px confirmed `document/body` width stays `375` after the history/footer layout update.

---

## [0.5.56] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** enlarged and realigned the `/leaderboard2` "Призы месяца" mobile card so its typography and MAGMAX shoe composition sit closer to the Figma mobile reference.
- **Remote versions:** `remote-frontend` raised to `0.1.52`.

### Verification

- `npm run build:remote-frontend`
- Chrome mobile screenshot at 375px confirmed `document/body` width stays `375`, with no page-level horizontal overflow after the prize image adjustment.

---

## [0.5.55] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** fixed the embedded mobile leaderboard on `/leaderboard2` so the 10-row rating block fits without the previous large empty black area and without clipping the table before the prizes section.
- **Remote versions:** `remote-frontend` raised to `0.1.51`.

### Verification

- `npm run build:remote-frontend`
- CDP mobile checks at 375px confirmed `document/body` width stays `375`, the embedded leaderboard canvas is `520px`, and the landing iframe wrapper matches the compact rating height.

---

## [0.5.54] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** aligned the `/leaderboard2` "Как это работает" and "Режимы забега" mobile sections closer to the Figma reference with the split heading, larger discipline card typography, bottom red carousel controls, and wider mode description text.
- **Remote versions:** `remote-frontend` raised to `0.1.50`.

### Verification

- `npm run build:remote-frontend`
- CDP mobile check at 375px confirmed `document/body` width stays `375`, the mode card stays within `343px`, and the carousel controls stay inside the content column.

---

## [0.5.53] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** aligned the first `/leaderboard2` mobile screen closer to the Figma reference by restoring the taller hero/timer cards, matching the intro text wrapping, adding the missing spacing before the red stats card, and keeping the timer row inside the 343px content column.
- **Remote versions:** `remote-frontend` raised to `0.1.49`.

### Verification

- `npm run build:remote-frontend`
- CDP mobile check at 375px confirmed `document/body` width stays `375`, the timer card stays within `343px`, and the first-screen section positions match the Figma mobile layout more closely.

---

## [0.5.52] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** adjusted the `/leaderboard2` prize-card MAGMAX shoe filter to match the black/gray Figma reference instead of the previous warm tint.
- **Remote versions:** `remote-frontend` raised to `0.1.48`.

### Verification

- `npm run build:remote-frontend`
- CDP mobile check at 375px confirmed the prize card still stays within the 343px content column.

---

## [0.5.51] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** tightened the 375px prize-card MAGMAX shoe bounds on `/leaderboard2` so the rotated image stays inside the card without hidden horizontal overflow.
- **Remote versions:** `remote-frontend` raised to `0.1.47`.

### Verification

- `npm run build:remote-frontend`
- CDP mobile check at 375px confirmed the prize card stays within the 343px content column.

---

## [0.5.50] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** adjusted the 375px "Режимы забега" card typography on `/leaderboard2` so the title/description use real mobile widths instead of oversized scaled boxes.
- **Remote versions:** `remote-frontend` raised to `0.1.46`.

### Verification

- `npm run build:remote-frontend`
- CDP mobile check at 375px confirmed the discipline card stays within the 343px content column.

---

## [0.5.49] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** tightened the 375px "Как это работает" heading on `/leaderboard2` so it fits on one line without clipping or hidden horizontal overflow.
- **Remote versions:** `remote-frontend` raised to `0.1.45`.

### Verification

- `npm run build:remote-frontend`
- CDP mobile check at 375px confirmed the "Как это работает" section and heading stay within the 343px content column.

---

## [0.5.48] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** adjusted the `/leaderboard2` prize card so the MAGMAX shoe is larger and positioned closer to the Figma mobile layout.
- **Remote Leaderboard landing mobile:** clipped the 375px footer glow so it no longer creates internal horizontal overflow while preserving the subscription block.
- **Remote versions:** `remote-frontend` raised to `0.1.44`.

### Verification

- `npm run build:remote-frontend`
- CDP mobile check at 375px confirmed document width stays `375/375`.

---

## [0.5.47] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** fixed the embedded rating block on `/leaderboard2` so the mobile leaderboard is visible instead of being covered by a black overlay, and tightened the iframe height to remove the empty footer area under the table.
- **Remote Leaderboard landing mobile:** aligned prize/CTA copy with the mobile Figma screen (`PUMA MAGMAX NITRO 2`) and made the FAQ mobile heading/questions fit without hidden horizontal overflow.
- **Remote versions:** `remote-frontend` raised to `0.1.43`.

### Verification

- `npm run build:remote-frontend`
- CDP mobile checks at 375px confirmed document width stays `375/375`.

---

## [0.5.46] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** tightened the 320px footer glow on `/leaderboard2` so the footer no longer creates horizontal overflow while preserving the compact subscription layout.
- **Remote versions:** `remote-frontend` raised to `0.1.42`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.45] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** compacted the embedded mobile leaderboard on `/leaderboard2`: the rating iframe is shorter on 320px and the internal leaderboard rows/header are tighter while preserving the inner scroll list.
- **Remote versions:** `remote-frontend` raised to `0.1.41`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.44] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** tightened the 320px footer subscription block on `/leaderboard2`: the footer logo now stays within the card width and the subscription title/input spacing is more controlled.
- **Remote versions:** `remote-frontend` raised to `0.1.40`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.43] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** improved the 320px FAQ block readability on `/leaderboard2`: question rows now have enough line-height and no longer visually overlap when wrapped.
- **Remote versions:** `remote-frontend` raised to `0.1.39`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.42] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** moved the 320px prize card corner marks behind and above the content so the `Призы месяца` label no longer has decorative marks crossing the text.
- **Remote versions:** `remote-frontend` raised to `0.1.38`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.41] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** strengthened the 320px hero shoe artwork on `/leaderboard2` so the first card reads closer to the Figma mobile reference while keeping the no-overflow layout.
- **Remote versions:** `remote-frontend` raised to `0.1.37`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.40] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** tightened the `/leaderboard2` 320px hero title so `Беги на максимум` stays inside the top card and lines up cleanly with the mobile reference without horizontal overflow.
- **Remote versions:** `remote-frontend` raised to `0.1.36`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.39] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** refined the `/leaderboard2` prize card on 320px mobile: the shoe artwork now stays inside the card bounds and sits closer to the Figma mobile composition.
- **Remote versions:** `remote-frontend` raised to `0.1.35`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.38] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** tightened the bottom footer of `/leaderboard2`: reduced the gap after race history, shortened the subscription footer, and softened the red glow so the mobile ending sits closer to the Figma reference.
- **Remote versions:** `remote-frontend` raised to `0.1.34`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.37] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** compacted the lower `/leaderboard2` mobile sections: FAQ heading/questions now fit inside the 320px layout, history cards are shorter, and the footer subscription area is tighter while preserving the no-horizontal-overflow render.
- **Remote versions:** `remote-frontend` raised to `0.1.33`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.36] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** tightened the embedded mobile leaderboard used inside `/leaderboard2`: participant rows are denser on narrow embeds, keeping the rating block more controlled and closer to the Figma mobile composition.
- **Remote versions:** `remote-frontend` raised to `0.1.32`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.35] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** refined the 320px `/leaderboard2` top pass: the hero headline is larger again while staying inside the card, and the Amazing Red stats card typography is scaled closer to the Figma mobile reference without reintroducing horizontal overflow.
- **Remote versions:** `remote-frontend` raised to `0.1.31`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.34] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** continued the top-to-bottom `/leaderboard2` mobile Figma alignment: the hero title is now split into controlled mobile lines, timer digits are compacted to avoid clipping, and the top stats/run-mode typography is tightened for the 320px layout without changing desktop styles.
- **Remote versions:** `remote-frontend` raised to `0.1.30`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.33] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** compacted the lower `/leaderboard2` mobile history and subscription area: race-history cards, social dots, and subscribe controls now sit closer to the Figma mobile rhythm while preserving the 320px no-overflow layout.
- **Remote versions:** `remote-frontend` raised to `0.1.29`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.32] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** tightened the `/leaderboard2` mobile FAQ block: the heading now renders as a single compressed line and FAQ questions use a denser two-line rhythm closer to the Figma mobile reference.
- **Remote versions:** `remote-frontend` raised to `0.1.28`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.31] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** refined the embedded mobile leaderboard in `/leaderboard2`: the narrow embed now behaves as a scrollable rating window, keeps lower participant rows partially hidden inside the card, and preserves the landing page section rhythm without horizontal overflow.
- **Remote versions:** `remote-frontend` raised to `0.1.27`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.30] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** restored the 320px `/leaderboard2` mobile geometry closer to the Figma prototype: expanded the hero, timer, intro, Amazing Red stats card, and prize card rhythm so the section coordinates align with the mobile reference and the hero title no longer clips.
- **Remote versions:** `remote-frontend` raised to `0.1.26`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.29] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** tightened the 361-480px lower-page rhythm on `/leaderboard2`: reduced the prize card height and pulled the final CTA / FAQ spacing closer to the mobile Figma reference.
- **Remote versions:** `remote-frontend` raised to `0.1.25`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.28] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** refined the 361-480px `/leaderboard2` prize and history sections: reduced the prize shoe/title balance so the description is visible, and tightened the history header/date layout for the narrower mobile column.
- **Remote versions:** `remote-frontend` raised to `0.1.24`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.27] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** aligned the 361-480px `/leaderboard2` content width with the mobile Figma reference and adjusted the run-mode carousel arrows so they no longer collide with the discipline title.
- **Remote versions:** `remote-frontend` raised to `0.1.23`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.26] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** compacted the first `/leaderboard2` mobile screen so the hero, timer, intro copy, and Amazing Red stats card sit closer to the Figma mobile reference while preserving the desktop layout.
- **Remote versions:** `remote-frontend` raised to `0.1.22`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.25] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** softened the mobile `/leaderboard2` footer subscription block so it sits closer to the Figma mobile reference without changing the desktop layout.
- **Remote versions:** `remote-frontend` raised to `0.1.21`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.24] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** continued the `/leaderboard2` mobile Figma pass: tuned the lower-page prize shoe, FAQ headline rhythm, FAQ answer alignment, and history card scale for the 444px mobile layout while keeping the desktop layout untouched.
- **Remote versions:** `remote-frontend` raised to `0.1.20`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.23] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** refined the `/leaderboard2` mobile rating and lower-page rhythm: enlarged the embedded rating window, aligned the visible leaderboard controls with the Figma reference, and added more breathing room to the mobile FAQ block.
- **Remote versions:** `remote-frontend` raised to `0.1.19`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.22] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** continued the `/leaderboard2` mobile Figma pass: compacted the hero, timer, Amazing Red stats card, steps, run-mode card, embedded rating window, and FAQ so the page sits closer to the supplied mobile reference.
- **Remote Leaderboard embed:** tightened the narrow embedded rating rows used inside the landing mobile state.
- **Remote versions:** `remote-frontend` raised to `0.1.18`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.21] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** added a dedicated 361-480px layout pass for `/leaderboard2`: tightened the hero, timer, stats, FAQ, history, and footer sections so the mobile landing sits closer to the Figma reference and avoids horizontal overflow on 444px screens.
- **Remote versions:** `remote-frontend` raised to `0.1.17`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.20] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** continued the `/leaderboard2` mobile Figma pass: tightened the run-mode card, fixed the carousel arrows so they no longer collide with the title, and kept the 320px layout free of horizontal overflow.
- **Remote Leaderboard embed:** refined the embedded mobile leaderboard inside the landing: added the compact `AMAZING RED` brand line above search and kept the search button hidden until the query is actionable.
- **Remote versions:** `remote-frontend` raised to `0.1.16`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.19] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** tightened the `/leaderboard2` mobile layout for 320px screens: compacted the hero/timer rhythm, fixed the Amazing Red stats card spacing, reduced lower-page vertical gaps, and kept the page free of horizontal overflow.
- **Remote Leaderboard embed:** adjusted the embedded leaderboard mobile state so search appears above gender tabs, the controls fit narrow screens, and the rating list is denser for landing-page placement.
- **Remote prizes copy:** updated the landing prize/CTA copy to the current `PUMA DEVIATE NITRO` wording.
- **Remote versions:** `remote-frontend` raised to `0.1.15`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.18] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** refined the `/leaderboard2` mobile layout against the Figma prototype: tuned the run mode typography, prize shoe placement, final CTA geo marks, FAQ spacing, and lower-page rhythm.
- **Remote versions:** `remote-frontend` raised to `0.1.14`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.17] - 2026-06-20

### Remote system

- **Remote Leaderboard landing mobile:** continued the mobile Figma pass for `/leaderboard2`: tightened hero typography, added the mobile Remote Leaderboard embed state, refined stats, prize, FAQ, history, and footer sections, and kept the page scrollable on desktop/mobile.
- **Remote Leaderboard embed:** default landing embed now opens the 5 km male rating view used in the supplied layout.
- **Remote versions:** `remote-frontend` raised to `0.1.13`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.16] - 2026-06-19

### Remote system

- **Remote Leaderboard landing hero:** corrected the "Беги на максимум" side marker layout to match Figma: `Москва` sits above the marker block, each side has four horizontal ticks, and the globe marker aligns with the first tick.
- **Remote Leaderboard route:** added `/liderboard2` as a compatibility alias for the `/leaderboard2` landing page.
- **Remote versions:** `remote-frontend` raised to `0.1.12`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.15] - 2026-06-19

### Remote system

- **Remote Leaderboard landing:** added the new `/leaderboard2` public landing page with the embedded Remote Leaderboard section.
- **Landing visual pass:** updated the hero, timer, intro CTA buttons, stats card, prize card arrows, Figma-style markers, location labels, and responsive scrolling to better match the supplied Figma layouts.
- **Remote leaderboard embed:** kept the embedded leaderboard route available for iframe-style placement inside the new landing.
- **Remote versions:** `remote-frontend` raised to `0.1.11`.

### Verification

- `npm run build:remote-frontend`

---

## [0.5.14] - 2026-06-16

### Local / iPad system

- **Ready-to-start decline flow:** on the "Готовы на старт?" screen the "Нет" button now opens the existing leave-run confirmation screen instead of immediately returning home; pressing "Нет" on the confirmation returns back to the ready screen.
- **Queue full copy style:** the secondary text on the "Очередь переполнена" screen now uses the same Proxima Nova description style as the run description on the "Привет, Алексей!" run selection screen.

### Remote system

- No functional remote app changes in this release.

### Verification

- `npm run check:frontend-src-js`
- `npm run build:frontend`
- `npm run build:remote-frontend`
- `npm run build:remote-backend`

---

## [0.5.13] - 2026-06-16

### Local / iPad system

- **Leaderboard arrows:** search navigation arrows in the waiting leaderboard are larger, spaced wider, and have a bigger touch target while staying inside the search field.
- **Leaderboard carousel arrows:** score/category carousel arrows now use the updated round red visual style shared with the remote leaderboard.
- **Build safety:** frontend builds now fail early if stray `.js/.jsx` files appear under `apps/frontend/src`, preventing dirty deploy workspaces from shadowing the intended TypeScript sources such as `runResultFormat.ts`.

### Remote system

- **Remote Leaderboard arrows:** public Remote Leaderboard uses the same larger search navigation arrows and updated carousel arrow styling.
- **Remote build safety:** remote frontend build runs the same stray JavaScript source check before bundling shared local frontend code.
- **Remote versions:** `remote-frontend` raised to `0.1.10`.

### Verification

- `npm run check:frontend-src-js`
- `npm run build:frontend`
- `npm run build:remote-frontend`

---

## [0.5.12] - 2026-06-15

### Remote system

- **Remote Admin monitoring:** упрощён экран мониторинга до визуальной схемы состояния системы; детальные live/debug-блоки убраны с вкладки, чтобы экран был компактнее для просмотра из Telegram.
- **Store status map:** строки параметров магазина теперь имеют собственные красно-зелёные индикаторы состояния для дорожки, экрана, TDHealth, backend, интернета, питания, температур и последней активности.
- **Monitoring events:** последние события мониторинга теперь сортируются по времени, без отдельного искусственного события “общая критичная проблема”.
- **Remote versions:** `remote-frontend` поднят до `0.1.9`.

### Verification

- `npx vitest run apps/remote-frontend/src/ui/tabs/statusMapModel.test.ts`
- `npm run build:remote-frontend`

---

## [0.5.11] - 2026-06-15

### Local / iPad system

- **Registration keyboard layout:** экраны ввода имени/фамилии и номера телефона теперь используют общий iPad-aware расчёт открытой клавиатуры и блокируют внутреннюю прокрутку коротких форм, чтобы на iPad 13 форма поджималась вверх без лишнего скроллинга.

### Verification

- `npm run build:frontend`

---

## [0.5.10] - 2026-06-15

### Local / iPad system

- **Treadmill busy flow:** на экране «Дорожка пока занята» левая кнопка теперь называется «Нет» и ведет на экран подтверждения «Вы уверены, что хотите сойти с забега?». На подтверждении повторное «Сойти с забега» снимает участника с забега, а «Нет» возвращает назад на экран «Дорожка пока занята».
- **TouchDesigner leaderboard tests:** добавлен regression-test, что широкий TouchDesigner leaderboard показывает legacy-результаты `9999`, `166.39` и `166:39` как `--:--` для 1 км и 5 км.

### Verification

- `npx vitest run apps/frontend/src/utils/runResultFormat.test.ts apps/frontend/src/features/td/tdFormat.test.ts`
- `npm run build:frontend`

---

## [0.5.9] - 2026-06-15

### Local / iPad system

- **Leaderboard search:** поиск в лидерборде ожидания теперь ищет по частичному совпадению уже от двух символов, а не только по полному ФИО.

### Remote system

- **Remote Leaderboard search:** публичный Remote Leaderboard использует тот же частичный поиск от двух символов по имени/фамилии, включая поиск по Enter и кнопке «Найти».
- **Remote versions:** `remote-frontend` поднят до `0.1.8`.

### Verification

- `npx vitest run apps/frontend/src/features/leaderboard/leaderboardSearchInteraction.test.ts`
- `npm run build:frontend`
- `npm run build:remote-frontend`

---

## [0.5.8] - 2026-06-15

### Local / iPad system

- **Age restriction screen:** убрана вторичная строка «вы можете вернуться на главную.»; на экране остается только сообщение «Участие в забеге доступно только совершеннолетним.»
- **Queue screens background:** для экранов очереди добавлен явный тёмный серо-чёрный градиент фона, чтобы он соответствовал Figma-состоянию.
- **Queue number line:** строка «Ваш номер в очереди: N» закреплена как однострочная и в основном экране очереди; номер остается красным через существующий `titleAccent`.

### Remote system

- **Remote versions:** `remote-backend` поднят до `0.1.8`, `remote-frontend` поднят до `0.1.7`.

### Verification

- `npm run build`
- `npx vitest run apps/frontend/src/utils/runResultFormat.test.ts`
- `npm test -w apps/remote-backend`

---

## [0.5.7] - 2026-06-15

### Local / iPad system

- **Экран «Готовы на старт»:** добавлен отдельный iPad-экран перед стартом для первого участника, когда очередь пустая. После выбора формата забега пользователь подтверждает готовность кнопкой «Готов», а дальнейший workflow старта остается прежним.
- **Run start navigation:** общая логика переходов после `startRun` вынесена в общий helper, чтобы экран выбора забега и новый экран готовности использовали один и тот же маршрутный сценарий.
- **Audit screen labels:** добавлено человекочитаемое название для `/run/ready` в логах экранов.
- **Менеджерская/локальная админская панель:** подтверждение PIN для удаления записи о забеге и сброса очереди теперь открывается в собственной модалке с замаскированным вводом вместо видимого `window.prompt`.

### Remote system

- **Remote Leaderboard legacy results:** remote-backend сохраняет строковые legacy значения времени из backup (`166:39`) до UI, чтобы лидерборды могли отображать их как `--:--`, а не превращать в `0`.
- **Leaderboard placeholders:** добавлены проверки, что legacy значения `9999`, `166.39` и `166:39` для 1 км и 5 км отображаются как `--:--`.
- **Remote versions:** `remote-backend` поднят до `0.1.7`, `remote-frontend` поднят до `0.1.6`.

### Verification

- `npm run build -w apps/frontend`

---

## [0.5.6] - 2026-06-15

### Remote system

- **Remote Admin monitoring:** верхняя карта состояния теперь подробнее отражает магазин: дорожка, экран/TouchDesigner, `TDHealth.json`, TouchDesigner app/project, локальный backend, TD -> backend, Remote -> магазин, интернет, Backend -> landing, питание, CPU/RAM/disk и температуры CPU/GPU/RAM/SSD.
- **TDHealth.json visibility:** во вкладке Monitoring добавлен блок с последним JSON состояния магазина, который local backend читает из `runtime/health/TDHealth.json` и отдает в remote monitoring.
- **Remote health diagnostics:** remote status теперь получает из local backend путь к `TDHealth.json`, source пути, `mtime`, размер файла и ошибку чтения/парсинга.
- **Remote Leaderboard search:** поиск в публичном Remote Leaderboard запускается по Enter и по кнопке «Найти» уже с двух символов.
- **Remote versions:** `remote-backend` поднят до `0.1.6`, `remote-frontend` поднят до `0.1.5`.

### Local / iPad system

- **TDHealth.json default path:** local backend при запуске из `apps/backend` теперь по умолчанию ищет файл в корневом `runtime/health/TDHealth.json`, как в продовой структуре проекта.
- **Health payload:** `/api/health/status` теперь возвращает метаданные `TDHealth.json` и добавляет warnings, если файл отсутствует или не парсится.
- **Leaderboard search:** leaderboard ожидания, как и remote leaderboard, ищет уже от двух символов.
- **Run selection screen:** приветствие показывает только имя участника белым цветом; описание формата забега переведено на Proxima Nova и увеличено на 25%.
- **Queue full screen:** вторичная строка «дождитесь, когда текущий участник финиширует и повторите попытку» стала в два раза меньше.

### Verification

- `npm run build:backend`
- `npm run build:remote-backend`
- `npm run build:remote-frontend`
- `npm run build:frontend`
- `npx tsx --test src/tdHealthDiagnostics.test.ts`
- `vitest statusMapModel.test.ts`
- `vitest leaderboardSearchInteraction.test.ts`

---

## [0.5.5] - 2026-06-09

### Added

- **Remote backup → leaderboard auto-update:** fresh remote backups can now automatically become the active JSON for the public Remote Leaderboard.
- **Remote Admin setting:** added a visible switch in `Бэкапирование системы` to enable or disable automatic Remote Leaderboard refresh from fresh backups.
- **Remote backup settings API:** added persisted runtime settings for remote backup behavior, including audit logging for setting changes.

### Changed

- **Remote Admin navigation:** restored readable Russian labels in the Remote Admin header tabs and backup status header.
- **Remote Leaderboard iframe readiness:** checked the public leaderboard URL headers for iframe embedding; the server does not send `X-Frame-Options` or `frame-ancestors` restrictions.

### Fixed

- **Remote backup mirror:** successful mirrored backups now refresh active leaderboard data when auto-update is enabled, with backend regression coverage.

---

## [0.5.4] - 2026-05-31

### Fixed

- **Admin PIN policy:** removed the disabled legacy local/remote admin PIN from active auth, DB seeding, and migration state. Manager panel remains on `332277`; local/remote admin dev PIN remains `191181`.

---

## [0.5.3] - 2026-05-31

### Добавлено

- **Audit событий админки и менеджерки:** успешные входы в `/admin` и `/manager` теперь сохраняются в локальные `events` как `admin_panel_login` и `manager_panel_login` с понятным текстом, ролью, IP и user-agent.
- **Audit изменения участника:** сохранение данных участника через менеджерскую/админскую панель теперь пишет событие `participant_profile_updated` с человекочитаемым описанием, что изменилось, и payload со значениями `before` / `after`.
- **Тесты audit-логов:** добавлены backend-тесты на запись логов входа и изменения имени/фамилии/телефона участника.

---

## [0.5.2] - 2026-05-29

### Добавлено

- **TouchDesigner health diagnostics:** local backend теперь умеет брать путь к `TDHealth.json` из настройки админки (`tdHealthFilePath`), затем из `TD_HEALTH_FILE_PATH`, затем из дефолтного `runtime/health/TDHealth.json`.
- **Диагностический endpoint магазина:** `/api/admin/td/health-diagnostics` показывает resolved path, источник пути, `cwd`, наличие файла, читаемость, валидность JSON, размер, `mtime`, ключи JSON и ошибку чтения/парсинга.
- **Remote Admin → System:** добавлен блок `TouchDesigner health file`, где можно указать путь к `TDHealth.json` на магазинном ПК, сохранить его и вручную проверить состояние файла кнопкой `Check now`.
- **Тесты диагностики TD Health:** добавлен backend-тест на приоритет источников пути и чтение валидного JSON-файла.

### Изменено

- **Remote backend:** добавлен прокси для диагностики TD Health и сохранения пути на local backend через существующее подключение к магазину.
- **Версии:** product/local поднят до `0.5.2`, `remote-backend` и `remote-frontend` подняты до `0.1.3`.

---

## [0.5.1] - 2026-05-29

### Добавлено

- **Glin Profanity:** подключена библиотека `glin-profanity` для проверки имени и фамилии при регистрации.
- **Расширенный банлист:** добавлен временный расширенный список запрещённых слов для русскоязычной валидации имени/фамилии.

### Изменено

- **Лидерборды ожидания и Remote Leaderboard:** поиск теперь запускается по `Enter` в строке поиска так же, как по кнопке «Найти».
- **Кнопка «Найти»:** при поиске по `Enter` кнопка кратко показывает состояние загрузки/disabled, чтобы было видно, что действие сработало.
- **Экран несовершеннолетнего участника:** текст разделён на две строки: основная фраза «Участие в забеге доступно только совершеннолетним» и вторичная фраза «Вы можете вернуться на главную» меньшим шрифтом.

### Исправлено

- **Лидерборды 1 км и 5 км:** legacy-заглушки результатов `166.39`, `166:39` и `9999` теперь отображаются как `--:--`.
- **Remote Leaderboard и лидерборд ожидания:** одинаково применяют отображение `--:--` для legacy-заглушек, без изменения исходных данных.
- **Регистрация:** валидация имени и фамилии сохраняет прежнее поведение для плохих слов, но дополняется новым фильтром и списком.

---

## [0.5.0] - 2026-05-14

### Remote: ACTIVE backup, маршруты и панель

#### Добавлено

- **ACTIVE backup** на remote-backend: `backups/active/active.json` + `active-meta.json` — единственный снимок, с которого строятся публичный leaderboard, забеги, recent-runs, логи (JSON для вкладки Logs), блок monitoring из вложенного `remote` в снимке.
- **История зеркал** только в `backups/history/` (`remote-backup-*.json`); планировщик зеркала **не** переключает ACTIVE сам по себе.
- **«Получить обновление»:** pull с local → новый файл в `history/` → promote в ACTIVE (`local_refresh`).
- **«Импорт данных для Remote обновления»:** только remote (`manual-remote-*.json` в history + ACTIVE), **без** вызова local import API.
- **«Импортировать данные на беговую дорожку»** — по-прежнему remote → local restore (`POST /api/remote/import-json`).
- API: `POST /api/remote/admin/backup/import-remote-active`, расширенный `GET /api/remote/admin/backup/status`, `GET /api/remote/admin/active-backup/monitoring`.
- Сервисы: `activeBackupStore`, `remoteBackupPaths`, `remoteEnvelope`, `snapshotQueueHistory`, `snapshotRecentRuns`; при старте — миграция legacy `latest.json` и перенос датированных файлов из корня backup в `history/`.

#### Изменено

- `GET /api/remote/leaderboard-data` и read-only админ-данные читают **ACTIVE** (fallback на legacy `latest.json` для миграции).
- UI remote: вкладки Export/Import, Monitoring, System, шапка панели; мониторинг live — вручную, снимок monitoring — из ACTIVE; Edit/Delete забегов остаются на live local (с пояснением в UI).
- **remote-frontend routing:** `/` и `/leaderboard` — публичный leaderboard без PIN; `/admin` — Remote Admin + PIN; прочие пути → `/`. После выхода из админки — навигация на `/`.
- Форма PIN: атрибуты против автозаполнения браузера (`autoComplete`, неочевидный `name`).
- **docs/ARCHITECTURE.md** — отражение модели ACTIVE / history и публичного leaderboard.

---

## [0.4.6] - 2026-05-12

### Удалённый мониторинг и публичный leaderboard

- **Remote Panel** — отдельное приложение (`apps/remote-frontend`, свой URL), доступ по **PIN** (логин → JWT). Просмотр и операции идут **не из live SQLite**: remote-backend сначала получает актуальный **JSON backup** с локального backend (экспорт / зеркало `latest.json`), затем на этой основе показывает **leaderboard**, **забеги**, **состояние системы**, работает с **backup / import / export**. **Источник правды для отображения и аналитики на remote — последний согласованный JSON backup**, а не прямое чтение живой БД.
- **Public Leaderboard** — отдельный публичный экран (тот же `remote-frontend`, другой маршрут), **без авторизации**. Данные **только** из последнего зеркала: `GET /api/remote/leaderboard-data` читает **`latest.json`** на remote-backend.

### Добавлено

- **`BACKUP_STORAGE_PATH`:** опциональный каталог вне `runtime/` для JSON-бэкапов (local scheduled backup, suspension state, remote mirror `latest.json` / `latest-meta.json` / `remote-backup-*.json`); `mkdir` при старте, валидация (не корень диска), без тихого fallback при ошибке пути.
- **`BACKUP_IMPORT_MAX_BYTES`:** единый лимит тела JSON для импорта (shared, default 50 MiB, clamp 25–100 MiB); Fastify `bodyLimit` на local и remote backend; сообщения об ошибках на remote/local клиентах (413, сеть, «локальный сервер недоступен»).
- **Публичный remote leaderboard:** `GET /api/remote/leaderboard-data`, сборка таблиц из `latest.json` (envelope `local.snapshot`); страница `remote-frontend` с `LeaderboardExperience` и polling.
- **Shared:** `backupImport.ts`, `backupStoragePath.ts` (resolve/validate пути бэкапов).

### Изменено

- **Remote backend:** прокси import (400/413/502), `LocalProxyHttpError`, `bodyLimit` и error handler 413; `backupDir()` через `remoteBackupDir`; `remoteSystem` / `remoteAdmin` читают ту же папку бэкапов.
- **Remote / local admin UI:** улучшенные сообщения при импорте backup; `layoutMode="desktop"` для remote leaderboard (отдельный viewport, локальный scroll подсветки вместо `scrollIntoView` по окну).
- **`ArOzioViewport`:** вариант `remote` для публичной веб-страницы (прокрутка оболочки).
- **Leaderboard (ожидание + remote):** стрелки карусели и поиска — встроенный SVG вместо временных URL Figma CDN.
- **Регистрация, шаг телефона (iPad):** после iOS `readOnly`-фокуса повторно выставляются `tel` / `inputmode` / `autocomplete` / `enterkeyhint` (`scheduleWizardStepPhoneFocus`).

### Исправлено

- **Импорт JSON ~1.6 MB через remote panel:** причина — дефолтный лимит тела Fastify на remote-backend; выровнено с local.
- **Пустой remote leaderboard при наличии данных в backup:** чтение массива сессий как `runSessions` (camelCase экспорта), с fallback на `run_sessions`.
- **Клиенты:** `fetch` / 413 / 502 для remote API и local admin `request`.

---

## [0.4.5] - 2026-05-06

### Добавлено

- **Remote Administrator (Stage 1–2 foundation):** отдельные приложения `apps/remote-backend` и `apps/remote-frontend` (JWT auth), proxy к локальному backend (health/recent runs/runs/export/import).
- **Monitoring host backend (remote-backend):** `POST /api/monitoring/health` (API key, лимиты размера, rate limit), latest state + JSONL history, severity calculation, Telegram/Email alerts с dedup/cooldown.
- **Audit log (remote-backend):** JSONL audit events (login/logout/view/export/import/edit/delete) с лимитом metadata и retention cleanup.
- **Документация:** `docs/ARCHITECTURE.md`, `docs/TOUCHDESIGNER_INTEGRATION.md`, `docs/remote-health-monitoring-host-spec-ru.md`.
- **Dev UX:** `npm run dev:stop` (Windows-friendly) и пример `scripts/start-local-product.sh`.

### Изменено

- **Dev PIN:** значение по умолчанию обновлено на `191181` для local/remote admin dev setup.
- **Remote backup mirror:** новые файлы создаются с префиксом `remote-backup-` и учитываются retention’ом; manual download остаётся stream-only (без сохранения на диске remote).

---

## [0.4.4] - 2026-04-30

### Добавлено

- **Админ-панель: восстановление из файла:** во вкладке `Экспорт-импорт` добавлена кнопка `Восстановить данные из файла` с выбором JSON-файла и запуском существующего server import (`/api/admin/data/import`).

### Изменено

- **Переименование вкладки:** вкладка `Приостановка` в админ-режиме manager/admin panel переименована в `Экспорт-импорт` без изменения текущего сценария backup/clear/restore.
- **Новая вкладка TouchDesigner:** TD-настройки вынесены в отдельную вкладку `TouchDesigner` с сохранением прежних полей (`host`, `port`, `adapter`, `demo mode`) и существующей логики сохранения.

### Исправлено

- **Единый сценарий восстановления данных:** импорт из JSON во вкладке `Экспорт-импорт` использует те же проверки подтверждения, валидацию JSON и обработку ошибок, что и текущий механизм импорта.

---

## [0.4.3] - 2026-04-29

### Добавлено

- **Единый inactivity timeout (на выбранных экранах):** добавлена настройка `inactivityTimeoutSec` (секунды) в `admin_settings` с дефолтом `120`, публикация в `/api/public/settings` и редактирование в admin settings.
- **Общий фронтовый хук бездействия:** добавлен `useInactivityReset` для централизованного авто-возврата на главный экран и сброса промежуточных состояний.

### Изменено

- **Таймауты на целевых экранах:** подключён auto-reset для leaderboard ожидания, manager/admin panel, шагов регистрации (18+, имя, телефон, согласия + pop-up), выбора забега и экрана «Ваш номер в очереди».
- **Навигация поиска в waiting leaderboard:** стрелки в поле поиска переведены в горизонтальную пару с направленной подсветкой доступного шага (вверх/вниз) и без циклического перескока через край.
- **Юридические pop-up:** обновлены шрифты для модалок «Правила участия» и «Обработка перс. данных» — заголовок на Druk Wide Cyr 48px/500, body на Proxima Nova 36px/400.

### Исправлено

- **Edit flow manager/admin:** после успешного PIN-подтверждения форма редактирования снова открывается корректно и при клике по строке, и по кнопке «Редактировать».
- **Стрелки поиска:** исправлены состояние/цвет неактивных стрелок (белый), активных (красный) и разворот первой стрелки.

---

## [0.4.2] - 2026-04-29

### Добавлено

- **Health endpoint (агрегированный):** добавлен `GET /api/health/status` с единым payload состояния backend, iPad heartbeat, TouchDesigner, очереди, результатов и системных метрик хоста.
- **Host push scheduler (optional):** добавлена периодическая отправка health payload на внешний хост при наличии `HEALTH_PUSH_URL` (интервал/таймаут настраиваются через env).
- **Документация мониторинга:** добавлен технический документ `docs/health-monitoring.md` с контрактом endpoint, описанием `TDHealth.json`, warnings и параметров host push.

### Изменено

- **Telemetry iPad:** в frontend-события (`/api/events`) добавлен `deviceId` (через `VITE_IPAD_DEVICE_ID` или стабильный fallback в `localStorage`) для различения устройств.
- **Health payload backend:** расширен секцией `system` (`cpuPct`, `ramPct`, `diskFreeGb`, `uptimeSec`, `internetOk`) и базовыми warning-правилами по ресурсам/сети.
- **TouchDesigner health file:** backend поддерживает безопасное чтение `TDHealth.json` (по умолчанию `./runtime/health/TDHealth.json` или путь из `TD_HEALTH_FILE_PATH`) без падения сервиса при отсутствии/ошибке файла.

### Исправлено

- **Устойчивость мониторинга:** ошибки сборки health payload и ошибки host push не приводят к падению backend; проблемы логируются и сервис продолжает работу.

---

## [0.4.1] - 2026-04-27

### Исправлено

- **Унификация ранжирования:** waiting leaderboard, manager/admin history и экспорт лидербордов используют единый ranking helper без дедупликации участников; каждый завершенный результат участвует отдельно.
- **Нулевые результаты забегов:** корректно обрабатываются и отображаются (`0 м`, `0:00`), не блокируют перевод `running -> finished` и не ломают продвижение очереди.
- **Форматирование времени в leaderboard:** исправлен регресс отображения; поддержаны `mm:ss`, числовые строки и числовые значения, при этом известное некорректное значение `166.39` отображается как `--:--`.
- **Manager/Admin панель — вкладка «Забеги»:** исправлена логика поиска и фильтров (поиск по имени/фамилии/телефону и полному ФИО, сброс кнопочного фильтра при вводе, корректная работа сортировки в обоих режимах).
- **Безопасность редактирования в admin panel:** добавлена обязательная проверка admin PIN перед открытием формы редактирования записей при отсутствии активной admin-сессии.
- **Управление очередью:** в текущей очереди manager/admin оставлено единое действие **«Сброс очереди»** с подтверждением и проверкой пароля/PIN; очищаются только `running + queued`, завершенные результаты не затрагиваются.

### Изменено

- **Экспорт leaderboard одним файлом (XLSX):** экспорт включает все 6 комбинаций (`5 мин/1 км/5 км` × `М/Ж`) с полями лидерборда, места, имени, фамилии, телефона, результата и даты/времени.
- **Тесты backend:** расширен набор тестов для кейсов нулевых результатов и обновлен запуск тестов (`tsx --test src/*.test.ts`).

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

- **Full admin (`/admin/*`):** enter only by **opening the URL** in the browser — full-screen PIN gate (`AdminGodLoginScreen` + `GodAdminRoute`). Legacy path «god admin from the kiosk home» is gone on purpose; DB-configured god PIN via `POST /api/admin/login`.
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

- **Admin PIN policy:** `POST /api/admin/login` and admin-scoped routes accept the configured god-admin PIN policy; manager access is handled separately by `POST /api/manager/login`.
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
