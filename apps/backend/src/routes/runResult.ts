import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { submitRunResult } from '../services/runResultService.js';
import { validateRunResultBody } from '../utils/validation.js';

export default async function runResultRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/run-result', async (request: FastifyRequest, reply: FastifyReply) => {
    const validation = validateRunResultBody(request.body);
    if (!validation.success) {
      return reply.status(400).send({ error: validation.message });
    }
    try {
      const result = submitRunResult(validation.data);
      return reply.status(201).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit run result';
      if (message === 'Participant not found') {
        return reply.status(404).send({ error: message });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to submit run result' });
    }
  });
}
