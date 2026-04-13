import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { devFinishLatestQueuedRun, startRunSession } from '../services/runService.js';
import { validateRunStartBody } from '../utils/validation.js';

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
      const result = startRunSession(validation.data);
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

  app.post('/api/run/dev-finish', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!allowDevFinish()) {
      return reply.status(404).send({ error: 'Not found' });
    }
    try {
      const result = devFinishLatestQueuedRun();
      return reply.status(200).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to finish run';
      if (message === 'No queued run session') {
        return reply.status(404).send({ error: message });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to finish run' });
    }
  });
}
