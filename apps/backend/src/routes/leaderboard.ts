import type { FastifyInstance, FastifyReply } from 'fastify';
import { getDb } from '../db/index.js';
import { runs } from '../db/index.js';

export default async function leaderboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/leaderboard', async (_request, reply: FastifyReply) => {
    const db = getDb();
    const entries = runs.getLeaderboardRuns(db, 50);
    return reply.send({
      leaderboard: entries.map((e) => ({
        participantId: e.run.participantId,
        participantName: e.participantName,
        resultTime: e.run.resultTime,
        distance: e.run.distance,
        speed: e.run.speed,
        runId: e.run.id,
        createdAt: e.run.createdAt,
      })),
    });
  });
}
