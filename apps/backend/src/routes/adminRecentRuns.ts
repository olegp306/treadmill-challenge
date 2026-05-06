import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';

export default async function adminRecentRunsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/admin/recent-runs', async (_request, reply) => {
    const db = getDb();

    const lastReg = db
      .prepare(
        `
      SELECT firstName, lastName, createdAt
      FROM participants
      ORDER BY createdAt DESC, id DESC
      LIMIT 1
    `
      )
      .get() as { firstName: string; lastName: string; createdAt: string } | undefined;

    const recentRuns = db
      .prepare(
        `
      SELECT
        r.createdAt as createdAt,
        r.resultTime as resultTime,
        r.distance as distance,
        r.speed as speed,
        COALESCE(c.runTypeKey, '') as runTypeKey,
        COALESCE(c.title, '') as competitionTitle,
        TRIM(COALESCE(p.firstName, '') || ' ' || COALESCE(p.lastName, '')) as participantName
      FROM runs r
      JOIN participants p ON p.id = r.participantId
      LEFT JOIN competitions c ON c.id = r.competitionId
      ORDER BY r.createdAt DESC, r.id DESC
      LIMIT 5
    `
      )
      .all() as Array<{
      createdAt: string;
      resultTime: number;
      distance: number;
      speed: number;
      runTypeKey: string;
      competitionTitle: string;
      participantName: string;
    }>;

    return reply.send({
      lastRegistration: lastReg
        ? { firstName: lastReg.firstName, lastName: lastReg.lastName, createdAt: lastReg.createdAt }
        : null,
      recentRuns: recentRuns.map((r) => ({
        participant: r.participantName,
        raceType: r.runTypeKey || r.competitionTitle || 'unknown',
        result: { resultTime: r.resultTime, distance: r.distance, speed: r.speed },
        createdAt: r.createdAt,
      })),
    });
  });
}

