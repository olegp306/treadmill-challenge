/**
 * Product version: set in monorepo **root** `package.json` and injected at build (see `vite.config.ts`).
 * See `docs/VERSIONING.md` for bumping and `CHANGELOG.md` for what shipped.
 */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'dev';
