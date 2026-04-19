import os from 'node:os';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ensureDb } from './db/index.js';
import registerRoutes from './routes/register.js';
import leaderboardRoutes from './routes/leaderboard.js';
import participantRoutes from './routes/participants.js';
import runResultRoutes from './routes/runResult.js';
import touchdesignerRoutes from './routes/touchdesigner.js';
import runRoutes from './routes/run.js';
import adminRoutes from './routes/admin.js';
import eventsRoutes from './routes/events.js';
import devQueueControlRoutes from './routes/devQueueControl.js';
import { getAppVersion } from './version.js';
import { registerTouchDesignerOscRunResultHandler } from './integrations/touchdesigner/oscTouchDesignerAck.js';
import { touchDesignerAdapter } from './integrations/touchdesigner/adapter.js';
import { submitRunSessionResult } from './services/runResultService.js';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

function listLanIPv4Addresses(): string[] {
  const nets = os.networkInterfaces();
  const out: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        out.push(net.address);
      }
    }
  }
  return out;
}

async function main() {
  await ensureDb();

  registerTouchDesignerOscRunResultHandler(async (dto) => {
    await submitRunSessionResult(dto, touchDesignerAdapter, {
      info: (o) => console.log(o),
      warn: (o) => console.warn(o),
      error: (o) => console.error(o),
    });
  });

  const app = Fastify({
    logger: true,
    /** Large JSON bodies when TouchDesigner sends `verificationPhotoBase64` with `/api/run-result`. */
    bodyLimit: 10 * 1024 * 1024,
  });

  const corsOrigin =
    process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
      : true;

  await app.register(cors, {
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Pin'],
  });

  await app.register(registerRoutes);
  await app.register(leaderboardRoutes);
  await app.register(participantRoutes);
  await app.register(runResultRoutes);
  await app.register(touchdesignerRoutes);
  await app.register(runRoutes);
  await app.register(eventsRoutes);
  await app.register(adminRoutes);
  await app.register(devQueueControlRoutes);

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/api/version', async () => ({
    name: 'treadmill-challenge',
    version: getAppVersion(),
  }));

  await app.listen({ port: PORT, host: HOST });

  const fePort = Number(process.env.VITE_DEV_PORT) || 5173;
  console.log('');
  console.log('Backend (API)');
  console.log(`  Local:   http://127.0.0.1:${PORT}`);
  for (const ip of listLanIPv4Addresses()) {
    console.log(`  Network: http://${ip}:${PORT}`);
  }
  console.log('');
  console.log('Frontend (Vite) — откройте в браузере телефона в той же Wi‑Fi сети:');
  console.log(`  Local:   http://127.0.0.1:${fePort}`);
  for (const ip of listLanIPv4Addresses()) {
    console.log(`  Network: http://${ip}:${fePort}`);
  }
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
