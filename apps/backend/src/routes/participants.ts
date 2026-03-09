import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, participants, runs } from '../db/index.js';

interface Params {
  id: string;
}

export default async function participantRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: Params }>('/api/participants/:id', async (request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) => {
    const db = getDb();
    const participant = participants.getParticipantById(db, request.params.id);
    if (!participant) {
      return reply.status(404).send({ error: 'Participant not found' });
    }
    const participantRuns = runs.getRunsByParticipantId(db, participant.id);
    return reply.send({
      ...participant,
      runs: participantRuns,
    });
  });
}
