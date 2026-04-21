import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getDb } from '../db/index.js';
import { buildDataSnapshot } from './dataSnapshot.js';

type BackupLog = {
  info?: (o: Record<string, unknown>) => void;
  warn?: (o: Record<string, unknown>) => void;
  error?: (o: Record<string, unknown>) => void;
};

const DEFAULT_INTERVAL_MINUTES = 60;

function clampIntervalMinutes(raw: string | undefined): number {
  const n = raw != null && raw.trim() !== '' ? Number(raw) : DEFAULT_INTERVAL_MINUTES;
  if (!Number.isFinite(n)) return DEFAULT_INTERVAL_MINUTES;
  return Math.min(Math.max(Math.floor(n), 1), 24 * 60);
}

function two(n: number): string {
  return String(n).padStart(2, '0');
}

function dateFolderName(d: Date): string {
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

function fileName(d: Date): string {
  return `backup-${two(d.getHours())}-${two(d.getMinutes())}.json`;
}

function resolveBaseDir(): string {
  const raw = process.env.DATA_SNAPSHOT_BACKUP_DIR?.trim();
  if (!raw) return path.resolve(process.cwd(), 'backup');
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

export type DataSnapshotBackupScheduler = {
  stop: () => void;
};

export async function writeDataSnapshotBackup(log?: BackupLog): Promise<{ path: string; bytes: number }> {
  const now = new Date();
  const baseDir = resolveBaseDir();
  const dayDir = path.join(baseDir, dateFolderName(now));
  const finalPath = path.join(dayDir, fileName(now));
  const tmpPath = `${finalPath}.tmp-${process.pid}-${Date.now()}`;

  await mkdir(dayDir, { recursive: true });

  const snapshot = buildDataSnapshot(getDb());
  const body = `${JSON.stringify(snapshot, null, 2)}\n`;

  try {
    await writeFile(tmpPath, body, { encoding: 'utf8', flag: 'wx' });
    await rename(tmpPath, finalPath);
    log?.info?.({
      msg: 'data_snapshot_backup_created',
      path: finalPath,
      bytes: Buffer.byteLength(body, 'utf8'),
    });
    return { path: finalPath, bytes: Buffer.byteLength(body, 'utf8') };
  } catch (e) {
    try {
      await unlink(tmpPath);
    } catch {
      /* ignore cleanup errors */
    }
    if (e instanceof Error && 'code' in e && String((e as { code?: unknown }).code) === 'EEXIST') {
      log?.warn?.({
        msg: 'data_snapshot_backup_skipped_exists',
        path: finalPath,
      });
      return { path: finalPath, bytes: Buffer.byteLength(body, 'utf8') };
    }
    log?.error?.({
      msg: 'data_snapshot_backup_failed',
      path: finalPath,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}

function msUntilNextTick(intervalMinutes: number, now: Date): number {
  const slotMs = intervalMinutes * 60_000;
  const nowMs = now.getTime();
  const nextMs = Math.floor(nowMs / slotMs + 1) * slotMs;
  return Math.max(nextMs - nowMs, 1_000);
}

export function startDataSnapshotBackupScheduler(log?: BackupLog): DataSnapshotBackupScheduler {
  const intervalMinutes = clampIntervalMinutes(process.env.DATA_SNAPSHOT_BACKUP_INTERVAL_MINUTES);
  const enabled = !['0', 'false', 'no'].includes((process.env.DATA_SNAPSHOT_BACKUP_ENABLED ?? 'true').toLowerCase());
  if (!enabled) {
    log?.info?.({ msg: 'data_snapshot_backup_scheduler_disabled' });
    return { stop: () => {} };
  }

  let running = false;
  const run = async () => {
    if (running) {
      log?.warn?.({ msg: 'data_snapshot_backup_tick_skipped_previous_still_running' });
      return;
    }
    running = true;
    try {
      await writeDataSnapshotBackup(log);
    } catch {
      /* already logged inside writeDataSnapshotBackup */
    } finally {
      running = false;
    }
  };
  let intervalHandle: NodeJS.Timeout | null = null;
  const startInterval = () => {
    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = setInterval(() => {
      void run();
    }, intervalMinutes * 60_000);
  };

  const initialDelayMs = msUntilNextTick(intervalMinutes, new Date());
  const initialHandle = setTimeout(() => {
    void run();
    startInterval();
  }, initialDelayMs);

  log?.info?.({
    msg: 'data_snapshot_backup_scheduler_started',
    baseDir: resolveBaseDir(),
    intervalMinutes,
    firstRunInMs: initialDelayMs,
  });

  return {
    stop: () => {
      clearTimeout(initialHandle);
      if (intervalHandle) clearInterval(intervalHandle);
      log?.info?.({ msg: 'data_snapshot_backup_scheduler_stopped' });
    },
  };
}
