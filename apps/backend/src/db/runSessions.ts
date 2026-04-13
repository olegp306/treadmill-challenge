import type { Db } from './sqlite.js';
import type { RunSession, RunSessionStatus, RunTypeId, RunTypeKey } from '@treadmill-challenge/shared';
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

export function getMaxQueueNumberForRunTypeId(db: Db, runTypeId: RunTypeId): number {
  const row = db
    .prepare(`SELECT COALESCE(MAX(queueNumber), 0) as m FROM run_sessions WHERE runTypeId = ?`)
    .get(runTypeId) as { m: number } | undefined;
  return row ? Number(row.m) : 0;
}

export function countQueuedAhead(db: Db, runTypeId: RunTypeId, queueNumber: number): number {
  const row = db
    .prepare(
      `
    SELECT COUNT(*) as c FROM run_sessions
    WHERE runTypeId = ? AND status = 'queued' AND queueNumber < ?
  `
    )
    .get(runTypeId, queueNumber) as { c: number } | undefined;
  return row ? Number(row.c) : 0;
}

export function positionInQueue(db: Db, runTypeId: RunTypeId, queueNumber: number): number {
  return countQueuedAhead(db, runTypeId, queueNumber) + 1;
}

export function createRunSession(
  db: Db,
  id: string,
  participantId: string,
  runTypeId: RunTypeId,
  queueNumber: number
): RunSession {
  const cfg = getRunTypeById(runTypeId);
  if (!cfg) {
    throw new Error('Invalid runTypeId');
  }
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO run_sessions (id, participantId, runTypeId, runType, status, queueNumber, resultTime, resultDistance, createdAt, startedAt, finishedAt)
    VALUES (?, ?, ?, ?, 'queued', ?, NULL, NULL, ?, NULL, NULL)
  `).run(id, participantId, runTypeId, cfg.key, queueNumber, createdAt);
  return {
    id,
    participantId,
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
    SELECT s.id, s.participantId, s.runTypeId, s.runType, s.status, s.queueNumber, s.resultTime, s.resultDistance,
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
}

export function listActiveQueue(db: Db, runTypeId?: RunTypeId): ActiveQueueRow[] {
  const whereByType = runTypeId !== undefined ? 'AND s.runTypeId = ?' : '';
  const rows = db
    .prepare(
      `
    SELECT s.id, s.participantId, s.runTypeId, s.runType, s.status, s.queueNumber, s.resultTime, s.resultDistance,
           s.createdAt, s.startedAt, s.finishedAt, p.firstName as pf, p.lastName as pl
    FROM run_sessions s
    JOIN participants p ON p.id = s.participantId
    WHERE s.status IN ('queued', 'running') ${whereByType}
    ORDER BY s.queueNumber ASC, s.createdAt ASC
  `
    )
    .all(...(runTypeId !== undefined ? [runTypeId] : [])) as Record<string, unknown>[];

  return rows.map((row) => {
    const pf = row.pf;
    const pl = row.pl;
    const sessionRow = { ...row };
    delete sessionRow.pf;
    delete sessionRow.pl;
    return {
      runSession: rowToSession(sessionRow),
      participantName: `${String(pf ?? '')} ${String(pl ?? '')}`.trim(),
    };
  });
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

export function getSessionForDevFinish(db: Db): RunSession | null {
  const running = db
    .prepare(`SELECT * FROM run_sessions WHERE status = 'running' ORDER BY createdAt DESC LIMIT 1`)
    .get() as Record<string, unknown> | undefined;
  if (running) return rowToSession(running);
  const queued = db
    .prepare(
      `SELECT * FROM run_sessions WHERE status = 'queued' ORDER BY queueNumber ASC, createdAt ASC LIMIT 1`
    )
    .get() as Record<string, unknown> | undefined;
  if (!queued) return null;
  return rowToSession(queued);
}
