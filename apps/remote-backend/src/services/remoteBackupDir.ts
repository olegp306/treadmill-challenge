import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { resolveBackupStoragePathInput, validateBackupStoragePathNotFilesystemRoot } from '@treadmill-challenge/shared';
import { runtimeRootDir } from '../runtimePaths.js';

type Log = {
  info: (o: Record<string, unknown>) => void;
  error: (o: Record<string, unknown>) => void;
};

/**
 * Root directory for remote mirrored backups (`remote-backup-*.json`, `latest.json`, `latest-meta.json`).
 *
 * - If `BACKUP_STORAGE_PATH` is set: that directory (validated, not a drive root).
 * - Otherwise: `{REMOTE_RUNTIME_DIR or runtime/remote}/backups` (unchanged legacy layout).
 */
export function getRemoteBackupRootDir(): string {
  const storage = process.env.BACKUP_STORAGE_PATH?.trim();
  if (storage) {
    const resolved = resolveBackupStoragePathInput(storage, process.cwd());
    const v = validateBackupStoragePathNotFilesystemRoot(resolved);
    if (!v.ok) {
      throw new Error(v.reason);
    }
    return resolved;
  }
  return path.join(runtimeRootDir(), 'backups');
}

/** Alias for callers that historically used `backupDir`. */
export function backupDir(): string {
  return getRemoteBackupRootDir();
}

export async function initRemoteBackupStorageIfConfigured(log: Log): Promise<void> {
  if (!process.env.BACKUP_STORAGE_PATH?.trim()) return;
  try {
    const dir = getRemoteBackupRootDir();
    await mkdir(dir, { recursive: true });
    log.info({ msg: 'backup_storage_path_ready', dir, source: 'BACKUP_STORAGE_PATH' });
  } catch (e) {
    log.error({
      msg: 'backup_storage_path_init_failed',
      error: e instanceof Error ? e.message : String(e),
      hint: 'BACKUP_STORAGE_PATH is set but invalid or not writable; fix path/permissions. Remote backups will fail until resolved (no silent fallback).',
    });
  }
}
