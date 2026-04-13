import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ensureDb } from './db/index.js';
import registerRoutes from './routes/register.js';
import leaderboardRoutes from './routes/leaderboard.js';
import participantRoutes from './routes/participants.js';
import runResultRoutes from './routes/runResult.js';
import touchdesignerRoutes from './routes/touchdesigner.js';
import runRoutes from './routes/run.js';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  await ensureDb();

  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(registerRoutes);
  await app.register(leaderboardRoutes);
  await app.register(participantRoutes);
  await app.register(runResultRoutes);
  await app.register(touchdesignerRoutes);
  await app.register(runRoutes);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.listen({ port: PORT, host: HOST });
  console.log(`Backend running at http://${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
