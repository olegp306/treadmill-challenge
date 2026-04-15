import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getRunTypeName } from '@treadmill-challenge/shared';
import { getDb } from '../db/index.js';
import { competitions, runs } from '../db/index.js';
import { parseLeaderboardScopeQuery } from '../utils/validation.js';

export default async function leaderboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/leaderboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = (request.query ?? {}) as Record<string, unknown>;
    const scope = parseLeaderboardScopeQuery(q);
    if (scope === 'INVALID') {
      return reply.status(400).send({
        error: 'Invalid leaderboard filter: provide both runTypeId (0|1|2) and gender (male|female), or omit both for global',
      });
    }

    const db = getDb();

    if (scope) {
      const comp = competitions.getActiveCompetition(db, scope.runTypeId, scope.gender);
      if (!comp) {
        return reply.send({
          scoped: true,
          runTypeId: scope.runTypeId,
          gender: scope.gender,
          runTypeName: getRunTypeName(scope.runTypeId),
          competitionTitle: null,
          leaderboard: [],
        });
      }
      const entries = runs.getLeaderboardForCompetition(db, comp.id, scope.runTypeId, 100);
      return reply.send({
        scoped: true,
        runTypeId: scope.runTypeId,
        gender: scope.gender,
        runTypeName: getRunTypeName(scope.runTypeId),
        competitionTitle: comp.title,
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
    }

    const entries = runs.getLeaderboardRuns(db, 50);
    return reply.send({
      scoped: false,
      runTypeId: null,
      gender: null,
      runTypeName: null,
      competitionTitle: null,
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
