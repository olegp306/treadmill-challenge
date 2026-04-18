import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getDb, runSessions } from '../db/index.js';
import { writePendingJpeg } from '../services/runPhotoStorage.js';

const MAX_BYTES = 6 * 1024 * 1024;

function stripDataUrlBase64(raw: string): string {
  const s = raw.trim();
  const m = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(s);
  return m ? m[1] : s;
}

/**
 * Kiosk uploads a JPEG captured when the run session becomes **running** (start of physical run).
 * Stored under `data/photos/pending/<runSessionId>.jpg` until `submitRunSessionResult` moves it to the run row.
 */
export default async function runPhotoRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/run-session/:runSessionId/start-photo', async (request: FastifyRequest, reply: FastifyReply) => {
    const { runSessionId } = request.params as { runSessionId: string };
    const body = (request.body ?? {}) as { participantId?: unknown; imageBase64?: unknown };
    const participantId = typeof body.participantId === 'string' ? body.participantId.trim() : '';
    const b64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';

    request.log.info({
      msg: 'verification_photo_capture_request',
      runSessionId,
      participantId: participantId || undefined,
      hasPayload: Boolean(b64),
    });

    if (!runSessionId.trim() || !participantId) {
      return reply.status(400).send({ error: 'runSessionId and participantId are required' });
    }
    if (!b64) {
      request.log.warn({ msg: 'verification_photo_capture_rejected', reason: 'missing_image', runSessionId });
      return reply.status(400).send({ error: 'imageBase64 is required' });
    }

    const db = getDb();
    const session = runSessions.getRunSessionById(db, runSessionId.trim());
    if (!session) {
      request.log.warn({ msg: 'verification_photo_capture_rejected', reason: 'session_not_found', runSessionId });
      return reply.status(404).send({ error: 'Run session not found' });
    }
    if (session.participantId !== participantId) {
      request.log.warn({
        msg: 'verification_photo_capture_rejected',
        reason: 'participant_mismatch',
        runSessionId,
        expectedParticipantId: session.participantId,
      });
      return reply.status(403).send({ error: 'Forbidden' });
    }
    if (session.status !== 'running') {
      request.log.warn({
        msg: 'verification_photo_capture_rejected',
        reason: 'session_not_running',
        runSessionId,
        status: session.status,
      });
      return reply.status(409).send({ error: 'Run session is not running' });
    }

    let buf: Buffer;
    try {
      const cleaned = stripDataUrlBase64(b64);
      buf = Buffer.from(cleaned, 'base64');
    } catch {
      request.log.warn({ msg: 'verification_photo_capture_failed', reason: 'invalid_base64', runSessionId });
      return reply.status(400).send({ error: 'Invalid base64 image' });
    }

    if (buf.length === 0 || buf.length > MAX_BYTES) {
      request.log.warn({
        msg: 'verification_photo_capture_rejected',
        reason: 'size',
        runSessionId,
        bytes: buf.length,
      });
      return reply.status(400).send({ error: 'Image too large or empty' });
    }

    const jpegMagic = buf[0] === 0xff && buf[1] === 0xd8;
    if (!jpegMagic) {
      request.log.warn({ msg: 'verification_photo_capture_rejected', reason: 'not_jpeg', runSessionId });
      return reply.status(400).send({ error: 'Only JPEG images are accepted' });
    }

    try {
      const existing = runSessions.getPendingPhotoPath(db, session.id);
      if (existing) {
        request.log.info({
          msg: 'verification_photo_capture_replace',
          runSessionId: session.id,
          participantId,
          previousPath: existing,
        });
      }

      const rel = writePendingJpeg(session.id, buf);
      runSessions.setPendingPhotoPath(db, session.id, rel);
      request.log.info({
        msg: 'verification_photo_capture_success',
        runSessionId: session.id,
        participantId,
        path: rel,
        bytes: buf.length,
      });
      return reply.status(201).send({ ok: true, path: rel });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      request.log.error({ msg: 'verification_photo_capture_failed', runSessionId: session.id, error: msg });
      return reply.status(500).send({ error: 'Failed to store photo' });
    }
  });
}
