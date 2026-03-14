import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { mockTouchDesignerAdapter } from '../integrations/touchdesigner/index.js';

/**
 * Routes for TouchDesigner integration (e.g. connection by OCR).
 * GET /api/touchdesigner/run-result — get latest run result data from TouchDesigner.
 */
export default async function touchdesignerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/touchdesigner/run-result', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await mockTouchDesignerAdapter.getRunResultFromTouchDesigner();
      if (result === null) {
        return reply.status(204).send();
      }
      return reply.status(200).send(result);
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to get run result from TouchDesigner' });
    }
  });
}
