import { DEFAULT_MAX_GLOBAL_QUEUE_SIZE } from '@treadmill-challenge/shared';
import type { Db } from './sqlite.js';
import { DEFAULT_GOD_ADMIN_PIN } from '../services/adminPinPolicy.js';

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
  return getSetting(db, 'adminPin') ?? DEFAULT_GOD_ADMIN_PIN;
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
const DEFAULT_INACTIVITY_TIMEOUT_SEC = 120;

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

/** Inactivity timeout in seconds for selected kiosk/admin screens. Default 120. */
export function getInactivityTimeoutSec(db: Db): number {
  const raw = Number(getSetting(db, 'inactivityTimeoutSec'));
  if (!Number.isFinite(raw)) return DEFAULT_INACTIVITY_TIMEOUT_SEC;
  return Math.min(3600, Math.max(15, Math.floor(raw)));
}

export function normalizeInactivityTimeoutSec(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_INACTIVITY_TIMEOUT_SEC;
  return Math.min(3600, Math.max(15, Math.floor(n)));
}
