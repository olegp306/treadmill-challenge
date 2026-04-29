import type { FastifyInstance } from 'fastify';
import { collectHealthStatusPayload } from '../services/healthAggregator.js';

export default async function healthStatusRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/health/status', async (request, reply) => {
    try {
      const payload = await collectHealthStatusPayload();
      return reply.send(payload);
    } catch (err) {
      request.log.error({
        msg: 'health_status_failed',
        error: err instanceof Error ? err.message : String(err),
      });
      return reply.status(500).send({ error: 'Failed to collect health status' });
    }
  });
}
