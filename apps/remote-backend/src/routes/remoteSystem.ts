import type { FastifyInstance } from 'fastify';
import path from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { readActiveBackupMetaFile } from '../services/activeBackupStore.js';
import { readBackupLatestMeta } from '../services/backupLatestMeta.js';
import { getBackupMirrorState } from '../services/backupMirrorScheduler.js';
import { backupDir } from '../services/remoteBackupDir.js';
import { remoteActiveDir, remoteHistoryDir } from '../services/remoteBackupPaths.js';
import {
  getLocalBaseUrl,
  getLocalHealthStatus,
  getLocalTdHealthDiagnostics,
  updateLocalTdHealthFilePath,
} from '../local/localClient.js';
import { requireRemoteAdmin } from '../auth/requireRemoteAdmin.js';
import {
  readEffectiveLocalConnectionSettings,
  readPublicLocalConnectionSettings,
  readStoreHeartbeat,
  updateLocalConnectionSettings,
  writeStoreHeartbeat,
} from '../local/localConnectionSettings.js';
import { remoteBackendVersion } from '../version.js';

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
  app.route({
    method: ['GET', 'POST'],
    url: '/api/remote/store-heartbeat',
    handler: async (request, reply) => {
      const settings = await readEffectiveLocalConnectionSettings();
      const expected = settings.heartbeatToken;
      if (expected) {
        const q = (request.query ?? {}) as { token?: unknown };
        const header = request.headers['x-store-heartbeat-token'];
        const got = typeof q.token === 'string' ? q.token : typeof header === 'string' ? header : '';
        if (got !== expected) {
          return reply.status(401).send({ ok: false, error: 'Unauthorized' });
        }
      }
      const heartbeat = await writeStoreHeartbeat({
        lastRemoteAddress: request.ip ?? null,
        lastUserAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
      });
      return reply.send({ ok: true, receivedAt: heartbeat.lastHeartbeatAt });
    },
  });

  app.get('/api/remote/admin/local-connection/settings', { preHandler: requireRemoteAdmin }, async (_request, reply) => {
    return reply.send({
      settings: await readPublicLocalConnectionSettings(),
      heartbeat: await readStoreHeartbeat(),
    });
  });

  app.put('/api/remote/admin/local-connection/settings', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    const body = (request.body ?? {}) as {
      localBackendBaseUrl?: unknown;
      localBackendAuthToken?: unknown;
      remoteBackendPublicUrl?: unknown;
      heartbeatToken?: unknown;
    };
    const settings = await updateLocalConnectionSettings({
      localBackendBaseUrl:
        typeof body.localBackendBaseUrl === 'string' || body.localBackendBaseUrl === null ? body.localBackendBaseUrl : undefined,
      localBackendAuthToken:
        typeof body.localBackendAuthToken === 'string' || body.localBackendAuthToken === null ? body.localBackendAuthToken : undefined,
      remoteBackendPublicUrl:
        typeof body.remoteBackendPublicUrl === 'string' || body.remoteBackendPublicUrl === null ? body.remoteBackendPublicUrl : undefined,
      heartbeatToken: typeof body.heartbeatToken === 'string' || body.heartbeatToken === null ? body.heartbeatToken : undefined,
    });
    return reply.send({ settings, heartbeat: await readStoreHeartbeat() });
  });

  app.get('/api/remote/admin/local-td-health/diagnostics', { preHandler: requireRemoteAdmin }, async (_request, reply) => {
    try {
      return reply.send({ diagnostics: await getLocalTdHealthDiagnostics() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return reply.status(502).send({ error: `Local TD health diagnostics unavailable: ${msg}` });
    }
  });

  app.put('/api/remote/admin/local-td-health/settings', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    const body = (request.body ?? {}) as { tdHealthFilePath?: unknown };
    if (typeof body.tdHealthFilePath !== 'string' && body.tdHealthFilePath !== null) {
      return reply.status(400).send({ error: 'tdHealthFilePath must be a string or null' });
    }
    try {
      await updateLocalTdHealthFilePath(body.tdHealthFilePath);
      return reply.send({ diagnostics: await getLocalTdHealthDiagnostics() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return reply.status(502).send({ error: `Local TD health settings unavailable: ${msg}` });
    }
  });

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
        appVersion: remoteBackendVersion(),
        serverTime,
        backupMirrorEnabled: mirrorEnabled,
        backupRetentionCount: retentionCount,
      },
      local: {
        baseUrl: localBaseUrl,
        online: localOnline,
        lastHealthCheckAt: localState.lastHealthCheckAt,
        lastError: localState.lastError,
        storeHeartbeat: await readStoreHeartbeat(),
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
