import crypto from 'node:crypto';
import { mkdir, readFile, stat, writeFile, copyFile, rename, readdir } from 'node:fs/promises';
import path from 'node:path';
import { backupDir } from './remoteBackupDir.js';
import { remoteActiveDir, remoteActiveJsonPath, remoteActiveMetaPath, remoteHistoryDir } from './remoteBackupPaths.js';
import { extractLocalSnapshot } from './remoteEnvelope.js';

export type ActiveBackupSource = 'local_refresh' | 'manual_import' | 'migrated_legacy';

export type ActiveBackupMetaFile = {
  /** When this machine wrote active.json (ISO). */
  activeUpdatedAt: string;
  source: ActiveBackupSource;
  /** `meta.createdAt` inside the envelope when present. */
  envelopeCreatedAt: string | null;
  lastBackupSha16: string | null;
  /** Optional dated history filename this active was promoted from. */
  historySourceFile: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function envelopeCreatedAt(envelope: unknown): string | null {
  if (!isRecord(envelope)) return null;
  const m = envelope.meta;
  if (isRecord(m) && typeof m.createdAt === 'string' && m.createdAt.trim()) return m.createdAt.trim();
  const snap = extractLocalSnapshot(envelope);
  const sm = snap?.meta;
  if (isRecord(sm) && typeof sm.createdAt === 'string' && sm.createdAt.trim()) return sm.createdAt.trim();
  return null;
}

export async function readActiveBackupMetaFile(): Promise<ActiveBackupMetaFile | null> {
  const fp = remoteActiveMetaPath();
  try {
    const raw = await readFile(fp, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;
    const activeUpdatedAt =
      typeof parsed.activeUpdatedAt === 'string' && parsed.activeUpdatedAt.trim()
        ? parsed.activeUpdatedAt.trim()
        : null;
    if (!activeUpdatedAt) return null;
    const source = parsed.source as ActiveBackupSource;
    const okSource = source === 'local_refresh' || source === 'manual_import' || source === 'migrated_legacy';
    return {
      activeUpdatedAt,
      source: okSource ? source : 'manual_import',
      envelopeCreatedAt: typeof parsed.envelopeCreatedAt === 'string' ? parsed.envelopeCreatedAt : null,
      lastBackupSha16: typeof parsed.lastBackupSha16 === 'string' ? parsed.lastBackupSha16 : null,
      historySourceFile: typeof parsed.historySourceFile === 'string' ? parsed.historySourceFile : null,
    };
  } catch {
    return null;
  }
}

export async function readActiveBackupRaw(): Promise<string | null> {
  const fp = remoteActiveJsonPath();
  try {
    return await readFile(fp, 'utf8');
  } catch {
    return null;
  }
}

export async function readActiveBackupParsed(): Promise<unknown | null> {
  const raw = await readActiveBackupRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export async function writeActiveBackupEnvelope(params: {
  envelope: unknown;
  source: ActiveBackupSource;
  historySourceFile?: string | null;
}): Promise<{ activeUpdatedAt: string; sha16: string }> {
  const dir = remoteActiveDir();
  await mkdir(dir, { recursive: true });
  const body = JSON.stringify(params.envelope, null, 2);
  const sha16 = crypto.createHash('sha256').update(body).digest('hex').slice(0, 16);
  const activeUpdatedAt = new Date().toISOString();
  const meta: ActiveBackupMetaFile = {
    activeUpdatedAt,
    source: params.source,
    envelopeCreatedAt: envelopeCreatedAt(params.envelope),
    lastBackupSha16: sha16,
    historySourceFile: params.historySourceFile ?? null,
  };
  await writeFile(remoteActiveJsonPath(), body, 'utf8');
  await writeFile(remoteActiveMetaPath(), JSON.stringify(meta, null, 2), 'utf8');
  return { activeUpdatedAt, sha16 };
}

/** Move dated `remote-backup-*.json` from legacy backup root into `history/`. */
export async function migrateLooseHistoryFilesToSubdir(log: {
  info: (o: Record<string, unknown>) => void;
  warn: (o: Record<string, unknown>) => void;
}): Promise<void> {
  const root = backupDir();
  const hist = remoteHistoryDir();
  await mkdir(hist, { recursive: true });
  let moved = 0;
  const files = await readdir(root).catch(() => [] as string[]);
  for (const f of files) {
    if (!/^remote-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/.test(f)) continue;
    const from = path.join(root, f);
    const to = path.join(hist, f);
    try {
      await rename(from, to);
      moved += 1;
    } catch (e) {
      log.warn({
        msg: 'remote_history_file_move_skipped',
        file: f,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  if (moved > 0) {
    log.info({ msg: 'remote_history_files_migrated_to_subdir', moved, historyDir: hist });
  }
}

export async function promoteHistoryFileToActive(
  historyPath: string,
  source: ActiveBackupSource
): Promise<{ activeUpdatedAt: string; sha16: string }> {
  const raw = await readFile(historyPath, 'utf8');
  const envelope = JSON.parse(raw) as unknown;
  return writeActiveBackupEnvelope({
    envelope,
    source,
    historySourceFile: path.basename(historyPath),
  });
}

/** If `active/active.json` is missing but legacy `latest.json` exists at backup root, copy once. */
export async function migrateLegacyLatestToActiveIfNeeded(log: {
  info: (o: Record<string, unknown>) => void;
  warn: (o: Record<string, unknown>) => void;
}): Promise<void> {
  const activeJson = remoteActiveJsonPath();
  try {
    await stat(activeJson);
    return;
  } catch {
    // no active — continue
  }
  const legacy = path.join(backupDir(), 'latest.json');
  try {
    await stat(legacy);
  } catch {
    return;
  }
  try {
    await mkdir(remoteActiveDir(), { recursive: true });
    await copyFile(legacy, activeJson);
    const raw = await readFile(legacy, 'utf8');
    let envelope: unknown = null;
    try {
      envelope = JSON.parse(raw) as unknown;
    } catch {
      envelope = null;
    }
    const meta: ActiveBackupMetaFile = {
      activeUpdatedAt: new Date().toISOString(),
      source: 'migrated_legacy',
      envelopeCreatedAt: envelope ? envelopeCreatedAt(envelope) : null,
      lastBackupSha16: crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16),
      historySourceFile: 'latest.json',
    };
    await writeFile(remoteActiveMetaPath(), JSON.stringify(meta, null, 2), 'utf8');
    log.info({ msg: 'remote_active_backup_migrated_from_legacy_latest', legacyPath: legacy });
  } catch (e) {
    log.warn({
      msg: 'remote_active_backup_legacy_migration_failed',
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
