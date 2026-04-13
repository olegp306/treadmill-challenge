import type { Db } from './sqlite.js';
import type { RunSession, RunSessionStatus, RunType } from '@treadmill-challenge/shared';

const RUN_TYPES: RunType[] = ['max_5_min', 'golden_km', 'stayer_sprint_5km'];
const STATUSES: RunSessionStatus[] = ['queued', 'running', 'finished', 'cancelled'];

function parseRunType(v: string): RunType {
  if (RUN_TYPES.includes(v as RunType)) return v as RunType;
  if (v === '5min') return 'max_5_min';
  if (v === 'sprint_5km') return 'stayer_sprint_5km';
  return 'max_5_min';
}

function parseStatus(v: string): RunSessionStatus {
  if (STATUSES.includes(v as RunSessionStatus)) return v as RunSessionStatus;
  return 'queued';
}

function rowToSession(row: Record<string, unknown>): RunSession {
  return {
    id: row.id as string,
    participantId: row.participantId as string,
    runType: parseRunType(row.runType as string),
    status: parseStatus(row.status as string),
    queueNumber: Number.isFinite(Number(row.queueNumber)) ? Number(row.queueNumber) : 0,
    resultTime: row.resultTime != null ? Number(row.resultTime) : null,
    resultDistance: row.resultDistance != null ? Number(row.resultDistance) : null,
    createdAt: row.createdAt as string,
    startedAt: (row.startedAt as string) || null,
    finishedAt: (row.finishedAt as string) || null,
  };
}

export function getMaxQueueNumberForRunType(db: Db, runType: RunType): number {
  const row = db
    .prepare(`SELECT COALESCE(MAX(queueNumber), 0) as m FROM run_sessions WHERE runType = ?`)
    .get(runType) as { m: number } | undefined;
  return row ? Number(row.m) : 0;
}

/** Queued sessions ahead in line (strictly smaller queueNumber). */
export function countQueuedAhead(db: Db, runType: RunType, queueNumber: number): number {
  const row = db
    .prepare(
      `
    SELECT COUNT(*) as c FROM run_sessions
    WHERE runType = ? AND status = 'queued' AND queueNumber < ?
  `
    )
    .get(runType, queueNumber) as { c: number } | undefined;
  return row ? Number(row.c) : 0;
}

/** 1-based position among queued with same runType. */
export function positionInQueue(db: Db, runType: RunType, queueNumber: number): number {
  return countQueuedAhead(db, runType, queueNumber) + 1;
}

export function createRunSession(
  db: Db,
  id: string,
  participantId: string,
  runType: RunType,
  queueNumber: number
): RunSession {
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO run_sessions (id, participantId, runType, status, queueNumber, resultTime, resultDistance, createdAt, startedAt, finishedAt)
    VALUES (?, ?, ?, 'queued', ?, NULL, NULL, ?, NULL, NULL)
  `).run(id, participantId, runType, queueNumber, createdAt);
  return {
    id,
    participantId,
    runType,
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

export function listQueuedByRunType(db: Db, runType: RunType): QueuedRow[] {
  const rows = db
    .prepare(
      `
    SELECT s.id, s.participantId, s.runType, s.status, s.queueNumber, s.resultTime, s.resultDistance,
           s.createdAt, s.startedAt, s.finishedAt, p.firstName as pf, p.lastName as pl
    FROM run_sessions s
    JOIN participants p ON p.id = s.participantId
    WHERE s.runType = ? AND s.status = 'queued'
    ORDER BY s.queueNumber ASC, s.createdAt ASC
  `
    )
    .all(runType) as Record<string, unknown>[];
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

export function listActiveQueue(db: Db, runType?: RunType): ActiveQueueRow[] {
  const whereByType = runType ? 'AND s.runType = ?' : '';
  const rows = db
    .prepare(
      `
    SELECT s.id, s.participantId, s.runType, s.status, s.queueNumber, s.resultTime, s.resultDistance,
           s.createdAt, s.startedAt, s.finishedAt, p.firstName as pf, p.lastName as pl
    FROM run_sessions s
    JOIN participants p ON p.id = s.participantId
    WHERE s.status IN ('queued', 'running') ${whereByType}
    ORDER BY s.queueNumber ASC, s.createdAt ASC
  `
    )
    .all(...(runType ? [runType] : [])) as Record<string, unknown>[];

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

/** Find running session first, else oldest queued by queue number. */
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
