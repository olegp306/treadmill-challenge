import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import {
  getRunTypeById,
  getRunTypeName,
  isRunTypeId,
  normalizeGender,
} from '@treadmill-challenge/shared';
import { touchDesignerAdapter } from '../integrations/touchdesigner/index.js';
import { adminSettings, competitions, getDb, participants, runs, runSessions } from '../db/index.js';
import { resetTestData } from '../services/adminService.js';
import {
  assignWinnerManually,
  restartCompetitionSlot,
  startCompetition,
  stopCompetition,
} from '../services/competitionService.js';
function getAdminPinFromRequest(request: FastifyRequest): string | null {
  const x = request.headers['x-admin-pin'];
  if (typeof x === 'string' && x.length > 0) return x.trim();
  const a = request.headers.authorization;
  if (typeof a === 'string' && a.startsWith('Bearer ')) return a.slice(7).trim();
  return null;
}

async function assertAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const db = getDb();
  const expected = adminSettings.getAdminPin(db);
  const pin = getAdminPinFromRequest(request);
  if (pin !== expected) {
    await reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
}

function parseRunTypeId(v: unknown): RunTypeId | null {
  const n = typeof v === 'number' ? v : Number(v);
  return isRunTypeId(n) ? n : null;
}

export default async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/admin/login', async (request, reply) => {
    const pin = (request.body as { pin?: string } | undefined)?.pin;
    const db = getDb();
    if (typeof pin !== 'string' || pin !== adminSettings.getAdminPin(db)) {
      return reply.status(401).send({ error: 'Неверный PIN' });
    }
    return reply.send({ ok: true });
  });

  await app.register(async (scoped) => {
    scoped.addHook('preHandler', assertAdmin);

    scoped.get('/api/admin/dashboard', async () => {
      const db = getDb();
      const slots: Array<{
        runTypeId: RunTypeId;
        gender: Gender;
        competition: ReturnType<typeof competitions.getCompetitionById>;
        queuedCount: number;
        leader: {
          participantName: string;
          resultTime: number;
          distance: number;
          runId: string;
        } | null;
      }> = [];
      for (let rt = 0; rt <= 2; rt++) {
        const runTypeId = rt as RunTypeId;
        for (const gender of ['male', 'female'] as const) {
          const active = competitions.getActiveCompetition(db, runTypeId, gender);
          const stopped = active ? null : competitions.getLatestStoppedCompetition(db, runTypeId, gender);
          const comp = active ?? stopped ?? null;
          const queueSource = active ?? null;
          const counts = queueSource
            ? competitions.competitionRowCount(db, queueSource.id)
            : { queued: 0, running: 0, finished: 0 };
          const lb = queueSource
            ? runs.getTopLeaderboardEntryForCompetition(db, queueSource.id, runTypeId)
            : null;
          slots.push({
            runTypeId,
            gender,
            competition: comp,
            queuedCount: counts.queued + counts.running,
            leader: lb
              ? {
                  participantName: lb.participantName,
                  resultTime: lb.run.resultTime,
                  distance: lb.run.distance,
                  runId: lb.run.id,
                }
              : null,
          });
        }
      }
      return { slots };
    });

    scoped.post('/api/admin/competitions/start', async (request, reply) => {
      const body = request.body as { runTypeId?: unknown; gender?: unknown };
      const runTypeId = parseRunTypeId(body.runTypeId);
      const gender = typeof body.gender === 'string' ? normalizeGender(body.gender) : null;
      if (runTypeId === null || gender === null) {
        return reply.status(400).send({ error: 'runTypeId and gender required' });
      }
      try {
        const c = startCompetition(runTypeId, gender);
        return reply.send({ competition: c });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed';
        return reply.status(400).send({ error: msg });
      }
    });

    scoped.post('/api/admin/competitions/stop', async (request, reply) => {
      const body = request.body as { competitionId?: string };
      const id = body.competitionId?.trim();
      if (!id) return reply.status(400).send({ error: 'competitionId required' });
      try {
        const c = stopCompetition(id);
        return reply.send({ competition: c });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed';
        return reply.status(400).send({ error: msg });
      }
    });

    scoped.post('/api/admin/competitions/restart', async (request, reply) => {
      const body = request.body as { runTypeId?: unknown; gender?: unknown };
      const runTypeId = parseRunTypeId(body.runTypeId);
      const gender = typeof body.gender === 'string' ? normalizeGender(body.gender) : null;
      if (runTypeId === null || gender === null) {
        return reply.status(400).send({ error: 'runTypeId and gender required' });
      }
      try {
        const c = restartCompetitionSlot(runTypeId, gender);
        return reply.send({ competition: c });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed';
        return reply.status(400).send({ error: msg });
      }
    });

    scoped.get('/api/admin/competitions/:id', async (request, reply) => {
      const db = getDb();
      const { id } = request.params as { id: string };
      const comp = competitions.getCompetitionById(db, id);
      if (!comp) return reply.status(404).send({ error: 'Not found' });
      const counts = competitions.competitionRowCount(db, id);
      return reply.send({ competition: comp, counts });
    });

    scoped.get('/api/admin/competitions/:id/queue', async (request, reply) => {
      const db = getDb();
      const { id } = request.params as { id: string };
      const comp = competitions.getCompetitionById(db, id);
      if (!comp) return reply.status(404).send({ error: 'Not found' });
      const rows = runSessions.listSessionsForCompetition(db, id);
      return reply.send({
        entries: rows.map((r) => ({
          runSessionId: r.runSession.id,
          queueNumber: r.runSession.queueNumber,
          status: r.runSession.status,
          participantId: r.runSession.participantId,
          participantName: r.participantName,
          phone: r.phone,
        })),
      });
    });

    scoped.get('/api/admin/competitions/:id/leaderboard', async (request, reply) => {
      const db = getDb();
      const { id } = request.params as { id: string };
      const comp = competitions.getCompetitionById(db, id);
      if (!comp) return reply.status(404).send({ error: 'Not found' });
      const entries = runs.getLeaderboardForCompetition(db, id, comp.runTypeId, 200);
      return reply.send({
        entries: entries.map((e, index) => ({
          rank: index + 1,
          participantId: e.run.participantId,
          participantName: e.participantName,
          resultTime: e.run.resultTime,
          distance: e.run.distance,
          speed: e.run.speed,
          runId: e.run.id,
          runSessionId: e.run.runSessionId,
          createdAt: e.run.createdAt,
        })),
      });
    });

    scoped.get('/api/admin/competitions/:id/participants', async (request, reply) => {
      const db = getDb();
      const { id } = request.params as { id: string };
      const comp = competitions.getCompetitionById(db, id);
      if (!comp) return reply.status(404).send({ error: 'Not found' });
      const ids = runSessions.listParticipantIdsForCompetition(db, id);
      const out = [];
      for (const pid of ids) {
        const p = participants.getParticipantById(db, pid);
        if (p) out.push(p);
      }
      return reply.send({ participants: out });
    });

    scoped.post('/api/admin/competitions/:cid/queue/:sid/remove', async (request, reply) => {
      const db = getDb();
      const { cid, sid } = request.params as { cid: string; sid: string };
      const s = runSessions.getRunSessionById(db, sid);
      if (!s || s.competitionId !== cid) return reply.status(404).send({ error: 'Not found' });
      runSessions.setSessionStatus(db, sid, 'cancelled');
      runSessions.renumberQueuedSessions(db, cid);
      return reply.send({ ok: true });
    });

    scoped.post('/api/admin/competitions/:cid/queue/:sid/move-up', async (request, reply) => {
      const db = getDb();
      const { cid, sid } = request.params as { cid: string; sid: string };
      const s = runSessions.getRunSessionById(db, sid);
      if (!s || s.competitionId !== cid || s.status !== 'queued') {
        return reply.status(400).send({ error: 'Invalid session' });
      }
      const queued = db
        .prepare(
          `SELECT id FROM run_sessions WHERE competitionId = ? AND status = 'queued' ORDER BY queueNumber ASC, createdAt ASC`
        )
        .all(cid) as { id: string }[];
      const idx = queued.findIndex((q) => q.id === sid);
      if (idx <= 0) return reply.send({ ok: true });
      runSessions.swapQueueNumbers(db, sid, queued[idx - 1].id);
      return reply.send({ ok: true });
    });

    scoped.post('/api/admin/competitions/:cid/queue/:sid/move-down', async (request, reply) => {
      const db = getDb();
      const { cid, sid } = request.params as { cid: string; sid: string };
      const s = runSessions.getRunSessionById(db, sid);
      if (!s || s.competitionId !== cid || s.status !== 'queued') {
        return reply.status(400).send({ error: 'Invalid session' });
      }
      const queued = db
        .prepare(
          `SELECT id FROM run_sessions WHERE competitionId = ? AND status = 'queued' ORDER BY queueNumber ASC, createdAt ASC`
        )
        .all(cid) as { id: string }[];
      const idx = queued.findIndex((q) => q.id === sid);
      if (idx < 0 || idx >= queued.length - 1) return reply.send({ ok: true });
      runSessions.swapQueueNumbers(db, sid, queued[idx + 1].id);
      return reply.send({ ok: true });
    });

    scoped.post('/api/admin/competitions/:cid/queue/:sid/mark-running', async (request, reply) => {
      const db = getDb();
      const { cid, sid } = request.params as { cid: string; sid: string };
      const s = runSessions.getRunSessionById(db, sid);
      if (!s || s.competitionId !== cid) return reply.status(404).send({ error: 'Not found' });
      const running = db
        .prepare(`SELECT id FROM run_sessions WHERE competitionId = ? AND status = 'running'`)
        .all(cid) as { id: string }[];
      for (const r of running) {
        if (r.id !== sid) {
          runSessions.setSessionStatus(db, r.id, 'queued');
        }
      }
      runSessions.setSessionStatus(db, sid, 'running', { startedAt: new Date().toISOString() });
      runSessions.renumberQueuedSessions(db, cid);
      return reply.send({ ok: true });
    });

    scoped.post('/api/admin/competitions/:cid/queue/:sid/mark-finished', async (request, reply) => {
      const db = getDb();
      const { cid, sid } = request.params as { cid: string; sid: string };
      const body = (request.body as { resultTime?: number; distance?: number }) ?? {};
      const s = runSessions.getRunSessionById(db, sid);
      if (!s || s.competitionId !== cid) return reply.status(404).send({ error: 'Not found' });
      const resultTime = typeof body.resultTime === 'number' ? body.resultTime : 0;
      const distance = typeof body.distance === 'number' ? body.distance : 0;
      const speed = runs.speedFromTimeDistance(resultTime, distance);
      const runId = randomUUID();
      runs.createRun(db, runId, s.participantId, cid, sid, resultTime, distance, speed);
      runSessions.updateSessionResults(db, sid, resultTime, distance);
      runSessions.renumberQueuedSessions(db, cid);
      return reply.send({ ok: true, runId });
    });

    scoped.post('/api/admin/competitions/:cid/queue/:sid/mark-cancelled', async (request, reply) => {
      const db = getDb();
      const { cid, sid } = request.params as { cid: string; sid: string };
      const s = runSessions.getRunSessionById(db, sid);
      if (!s || s.competitionId !== cid) return reply.status(404).send({ error: 'Not found' });
      runSessions.setSessionStatus(db, sid, 'cancelled');
      runSessions.renumberQueuedSessions(db, cid);
      return reply.send({ ok: true });
    });

    scoped.put('/api/admin/competitions/:cid/leaderboard/:runId', async (request, reply) => {
      const db = getDb();
      const { cid, runId } = request.params as { cid: string; runId: string };
      const body = request.body as { resultTime?: number; distance?: number };
      const run = runs.getRunById(db, runId);
      if (!run || run.competitionId !== cid) return reply.status(404).send({ error: 'Not found' });
      const resultTime = typeof body.resultTime === 'number' ? body.resultTime : run.resultTime;
      const distance = typeof body.distance === 'number' ? body.distance : run.distance;
      runs.updateRunMetrics(db, runId, resultTime, distance);
      if (run.runSessionId) {
        runSessions.updateSessionResults(db, run.runSessionId, resultTime, distance);
      }
      return reply.send({ ok: true });
    });

    scoped.delete('/api/admin/competitions/:cid/leaderboard/:runId', async (request, reply) => {
      const db = getDb();
      const { cid, runId } = request.params as { cid: string; runId: string };
      const run = runs.getRunById(db, runId);
      if (!run || run.competitionId !== cid) return reply.status(404).send({ error: 'Not found' });
      runs.deleteRunById(db, runId);
      return reply.send({ ok: true });
    });

    scoped.post('/api/admin/competitions/:id/leaderboard/recalculate', async (request, reply) => {
      const db = getDb();
      const { id } = request.params as { id: string };
      const comp = competitions.getCompetitionById(db, id);
      if (!comp) return reply.status(404).send({ error: 'Not found' });
      const rows = db
        .prepare(`SELECT id, resultTime, distance FROM runs WHERE competitionId = ?`)
        .all(id) as { id: string; resultTime: number; distance: number }[];
      for (const r of rows) {
        runs.updateRunMetrics(db, r.id, r.resultTime, r.distance);
      }
      return reply.send({ ok: true, updated: rows.length });
    });

    scoped.post('/api/admin/competitions/:cid/winner', async (request, reply) => {
      const body = request.body as { participantId?: string; runSessionId?: string | null };
      const pid = body.participantId?.trim();
      if (!pid) return reply.status(400).send({ error: 'participantId required' });
      const { cid } = request.params as { cid: string };
      try {
        assignWinnerManually(cid, pid, body.runSessionId ?? null);
        return reply.send({ ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed';
        return reply.status(400).send({ error: msg });
      }
    });

    scoped.put('/api/admin/participants/:id', async (request, reply) => {
      const db = getDb();
      const { id } = request.params as { id: string };
      const body = request.body as {
        firstName?: string;
        lastName?: string;
        phone?: string;
        sex?: string;
      };
      try {
        participants.updateParticipantFields(db, id, {
          ...(body.firstName !== undefined && { firstName: body.firstName }),
          ...(body.lastName !== undefined && { lastName: body.lastName }),
          ...(body.phone !== undefined && { phone: body.phone }),
          ...(body.sex !== undefined && { sex: normalizeGender(body.sex) }),
        });
        return reply.send({ participant: participants.getParticipantById(db, id) });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed';
        return reply.status(400).send({ error: msg });
      }
    });

    scoped.delete('/api/admin/competitions/:cid/participants/:pid', async (request, reply) => {
      const db = getDb();
      const { cid, pid } = request.params as { cid: string; pid: string };
      const sessions = db
        .prepare(
          `SELECT id FROM run_sessions WHERE competitionId = ? AND participantId = ?`
        )
        .all(cid, pid) as { id: string }[];
      for (const s of sessions) {
        runSessions.setSessionStatus(db, s.id, 'cancelled');
      }
      db.prepare(`DELETE FROM runs WHERE competitionId = ? AND participantId = ?`).run(cid, pid);
      runSessions.renumberQueuedSessions(db, cid);
      return reply.send({ ok: true, cancelledSessions: sessions.length });
    });

    scoped.post('/api/admin/competitions/:id/actions/resend-td', async (request, reply) => {
      const db = getDb();
      const { id } = request.params as { id: string };
      const comp = competitions.getCompetitionById(db, id);
      if (!comp) return reply.status(404).send({ error: 'Not found' });
      let sess = runSessions.getCurrentRunningSessionForCompetition(db, id);
      if (!sess) {
        const row = db
          .prepare(
            `SELECT id FROM run_sessions WHERE competitionId = ? AND status = 'queued' ORDER BY queueNumber ASC LIMIT 1`
          )
          .get(id) as { id: string } | undefined;
        sess = row ? runSessions.getRunSessionById(db, row.id) : null;
      }
      if (!sess) {
        return reply.status(400).send({ error: 'Нет текущего участника в очереди' });
      }
      const p = participants.getParticipantById(db, sess.participantId);
      if (!p) return reply.status(500).send({ error: 'Participant' });
      const cfg = getRunTypeById(sess.runTypeId);
      try {
        await Promise.resolve(
          touchDesignerAdapter.sendRunSessionStarted({
            runSessionId: sess.id,
            participantId: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            phone: p.phone,
            runTypeId: sess.runTypeId,
            runTypeName: getRunTypeName(sess.runTypeId),
            runTypeKey: cfg?.key ?? 'max_5_min',
          })
        );
        adminSettings.setSetting(db, 'lastTdSyncOk', new Date().toISOString());
        adminSettings.setSetting(db, 'lastTdSyncError', '');
        return reply.send({ ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        adminSettings.setSetting(db, 'lastTdSyncError', msg);
        return reply.status(500).send({ error: msg });
      }
    });

    scoped.post('/api/admin/competitions/:id/actions/clear-queue', async (request, reply) => {
      const db = getDb();
      const { id } = request.params as { id: string };
      const n = runSessions.cancelQueuedSessionsForCompetition(db, id);
      return reply.send({ ok: true, cancelled: n });
    });

    scoped.post('/api/admin/competitions/:id/actions/reset-runner', async (request, reply) => {
      const db = getDb();
      const { id } = request.params as { id: string };
      const running = db
        .prepare(`SELECT id FROM run_sessions WHERE competitionId = ? AND status = 'running'`)
        .all(id) as { id: string }[];
      for (const r of running) {
        runSessions.setSessionStatus(db, r.id, 'queued', { clearResults: true });
      }
      runSessions.renumberQueuedSessions(db, id);
      return reply.send({ ok: true, reset: running.length });
    });

    scoped.get('/api/admin/td/status', async () => {
      const db = getDb();
      return {
        adapter: adminSettings.getSetting(db, 'tdAdapter') ?? 'mock',
        host: adminSettings.getSetting(db, 'tdHost') ?? '127.0.0.1',
        port: adminSettings.getSetting(db, 'tdPort') ?? '7000',
        lastSyncOk: adminSettings.getSetting(db, 'lastTdSyncOk') ?? '',
        lastSyncError: adminSettings.getSetting(db, 'lastTdSyncError') ?? '',
      };
    });

    scoped.get('/api/admin/settings', async () => {
      const db = getDb();
      return {
        adminPin: adminSettings.getAdminPin(db),
        tdHost: adminSettings.getSetting(db, 'tdHost') ?? '127.0.0.1',
        tdPort: adminSettings.getSetting(db, 'tdPort') ?? '7000',
        tdAdapter: adminSettings.getSetting(db, 'tdAdapter') ?? 'mock',
        testMode: adminSettings.getSetting(db, 'testMode') === 'true',
        tdDemoMode: adminSettings.getTdDemoMode(db),
        maxQueueSizePerRun: adminSettings.getMaxQueueSizePerRun(db),
        eventTitle: adminSettings.getSetting(db, 'eventTitle') ?? 'Amazing Red',
      };
    });

    scoped.put('/api/admin/settings', async (request, reply) => {
      const db = getDb();
      const body = request.body as {
        adminPin?: string;
        tdHost?: string;
        tdPort?: string;
        tdAdapter?: string;
        testMode?: boolean;
        tdDemoMode?: boolean;
        maxQueueSizePerRun?: number;
        eventTitle?: string;
      };
      if (body.adminPin !== undefined) adminSettings.setSetting(db, 'adminPin', body.adminPin.trim());
      if (body.tdHost !== undefined) adminSettings.setSetting(db, 'tdHost', body.tdHost.trim());
      if (body.tdPort !== undefined) adminSettings.setSetting(db, 'tdPort', String(body.tdPort).trim());
      if (body.tdAdapter !== undefined) adminSettings.setSetting(db, 'tdAdapter', body.tdAdapter.trim());
      if (body.testMode !== undefined) adminSettings.setSetting(db, 'testMode', body.testMode ? 'true' : 'false');
      if (body.tdDemoMode !== undefined) adminSettings.setSetting(db, 'tdDemoMode', body.tdDemoMode ? 'true' : 'false');
      if (body.maxQueueSizePerRun !== undefined) {
        const n = Math.min(500, Math.max(1, Math.floor(Number(body.maxQueueSizePerRun))));
        adminSettings.setSetting(db, 'maxQueueSizePerRun', String(n));
      }
      if (body.eventTitle !== undefined) adminSettings.setSetting(db, 'eventTitle', body.eventTitle.trim());
      return reply.send({ ok: true });
    });

    scoped.post('/api/admin/test-mode/toggle', async (request, reply) => {
      const db = getDb();
      const cur = adminSettings.getSetting(db, 'testMode') === 'true';
      adminSettings.setSetting(db, 'testMode', cur ? 'false' : 'true');
      return reply.send({ testMode: !cur });
    });

    scoped.post('/api/admin/test-data/reset', async (_request, reply) => {
      try {
        resetTestData();
        return reply.send({ ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed';
        return reply.status(500).send({ error: msg });
      }
    });

    scoped.get('/api/admin/archive', async (request) => {
      const db = getDb();
      const q = (request.query ?? {}) as Record<string, unknown>;
      const gender = q.gender ? normalizeGender(String(q.gender)) : undefined;
      const runTypeRaw = q.runTypeId;
      const runTypeId = runTypeRaw !== undefined && runTypeRaw !== '' ? parseRunTypeId(runTypeRaw) : null;
      const from = q.from ? String(q.from) : null;
      const to = q.to ? String(q.to) : null;

      let sql = `SELECT * FROM competitions WHERE status IN ('stopped','archived')`;
      const params: unknown[] = [];
      if (gender) {
        sql += ` AND gender = ?`;
        params.push(gender);
      }
      if (runTypeId !== null) {
        sql += ` AND runTypeId = ?`;
        params.push(runTypeId);
      }
      if (from) {
        sql += ` AND startedAt >= ?`;
        params.push(from);
      }
      if (to) {
        sql += ` AND startedAt <= ?`;
        params.push(to);
      }
      sql += ` ORDER BY startedAt DESC LIMIT 200`;
      const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
      return {
        competitions: rows.map((row) => ({
          id: row.id,
          runTypeId: row.runTypeId,
          runTypeKey: row.runTypeKey,
          gender: row.gender,
          title: row.title,
          status: row.status,
          startedAt: row.startedAt,
          stoppedAt: row.stoppedAt,
          winnerParticipantId: row.winnerParticipantId,
          winnerRunSessionId: row.winnerRunSessionId,
        })),
      };
    });
  });
}
