import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getDb } from '../db/index.js';
import * as events from '../db/events.js';

function parseBody(body: unknown): {
  type: string;
  payload: Record<string, unknown>;
  sessionId?: string;
  participantId?: string;
  runSessionId?: string;
  readableMessage?: string;
} | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const type = typeof b.type === 'string' ? b.type.trim() : '';
  if (!type || type.length > 128) return null;
  let payload: Record<string, unknown> = {};
  if (b.payload != null && typeof b.payload === 'object' && !Array.isArray(b.payload)) {
    payload = b.payload as Record<string, unknown>;
  }
  const sessionId = typeof b.sessionId === 'string' ? b.sessionId.trim() : '';
  const participantId = typeof b.participantId === 'string' ? b.participantId.trim() : '';
  const runSessionId = typeof b.runSessionId === 'string' ? b.runSessionId.trim() : '';
  const readableMessage =
    typeof b.readableMessage === 'string' ? b.readableMessage.trim() : undefined;
  return {
    type,
    payload,
    sessionId: sessionId || undefined,
    participantId: participantId || undefined,
    runSessionId: runSessionId || undefined,
    readableMessage: readableMessage || undefined,
  };
}

export default async function eventsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/events', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = parseBody(request.body);
    if (!parsed) {
      return reply.status(400).send({ error: 'Invalid body: need type (string) and optional payload (object)' });
    }
    const sessionId = parsed.sessionId && parsed.sessionId.length > 0 ? parsed.sessionId : 'anonymous';
    let payloadJson: string;
    try {
      payloadJson = JSON.stringify(parsed.payload ?? {});
    } catch {
      return reply.status(400).send({ error: 'Invalid payload JSON' });
    }
    try {
      const db = getDb();
      const id = events.insertEvent(db, {
        sessionId,
        participantId: parsed.participantId ?? null,
        runSessionId: parsed.runSessionId ?? null,
        type: parsed.type,
        payloadJson,
        readableMessage: parsed.readableMessage ?? '',
      });
      return reply.status(201).send({ ok: true, id });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to store event' });
    }
  });
}
