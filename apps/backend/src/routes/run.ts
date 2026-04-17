import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  devFinishLatestQueuedRun,
  getQueue,
  getRunSessionState,
  leaveRunSession,
  startRunSession,
} from '../services/runService.js';
import { adminSettings, getDb } from '../db/index.js';
import { parseRunQueueFilterQuery, parseSexQuery, validateRunStartBody } from '../utils/validation.js';
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
      const outcome = await startRunSession(validation.data, touchDesignerAdapter);
      request.log.info({
        msg: 'run_start_outcome',
        ok: outcome.ok,
        reason: outcome.ok ? 'ok' : outcome.reason,
        runSessionId: outcome.ok ? outcome.data.runSessionId : undefined,
        participantId: validation.data.participantId,
        runTypeId: validation.data.runTypeId,
        tdDemoMode: outcome.ok ? outcome.data.demoMode : undefined,
        status: outcome.ok ? outcome.data.status : undefined,
        position: outcome.ok ? outcome.data.position : undefined,
        treadmillStatus: outcome.ok ? outcome.data.treadmillStatus : undefined,
      });
      if (!outcome.ok) {
        const statusCode = outcome.reason === 'td_unavailable' ? 503 : 409;
        return reply.status(statusCode).send({ success: false, reason: outcome.reason });
      }
      return reply.status(201).send({ success: true, reason: 'ok', ...outcome.data });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start run';
      if (message === 'Participant not found') {
        return reply.status(404).send({ error: message });
      }
      if (message.startsWith('Нет активного соревнования')) {
        return reply.status(409).send({ error: message });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to start run' });
    }
  });

  app.post('/api/run/leave-queue', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body ?? {}) as { runSessionId?: string; participantId?: string };
    const runSessionId = typeof body.runSessionId === 'string' ? body.runSessionId.trim() : '';
    const participantId = typeof body.participantId === 'string' ? body.participantId.trim() : '';
    if (!runSessionId || !participantId) {
      return reply.status(400).send({ error: 'runSessionId and participantId are required' });
    }
    try {
      leaveRunSession(runSessionId, participantId);
      return reply.status(200).send({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to leave queue';
      if (message === 'Run session not found') {
        return reply.status(404).send({ error: message });
      }
      if (message === 'Forbidden') {
        return reply.status(403).send({ error: message });
      }
      if (message === 'Run session cannot be left') {
        return reply.status(409).send({ error: message });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to leave queue' });
    }
  });

  app.get('/api/run/queue', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = (request.query ?? {}) as Record<string, unknown>;
    const runType = parseRunQueueFilterQuery(q);
    if (runType === 'INVALID') {
      return reply.status(400).send({
        error: 'Invalid queue filter: use runTypeId (0|1|2) or runType (max_5_min, golden_km, stayer_sprint_5km)',
      });
    }
    const sex = parseSexQuery(q);
    if (sex === 'INVALID') {
      return reply.status(400).send({ error: 'Invalid sex: use male or female' });
    }
    try {
      const data = getQueue(runType, sex);
      return reply.status(200).send(data);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to load queue' });
    }
  });

  app.get('/api/run/session/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const participantId = typeof (request.query as { participantId?: unknown } | undefined)?.participantId === 'string'
      ? String((request.query as { participantId?: unknown }).participantId).trim()
      : '';
    if (!id?.trim()) {
      return reply.status(400).send({ error: 'runSessionId is required' });
    }
    try {
      const state = getRunSessionState(id);
      if (participantId && participantId !== state.participantId) {
        return reply.status(403).send({ error: 'Forbidden' });
      }
      return reply.status(200).send(state);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load run session';
      if (message === 'Run session not found') {
        return reply.status(404).send({ error: message });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to load run session' });
    }
  });

  app.post('/api/run/dev-finish', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!allowDevFinish()) {
      return reply.status(404).send({ error: 'Not found' });
    }
    const db = getDb();
    if (!adminSettings.getTdDemoMode(db)) {
      return reply.status(404).send({ error: 'Not found' });
    }
    request.log.info({ msg: 'dev_finish_request', body: request.body ?? null });
    try {
      const result = devFinishLatestQueuedRun();
      request.log.info({
        msg: 'dev_finish_saved',
        runSessionId: result.runSessionId,
        runId: result.runId,
        participantId: result.participantId,
      });
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
