import type { FastifyInstance } from 'fastify';
import { HealthPayloadSchema } from '../monitoring/healthSchema.js';
import { requireHealthAuth } from '../monitoring/auth.js';
import { checkRateLimit } from '../monitoring/rateLimit.js';
import { appendHealthEvent, compactSnapshot, makeLatestState, readLatestState, writeLatestState } from '../monitoring/storage.js';
import { calculateHealthSeverity, healthKey } from '../monitoring/severity.js';
import { emitAlerts } from '../monitoring/alerts.js';

export async function registerMonitoringIngestRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/api/monitoring/health',
    {
      preHandler: requireHealthAuth,
      bodyLimit: 64 * 1024,
    },
    async (request, reply) => {
      const receivedAt = new Date().toISOString();

      const parsed = HealthPayloadSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid health payload' });
      }
      const payload = parsed.data;

      const rl = checkRateLimit(payload, Date.now(), 5_000);
      if (!rl.ok) {
        return reply
          .status(429)
          .header('Retry-After', String(rl.retryAfterSec))
          .send({ error: 'Too Many Requests', retryAfterSec: rl.retryAfterSec });
      }

      const key = healthKey(payload);
      const prev = await readLatestState(key);
      const { severity, problems } = calculateHealthSeverity(payload, prev, receivedAt);

      const latest = makeLatestState(payload, receivedAt, severity, problems);
      await writeLatestState(latest);

      await appendHealthEvent({
        key,
        receivedAt,
        payloadTimestamp: payload.timestamp,
        severity,
        problems,
        snapshot: compactSnapshot(payload),
      });

      // alerts (dedup/cooldown inside)
      try {
        await emitAlerts({
          projectId: payload.projectId,
          locationId: payload.locationId,
          deviceId: payload.deviceId,
          severity,
          problems,
          detectedAt: receivedAt,
          lastSignalAt: prev?.lastReceivedAt ?? null,
        });
      } catch (e) {
        request.log.warn({ msg: 'monitoring_alert_emit_failed', error: e instanceof Error ? e.message : String(e), key });
      }

      return reply.send({
        success: true,
        severity,
        problems,
        receivedAt,
      });
    }
  );
}

