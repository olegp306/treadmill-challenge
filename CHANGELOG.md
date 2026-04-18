# Changelog

All notable changes to **Treadmill Challenge / Amazing Red Kiosk** are documented here.  
The version number matches the monorepo root `package.json` (`name`: `treadmill-challenge`).

## [1.1.0] - 2026-04-18

### Added

- **Verification photo (fraud checks):** JPEG captured on the kiosk when a run session becomes `running`, stored as pending on the server, then linked to the leaderboard `run` row when the result is submitted (same moment as finish). Admin can open the photo from the competition leaderboard.
- **API:** `POST /api/run-session/:runSessionId/start-photo`, `GET /api/version`, `appVersion` in `GET /api/public/settings`, `GET /api/admin/runs/:runId/verification-photo` (admin auth).
- **Version display:** Admin footer shows bundled kiosk version and live API version.

### Documentation

- `docs/VERSIONING.md` — how to bump versions and maintain this file.

## [1.0.0] - earlier

- Initial tracked release (baseline before structured changelog).
