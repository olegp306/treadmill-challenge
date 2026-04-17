import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateDemoMetrics, type RunSessionResultDto } from '@treadmill-challenge/shared';
import { adminSettings, getDb, runSessions } from '../db/index.js';
import { getExistingResultByRunSessionId, submitRunSessionResult } from '../services/runResultService.js';
import { validateRunSessionResultBody } from '../utils/validation.js';

function readTdTokenFromRequest(request: FastifyRequest): string {
  const fromHeader = request.headers['x-td-token'];
  if (typeof fromHeader === 'string' && fromHeader.trim()) return fromHeader.trim();
  const auth = request.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return '';
}

function assertTdCallbackAuth(request: FastifyRequest, reply: FastifyReply): boolean {
  const expected = process.env.TD_CALLBACK_TOKEN?.trim() ?? '';
  if (!expected) return true;
  const provided = readTdTokenFromRequest(request);
  if (!provided || provided !== expected) {
    void reply.status(401).send({ error: 'Unauthorized TD callback' });
    return false;
  }
  return true;
}

export default async function runResultRoutes(app: FastifyInstance): Promise<void> {
  const handleRunResult = async (
    request: FastifyRequest,
    reply: FastifyReply,
    opts: { source: 'public' | 'touchdesigner'; requiresTdAuth: boolean }
  ) => {
    if (opts.requiresTdAuth && !assertTdCallbackAuth(request, reply)) {
      return;
    }
    request.log.info({
      msg: 'run_result_request',
      source: opts.source,
      contentType: request.headers['content-type'],
      bodyPreview:
        request.body && typeof request.body === 'object'
          ? {
              runSessionId: (request.body as Record<string, unknown>).runSessionId,
              resultTime: (request.body as Record<string, unknown>).resultTime,
              distance: (request.body as Record<string, unknown>).distance,
              result: (request.body as Record<string, unknown>).result,
              participant: (request.body as Record<string, unknown>).participant,
              run: (request.body as Record<string, unknown>).run,
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
        rank: result.rank,
        tdDemoMode: demoMode,
      });
      return reply.status(201).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit run result';
      if (message === 'Run session already finished') {
        const existing = getExistingResultByRunSessionId(data.runSessionId);
        if (existing) {
          request.log.info({
            msg: 'run_result_duplicate_finish_accepted',
            source: opts.source,
            runSessionId: existing.runSessionId,
            runId: existing.runId,
          });
          return reply.status(200).send({ ...existing, duplicate: true });
        }
      }
      if (message === 'Run session not found' || message === 'Participant not found') {
        return reply.status(404).send({ error: message });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to submit run result' });
    }
  };

  app.post('/api/run-result', async (request: FastifyRequest, reply: FastifyReply) =>
    handleRunResult(request, reply, { source: 'public', requiresTdAuth: false })
  );

  app.post('/api/touchdesigner/run-result', async (request: FastifyRequest, reply: FastifyReply) =>
    handleRunResult(request, reply, { source: 'touchdesigner', requiresTdAuth: true })
  );
}
