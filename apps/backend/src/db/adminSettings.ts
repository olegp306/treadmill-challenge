import { DEFAULT_MAX_GLOBAL_QUEUE_SIZE } from '@treadmill-challenge/shared';
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

/** When true, public kiosk may show TouchDesigner integration info banners (operator/debug). */
export function getIntegrationInfoMessages(db: Db): boolean {
  return getSetting(db, 'integrationInfoMessages') === 'true';
}

/** Max global treadmill pool size (queued + running). Default 4 (1 running + up to 3 queued). */
export function getMaxGlobalQueueSize(db: Db): number {
  const raw = getSetting(db, 'maxGlobalQueueSize') ?? getSetting(db, 'maxQueueSizePerRun');
  const n = parseInt(raw ?? String(DEFAULT_MAX_GLOBAL_QUEUE_SIZE), 10);
  if (!Number.isFinite(n)) return DEFAULT_MAX_GLOBAL_QUEUE_SIZE;
  return Math.min(500, Math.max(1, n));
}

/** @deprecated Use getMaxGlobalQueueSize */
export function getMaxQueueSizePerRun(db: Db): number {
  return getMaxGlobalQueueSize(db);
}

const HEARTBEAT_INTERVAL_MIN_OPTIONS = new Set([5, 10, 30, 60]);

/** Public telemetry heartbeat interval in minutes. Default 5. */
export function getHeartbeatIntervalMin(db: Db): number {
  const raw = getSetting(db, 'heartbeatIntervalMin');
  const n = Number(raw);
  if (!Number.isFinite(n) || !HEARTBEAT_INTERVAL_MIN_OPTIONS.has(n)) return 5;
  return n;
}

export function normalizeHeartbeatIntervalMin(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || !HEARTBEAT_INTERVAL_MIN_OPTIONS.has(n)) return 5;
  return n;
}
