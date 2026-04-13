import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { devFinishLatestQueuedRun, getQueue, startRunSession } from '../services/runService.js';
import { parseRunQueueFilterQuery, validateRunStartBody } from '../utils/validation.js';
import { touchDesignerAdapter } from '../integrations/touchdesigner/index.js';

function allowDevFinish(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_RUN_DEV_FINISH === 'true';
}

export default async function runRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/run/start', async (request: FastifyRequest, reply: FastifyReply) => {
    const validation = validateRunStartBody(request.body);
    if (!validation.success) {
      return reply.status(400).send({ error: validation.message });
    }
    try {
      const result = startRunSession(validation.data, touchDesignerAdapter);
      return reply.status(201).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start run';
      if (message === 'Participant not found') {
        return reply.status(404).send({ error: message });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to start run' });
    }
  });

  app.get('/api/run/queue', async (request: FastifyRequest, reply: FastifyReply) => {
    const runType = parseRunQueueFilterQuery(
      (request.query ?? {}) as Record<string, unknown>
    );
    if (runType === 'INVALID') {
      return reply.status(400).send({
        error: 'Invalid queue filter: use runTypeId (0|1|2) or runType (max_5_min, golden_km, stayer_sprint_5km)',
      });
    }
    try {
      const data = getQueue(runType);
      return reply.status(200).send(data);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to load queue' });
    }
  });

  app.post('/api/run/dev-finish', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!allowDevFinish()) {
      return reply.status(404).send({ error: 'Not found' });
    }
    try {
      const result = devFinishLatestQueuedRun();
      return reply.status(200).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to finish run';
      if (message === 'No run session to finish') {
        return reply.status(404).send({ error: message });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to finish run' });
    }
  });
}
