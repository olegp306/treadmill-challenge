import os from 'node:os';
import path from 'node:path';
import dns from 'node:dns/promises';
import { readFile, stat, statfs } from 'node:fs/promises';
import { adminSettings, getDb, runSessions } from '../db/index.js';
import { getAppVersion } from '../version.js';

const DEFAULT_IPAD_ONLINE_THRESHOLD_SEC = 90;
const DEFAULT_TD_HEALTH_FILE_PATH = path.join('runtime', 'health', 'TDHealth.json');

function parseIpadOnlineThresholdSec(): number {
  const raw = Number(process.env.IPAD_ONLINE_THRESHOLD_SEC ?? DEFAULT_IPAD_ONLINE_THRESHOLD_SEC);
  if (!Number.isFinite(raw)) return DEFAULT_IPAD_ONLINE_THRESHOLD_SEC;
  return Math.max(5, Math.floor(raw));
}

export type TdHealthFilePathSource = 'admin_setting' | 'env' | 'default';

export type TdHealthFilePathResolution = {
  path: string;
  source: TdHealthFilePathSource;
  configuredValue: string | null;
  cwd: string;
};

export type TdHealthDiagnostics = TdHealthFilePathResolution & {
  exists: boolean;
  readable: boolean;
  parseOk: boolean;
  sizeBytes: number | null;
  mtime: string | null;
  jsonKeys: string[];
  error: string | null;
};

function resolvePathValue(value: string, cwd: string): string {
  return path.isAbsolute(value) ? value : path.resolve(cwd, value);
}

function defaultRuntimeRoot(cwd: string): string {
  const normalized = path.normalize(cwd);
  if (path.basename(normalized) === 'backend' && path.basename(path.dirname(normalized)) === 'apps') {
    return path.resolve(normalized, '..', '..');
  }
  return normalized;
}

export function resolveTdHealthFilePathFromSources(input: {
  adminSetting?: string | null;
  envValue?: string | null;
  cwd?: string;
} = {}): TdHealthFilePathResolution {
  const cwd = input.cwd ?? process.cwd();
  const adminSetting = input.adminSetting?.trim();
  if (adminSetting) {
    return {
      path: resolvePathValue(adminSetting, cwd),
      source: 'admin_setting',
      configuredValue: adminSetting,
      cwd,
    };
  }

  const envValue = input.envValue?.trim();
  if (envValue) {
    return {
      path: resolvePathValue(envValue, cwd),
      source: 'env',
      configuredValue: envValue,
      cwd,
    };
  }

  return {
    path: path.resolve(defaultRuntimeRoot(cwd), DEFAULT_TD_HEALTH_FILE_PATH),
    source: 'default',
    configuredValue: null,
    cwd,
  };
}

export function resolveTdHealthFilePath(): TdHealthFilePathResolution {
  const db = getDb();
  return resolveTdHealthFilePathFromSources({
    adminSetting: adminSettings.getSetting(db, 'tdHealthFilePath'),
    envValue: process.env.TD_HEALTH_FILE_PATH,
    cwd: process.cwd(),
  });
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function readTdHealthDiagnosticsForPath(
  resolution: TdHealthFilePathResolution
): Promise<TdHealthDiagnostics> {
  const base: TdHealthDiagnostics = {
    ...resolution,
    exists: false,
    readable: false,
    parseOk: false,
    sizeBytes: null,
    mtime: null,
    jsonKeys: [] as string[],
    error: null as string | null,
  };

  let raw: string;
  try {
    const fileStat = await stat(resolution.path);
    raw = await readFile(resolution.path, 'utf8');
    base.exists = true;
    base.readable = true;
    base.sizeBytes = fileStat.size;
    base.mtime = fileStat.mtime.toISOString();
  } catch (e) {
    return {
      ...base,
      error: (e as NodeJS.ErrnoException).code === 'ENOENT' ? 'file_not_found' : errorMessage(e),
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...base, error: 'json_root_not_object' };
    }
    return {
      ...base,
      parseOk: true,
      jsonKeys: Object.keys(parsed as Record<string, unknown>),
    };
  } catch (e) {
    return { ...base, error: errorMessage(e) };
  }
}

export function getTdHealthFilePathSetting(): string {
  return adminSettings.getSetting(getDb(), 'tdHealthFilePath') ?? '';
}

export async function getTdHealthDiagnostics(): Promise<TdHealthDiagnostics> {
  return readTdHealthDiagnosticsForPath(resolveTdHealthFilePath());
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
    healthFilePath: string | null;
    healthFilePathSource: TdHealthFilePathSource;
    healthFileUpdatedAt: string | null;
    healthFileSizeBytes: number | null;
    healthFileError: string | null;
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
  const lastIpadHeartbeatMs = lastIpadHeartbeatAt ? new Date(lastIpadHeartbeatAt).getTime() : null;
  const ipadOnline =
    lastIpadHeartbeatMs != null &&
    Number.isFinite(lastIpadHeartbeatMs) &&
    now.getTime() - lastIpadHeartbeatMs <= onlineThresholdSec * 1000;

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

  const tdHealthResolution = resolveTdHealthFilePath();
  const [tdHealthFile, tdHealthDiagnostics] = await Promise.all([
    readTdHealthFile(tdHealthResolution.path),
    readTdHealthDiagnosticsForPath(tdHealthResolution),
  ]);

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
  if (!tdHealthDiagnostics.exists) {
    warnings.push('td_health_file_missing');
  } else if (!tdHealthDiagnostics.parseOk) {
    warnings.push('td_health_file_parse_error');
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
      healthFilePath: tdHealthDiagnostics.path,
      healthFilePathSource: tdHealthDiagnostics.source,
      healthFileUpdatedAt: tdHealthDiagnostics.mtime,
      healthFileSizeBytes: tdHealthDiagnostics.sizeBytes,
      healthFileError: tdHealthDiagnostics.error,
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
