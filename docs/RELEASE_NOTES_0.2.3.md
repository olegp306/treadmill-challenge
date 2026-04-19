# Release v0.2.3

**Date:** 2026-04-19

## Summary

Kiosk main screen: when the global pool is full (default limit 4: 1 running + 3 queued), **Participate** now shows the existing **queue overflow** screen (`/register/queue-full` — *«Очередь переполнена…»*), not the in-queue *treadmill busy* UI. Run selection: wider greeting line for *«Привет, …»*.

## User-visible changes

- **Main → Participate, full queue:** `QueueFullPage` with *«Очередь переполнена, дождитесь, когда текущий участник финиширует…»* and return to home.
- **Run select:** greeting row uses more horizontal space; 15-character truncation behavior unchanged.

## Technical

- `getRunQueue` runs before resume/registration branches; full pool short-circuits to `queue-full`.
- `QueueFullPage` only requires navigation `state` from main; no longer bounces on `sessionStorage` ids when the entry token is present.
- `logEvent`: `getLoggedParticipantId` / `getLoggedRunSessionId` exports.

Full list: root `CHANGELOG.md` section **[0.2.3]**.
