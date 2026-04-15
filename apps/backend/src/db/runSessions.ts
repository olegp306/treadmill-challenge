import type { Db } from './sqlite.js';
import type { Gender, RunSession, RunSessionStatus, RunTypeId, RunTypeKey } from '@treadmill-challenge/shared';
import {
  getRunTypeById,
  isRunTypeId,
  runTypeKeyStringToId,
} from '@treadmill-challenge/shared';

const STATUSES: RunSessionStatus[] = ['queued', 'running', 'finished', 'cancelled'];

function parseStatus(v: string): RunSessionStatus {
  if (STATUSES.includes(v as RunSessionStatus)) return v as RunSessionStatus;
  return 'queued';
}

function rowToSession(row: Record<string, unknown>): RunSession {
  let runTypeId = Number(row.runTypeId);
  const runTypeStr = String(row.runType ?? '');
  if (!isRunTypeId(runTypeId)) {
    const mapped = runTypeKeyStringToId(runTypeStr);
    runTypeId = mapped ?? 0;
  }
  const cfg = getRunTypeById(runTypeId);
  return {
    id: row.id as string,
    participantId: row.participantId as string,
    competitionId: String(row.competitionId ?? ''),
    runTypeId: runTypeId as RunTypeId,
    runType: (cfg?.key ?? 'max_5_min') as RunTypeKey,
    status: parseStatus(row.status as string),
    queueNumber: Number.isFinite(Number(row.queueNumber)) ? Number(row.queueNumber) : 0,
    resultTime: row.resultTime != null ? Number(row.resultTime) : null,
    resultDistance: row.resultDistance != null ? Number(row.resultDistance) : null,
    createdAt: row.createdAt as string,
    startedAt: (row.startedAt as string) || null,
    finishedAt: (row.finishedAt as string) || null,
  };
}

/** Counts sessions occupying the treadmill queue (queued + running) for capacity checks. */
export function countQueueOccupancyForCompetition(db: Db, competitionId: string): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) as c FROM run_sessions WHERE competitionId = ? AND status IN ('queued', 'running')`
    )
    .get(competitionId) as { c: number } | undefined;
  return row ? Number(row.c) : 0;
}

export function getMaxQueueNumberForCompetition(db: Db, competitionId: string): number {
  const row = db
    .prepare(`SELECT COALESCE(MAX(queueNumber), 0) as m FROM run_sessions WHERE competitionId = ?`)
    .get(competitionId) as { m: number } | undefined;
  return row ? Number(row.m) : 0;
}

export function countQueuedAhead(db: Db, competitionId: string, queueNumber: number): number {
  const row = db
    .prepare(
      `
    SELECT COUNT(*) as c FROM run_sessions
    WHERE competitionId = ? AND status = 'queued' AND queueNumber < ?
  `
    )
    .get(competitionId, queueNumber) as { c: number } | undefined;
  return row ? Number(row.c) : 0;
}

export function positionInQueue(db: Db, competitionId: string, queueNumber: number): number {
  return countQueuedAhead(db, competitionId, queueNumber) + 1;
}

export function createRunSession(
  db: Db,
  id: string,
  participantId: string,
  competitionId: string,
  runTypeId: RunTypeId,
  queueNumber: number
): RunSession {
  const cfg = getRunTypeById(runTypeId);
  if (!cfg) {
    throw new Error('Invalid runTypeId');
  }
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO run_sessions (id, participantId, competitionId, runTypeId, runType, status, queueNumber, resultTime, resultDistance, createdAt, startedAt, finishedAt)
    VALUES (?, ?, ?, ?, ?, 'queued', ?, NULL, NULL, ?, NULL, NULL)
  `).run(id, participantId, competitionId, runTypeId, cfg.key, queueNumber, createdAt);
  return {
    id,
    participantId,
    competitionId,
    runTypeId,
    runType: cfg.key,
    status: 'queued',
    queueNumber,
    resultTime: null,
    resultDistance: null,
    createdAt,
    startedAt: null,
    finishedAt: null,
  };
}

export function getRunSessionById(db: Db, id: string): RunSession | null {
  const row = db.prepare('SELECT * FROM run_sessions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToSession(row);
}

export interface QueuedRow {
  runSession: RunSession;
  participantName: string;
}

export function listQueuedByRunTypeId(db: Db, runTypeId: RunTypeId): QueuedRow[] {
  const rows = db
    .prepare(
      `
    SELECT s.id, s.participantId, s.competitionId, s.runTypeId, s.runType, s.status, s.queueNumber, s.resultTime, s.resultDistance,
           s.createdAt, s.startedAt, s.finishedAt, p.firstName as pf, p.lastName as pl
    FROM run_sessions s
    JOIN participants p ON p.id = s.participantId
    WHERE s.runTypeId = ? AND s.status = 'queued'
    ORDER BY s.queueNumber ASC, s.createdAt ASC
  `
    )
    .all(runTypeId) as Record<string, unknown>[];
  return rows.map((row) => {
    const pf = row.pf;
    const pl = row.pl;
    const sessionRow = { ...row };
    delete sessionRow.pf;
    delete sessionRow.pl;
    const participantName = `${String(pf ?? '')} ${String(pl ?? '')}`.trim().toUpperCase();
    return {
      runSession: rowToSession(sessionRow as Record<string, unknown>),
      participantName,
    };
  });
}

export interface ActiveQueueRow {
  runSession: RunSession;
  participantName: string;
  gender: Gender;
}

export function listActiveQueue(db: Db, runTypeId?: RunTypeId, gender?: Gender): ActiveQueueRow[] {
  const conditions = [`c.status = 'active'`, `s.status IN ('queued', 'running')`];
  const params: unknown[] = [];
  if (runTypeId !== undefined) {
    conditions.push(`s.runTypeId = ?`);
    params.push(runTypeId);
  }
  if (gender !== undefined) {
    conditions.push(`c.gender = ?`);
    params.push(gender);
  }
  const whereSql = conditions.join(' AND ');
  const orderSql =
    runTypeId !== undefined && gender !== undefined
      ? 'ORDER BY s.queueNumber ASC, s.createdAt ASC'
      : 'ORDER BY s.createdAt ASC';
  const rows = db
    .prepare(
      `
    SELECT s.id, s.participantId, s.competitionId, s.runTypeId, s.runType, s.status, s.queueNumber, s.resultTime, s.resultDistance,
           s.createdAt, s.startedAt, s.finishedAt, p.firstName as pf, p.lastName as pl, c.gender as cg
    FROM run_sessions s
    JOIN competitions c ON c.id = s.competitionId
    JOIN participants p ON p.id = s.participantId
    WHERE ${whereSql}
    ${orderSql}
  `
    )
    .all(...params) as Record<string, unknown>[];

  return rows.map((row) => {
    const pf = row.pf;
    const pl = row.pl;
    const cg = row.cg;
    const sessionRow = { ...row };
    delete sessionRow.pf;
    delete sessionRow.pl;
    delete sessionRow.cg;
    return {
      runSession: rowToSession(sessionRow),
      participantName: `${String(pf ?? '')} ${String(pl ?? '')}`.trim(),
      gender: String(cg ?? 'male') as Gender,
    };
  });
}

export interface CompetitionQueueAdminRow {
  runSession: RunSession;
  participantName: string;
  phone: string;
}

export function listSessionsForCompetition(db: Db, competitionId: string): CompetitionQueueAdminRow[] {
  const rows = db
    .prepare(
      `
    SELECT s.id, s.participantId, s.competitionId, s.runTypeId, s.runType, s.status, s.queueNumber, s.resultTime, s.resultDistance,
           s.createdAt, s.startedAt, s.finishedAt, p.firstName as pf, p.lastName as pl, p.phone as phone
    FROM run_sessions s
    JOIN participants p ON p.id = s.participantId
    WHERE s.competitionId = ?
    ORDER BY
      CASE s.status WHEN 'running' THEN 0 WHEN 'queued' THEN 1 WHEN 'finished' THEN 2 ELSE 3 END,
      s.queueNumber ASC,
      s.createdAt ASC
  `
    )
    .all(competitionId) as Record<string, unknown>[];

  return rows.map((row) => {
    const pf = row.pf;
    const pl = row.pl;
    const phone = String(row.phone ?? '');
    const sessionRow = { ...row };
    delete sessionRow.pf;
    delete sessionRow.pl;
    delete sessionRow.phone;
    return {
      runSession: rowToSession(sessionRow),
      participantName: `${String(pf ?? '')} ${String(pl ?? '')}`.trim(),
      phone,
    };
  });
}

export function listParticipantIdsForCompetition(db: Db, competitionId: string): string[] {
  const rows = db
    .prepare(`SELECT DISTINCT participantId FROM run_sessions WHERE competitionId = ?`)
    .all(competitionId) as { participantId: string }[];
  return rows.map((r) => r.participantId);
}

export function updateSessionResults(
  db: Db,
  sessionId: string,
  resultTime: number,
  resultDistance: number
): void {
  const finishedAt = new Date().toISOString();
  db.prepare(`
    UPDATE run_sessions
    SET status = 'finished', resultTime = ?, resultDistance = ?, finishedAt = ?
    WHERE id = ?
  `).run(resultTime, resultDistance, finishedAt, sessionId);
}

export function setSessionStatus(
  db: Db,
  sessionId: string,
  status: RunSessionStatus,
  opts?: { startedAt?: string | null; finishedAt?: string | null; clearResults?: boolean }
): void {
  const clear = opts?.clearResults ?? false;
  if (clear) {
    db.prepare(`
      UPDATE run_sessions SET status = ?, startedAt = NULL, finishedAt = NULL, resultTime = NULL, resultDistance = NULL
      WHERE id = ?
    `).run(status, sessionId);
  } else if (status === 'running') {
    const startedAt = opts?.startedAt ?? new Date().toISOString();
    db.prepare(`UPDATE run_sessions SET status = ?, startedAt = ? WHERE id = ?`).run(status, startedAt, sessionId);
  } else if (status === 'queued') {
    db.prepare(`UPDATE run_sessions SET status = ?, startedAt = NULL WHERE id = ?`).run(status, sessionId);
  } else if (status === 'cancelled') {
    db.prepare(`
      UPDATE run_sessions SET status = ?, startedAt = NULL, finishedAt = NULL, resultTime = NULL, resultDistance = NULL
      WHERE id = ?
    `).run(status, sessionId);
  } else {
    db.prepare(`UPDATE run_sessions SET status = ? WHERE id = ?`).run(status, sessionId);
  }
}

export function swapQueueNumbers(db: Db, sessionIdA: string, sessionIdB: string): void {
  const a = getRunSessionById(db, sessionIdA);
  const b = getRunSessionById(db, sessionIdB);
  if (!a || !b || a.competitionId !== b.competitionId) throw new Error('Invalid sessions for swap');
  if (a.status !== 'queued' || b.status !== 'queued') throw new Error('Can only reorder queued sessions');
  const ta = a.queueNumber;
  const tb = b.queueNumber;
  const upd = db.prepare(`UPDATE run_sessions SET queueNumber = ? WHERE id = ?`);
  upd.run(tb, sessionIdA);
  upd.run(ta, sessionIdB);
}

export function renumberQueuedSessions(db: Db, competitionId: string): void {
  const rows = db
    .prepare(
      `
    SELECT id FROM run_sessions
    WHERE competitionId = ? AND status IN ('queued', 'running')
    ORDER BY queueNumber ASC, createdAt ASC, id ASC
  `
    )
    .all(competitionId) as { id: string }[];
  const upd = db.prepare(`UPDATE run_sessions SET queueNumber = ? WHERE id = ?`);
  let n = 1;
  for (const r of rows) {
    upd.run(n++, r.id);
  }
}

export function getSessionForDevFinish(db: Db): RunSession | null {
  const running = db
    .prepare(
      `
    SELECT s.* FROM run_sessions s
    JOIN competitions c ON c.id = s.competitionId
    WHERE c.status = 'active' AND s.status = 'running'
    ORDER BY s.startedAt DESC
    LIMIT 1
  `
    )
    .get() as Record<string, unknown> | undefined;
  if (running) return rowToSession(running);
  const queued = db
    .prepare(
      `
    SELECT s.* FROM run_sessions s
    JOIN competitions c ON c.id = s.competitionId
    WHERE c.status = 'active' AND s.status = 'queued'
    ORDER BY s.queueNumber ASC, s.createdAt ASC
    LIMIT 1
  `
    )
    .get() as Record<string, unknown> | undefined;
  if (!queued) return null;
  return rowToSession(queued);
}

export function getCurrentRunningSessionForCompetition(db: Db, competitionId: string): RunSession | null {
  const row = db
    .prepare(
      `SELECT * FROM run_sessions WHERE competitionId = ? AND status = 'running' ORDER BY startedAt DESC LIMIT 1`
    )
    .get(competitionId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToSession(row);
}

export function cancelQueuedSessionsForCompetition(db: Db, competitionId: string): number {
  const row = db
    .prepare(`SELECT COUNT(*) as c FROM run_sessions WHERE competitionId = ? AND status = 'queued'`)
    .get(competitionId) as { c: number };
  const n = Number(row.c);
  db.prepare(`UPDATE run_sessions SET status = 'cancelled' WHERE competitionId = ? AND status = 'queued'`).run(
    competitionId
  );
  return n;
}
