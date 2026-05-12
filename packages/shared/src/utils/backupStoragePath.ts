import path from 'node:path';

/**
 * Resolves `BACKUP_STORAGE_PATH` to an absolute, normalized directory path.
 * Relative values are resolved against `cwd` (typically `process.cwd()`).
 */
export function resolveBackupStoragePathInput(raw: string, cwd: string): string {
  const t = raw.trim();
  if (!t) throw new Error('BACKUP_STORAGE_PATH is empty');
  return path.isAbsolute(t) ? path.normalize(t) : path.normalize(path.resolve(cwd, t));
}

/**
 * Rejects filesystem / drive roots so backups never target `C:\`, `/`, etc.
 */
export function validateBackupStoragePathNotFilesystemRoot(abs: string): { ok: true } | { ok: false; reason: string } {
  const normalized = path.normalize(abs);
  const parsed = path.parse(normalized);
  const root = parsed.root || '';
  if (!root) {
    return { ok: false, reason: 'Unable to parse BACKUP_STORAGE_PATH' };
  }
  const afterRoot = normalized.slice(root.length).replace(/^[\\/]+/, '');
  if (afterRoot.length === 0) {
    return {
      ok: false,
      reason:
        'BACKUP_STORAGE_PATH must not be a drive or filesystem root. Use a dedicated folder (e.g. C:\\OZIO_BACKUPS or /var/ozio/backups).',
    };
  }
  return { ok: true };
}
