import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRemoteAdminRoutes } from './routes/remoteAdmin.js';
import { registerRemoteSystemRoutes } from './routes/remoteSystem.js';
import { registerMonitoringIngestRoutes } from './routes/monitoringIngest.js';
import { startBackupMirrorScheduler } from './services/backupMirrorScheduler.js';
import { cleanupOldHealthEvents } from './monitoring/storage.js';
import { cleanupAudit } from './audit/auditLog.js';

const PORT = Number(process.env.REMOTE_BACKEND_PORT ?? process.env.PORT) || 3002;
const HOST = process.env.HOST || '0.0.0.0';

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  const corsOrigin = process.env.REMOTE_CORS_ORIGIN?.trim() || '*';
  await app.register(cors, {
    origin: corsOrigin === '*' ? true : corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.get('/health', async () => ({ status: 'ok', service: 'remote-backend' }));

  await registerRemoteAdminRoutes(app);
  await registerRemoteSystemRoutes(app);
  await registerMonitoringIngestRoutes(app);

  const backupMirror = startBackupMirrorScheduler({
    info: (o) => app.log.info(o),
    warn: (o) => app.log.warn(o),
    error: (o) => app.log.error(o),
  });
  app.addHook('onClose', async () => backupMirror.stop());

  // Cleanup jobs (best-effort)
  const cleanupTimer = setInterval(() => {
    const nowIso = new Date().toISOString();
    void cleanupOldHealthEvents({ maxDays: 7, maxPerDevice: 10_000, nowIso }).catch((e) =>
      app.log.warn({ msg: 'monitoring_cleanup_failed', error: e instanceof Error ? e.message : String(e) })
    );
    void cleanupAudit({ maxDays: 90, nowIso }).catch((e) =>
      app.log.warn({ msg: 'audit_cleanup_failed', error: e instanceof Error ? e.message : String(e) })
    );
  }, 60 * 60_000);
  app.addHook('onClose', async () => clearInterval(cleanupTimer));

  await app.listen({ port: PORT, host: HOST });
  app.log.info({ msg: 'remote_backend_started', host: HOST, port: PORT });
  app.log.info({
    msg: 'remote_backend_dev_urls',
    remoteBackendUrl: `http://localhost:${PORT}`,
    localBackendBaseUrl: process.env.LOCAL_BACKEND_BASE_URL?.trim() || null,
  });

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    try {
      app.log.info({ msg: 'remote_backend_shutting_down', signal });
      await app.close();
    } catch (e) {
      app.log.warn({ msg: 'remote_backend_shutdown_failed', error: e instanceof Error ? e.message : String(e) });
    } finally {
      process.exit(0);
    }
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
