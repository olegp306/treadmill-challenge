import os from 'node:os';
import path from 'node:path';
import dns from 'node:dns/promises';
import { readFile, statfs } from 'node:fs/promises';
import { getDb, runSessions } from '../db/index.js';
import { getAppVersion } from '../version.js';

const DEFAULT_IPAD_ONLINE_THRESHOLD_SEC = 90;

function parseIpadOnlineThresholdSec(): number {
  const raw = Number(process.env.IPAD_ONLINE_THRESHOLD_SEC ?? DEFAULT_IPAD_ONLINE_THRESHOLD_SEC);
  if (!Number.isFinite(raw)) return DEFAULT_IPAD_ONLINE_THRESHOLD_SEC;
  return Math.max(5, Math.floor(raw));
}

function readOptionalTdHealthFilePath(): string | null {
  const raw = process.env.TD_HEALTH_FILE_PATH?.trim();
  if (raw) return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  return path.resolve(process.cwd(), 'runtime', 'health', 'TDHealth.json');
}

function toIsoOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function readTdHealthFile(pathValue: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(pathValue, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    console.warn({
      msg: 'td_health_file_invalid_json',
      path: pathValue,
    });
    return null;
  } catch {
    return null;
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function readRamPct(): number | null {
  try {
    const total = os.totalmem();
    const free = os.freemem();
    if (!Number.isFinite(total) || total <= 0) return null;
    return round1(((total - free) / total) * 100);
  } catch {
    return null;
  }
}

async function readCpuPct(): Promise<number | null> {
  try {
    const start = os.cpus();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const end = os.cpus();
    if (start.length === 0 || end.length === 0 || start.length !== end.length) return null;
    let idleDiff = 0;
    let totalDiff = 0;
    for (let i = 0; i < start.length; i += 1) {
      const s = start[i].times;
      const e = end[i].times;
      const sTotal = s.user + s.nice + s.sys + s.idle + s.irq;
      const eTotal = e.user + e.nice + e.sys + e.idle + e.irq;
      idleDiff += e.idle - s.idle;
      totalDiff += eTotal - sTotal;
    }
    if (totalDiff <= 0) return null;
    return round1((1 - idleDiff / totalDiff) * 100);
  } catch {
    return null;
  }
}

async function readDiskFreeGb(): Promise<number | null> {
  try {
    const fsStats = await statfs(process.cwd());
    const freeBytes = Number(fsStats.bavail) * Number(fsStats.bsize);
    if (!Number.isFinite(freeBytes) || freeBytes < 0) return null;
    return round1(freeBytes / (1024 * 1024 * 1024));
  } catch {
    return null;
  }
}

async function readInternetOk(): Promise<boolean | null> {
  const timeoutMs = 2500;
  try {
    await Promise.race([
      dns.resolve('example.com'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    return true;
  } catch {
    return false;
  }
}

export type HealthStatusPayload = {
  appVersion: string;
  backendOnline: boolean;
  timestamp: string;
  ipad: {
    deviceId: string | null;
    lastHeartbeatAt: string | null;
    online: boolean;
    onlineThresholdSec: number;
  };
  td: {
    lastTdEventAt: string | null;
    lastTdSyncOk: string | null;
    lastTdSyncError: string | null;
    healthFile: Record<string, unknown> | null;
  };
  system: {
    cpuPct: number | null;
    ramPct: number | null;
    diskFreeGb: number | null;
    uptimeSec: number | null;
    internetOk: boolean | null;
  };
  queue: {
    runningCount: number;
    queuedCount: number;
  };
  runs: {
    lastSuccessfulRunAt: string | null;
  };
  warnings: string[];
  errors: string[];
};

export async function collectHealthStatusPayload(now = new Date()): Promise<HealthStatusPayload> {
  const db = getDb();
  const timestamp = now.toISOString();
  const onlineThresholdSec = parseIpadOnlineThresholdSec();

  const lastHeartbeatRow = db
    .prepare(
      `
      SELECT createdAt, payload
      FROM events
      WHERE type = 'heartbeat'
      ORDER BY createdAt DESC, id DESC
      LIMIT 1
    `
    )
    .get() as { createdAt?: string; payload?: string } | undefined;
  const lastIpadHeartbeatAt = toIsoOrNull(lastHeartbeatRow?.createdAt);
  let ipadDeviceId: string | null = null;
  if (typeof lastHeartbeatRow?.payload === 'string') {
    try {
      const parsed = JSON.parse(lastHeartbeatRow.payload) as Record<string, unknown>;
      const fromPayload = typeof parsed.deviceId === 'string' ? parsed.deviceId.trim() : '';
      ipadDeviceId = fromPayload || null;
    } catch {
      ipadDeviceId = null;
    }
  }
  const ipadOnline =
    lastIpadHeartbeatAt != null && now.getTime() - new Date(lastIpadHeartbeatAt).getTime() <= onlineThresholdSec * 1000;

  const lastTdEventRow = db
    .prepare(
      `
      SELECT createdAt
      FROM events
      WHERE type LIKE 'td_%' OR type LIKE 'touchdesigner_%'
      ORDER BY createdAt DESC, id DESC
      LIMIT 1
    `
    )
    .get() as { createdAt?: string } | undefined;
  const lastTdEventAt = toIsoOrNull(lastTdEventRow?.createdAt);

  const settingsRows = db
    .prepare(`SELECT key, value FROM admin_settings WHERE key IN ('lastTdSyncOk', 'lastTdSyncError')`)
    .all() as Array<{ key: string; value: string }>;
  const settings = new Map<string, string>();
  for (const row of settingsRows) {
    settings.set(row.key, row.value);
  }
  const lastTdSyncOk = toIsoOrNull(settings.get('lastTdSyncOk'));
  const lastTdSyncError = toIsoOrNull(settings.get('lastTdSyncError'));

  const runningCount = runSessions.getCurrentRunningSessionGlobal(db) ? 1 : 0;
  const queuedCount = runSessions.listGlobalQueuedSessionsOrdered(db).length;

  const lastSuccessfulRunRow = db
    .prepare(
      `
      SELECT COALESCE(NULLIF(TRIM(finishedAt), ''), createdAt) AS completedAt
      FROM run_sessions
      WHERE status = 'finished'
      ORDER BY completedAt DESC, id DESC
      LIMIT 1
    `
    )
    .get() as { completedAt?: string } | undefined;
  const lastSuccessfulRunAt = toIsoOrNull(lastSuccessfulRunRow?.completedAt);

  const [cpuPct, diskFreeGb, internetOk] = await Promise.all([readCpuPct(), readDiskFreeGb(), readInternetOk()]);
  const ramPct = readRamPct();
  const uptimeSec = Number.isFinite(process.uptime()) ? Math.floor(process.uptime()) : null;

  const tdHealthFile = await readTdHealthFile(readOptionalTdHealthFilePath());

  const warnings: string[] = [];
  const errors: string[] = [];

  if (!ipadOnline) {
    warnings.push('ipad_heartbeat_stale_or_missing');
  }
  if (queuedCount > 0 && runningCount === 0) {
    warnings.push('queue_has_waiting_sessions_without_running');
  }
  if (lastTdSyncError) {
    errors.push('td_last_sync_error_present');
  }
  if (cpuPct != null && cpuPct > 85) warnings.push('high_cpu');
  if (ramPct != null && ramPct > 85) warnings.push('high_ram');
  if (diskFreeGb != null && diskFreeGb < 5) warnings.push('low_disk');
  if (internetOk === false) warnings.push('no_internet');
  if (
    tdHealthFile &&
    Array.isArray((tdHealthFile as Record<string, unknown>).errors) &&
    ((tdHealthFile as Record<string, unknown>).errors as unknown[]).length > 0
  ) {
    warnings.push('td_errors');
  }

  return {
    appVersion: getAppVersion(),
    backendOnline: true,
    timestamp,
    ipad: {
      deviceId: ipadDeviceId,
      lastHeartbeatAt: lastIpadHeartbeatAt,
      online: ipadOnline,
      onlineThresholdSec,
    },
    td: {
      lastTdEventAt,
      lastTdSyncOk,
      lastTdSyncError,
      healthFile: tdHealthFile,
    },
    queue: {
      runningCount,
      queuedCount,
    },
    runs: {
      lastSuccessfulRunAt,
    },
    system: {
      cpuPct,
      ramPct,
      diskFreeGb,
      uptimeSec,
      internetOk,
    },
    warnings,
    errors,
  };
}
