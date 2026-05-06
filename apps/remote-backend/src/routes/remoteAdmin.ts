import type { FastifyInstance } from 'fastify';
import { signRemoteAdminJwt } from '../auth/jwt.js';
import { requireRemoteAdmin } from '../auth/requireRemoteAdmin.js';
import { writeAudit } from '../audit/auditLog.js';
import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { runtimeRootDir } from '../runtimePaths.js';
import {
  getLocalAdminRecentRuns,
  getLocalAdminRunSessions,
  getLocalHealthStatus,
  getLocalAdminToken,
  getLocalBaseUrl,
  deleteLocalAdminRunSessionEntry,
  proxyLocalAdminImportJson,
  proxyLocalAdminJsonExport,
  proxyLocalAdminLeaderboardsXlsx,
  updateLocalAdminRunSessionResult,
} from '../local/localClient.js';

function normalizeHours(raw: unknown, fallback: number): number {
  const n = Number(raw ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(24 * 14, Math.max(1, Math.floor(n)));
}

async function readLatestRemoteBackupJson(): Promise<{ fileName: string; raw: string; parsed: unknown } | null> {
  const dir = path.join(runtimeRootDir(), 'backups');
  const files = (await readdir(dir).catch(() => [] as string[]))
    .filter((f) => /^remote-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  const latest = files.length ? files[files.length - 1]! : null;
  if (!latest) return null;
  const raw = await readFile(path.join(dir, latest), 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  return { fileName: latest, raw, parsed };
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
    try {
      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'RECENT_RUNS_VIEWED',
        entityType: null,
        entityId: null,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: null,
      }).catch(() => undefined);
      return reply.send(await getLocalAdminRecentRuns());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      request.log.warn({ msg: 'remote_proxy_recent_runs_failed', error: msg });
      return reply.status(502).send({ error: `Local backend unavailable: ${msg}` });
    }
  });

  // ===== Runs / run sessions (Stage 2) =====
  app.get('/api/remote/admin/run-sessions', { preHandler: requireRemoteAdmin }, async (request, reply) => {
    try {
      await writeAudit({
        userId: null,
        userEmail: null,
        action: 'RUN_SESSIONS_VIEWED',
        entityType: null,
        entityId: null,
        ip: request.ip ?? null,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        metadata: null,
      }).catch(() => undefined);
      return reply.send(await getLocalAdminRunSessions());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      request.log.warn({ msg: 'remote_proxy_run_sessions_failed', error: msg });
      return reply.status(502).send({ error: `Local backend unavailable: ${msg}` });
    }
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
        const latest = await readLatestRemoteBackupJson();
        if (!latest) return reply.status(404).send({ error: 'No remote backups found' });

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
          return reply.header('Content-Type', 'application/json; charset=utf-8').send(latest.raw);
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
      const cd = res.headers.get('Content-Disposition') ?? 'attachment; filename="backup.json"';
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
      return reply.header('Content-Type', contentType).header('Content-Disposition', cd).send(body);
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
      const cd = res.headers.get('Content-Disposition') ?? 'attachment; filename="leaderboards.xlsx"';
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
      return reply.header('Content-Type', contentType).header('Content-Disposition', cd).send(Buffer.from(bytes));
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
      return reply.status(502).send({ error: `Local backend unavailable: ${msg}` });
    }
  });
}

