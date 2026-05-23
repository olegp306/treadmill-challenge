import type { FastifyInstance, FastifyRequest } from 'fastify';
import { signRemoteAdminJwt } from '../auth/jwt.js';
import { requireRemoteAdmin } from '../auth/requireRemoteAdmin.js';
import { writeAudit } from '../audit/auditLog.js';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  promoteHistoryFileToActive,
  readActiveBackupMetaFile,
  readActiveBackupParsed,
  readActiveBackupRaw,
  writeActiveBackupEnvelope,
} from '../services/activeBackupStore.js';
import {
  getBackupMirrorState,
  runRemoteBackupMirrorOnce,
} from '../services/backupMirrorScheduler.js';
import { readBackupLatestMeta, lastBackupAtFromDatedFiles } from '../services/backupLatestMeta.js';
import { normalizeUserUploadToEnvelope } from '../services/remoteEnvelope.js';
import { remoteHistoryDir } from '../services/remoteBackupPaths.js';
import { runSessionsResponseFromEnvelope } from '../services/snapshotQueueHistory.js';
import { recentRunsFromEnvelope } from '../services/snapshotRecentRuns.js';
import {
  getLocalHealthStatus,
  getLocalAdminToken,
  getLocalBaseUrl,
  deleteLocalAdminRunSessionEntry,
  LocalProxyHttpError,
  proxyLocalAdminImportJson,
  proxyLocalAdminJsonExport,
  proxyLocalAdminLeaderboardsXlsx,
  updateLocalAdminRunSessionResult,
} from '../local/localClient.js';
import { readPublicTelegramSettings, updateTelegramSettings } from '../telegram/telegramSettings.js';
import { sendTelegramAlert } from '../telegram/telegramBot.js';

function normalizeHours(raw: unknown, fallback: number): number {
  const n = Number(raw ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(24 * 14, Math.max(1, Math.floor(n)));
}

/** For Content-Disposition only; payloads unchanged. */
function remoteDownloadStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}-${p(d.getMinutes())}`;
}

async function readActiveBackupForDownload(): Promise<{ fileName: string; raw: string } | null> {
  const raw = await readActiveBackupRaw();
  if (!raw) return null;
  const meta = await readActiveBackupMetaFile();
  const base =
    meta?.historySourceFile && meta.historySourceFile.trim().length > 0
      ? `active-${meta.historySourceFile.replace(/[^\w.-]+/g, '_')}`
      : 'active-backup';
  const fileName = base.endsWith('.json') ? base : `${base}.json`;
  return { fileName, raw };
}

export async function registerRemoteAdminRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/remote/admin/login', async (request, reply) => {
    const expectedPin = process.env.REMOTE_ADMIN_PIN?.trim() || '191181';
    const pin = (request.body as { pin?: unknown } | undefined)?.pin;
    if (typeof pin !== 'string' || pin.trim() !== expectedPin) {
      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'ADMIN_LOGIN_FAILED',
        entityType: null,
        entityId: null,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: null,
      }).catch(() => undefined);
      return reply.status(401).send({ error: 'Invalid PIN' });
    }
    try {
      const token = signRemoteAdminJwt();
      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'ADMIN_LOGIN',
        entityType: null,
        entityId: null,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: null,
      }).catch(() => undefined);
      return reply.send({ ok: true, token });
    } catch (e) {
      request.log.error({ msg: 'remote_admin_login_failed', error: e instanceof Error ? e.message : String(e) });
      return reply.status(500).send({ error: 'Server misconfigured' });
    }
  });

  app.post('/api/remote/admin/logout', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    await writeAudit({
      userId: null,
      userEmail: null,
      action: 'ADMIN_LOGOUT',
      entityType: null,
      entityId: null,
      ip: request.ip ?? null,
      userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
      metadata: null,
    }).catch(() => undefined);
    return reply.send({ ok: true });
  });

  app.get('/api/remote/admin/telegram/settings', { preHandler: requireRemoteAdmin }, async (_request, reply) => {
    return reply.send({ settings: await readPublicTelegramSettings() });
  });

  app.put('/api/remote/admin/telegram/settings', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    const body = (request.body ?? {}) as {
      botToken?: unknown;
      chatId?: unknown;
      statusPageUrl?: unknown;
      webhookSecret?: unknown;
      alertsEnabled?: unknown;
    };
    const settings = await updateTelegramSettings({
      botToken: typeof body.botToken === 'string' || body.botToken === null ? body.botToken : undefined,
      chatId: typeof body.chatId === 'string' || body.chatId === null ? body.chatId : undefined,
      statusPageUrl: typeof body.statusPageUrl === 'string' || body.statusPageUrl === null ? body.statusPageUrl : undefined,
      webhookSecret: typeof body.webhookSecret === 'string' || body.webhookSecret === null ? body.webhookSecret : undefined,
      alertsEnabled: typeof body.alertsEnabled === 'boolean' ? body.alertsEnabled : undefined,
    });
    await writeAudit({
      userId: null,
      userEmail: null,
      action: 'TELEGRAM_SETTINGS_UPDATED',
      entityType: 'telegram_settings',
      entityId: null,
      ip: request.ip ?? null,
      userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
      metadata: {
        botTokenConfigured: settings.botTokenConfigured,
        chatIdConfigured: Boolean(settings.chatId),
        statusPageUrlConfigured: Boolean(settings.statusPageUrl),
        webhookSecretConfigured: settings.webhookSecretConfigured,
        alertsEnabled: settings.alertsEnabled,
      },
    }).catch(() => undefined);
    return reply.send({ settings });
  });

  app.post('/api/remote/admin/telegram/test-alert', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    try {
      await sendTelegramAlert('[TEST] Treadmill Challenge alerts connected');
      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'TELEGRAM_TEST_ALERT_SENT',
        entityType: 'telegram_settings',
        entityId: null,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: null,
      }).catch(() => undefined);
      return reply.send({ ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      request.log.warn({ msg: 'telegram_test_alert_failed', error: msg });
      return reply.status(502).send({ error: msg });
    }
  });

  function backupLog(request: FastifyRequest) {
    return {
      info: (o: Record<string, unknown>) => request.log.info(o),
      warn: (o: Record<string, unknown>) => request.log.warn(o),
      error: (o: Record<string, unknown>) => request.log.error(o),
    };
  }

  function remoteBackupLogsHours(): number {
    const raw = Number(process.env.REMOTE_BACKUP_LOG_HOURS ?? 48);
    if (!Number.isFinite(raw)) return 48;
    return Math.min(24 * 14, Math.max(1, Math.floor(raw)));
  }

  app.get('/api/remote/admin/backup/status', { preHandler: requireRemoteAdmin }, async (_request, reply) => {
    const mirror = getBackupMirrorState();
    const meta = await readBackupLatestMeta();
    const activeMeta = await readActiveBackupMetaFile();
    const datedIso = await lastBackupAtFromDatedFiles();
    const hasActive = Boolean(activeMeta?.activeUpdatedAt);
    const lastBackupAt = meta?.lastBackupAt ?? null;
    return reply.send({
      backup: {
        hasBackup: hasActive,
        lastBackupAt,
        lastBackupSha16: meta?.lastBackupSha16 ?? null,
        logsHours: meta?.logsHours ?? remoteBackupLogsHours(),
        lastError: mirror.lastError,
        lastMirrorSuccessAt: mirror.lastSuccessAt,
        lastHistoryMirrorAt: datedIso,
        activeUpdatedAt: activeMeta?.activeUpdatedAt ?? null,
        activeSource: activeMeta?.source ?? null,
        activeEnvelopeCreatedAt: activeMeta?.envelopeCreatedAt ?? null,
      },
    });
  });

  app.post('/api/remote/admin/backup/pull', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    const r = await runRemoteBackupMirrorOnce(backupLog(request));
    if (!r.ok) {
      return reply.status(502).send({ error: r.error ?? 'Backup pull failed' });
    }
    try {
      await promoteHistoryFileToActive(r.historyPath, 'local_refresh');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      request.log.warn({ msg: 'remote_active_promote_failed', error: msg });
      return reply.status(500).send({ error: msg });
    }
    await writeAudit({
      userId: null,
      userEmail: null,
      action: 'BACKUP_PULL',
      entityType: 'remote_backup',
      entityId: null,
      ip: request.ip ?? null,
      userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
      metadata: { pulledAt: r.lastBackupAt, historyPath: r.historyPath, activeRefreshed: true },
    }).catch(() => undefined);
    return reply.send({ ok: true as const, pulledAt: r.lastBackupAt, activeRefreshed: true as const });
  });

  // ===== Proxy + mirror APIs (remote admin only) =====
  app.get('/api/remote/health/status', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    try {
      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'HEALTH_STATUS_VIEWED',
        entityType: null,
        entityId: null,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: null,
      }).catch(() => undefined);
      return reply.send(await getLocalHealthStatus());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      request.log.warn({ msg: 'remote_proxy_health_failed', error: msg });
      return reply.status(502).send({ error: `Local backend unavailable: ${msg}` });
    }
  });

  app.get('/api/remote/admin/recent-runs', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    await writeAudit({
      userId: null,
      userEmail: null,
      action: 'RECENT_RUNS_VIEWED',
      entityType: null,
      entityId: null,
      ip: request.ip ?? null,
      userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
      metadata: { source: 'active_backup' },
    }).catch(() => undefined);
    const root = await readActiveBackupParsed();
    if (!root) {
      return reply.send({ lastRegistration: null, recentRuns: [] });
    }
    return reply.send(recentRunsFromEnvelope(root));
  });

  // ===== Runs / run sessions (Stage 2) =====
  app.get('/api/remote/admin/run-sessions', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    await writeAudit({
      userId: null,
      userEmail: null,
      action: 'RUN_SESSIONS_VIEWED',
      entityType: null,
      entityId: null,
      ip: request.ip ?? null,
      userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
      metadata: { source: 'active_backup' },
    }).catch(() => undefined);
    const root = await readActiveBackupParsed();
    if (!root) {
      return reply.send({ entries: [] });
    }
    return reply.send(runSessionsResponseFromEnvelope(root));
  });

  app.put('/api/remote/admin/run-sessions/:runSessionId/result', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    const { runSessionId } = request.params as { runSessionId: string };
    const body = (request.body ?? {}) as { resultTime?: unknown; resultDistance?: unknown };
    const resultTime = Number(body.resultTime);
    const resultDistance = Number(body.resultDistance);
    if (!Number.isFinite(resultTime) || resultTime < 0 || !Number.isFinite(resultDistance) || resultDistance < 0) {
      return reply.status(400).send({ error: 'resultTime/resultDistance must be non-negative numbers' });
    }
    try {
      const res = await updateLocalAdminRunSessionResult(runSessionId, resultTime, resultDistance);
      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'DATABASE_RECORD_UPDATED',
        entityType: 'run_session',
        entityId: runSessionId,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: { resultTime, resultDistance },
      }).catch(() => undefined);
      return reply.send(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      request.log.warn({ msg: 'remote_proxy_run_session_update_failed', error: msg, runSessionId });
      return reply.status(502).send({ error: `Local backend unavailable: ${msg}` });
    }
  });

  app.delete('/api/remote/admin/run-sessions/:runSessionId', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    const { runSessionId } = request.params as { runSessionId: string };
    const pin = getLocalAdminToken();
    if (!pin) {
      return reply.status(500).send({ error: 'Remote server misconfigured: LOCAL_BACKEND_AUTH_TOKEN is not set' });
    }
    try {
      const res = await deleteLocalAdminRunSessionEntry(runSessionId, pin);
      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'DATABASE_RECORD_DELETED',
        entityType: 'run_session',
        entityId: runSessionId,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: null,
      }).catch(() => undefined);
      return reply.send(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      request.log.warn({ msg: 'remote_proxy_run_session_delete_failed', error: msg, runSessionId, localBaseUrl: getLocalBaseUrl() });
      return reply.status(502).send({ error: `Local backend unavailable: ${msg}` });
    }
  });

  app.get('/api/remote/downloads/backup-json', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    const hoursDefault = Number(process.env.REMOTE_BACKUP_LOG_HOURS ?? 48);
    const q = (request.query as { hours?: unknown; source?: unknown; format?: unknown } | undefined) ?? {};
    const hours = normalizeHours(q.hours, Number.isFinite(hoursDefault) ? hoursDefault : 48);
    const source = typeof q.source === 'string' ? q.source.trim().toLowerCase() : '';
    const format = typeof q.format === 'string' ? q.format.trim().toLowerCase() : '';
    try {
      if (source === 'remote-backup') {
        const latest = await readActiveBackupForDownload();
        if (!latest) return reply.status(404).send({ error: 'Нет активного backup на remote (active.json)' });

        await writeAudit({
          userId: null,
          userEmail: null,
          action: 'LOGS_VIEWED_FROM_BACKUP',
          entityType: 'remote_backup_json',
          entityId: latest.fileName,
          ip: request.ip ?? null,
          userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
          metadata: { source: 'remote-backup-json' },
        }).catch(() => undefined);

        if (format === 'json') {
          return reply
            .header('Content-Type', 'application/json; charset=utf-8')
            .header('Content-Disposition', `attachment; filename="${latest.fileName}"`)
            .send(latest.raw);
        }
        return reply
          .header('Content-Type', 'application/json; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="${latest.fileName}"`)
          .send(latest.raw);
      }

      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'EXPORT_STARTED',
        entityType: 'backup_json',
        entityId: null,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: { hours },
      }).catch(() => undefined);
      const res = await proxyLocalAdminJsonExport(hours);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const body = await res.text();
      const contentType = res.headers.get('Content-Type') ?? 'application/json; charset=utf-8';
      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'EXPORT_COMPLETED',
        entityType: 'backup_json',
        entityId: null,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: { hours, bytes: Buffer.byteLength(body, 'utf8') },
      }).catch(() => undefined);
      return reply
        .header('Content-Type', contentType)
        .header('Content-Disposition', `attachment; filename="remote-backup-${remoteDownloadStamp()}.json"`)
        .send(body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'EXPORT_FAILED',
        entityType: 'backup_json',
        entityId: null,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: { error: msg, hours },
      }).catch(() => undefined);
      request.log.warn({ msg: 'remote_proxy_download_backup_failed', error: msg });
      return reply.status(502).send({ error: `Local backend unavailable: ${msg}` });
    }
  });

  app.get('/api/remote/downloads/leaderboards-xlsx', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    try {
      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'EXPORT_STARTED',
        entityType: 'leaderboards_xlsx',
        entityId: null,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: null,
      }).catch(() => undefined);
      const res = await proxyLocalAdminLeaderboardsXlsx();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      const contentType =
        res.headers.get('Content-Type') ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'EXPORT_COMPLETED',
        entityType: 'leaderboards_xlsx',
        entityId: null,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: { bytes: bytes.byteLength },
      }).catch(() => undefined);
      return reply
        .header('Content-Type', contentType)
        .header('Content-Disposition', `attachment; filename="remote-leaderboards-${remoteDownloadStamp()}.xlsx"`)
        .send(Buffer.from(bytes));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'EXPORT_FAILED',
        entityType: 'leaderboards_xlsx',
        entityId: null,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: { error: msg },
      }).catch(() => undefined);
      request.log.warn({ msg: 'remote_proxy_download_xlsx_failed', error: msg });
      return reply.status(502).send({ error: `Local backend unavailable: ${msg}` });
    }
  });

  app.get('/api/remote/admin/active-backup/monitoring', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    const root = await readActiveBackupParsed();
    if (!root || typeof root !== 'object') {
      return reply.send({ empty: true as const, remote: null });
    }
    const rec = root as Record<string, unknown>;
    const remote = rec.remote;
    return reply.send({ empty: false as const, remote: remote ?? null });
  });

  app.post('/api/remote/admin/backup/import-remote-active', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    const norm = normalizeUserUploadToEnvelope(request.body);
    if (!norm.ok) {
      return reply.status(400).send({ error: norm.error });
    }
    const hist = remoteHistoryDir();
    await mkdir(hist, { recursive: true });
    const stamp = remoteDownloadStamp();
    const histName = `manual-remote-${stamp}.json`;
    const histPath = path.join(hist, histName);
    await writeFile(histPath, JSON.stringify(norm.envelope, null, 2), 'utf8');
    const w = await writeActiveBackupEnvelope({
      envelope: norm.envelope,
      source: 'manual_import',
      historySourceFile: histName,
    });
    await writeAudit({
      userId: null,
      userEmail: null,
      action: 'REMOTE_ACTIVE_IMPORT',
      entityType: 'remote_active_backup',
      entityId: null,
      ip: request.ip ?? null,
      userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
      metadata: { activeUpdatedAt: w.activeUpdatedAt, historyFile: histName },
    }).catch(() => undefined);
    return reply.send({ ok: true as const, activeUpdatedAt: w.activeUpdatedAt });
  });

  app.post('/api/remote/import-json', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    try {
      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'IMPORT_STARTED',
        entityType: 'backup_json',
        entityId: null,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: null,
      }).catch(() => undefined);
      const res = await proxyLocalAdminImportJson(request.body);
      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'IMPORT_COMPLETED',
        entityType: 'backup_json',
        entityId: null,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: { ok: (res as { ok?: unknown }).ok ?? true },
      }).catch(() => undefined);
      return reply.send(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'IMPORT_FAILED',
        entityType: 'backup_json',
        entityId: null,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: { error: msg },
      }).catch(() => undefined);
      request.log.warn({ msg: 'remote_proxy_import_failed', error: msg });
      if (e instanceof LocalProxyHttpError) {
        if (e.httpStatus === 400) {
          return reply.status(400).send({ error: msg });
        }
        if (e.httpStatus === 413) {
          return reply.status(413).send({ error: msg });
        }
        if (e.httpStatus === 401 || e.httpStatus === 403) {
          return reply
            .status(502)
            .send({ error: 'Локальный сервер отклонил авторизацию. Проверьте LOCAL_BACKEND_AUTH_TOKEN.' });
        }
        return reply.status(502).send({ error: msg });
      }
      return reply.status(500).send({ error: msg });
    }
  });
}
