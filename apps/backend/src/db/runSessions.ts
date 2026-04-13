import type { Db } from './sqlite.js';
import type { RunSession, RunSessionStatus, RunType } from '@treadmill-challenge/shared';

const RUN_TYPES: RunType[] = ['5min', 'golden_km', 'sprint_5km'];
const STATUSES: RunSessionStatus[] = ['queued', 'running', 'finished'];

function parseRunType(v: string): RunType {
  if (RUN_TYPES.includes(v as RunType)) return v as RunType;
  return '5min';
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
    createdAt: row.createdAt as string,
    finishedAt: (row.finishedAt as string) || null,
    resultRunId: (row.resultRunId as string) || null,
  };
}

export function createRunSession(
  db: Db,
  id: string,
  participantId: string,
  runType: RunType
): RunSession {
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO run_sessions (id, participantId, runType, status, createdAt, finishedAt, resultRunId)
    VALUES (?, ?, ?, 'queued', ?, NULL, NULL)
  `).run(id, participantId, runType, createdAt);
  return {
    id,
    participantId,
    runType,
    status: 'queued',
    createdAt,
    finishedAt: null,
    resultRunId: null,
  };
}

export function getRunSessionById(db: Db, id: string): RunSession | null {
  const row = db.prepare('SELECT * FROM run_sessions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToSession(row);
}

/** Latest queued session (any runType), for dev finish. */
export function getLatestQueuedSession(db: Db): RunSession | null {
  const row = db.prepare(`
    SELECT * FROM run_sessions WHERE status = 'queued' ORDER BY createdAt DESC LIMIT 1
  `).get() as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToSession(row);
}

export function markSessionFinished(
  db: Db,
  sessionId: string,
  resultRunId: string
): void {
  const finishedAt = new Date().toISOString();
  db.prepare(`
    UPDATE run_sessions SET status = 'finished', finishedAt = ?, resultRunId = ? WHERE id = ?
  `).run(finishedAt, resultRunId, sessionId);
}
