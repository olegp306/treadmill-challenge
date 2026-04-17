import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { touchDesignerAdapter } from '../integrations/touchdesigner/index.js';
import { TD_UNAVAILABLE } from '../services/runSessionPromotion.js';
import {
  cancelCurrentRunning,
  finishCurrentWithFakeResults,
  getQueueControlState,
  promoteNextQueuedToRunning,
  restartCurrentRunning,
} from '../services/devQueueControlService.js';

function allowDevQueueControl(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_QUEUE_CONTROL === 'true';
}

export default async function devQueueControlRoutes(app: FastifyInstance): Promise<void> {
  const guard = (reply: FastifyReply): boolean => {
    if (!allowDevQueueControl()) {
      void reply.status(404).send({ error: 'Not found' });
      return false;
    }
    return true;
  };

  app.get('/api/dev/queue-control/state', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!guard(reply)) return;
    try {
      const state = getQueueControlState();
      return reply.status(200).send(state);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to load queue control state' });
    }
  });

  app.post('/api/dev/queue-control/promote-next', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!guard(reply)) return;
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

  app.post('/api/dev/queue-control/finish-current', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!guard(reply)) return;
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

  app.post('/api/dev/queue-control/cancel-current', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!guard(reply)) return;
    try {
      const result = await cancelCurrentRunning(touchDesignerAdapter, {
        info: (o) => request.log.info(o),
        warn: (o) => request.log.warn(o),
        error: (o) => request.log.error(o),
      });
      return reply.status(200).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel run';
      if (message === 'No running session') {
        return reply.status(404).send({ error: message });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to cancel run' });
    }
  });

  app.post('/api/dev/queue-control/restart-current', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!guard(reply)) return;
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
