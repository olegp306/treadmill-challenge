import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { registerParticipant } from '../services/registrationService.js';
import { validateRegisterBody } from '../utils/validation.js';
import { mockTouchDesignerAdapter } from '../integrations/touchdesigner/index.js';

export default async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const validation = validateRegisterBody(request.body);
    if (!validation.success) {
      return reply.status(400).send({ error: validation.message });
    }
    try {
      const participant = registerParticipant(validation.data, mockTouchDesignerAdapter);
      return reply.status(201).send(participant);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Registration failed' });
    }
  });
}
