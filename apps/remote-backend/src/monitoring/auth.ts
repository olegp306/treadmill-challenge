import type { FastifyRequest, FastifyReply } from 'fastify';

function readExpectedKey(): string {
  return process.env.HEALTH_API_KEY?.trim() || '';
}

function readFromHeader(request: FastifyRequest): string {
  const a = request.headers.authorization;
  if (typeof a === 'string' && a.startsWith('Bearer ')) return a.slice(7).trim();
  const x = request.headers['x-health-api-key'];
  if (typeof x === 'string') return x.trim();
  return '';
}

export async function requireHealthAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const expected = readExpectedKey();
  if (!expected) {
    request.log.error({ msg: 'health_auth_misconfigured', error: 'HEALTH_API_KEY is not set' });
    await reply.status(500).send({ error: 'Server misconfigured' });
    return;
  }
  const got = readFromHeader(request);
  if (!got || got !== expected) {
    await reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
}

