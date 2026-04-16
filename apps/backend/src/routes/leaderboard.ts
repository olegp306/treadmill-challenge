import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getRunTypeName } from '@treadmill-challenge/shared';
import { getDb } from '../db/index.js';
import { competitions, runs } from '../db/index.js';
import { parseLeaderboardScopeQuery } from '../utils/validation.js';

function rankCompetitionEntries(
  entries: Array<{ resultTime: number; distance: number }>,
  runTypeId: number
): number[] {
  const ranks: number[] = [];
  let prevKey: string | null = null;
  let prevRank = 0;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const key = runTypeId === 0 ? `${e.distance}|${e.resultTime}` : `${e.resultTime}|${e.distance}`;
    if (i === 0) {
      prevRank = 1;
      prevKey = key;
      ranks.push(1);
      continue;
    }
    if (key === prevKey) {
      ranks.push(prevRank);
    } else {
      prevRank = i + 1;
      prevKey = key;
      ranks.push(prevRank);
    }
  }
  return ranks;
}

export default async function leaderboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/leaderboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = (request.query ?? {}) as Record<string, unknown>;
    const scope = parseLeaderboardScopeQuery(q);
    if (scope === 'INVALID') {
      return reply.status(400).send({
        error: 'Invalid leaderboard filter: provide both runTypeId (0|1|2) and sex (male|female), or omit both for global',
      });
    }

    const db = getDb();

    if (scope) {
      const comp = competitions.getActiveCompetition(db, scope.runTypeId, scope.sex);
      if (!comp) {
        return reply.send({
          scoped: true,
          runTypeId: scope.runTypeId,
          sex: scope.sex,
          runTypeName: getRunTypeName(scope.runTypeId),
          competitionTitle: null,
          leaderboard: [],
        });
      }
      const entries = runs.getLeaderboardForCompetition(db, comp.id, scope.runTypeId, 100);
      const ranks = rankCompetitionEntries(
        entries.map((e) => ({ resultTime: e.run.resultTime, distance: e.run.distance })),
        scope.runTypeId
      );
      return reply.send({
        scoped: true,
        runTypeId: scope.runTypeId,
        sex: scope.sex,
        runTypeName: getRunTypeName(scope.runTypeId),
        competitionTitle: comp.title,
        leaderboard: entries.map((e, idx) => ({
          rank: ranks[idx],
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
      sex: null,
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
