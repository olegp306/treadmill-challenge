import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { resolveBackupStoragePathInput, validateBackupStoragePathNotFilesystemRoot } from '@treadmill-challenge/shared';

type Log = {
  info: (o: Record<string, unknown>) => void;
  error: (o: Record<string, unknown>) => void;
};

/**
 * Base directory for local JSON backups (scheduled snapshot, suspension backup, etc.).
 *
 * Priority:
 * 1. `BACKUP_STORAGE_PATH` when set — must not be a drive/filesystem root; no silent fallback if invalid.
 * 2. `DATA_SNAPSHOT_BACKUP_DIR` when set (legacy).
 * 3. `{cwd}/backup` (default).
 */
export function getLocalBackupBaseDir(): string {
  const storage = process.env.BACKUP_STORAGE_PATH?.trim();
  if (storage) {
    const resolved = resolveBackupStoragePathInput(storage, process.cwd());
    const v = validateBackupStoragePathNotFilesystemRoot(resolved);
    if (!v.ok) {
      throw new Error(v.reason);
    }
    return resolved;
  }
  const raw = process.env.DATA_SNAPSHOT_BACKUP_DIR?.trim();
  if (!raw) return path.resolve(process.cwd(), 'backup');
  return path.isAbsolute(raw) ? path.normalize(raw) : path.normalize(path.resolve(process.cwd(), raw));
}

/** Best-effort mkdir + log when `BACKUP_STORAGE_PATH` is configured. Does not fall back to another directory. */
export async function initLocalBackupStorageIfConfigured(log: Log): Promise<void> {
  if (!process.env.BACKUP_STORAGE_PATH?.trim()) return;
  try {
    const dir = getLocalBackupBaseDir();
    await mkdir(dir, { recursive: true });
    log.info({ msg: 'backup_storage_path_ready', dir, source: 'BACKUP_STORAGE_PATH' });
  } catch (e) {
    log.error({
      msg: 'backup_storage_path_init_failed',
      error: e instanceof Error ? e.message : String(e),
      hint: 'BACKUP_STORAGE_PATH is set but invalid or not writable; fix path/permissions. Backups will fail until resolved (no silent fallback).',
    });
  }
}
