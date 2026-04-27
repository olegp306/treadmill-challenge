import type { Db } from './sqlite.js';
import { unlinkRelative } from '../services/runPhotoStorage.js';
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

/** Single treadmill: count all sessions in the global active pool (queued + running). */
export function countGlobalQueueOccupancy(db: Db): number {
  const row = db
    .prepare(`SELECT COUNT(*) as c FROM run_sessions WHERE status IN ('queued', 'running')`)
    .get() as { c: number } | undefined;
  return row ? Number(row.c) : 0;
}

/** At most one row — single physical treadmill. */
export function getCurrentRunningSessionGlobal(db: Db): RunSession | null {
  const row = db
    .prepare(`SELECT * FROM run_sessions WHERE status = 'running' ORDER BY startedAt ASC, id ASC LIMIT 1`)
    .get() as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToSession(row);
}

/** Global FIFO: next person waiting for the treadmill. */
export function getFirstQueuedSessionGlobal(db: Db): RunSession | null {
  const row = db
    .prepare(
      `SELECT * FROM run_sessions WHERE status = 'queued' ORDER BY createdAt ASC, id ASC LIMIT 1`
    )
    .get() as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToSession(row);
}

/** 1-based position among all queued sessions (global FIFO). */
export function positionInGlobalQueue(db: Db, sessionId: string): number {
  const s = getRunSessionById(db, sessionId);
  if (!s || s.status !== 'queued') return 0;
  const row = db
    .prepare(
      `
    SELECT COUNT(*) as c FROM run_sessions
    WHERE status = 'queued' AND (
      createdAt < ? OR (createdAt = ? AND id < ?)
    )
  `
    )
    .get(s.createdAt, s.createdAt, sessionId) as { c: number } | undefined;
  return Number(row?.c ?? 0) + 1;
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
    ORDER BY s.createdAt ASC, s.id ASC
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
  participantFirstName: string;
  participantLastName: string;
  /** From `participants.phone` (same row as first/last name). */
  participantPhone: string;
  sex: Gender;
}

export interface ActiveQueueExportRow {
  runSession: RunSession;
  firstName: string;
  lastName: string;
  phone: string;
}

export function listActiveQueue(db: Db, runTypeId?: RunTypeId, sex?: Gender): ActiveQueueRow[] {
  const conditions = [`c.status = 'active'`, `s.status IN ('queued', 'running')`];
  const params: unknown[] = [];
  if (runTypeId !== undefined) {
    conditions.push(`s.runTypeId = ?`);
    params.push(runTypeId);
  }
  if (sex !== undefined) {
    conditions.push(`c.gender = ?`);
    params.push(sex);
  }
  const whereSql = conditions.join(' AND ');
  const orderSql = 'ORDER BY s.createdAt ASC, s.id ASC';
  const rows = db
    .prepare(
      `
    SELECT s.id, s.participantId, s.competitionId, s.runTypeId, s.runType, s.status, s.queueNumber, s.resultTime, s.resultDistance,
           s.createdAt, s.startedAt, s.finishedAt, p.firstName as pf, p.lastName as pl, p.phone as pphone, c.gender as cg
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
    delete sessionRow.pphone;
    delete sessionRow.cg;
    return {
      runSession: rowToSession(sessionRow),
      participantName: `${String(pf ?? '')} ${String(pl ?? '')}`.trim(),
      participantFirstName: String(pf ?? '').trim(),
      participantLastName: String(pl ?? '').trim(),
      participantPhone: String(row.pphone ?? ''),
      sex: String(cg ?? 'male') as Gender,
    };
  });
}

/** Менеджерская «история очереди»: активные (running, затем queued) и недавние finished, всего не более `maxTotal`. */
export type ManagerQueueHistoryRow = {
  runSessionId: string;
  queueNumber: number;
  participantId: string;
  participantName: string;
  participantFirstName: string;
  participantLastName: string;
  participantPhone: string;
  sex: Gender;
  runTypeId: RunTypeId;
  runType: string;
  status: 'queued' | 'running' | 'finished';
  competitionId: string;
  /** ISO: finished → finishedAt или createdAt; running → startedAt или createdAt; queued → createdAt. */
  displayTime: string;
};

function displayTimeForHistoryRow(status: 'queued' | 'running' | 'finished', s: RunSession): string {
  if (status === 'finished') {
    const f = s.finishedAt?.trim();
    return f && f.length > 0 ? f : s.createdAt;
  }
  if (status === 'running') {
    const st = s.startedAt?.trim();
    return st && st.length > 0 ? st : s.createdAt;
  }
  return s.createdAt;
}

export function listManagerQueueHistory(db: Db, maxTotal: number): ManagerQueueHistoryRow[] {
  const cap = Math.min(Math.max(1, maxTotal), 100);
  const activeRows = listActiveQueue(db);
  const running = activeRows
    .filter((r) => r.runSession.status === 'running')
    .sort((a, b) => {
      const ta = `${a.runSession.startedAt ?? a.runSession.createdAt}\t${a.runSession.id}`;
      const tb = `${b.runSession.startedAt ?? b.runSession.createdAt}\t${b.runSession.id}`;
      return ta.localeCompare(tb);
    });
  const queued = activeRows
    .filter((r) => r.runSession.status === 'queued')
    .sort((a, b) => {
      const ta = `${a.runSession.createdAt}\t${a.runSession.id}`;
      const tb = `${b.runSession.createdAt}\t${b.runSession.id}`;
      return ta.localeCompare(tb);
    });
  const activeOrdered = [...running, ...queued].slice(0, 4);

  const toRow = (r: ActiveQueueRow): ManagerQueueHistoryRow => {
    const st = r.runSession.status as 'queued' | 'running';
    return {
      runSessionId: r.runSession.id,
      queueNumber: r.runSession.queueNumber,
      participantId: r.runSession.participantId,
      participantName: r.participantName,
      participantFirstName: r.participantFirstName,
      participantLastName: r.participantLastName,
      participantPhone: r.participantPhone,
      sex: r.sex,
      runTypeId: r.runSession.runTypeId,
      runType: r.runSession.runType,
      status: st,
      competitionId: r.runSession.competitionId,
      displayTime: displayTimeForHistoryRow(st, r.runSession),
    };
  };

  const needFinished = Math.max(0, cap - activeOrdered.length);
  const finished: ManagerQueueHistoryRow[] = [];
  if (needFinished > 0) {
    const fRows = db
      .prepare(
        `
      SELECT s.id, s.participantId, s.competitionId, s.runTypeId, s.runType, s.status, s.queueNumber, s.resultTime, s.resultDistance,
             s.createdAt, s.startedAt, s.finishedAt, p.firstName as pf, p.lastName as pl, p.phone as pphone, c.gender as cg
      FROM run_sessions s
      JOIN participants p ON p.id = s.participantId
      JOIN competitions c ON c.id = s.competitionId
      WHERE s.status = 'finished' AND c.status = 'active'
      ORDER BY
        (CASE WHEN s.finishedAt IS NOT NULL AND TRIM(s.finishedAt) != '' THEN s.finishedAt ELSE s.createdAt END) DESC,
        s.id DESC
      LIMIT ?
    `
      )
      .all(needFinished) as Record<string, unknown>[];

    for (const row of fRows) {
      const pf = row.pf;
      const pl = row.pl;
      const cg = row.cg;
      const sessionRow = { ...row };
      delete sessionRow.pf;
      delete sessionRow.pl;
      delete sessionRow.pphone;
      delete sessionRow.cg;
      const s = rowToSession(sessionRow);
      finished.push({
        runSessionId: s.id,
        queueNumber: s.queueNumber,
        participantId: s.participantId,
        participantName: `${String(pf ?? '')} ${String(pl ?? '')}`.trim(),
        participantFirstName: String(pf ?? '').trim(),
        participantLastName: String(pl ?? '').trim(),
        participantPhone: String(row.pphone ?? ''),
        sex: String(cg ?? 'male') as Gender,
        runTypeId: s.runTypeId,
        runType: s.runType,
        status: 'finished',
        competitionId: s.competitionId,
        displayTime: displayTimeForHistoryRow('finished', s),
      });
    }
  }

  return [...activeOrdered.map(toRow), ...finished];
}

/** Active global queue rows for export (queued + running), ordered by queue FIFO. */
export function listActiveQueueForExport(db: Db): ActiveQueueExportRow[] {
  const rows = db
    .prepare(
      `
    SELECT s.id, s.participantId, s.competitionId, s.runTypeId, s.runType, s.status, s.queueNumber, s.resultTime, s.resultDistance,
           s.createdAt, s.startedAt, s.finishedAt, p.firstName as pf, p.lastName as pl, p.phone as pphone
    FROM run_sessions s
    JOIN participants p ON p.id = s.participantId
    WHERE s.status IN ('queued', 'running')
    ORDER BY s.createdAt ASC, s.id ASC
  `
    )
    .all() as Record<string, unknown>[];

  return rows.map((row) => {
    const pf = String(row.pf ?? '');
    const pl = String(row.pl ?? '');
    const phone = String(row.pphone ?? '');
    const sessionRow = { ...row };
    delete sessionRow.pf;
    delete sessionRow.pl;
    delete sessionRow.pphone;
    return {
      runSession: rowToSession(sessionRow),
      firstName: pf,
      lastName: pl,
      phone,
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

export function getPendingPhotoPath(db: Db, sessionId: string): string | null {
  const row = db
    .prepare(`SELECT pending_photo_path FROM run_sessions WHERE id = ?`)
    .get(sessionId) as { pending_photo_path?: string | null } | undefined;
  const v = row?.pending_photo_path;
  return v != null && String(v).trim() ? String(v).trim() : null;
}

export function setPendingPhotoPath(db: Db, sessionId: string, relativePath: string): void {
  db.prepare(`UPDATE run_sessions SET pending_photo_path = ? WHERE id = ?`).run(relativePath, sessionId);
}

export function clearPendingPhotoPath(db: Db, sessionId: string): void {
  db.prepare(`UPDATE run_sessions SET pending_photo_path = NULL WHERE id = ?`).run(sessionId);
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
    const pendingRow = db
      .prepare(`SELECT pending_photo_path FROM run_sessions WHERE id = ?`)
      .get(sessionId) as { pending_photo_path?: string | null } | undefined;
    unlinkRelative(pendingRow?.pending_photo_path ?? undefined);
    db.prepare(`
      UPDATE run_sessions SET status = ?, startedAt = NULL, finishedAt = NULL, resultTime = NULL, resultDistance = NULL, pending_photo_path = NULL
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
  renumberGlobalQueuedSessions(db);
}

/**
 * Put `sessionId` last in global FIFO among queued sessions (updates `createdAt`).
 * Caller must ensure the session is already `queued`.
 */
export function bumpRunSessionCreatedAtToGlobalQueueTail(db: Db, sessionId: string): void {
  const s = getRunSessionById(db, sessionId);
  if (!s || s.status !== 'queued') {
    throw new Error('Session must exist and be queued');
  }
  const row = db
    .prepare(`SELECT MAX(createdAt) as m FROM run_sessions WHERE status = 'queued'`)
    .get() as { m: string | null } | undefined;
  let nextMs = Date.now();
  if (row?.m != null && String(row.m).trim().length > 0) {
    const maxMs = new Date(String(row.m)).getTime();
    if (!Number.isNaN(maxMs)) nextMs = Math.max(nextMs, maxMs + 1);
  }
  db.prepare(`UPDATE run_sessions SET createdAt = ? WHERE id = ?`).run(new Date(nextMs).toISOString(), sessionId);
}

/** Cancel a globally queued session (not running); renumbers remaining queue. */
export function cancelGlobalQueuedSessionById(db: Db, sessionId: string): 'ok' | 'not_found' | 'not_queued' {
  const s = getRunSessionById(db, sessionId);
  if (!s) return 'not_found';
  if (s.status !== 'queued') return 'not_queued';
  setSessionStatus(db, sessionId, 'cancelled');
  renumberGlobalQueuedSessions(db);
  return 'ok';
}

/** Renumber queueNumber 1..n for all queued+running sessions (global FIFO order). */
export function renumberGlobalQueuedSessions(db: Db): void {
  const rows = db
    .prepare(
      `
    SELECT id FROM run_sessions
    WHERE status IN ('queued', 'running')
    ORDER BY createdAt ASC, id ASC
  `
    )
    .all() as { id: string }[];
  const upd = db.prepare(`UPDATE run_sessions SET queueNumber = ? WHERE id = ?`);
  let n = 1;
  for (const r of rows) {
    upd.run(n++, r.id);
  }
}

/** @deprecated Use renumberGlobalQueuedSessions — competition id is ignored. */
export function renumberQueuedSessions(db: Db, _competitionId: string): void {
  void _competitionId;
  renumberGlobalQueuedSessions(db);
}

export interface RunningSessionDetailGlobal {
  runSession: RunSession;
  firstName: string;
  lastName: string;
  phone: string;
  gender: Gender;
}

/** Current global running session with participant + competition gender (at most one). */
export function getRunningSessionDetailGlobal(db: Db): RunningSessionDetailGlobal | null {
  const row = db
    .prepare(
      `
    SELECT s.id, s.participantId, s.competitionId, s.runTypeId, s.runType, s.status, s.queueNumber, s.resultTime, s.resultDistance,
           s.createdAt, s.startedAt, s.finishedAt, p.firstName as pf, p.lastName as pl, p.phone as pphone, c.gender as cg
    FROM run_sessions s
    JOIN participants p ON p.id = s.participantId
    JOIN competitions c ON c.id = s.competitionId
    WHERE s.status = 'running'
    ORDER BY s.startedAt ASC, s.id ASC
    LIMIT 1
  `
    )
    .get() as Record<string, unknown> | undefined;
  if (!row) return null;
  const pf = row.pf;
  const pl = row.pl;
  const phone = String(row.pphone ?? '');
  const cg = row.cg;
  const sessionRow = { ...row };
  delete sessionRow.pf;
  delete sessionRow.pl;
  delete sessionRow.pphone;
  delete sessionRow.cg;
  return {
    runSession: rowToSession(sessionRow as Record<string, unknown>),
    firstName: String(pf ?? ''),
    lastName: String(pl ?? ''),
    phone,
    gender: String(cg ?? 'male') as Gender,
  };
}

export interface GlobalQueuedSessionRow {
  runSession: RunSession;
  participantName: string;
  phone: string;
  gender: Gender;
}

/** Global FIFO: all queued sessions with names (for dev queue control). */
export function listGlobalQueuedSessionsOrdered(db: Db): GlobalQueuedSessionRow[] {
  const rows = db
    .prepare(
      `
    SELECT s.id, s.participantId, s.competitionId, s.runTypeId, s.runType, s.status, s.queueNumber, s.resultTime, s.resultDistance,
           s.createdAt, s.startedAt, s.finishedAt, p.firstName as pf, p.lastName as pl, p.phone as pphone, c.gender as cg
    FROM run_sessions s
    JOIN participants p ON p.id = s.participantId
    JOIN competitions c ON c.id = s.competitionId
    WHERE s.status = 'queued'
    ORDER BY s.createdAt ASC, s.id ASC
  `
    )
    .all() as Record<string, unknown>[];

  return rows.map((row) => {
    const pf = row.pf;
    const pl = row.pl;
    const phone = String(row.pphone ?? '');
    const cg = row.cg;
    const sessionRow = { ...row };
    delete sessionRow.pf;
    delete sessionRow.pl;
    delete sessionRow.pphone;
    delete sessionRow.cg;
    return {
      runSession: rowToSession(sessionRow as Record<string, unknown>),
      participantName: `${String(pf ?? '')} ${String(pl ?? '')}`.trim(),
      phone,
      gender: String(cg ?? 'male') as Gender,
    };
  });
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
    ORDER BY s.createdAt ASC, s.id ASC
    LIMIT 1
  `
    )
    .get() as Record<string, unknown> | undefined;
  if (!queued) return null;
  return rowToSession(queued);
}

export function cancelQueuedSessionsForCompetition(db: Db, competitionId: string): number {
  const row = db
    .prepare(`SELECT COUNT(*) as c FROM run_sessions WHERE competitionId = ? AND status = 'queued'`)
    .get(competitionId) as { c: number };
  const n = Number(row.c);
  db.prepare(`UPDATE run_sessions SET status = 'cancelled' WHERE competitionId = ? AND status = 'queued'`).run(
    competitionId
  );
  if (n > 0) {
    renumberGlobalQueuedSessions(db);
  }
  return n;
}
