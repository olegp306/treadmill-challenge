import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { touchDesignerAdapter } from '../integrations/touchdesigner/index.js';
import { TD_UNAVAILABLE } from '../services/runSessionPromotion.js';
import {
  finishCurrentWithFakeResults,
  getQueueControlState,
  moveCurrentRunnerToEndOfQueue,
  promoteNextQueuedToRunning,
  removeGlobalQueuedSessionByRunSessionId,
  restartCurrentRunning,
} from '../services/devQueueControlService.js';

/** `/api/dev/queue-control/*` — operator tool; same origin as API in dev and production (no env gate). */
export default async function devQueueControlRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/dev/queue-control/state', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const state = getQueueControlState();
      return reply.status(200).send(state);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to load queue control state' });
    }
  });

  app.post('/api/dev/queue-control/promote-next', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await promoteNextQueuedToRunning(touchDesignerAdapter, {
        info: (o) => request.log.info(o),
        warn: (o) => request.log.warn(o),
        error: (o) => request.log.error(o),
      });
      return reply.status(200).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to promote next session';
      if (message === 'Queue is empty') {
        return reply.status(404).send({ error: message });
      }
      if (message === 'Already running') {
        return reply.status(409).send({ error: message });
      }
      if (message === TD_UNAVAILABLE) {
        return reply.status(503).send({ error: 'td_unavailable' });
      }
      if (
        message.includes('Treadmill busy') ||
        message.includes('Could not place next session')
      ) {
        return reply.status(409).send({ error: message });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to promote next session' });
    }
  });

  app.post('/api/dev/queue-control/move-current-to-end', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await moveCurrentRunnerToEndOfQueue(touchDesignerAdapter, {
        info: (o) => request.log.info(o),
        warn: (o) => request.log.warn(o),
        error: (o) => request.log.error(o),
      });
      return reply.status(200).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to move current runner';
      if (message === 'No running session') {
        return reply.status(404).send({ error: message });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to move current runner' });
    }
  });

  app.post('/api/dev/queue-control/remove-queued', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = (request.body ?? {}) as { runSessionId?: string };
      const result = removeGlobalQueuedSessionByRunSessionId(
        typeof body.runSessionId === 'string' ? body.runSessionId : ''
      );
      return reply.status(200).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove from queue';
      if (message === 'runSessionId required') {
        return reply.status(400).send({ error: message });
      }
      if (message === 'Run session not found') {
        return reply.status(404).send({ error: message });
      }
      if (message === 'Not a queued session') {
        return reply.status(409).send({ error: message });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to remove from queue' });
    }
  });

  app.post('/api/dev/queue-control/finish-current', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await finishCurrentWithFakeResults(touchDesignerAdapter, {
        info: (o) => request.log.info(o),
        warn: (o) => request.log.warn(o),
        error: (o) => request.log.error(o),
      });
      return reply.status(200).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to finish run';
      if (message === 'No running session') {
        return reply.status(404).send({ error: message });
      }
      if (message === 'Run session not found' || message === 'Participant not found') {
        return reply.status(404).send({ error: message });
      }
      if (message === 'Run session already finished' || message === 'Run session cancelled') {
        return reply.status(409).send({ error: message });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to finish run' });
    }
  });

  app.post('/api/dev/queue-control/restart-current', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await restartCurrentRunning(touchDesignerAdapter, {
        info: (o) => request.log.info(o),
        warn: (o) => request.log.warn(o),
        error: (o) => request.log.error(o),
      });
      return reply.status(200).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restart run';
      if (message === 'No running session' || message === 'Participant not found') {
        return reply.status(404).send({ error: message });
      }
      if (message === TD_UNAVAILABLE) {
        return reply.status(503).send({ error: 'td_unavailable' });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to restart run' });
    }
  });
}
