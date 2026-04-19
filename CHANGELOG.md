# Changelog

All notable changes to **Treadmill Challenge / Amazing Red Kiosk** are documented here.  
The version number matches the monorepo root `package.json` (`name`: `treadmill-challenge`).

## [1.1.0] - 2026-04-18

### Added

- **Verification photo (fraud checks):** JPEG is produced by **TouchDesigner** and sent with **`POST /api/run-result`** (or `/api/touchdesigner/run-result`) as optional `verificationPhotoBase64`; stored per **run** / `runSessionId`, not as a permanent participant asset. Admin opens it from the competition leaderboard / run session.
- **API:** optional `verificationPhotoBase64` on run-result payloads; `GET /api/version`, `appVersion` in `GET /api/public/settings`, `GET /api/admin/runs/:runId/verification-photo` (admin auth). Removed kiosk `POST /api/run-session/:runSessionId/start-photo`.
- **Version display:** Admin footer shows bundled kiosk version and live API version.

### Documentation

- `docs/VERSIONING.md` — how to bump versions and maintain this file.

## [1.0.0] - earlier

- Initial tracked release (baseline before structured changelog).
