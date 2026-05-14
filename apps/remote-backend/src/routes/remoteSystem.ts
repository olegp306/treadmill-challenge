import type { FastifyInstance } from 'fastify';
import path from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { readActiveBackupMetaFile } from '../services/activeBackupStore.js';
import { readBackupLatestMeta } from '../services/backupLatestMeta.js';
import { getBackupMirrorState } from '../services/backupMirrorScheduler.js';
import { backupDir } from '../services/remoteBackupDir.js';
import { remoteActiveDir, remoteHistoryDir } from '../services/remoteBackupPaths.js';
import { getLocalBaseUrl, getLocalHealthStatus } from '../local/localClient.js';
import { requireRemoteAdmin } from '../auth/requireRemoteAdmin.js';

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

type LocalState = { lastHealthCheckAt: string | null; lastError: string | null };
const localState: LocalState = { lastHealthCheckAt: null, lastError: null };

async function readBackupFolderStatus(): Promise<{
  folderPath: string;
  latestFileName: string | null;
  latestCreatedAt: string | null;
  totalCount: number;
}> {
  const dir = remoteHistoryDir();
  const files = (await readdir(dir).catch(() => [] as string[]))
    .filter((f) => /^remote-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  const latest = files.length ? files[files.length - 1] : null;
  const latestCreatedAt = latest ? (await stat(path.join(dir, latest)).then((s) => s.mtime.toISOString()).catch(() => null)) : null;
  return {
    folderPath: dir,
    latestFileName: latest,
    latestCreatedAt,
    totalCount: files.length,
  };
}

export async function registerRemoteSystemRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/remote/system/status', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    const serverTime = new Date().toISOString();
    const localBaseUrl = getLocalBaseUrl() || null;

    let localOnline = false;
    try {
      await getLocalHealthStatus();
      localOnline = true;
      localState.lastHealthCheckAt = serverTime;
      localState.lastError = null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      localOnline = false;
      localState.lastError = msg;
      request.log.warn({ msg: 'remote_system_local_health_failed', error: msg });
    }

    const mirrorEnabled = boolEnv('REMOTE_BACKUP_ENABLED', true);
    const retentionCount = intEnv('REMOTE_BACKUP_RETENTION_COUNT', 24, 1, 10_000);
    const backups = await readBackupFolderStatus();
    const mirror = getBackupMirrorState();
    const latestMeta = await readBackupLatestMeta();
    const activeMeta = await readActiveBackupMetaFile();
    const lastBackupAt = latestMeta?.lastBackupAt ?? backups.latestCreatedAt ?? mirror.lastSuccessAt ?? null;

    return reply.send({
      remote: {
        online: true,
        appVersion: process.env.REMOTE_APP_VERSION?.trim() || null,
        serverTime,
        backupMirrorEnabled: mirrorEnabled,
        backupRetentionCount: retentionCount,
      },
      local: {
        baseUrl: localBaseUrl,
        online: localOnline,
        lastHealthCheckAt: localState.lastHealthCheckAt,
        lastError: localState.lastError,
      },
      backups: {
        folderPath: backups.folderPath,
        backupRoot: backupDir(),
        historyDir: remoteHistoryDir(),
        activeDir: remoteActiveDir(),
        latestFileName: backups.latestFileName ?? (mirror.latestFilePath ? path.basename(mirror.latestFilePath) : null),
        latestCreatedAt: backups.latestCreatedAt ?? mirror.lastSuccessAt,
        lastBackupAt,
        lastBackupSha16: latestMeta?.lastBackupSha16 ?? null,
        backupLogsHours: latestMeta?.logsHours ?? 48,
        totalCount: backups.totalCount,
        lastError: mirror.lastError,
        activeUpdatedAt: activeMeta?.activeUpdatedAt ?? null,
        activeSource: activeMeta?.source ?? null,
        activeEnvelopeCreatedAt: activeMeta?.envelopeCreatedAt ?? null,
      },
    });
  });
}

