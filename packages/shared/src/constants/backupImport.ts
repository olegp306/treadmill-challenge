const MB = 1024 * 1024;

/** Default max JSON backup import size (50 MiB). */
export const BACKUP_IMPORT_DEFAULT_BYTES = 50 * MB;

/** Minimum allowed value when `BACKUP_IMPORT_MAX_BYTES` is set (25 MiB). */
export const BACKUP_IMPORT_MIN_BYTES = 25 * MB;

/** Upper bound for env override (avoids accidental huge allocations). */
export const BACKUP_IMPORT_ENV_CAP_BYTES = 100 * MB;

const RUN_RESULT_BODY_FLOOR_BYTES = 10 * MB;

/**
 * Parses `BACKUP_IMPORT_MAX_BYTES` for JSON backup import (local admin + remote proxy).
 * Invalid or empty values fall back to {@link BACKUP_IMPORT_DEFAULT_BYTES}.
 * Values are clamped to [{@link BACKUP_IMPORT_MIN_BYTES}, {@link BACKUP_IMPORT_ENV_CAP_BYTES}].
 */
export function parseBackupImportMaxBytes(envValue: string | undefined): number {
  const raw = envValue?.trim();
  if (raw == null || raw === '') return BACKUP_IMPORT_DEFAULT_BYTES;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return BACKUP_IMPORT_DEFAULT_BYTES;
  const floored = Math.floor(n);
  return Math.min(BACKUP_IMPORT_ENV_CAP_BYTES, Math.max(BACKUP_IMPORT_MIN_BYTES, floored));
}

/**
 * Fastify global `bodyLimit`: at least TouchDesigner run-result floor, and at least backup import size.
 */
export function resolveFastifyBodyLimitBytes(envValue: string | undefined): number {
  return Math.max(RUN_RESULT_BODY_FLOOR_BYTES, parseBackupImportMaxBytes(envValue));
}

export function formatBytesAsMbLabel(bytes: number): string {
  const mb = bytes / MB;
  if (Math.abs(mb - Math.round(mb)) < 0.001) return `${Math.round(mb)} MB`;
  return `${mb.toFixed(1)} MB`;
}

export function backupImportFileTooLargeMessage(maxBytes: number): string {
  return `Файл слишком большой. Максимальный размер: ${formatBytesAsMbLabel(maxBytes)}`;
}
