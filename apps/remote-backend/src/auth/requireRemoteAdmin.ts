import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyRemoteAdminJwt } from './jwt.js';

function getBearerToken(request: FastifyRequest): string {
  const raw = request.headers.authorization;
  if (typeof raw !== 'string' || !raw.startsWith('Bearer ')) return '';
  return raw.slice('Bearer '.length).trim();
}

export async function requireRemoteAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const token = getBearerToken(request);
    if (!token) {
      await reply.status(401).send({ error: 'Unauthorized' });
      return;
    }
    const payload = verifyRemoteAdminJwt(token);
    if (payload.sub !== 'remote_admin') {
      await reply.status(401).send({ error: 'Unauthorized' });
      return;
    }
  } catch (e) {
    request.log.warn({ msg: 'remote_admin_jwt_invalid', error: e instanceof Error ? e.message : String(e) });
    await reply.status(401).send({ error: 'Unauthorized' });
  }
}

