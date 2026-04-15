import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateDemoMetrics, type RunSessionResultDto } from '@treadmill-challenge/shared';
import { adminSettings, getDb, runSessions } from '../db/index.js';
import { submitRunSessionResult } from '../services/runResultService.js';
import { validateRunSessionResultBody } from '../utils/validation.js';

export default async function runResultRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/run-result', async (request: FastifyRequest, reply: FastifyReply) => {
    request.log.info({
      msg: 'run_result_request',
      contentType: request.headers['content-type'],
      bodyPreview:
        request.body && typeof request.body === 'object'
          ? {
              runSessionId: (request.body as Record<string, unknown>).runSessionId,
              resultTime: (request.body as Record<string, unknown>).resultTime,
              distance: (request.body as Record<string, unknown>).distance,
            }
          : typeof request.body,
    });

    const validation = validateRunSessionResultBody(request.body);
    if (!validation.success) {
      request.log.warn({ msg: 'run_result_validation_failed', message: validation.message });
      return reply.status(400).send({ error: validation.message });
    }

    const db = getDb();
    let data: RunSessionResultDto = validation.data;
    const demoMode = adminSettings.getTdDemoMode(db);

    if (demoMode) {
      const session = runSessions.getRunSessionById(db, data.runSessionId);
      if (session) {
        const demo = generateDemoMetrics(session.runTypeId, session.id);
        request.log.info({
          msg: 'run_result_td_demo_mode',
          runSessionId: data.runSessionId,
          runTypeId: session.runTypeId,
          clientResultTime: data.resultTime,
          clientDistance: data.distance,
          appliedResultTime: demo.resultTime,
          appliedDistance: demo.distance,
        });
        data = { ...data, resultTime: demo.resultTime, distance: demo.distance };
      } else {
        request.log.warn({ msg: 'run_result_td_demo_mode_no_session', runSessionId: data.runSessionId });
      }
    }

    try {
      const result = submitRunSessionResult(data);
      request.log.info({
        msg: 'run_result_saved',
        runId: result.runId,
        runSessionId: result.runSessionId,
        participantId: result.participantId,
        resultTime: data.resultTime,
        distance: data.distance,
        tdDemoMode: demoMode,
      });
      return reply.status(201).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit run result';
      if (message === 'Run session not found' || message === 'Participant not found') {
        return reply.status(404).send({ error: message });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to submit run result' });
    }
  });
}
