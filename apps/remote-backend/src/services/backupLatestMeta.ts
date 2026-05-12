import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { backupDir } from './remoteBackupDir.js';

export type BackupLatestMeta = {
  lastBackupAt: string;
  lastBackupSha16: string | null;
  logsHours: number;
  sourceFile?: string | null;
};

const META_NAME = 'latest-meta.json';

export function backupsDir(): string {
  return backupDir();
}

export function latestMetaPath(): string {
  return path.join(backupsDir(), META_NAME);
}

export async function readBackupLatestMeta(): Promise<BackupLatestMeta | null> {
  const fp = latestMetaPath();
  try {
    const raw = await readFile(fp, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    const lastBackupAt = typeof o.lastBackupAt === 'string' && o.lastBackupAt.trim() ? o.lastBackupAt.trim() : null;
    if (!lastBackupAt) return null;
    return {
      lastBackupAt,
      lastBackupSha16: typeof o.lastBackupSha16 === 'string' ? o.lastBackupSha16 : null,
      logsHours: typeof o.logsHours === 'number' && Number.isFinite(o.logsHours) ? o.logsHours : 48,
      sourceFile: typeof o.sourceFile === 'string' ? o.sourceFile : null,
    };
  } catch {
    return null;
  }
}

/** Fallback: mtime of newest `remote-backup-*.json` in backups dir. */
export async function lastBackupAtFromDatedFiles(): Promise<string | null> {
  const dir = backupsDir();
  const files = (await readdir(dir).catch(() => [] as string[]))
    .filter((f) => /^remote-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  const latest = files.length ? files[files.length - 1]! : null;
  if (!latest) return null;
  const st = await stat(path.join(dir, latest)).catch(() => null);
  if (!st) return null;
  return st.mtime.toISOString();
}
