import type { Db } from './sqlite.js';

export function getSetting(db: Db, key: string): string | null {
  const row = db.prepare(`SELECT value FROM admin_settings WHERE key = ?`).get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(db: Db, key: string, value: string): void {
  const exists = db.prepare(`SELECT 1 FROM admin_settings WHERE key = ?`).get(key);
  if (exists) {
    db.prepare(`UPDATE admin_settings SET value = ? WHERE key = ?`).run(value, key);
  } else {
    db.prepare(`INSERT INTO admin_settings (key, value) VALUES (?, ?)`).run(key, value);
  }
}

export function getAdminPin(db: Db): string {
  return getSetting(db, 'adminPin') ?? '555555';
}

/** When true, run start skips real TouchDesigner send; client shows demo finish flow. */
export function getTdDemoMode(db: Db): boolean {
  return getSetting(db, 'tdDemoMode') === 'true';
}

/** Max queue capacity per active competition (queued + running). Default 3. */
export function getMaxQueueSizePerRun(db: Db): number {
  const raw = getSetting(db, 'maxQueueSizePerRun');
  const n = parseInt(raw ?? '3', 10);
  if (!Number.isFinite(n)) return 3;
  return Math.min(500, Math.max(1, n));
}
