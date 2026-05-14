import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { readActiveBackupMetaFile } from './activeBackupStore.js';
import { remoteHistoryDir } from './remoteBackupPaths.js';

export type BackupLatestMeta = {
  lastBackupAt: string;
  lastBackupSha16: string | null;
  logsHours: number;
  sourceFile?: string | null;
};

/** Active backup meta (operator-controlled snapshot). */
export async function readBackupLatestMeta(): Promise<BackupLatestMeta | null> {
  const am = await readActiveBackupMetaFile();
  if (!am) return null;
  const logsHoursRaw = Number(process.env.REMOTE_BACKUP_LOG_HOURS ?? 48);
  const logsHours = Number.isFinite(logsHoursRaw) ? Math.min(24 * 14, Math.max(1, Math.floor(logsHoursRaw))) : 48;
  const lastBackupAt = am.envelopeCreatedAt ?? am.activeUpdatedAt;
  return {
    lastBackupAt,
    lastBackupSha16: am.lastBackupSha16,
    logsHours,
    sourceFile: am.historySourceFile,
  };
}

/** Newest dated mirror file in `history/` (mtime). */
export async function lastBackupAtFromDatedFiles(): Promise<string | null> {
  const dir = remoteHistoryDir();
  const files = (await readdir(dir).catch(() => [] as string[]))
    .filter((f) => /^remote-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  const latest = files.length ? files[files.length - 1]! : null;
  if (!latest) return null;
  const st = await stat(path.join(dir, latest)).catch(() => null);
  if (!st) return null;
  return st.mtime.toISOString();
}
