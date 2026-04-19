# Release v0.2.4

**Date:** 2026-04-19

## Summary

Kiosk **«Принять участие»** always starts **full registration** when the global pool has free slots—no jump to **run-select** / «Привет, участник!» from a leftover **participantId**. **Dev queue control** page is reorganized: actions on top, current session plaque with format / gender / status; tables and **Restart** removed.

## Highlights

- **`clearLoggedParticipantId()`** + Main clears session ids before **`/register`** when queue not full.
- **`/dev/queue-control`:** utility copy at bottom; primary operator buttons at top.

Full history: **`CHANGELOG.md`** → **[0.2.4]**.
