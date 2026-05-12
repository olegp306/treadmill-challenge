import type { FastifyInstance } from 'fastify';
import { buildLeaderboardDataFromLatestBackup } from '../services/leaderboardFromLatestBackup.js';

/** Public read-only leaderboard built from `backups/latest.json` (no live DB). */
export async function registerPublicLeaderboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/remote/leaderboard-data', async (_request, reply) => {
    const result = await buildLeaderboardDataFromLatestBackup();
    if (!result.ok) {
      return reply.status(500).send({ ok: false, error: result.error });
    }
    if (result.empty) {
      return reply.send({
        ok: true,
        empty: true,
        lastBackupAt: result.lastBackupAt,
        message: result.message,
        scopes: [],
      });
    }
    return reply.send({
      ok: true,
      empty: false,
      lastBackupAt: result.lastBackupAt,
      scopes: result.scopes,
    });
  });
}
