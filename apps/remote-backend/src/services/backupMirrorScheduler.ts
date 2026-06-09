import crypto from 'node:crypto';
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { proxyLocalAdminJsonExport } from '../local/localClient.js';
import { runtimeRootDir } from '../runtimePaths.js';
import { remoteBackendVersion } from '../version.js';
import { migrateLooseHistoryFilesToSubdir, promoteHistoryFileToActive } from './activeBackupStore.js';
import { backupDir } from './remoteBackupDir.js';
import { remoteHistoryDir } from './remoteBackupPaths.js';
import { readEffectiveRemoteBackupSettingsSync } from './remoteBackupSettings.js';

export { backupDir } from './remoteBackupDir.js';

type Log = {
  info: (obj: Record<string, unknown>) => void;
  warn: (obj: Record<string, unknown>) => void;
  error: (obj: Record<string, unknown>) => void;
};

export type BackupMirrorHandle = { stop: () => void };

type BackupMirrorState = {
  lastSuccessAt: string | null;
  lastError: string | null;
  latestFilePath: string | null;
};

const state: BackupMirrorState = {
  lastSuccessAt: null,
  lastError: null,
  latestFilePath: null,
};

export function getBackupMirrorState(): BackupMirrorState {
  return { ...state };
}

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw == null) return fallback;
  return !['0', 'false', 'no'].includes(raw.trim().toLowerCase());
}

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(raw)));
}

function logsHoursForExport(): number {
  const raw = Number(process.env.REMOTE_BACKUP_LOG_HOURS ?? 48);
  if (!Number.isFinite(raw)) return 48;
  return Math.min(24 * 14, Math.max(1, Math.floor(raw)));
}

function fileName(now: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `remote-backup-${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}-${two(now.getHours())}-${two(now.getMinutes())}.json`;
}

function monitoringDir(): string {
  return path.join(runtimeRootDir(), 'monitoring');
}

function auditDir(): string {
  return path.join(runtimeRootDir(), 'audit');
}

function truncateJsonObject(obj: unknown, maxBytes: number): unknown {
  try {
    const json = JSON.stringify(obj);
    if (Buffer.byteLength(json, 'utf8') <= maxBytes) return obj;
    return { truncated: true, originalBytes: Buffer.byteLength(json, 'utf8') };
  } catch {
    return { truncated: true, reason: 'stringify_failed' };
  }
}

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (/token|secret|pass|authorization|api[-_]?key/i.test(k)) {
      out[k] = '[redacted]';
      continue;
    }
    out[k] = redactSecrets(v);
  }
  return out;
}

async function readLatestHealthStates(limit: number): Promise<unknown[]> {
  const dir = path.join(monitoringDir(), 'latest');
  const files = (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith('.json')).sort().slice(0, limit);
  const out: unknown[] = [];
  for (const f of files) {
    try {
      const raw = await readFile(path.join(dir, f), 'utf8');
      out.push(JSON.parse(raw) as unknown);
    } catch {
      // ignore corrupted file
    }
  }
  return out;
}

async function readLastJsonlRecords(baseDir: string, fileName: string, maxRecords: number): Promise<unknown[]> {
  const dayDirs = (await readdir(baseDir).catch(() => [] as string[]))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();

  const out: unknown[] = [];
  for (const d of dayDirs) {
    const fp = path.join(baseDir, d, fileName);
    const st = await stat(fp).catch(() => null);
    if (!st || !st.isFile()) continue;
    const raw = await readFile(fp, 'utf8').catch(() => '');
    if (!raw) continue;
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      try {
        out.push(JSON.parse(lines[i]!) as unknown);
        if (out.length >= maxRecords) return out.reverse();
      } catch {
        // ignore
      }
    }
  }
  return out.reverse();
}

function buildRemoteBackupEnvelope(input: {
  localSnapshot: unknown;
  remoteAudit: unknown[];
  remoteHealthEvents: unknown[];
  remoteLatestStates: unknown[];
}): unknown {
  const createdAt = new Date().toISOString();
  return {
    meta: {
      kind: 'remote-backup-v1',
      createdAt,
      remoteBackendVersion: remoteBackendVersion(),
    },
    local: {
      snapshot: input.localSnapshot,
    },
    remote: {
      audit: {
        events: input.remoteAudit,
      },
      monitoring: {
        latestStates: input.remoteLatestStates,
        events: input.remoteHealthEvents,
      },
    },
  };
}

async function applyRetention(dir: string, keepCount: number): Promise<void> {
  const files = (await readdir(dir))
    .filter((f) => /^remote-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  if (files.length <= keepCount) return;
  const toDelete = files.slice(0, files.length - keepCount);
  for (const f of toDelete) {
    await unlink(path.join(dir, f));
  }
}

export type MirrorOnceResult =
  | { ok: true; historyPath: string; lastBackupAt: string; activeRefreshed: boolean }
  | { ok: false; error: string };

/**
 * Pull from local, write dated file under `backups/history/` only.
 * Does **not** update the operator-controlled active backup (see `promoteHistoryFileToActive`).
 */
export async function runRemoteBackupMirrorOnce(log: Log): Promise<MirrorOnceResult> {
  const startedAt = Date.now();
  const logsHours = logsHoursForExport();
  const keepCount = intEnv('REMOTE_BACKUP_RETENTION_COUNT', 24, 1, 10_000);
  try {
    await migrateLooseHistoryFilesToSubdir(log);
    const hist = remoteHistoryDir();
    await mkdir(hist, { recursive: true });
    const res = await proxyLocalAdminJsonExport(logsHours);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    const body = await res.text();
    const localSnapshot = JSON.parse(body) as unknown;

    const [remoteAuditRaw, remoteHealthEventsRaw, remoteLatestStatesRaw] = await Promise.all([
      readLastJsonlRecords(auditDir(), 'audit.jsonl', 2000),
      readLastJsonlRecords(path.join(monitoringDir(), 'events'), 'events.jsonl', 2000),
      readLatestHealthStates(200),
    ]);

    const remoteAudit = remoteAuditRaw.map((e) => truncateJsonObject(redactSecrets(e), 2 * 1024));
    const remoteHealthEvents = remoteHealthEventsRaw.map((e) => truncateJsonObject(redactSecrets(e), 2 * 1024));
    const remoteLatestStates = remoteLatestStatesRaw.map((e) => truncateJsonObject(redactSecrets(e), 2 * 1024));

    const envelope = buildRemoteBackupEnvelope({
      localSnapshot,
      remoteAudit,
      remoteHealthEvents,
      remoteLatestStates,
    });

    const outBody = JSON.stringify(envelope, null, 2);
    const sha = crypto.createHash('sha256').update(outBody).digest('hex').slice(0, 16);
    const p = path.join(hist, fileName(new Date()));
    await writeFile(p, outBody, 'utf8');
    const lastBackupAt = new Date().toISOString();
    await applyRetention(hist, keepCount);
    const settings = readEffectiveRemoteBackupSettingsSync();
    let activeRefreshed = false;
    if (settings.autoActivateLeaderboard) {
      await promoteHistoryFileToActive(p, 'local_refresh');
      activeRefreshed = true;
    }
    state.lastSuccessAt = lastBackupAt;
    state.lastError = null;
    state.latestFilePath = p;
    log.info({
      msg: 'remote_backup_mirrored',
      path: p,
      sha16: sha,
      activeRefreshed,
      elapsedMs: Date.now() - startedAt,
    });
    return { ok: true, historyPath: p, lastBackupAt, activeRefreshed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    state.lastError = msg;
    log.warn({ msg: 'remote_backup_mirror_failed', error: msg });
    return { ok: false, error: msg };
  }
}

export function startBackupMirrorScheduler(log: Log): BackupMirrorHandle {
  const enabled = boolEnv('REMOTE_BACKUP_ENABLED', true);
  if (!enabled) {
    log.info({ msg: 'remote_backup_mirror_disabled' });
    return { stop: () => {} };
  }

  const intervalMinutes = intEnv('REMOTE_BACKUP_INTERVAL_MINUTES', 30, 1, 24 * 60);
  const keepCount = intEnv('REMOTE_BACKUP_RETENTION_COUNT', 24, 1, 10_000);
  let running = false;
  const firstRunDelayMs = 2_000;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runRemoteBackupMirrorOnce(log);
    } finally {
      running = false;
    }
  };

  setTimeout(() => void tick(), firstRunDelayMs);
  const timer = setInterval(() => void tick(), intervalMinutes * 60_000);
  log.info({
    msg: 'remote_backup_mirror_started',
    intervalMinutes,
    keepCount,
    firstRunDelayMs,
    historyDir: remoteHistoryDir(),
  });

  return { stop: () => clearInterval(timer) };
}
