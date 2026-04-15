import type { Db } from './sqlite.js';
import type { Competition, CompetitionStatus, Gender, RunTypeId, RunTypeKey } from '@treadmill-challenge/shared';
import { getRunTypeById } from '@treadmill-challenge/shared';

function rowToCompetition(row: Record<string, unknown>): Competition {
  return {
    id: row.id as string,
    runTypeId: Number(row.runTypeId) as RunTypeId,
    runTypeKey: row.runTypeKey as RunTypeKey,
    gender: row.gender as Gender,
    title: String(row.title ?? ''),
    status: row.status as CompetitionStatus,
    startedAt: String(row.startedAt ?? ''),
    stoppedAt: row.stoppedAt != null ? String(row.stoppedAt) : null,
    winnerParticipantId: row.winnerParticipantId != null ? String(row.winnerParticipantId) : null,
    winnerRunSessionId: row.winnerRunSessionId != null ? String(row.winnerRunSessionId) : null,
    queuePaused: row.queuePaused != null ? Number(row.queuePaused) === 1 : false,
  };
}

export function getCompetitionById(db: Db, id: string): Competition | null {
  const row = db.prepare(`SELECT * FROM competitions WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToCompetition(row);
}

export function getActiveCompetition(
  db: Db,
  runTypeId: RunTypeId,
  gender: Gender
): Competition | null {
  const row = db
    .prepare(`SELECT * FROM competitions WHERE runTypeId = ? AND gender = ? AND status = 'active'`)
    .get(runTypeId, gender) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToCompetition(row);
}

/** Latest stopped competition for a slot (when there is no active). */
export function getLatestStoppedCompetition(
  db: Db,
  runTypeId: RunTypeId,
  gender: Gender
): Competition | null {
  const row = db
    .prepare(
      `SELECT * FROM competitions WHERE runTypeId = ? AND gender = ? AND status = 'stopped' ORDER BY startedAt DESC LIMIT 1`
    )
    .get(runTypeId, gender) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToCompetition(row);
}

export function getCompetitionForRestart(
  db: Db,
  runTypeId: RunTypeId,
  gender: Gender
): Competition | null {
  const active = getActiveCompetition(db, runTypeId, gender);
  if (active) return active;
  return getLatestStoppedCompetition(db, runTypeId, gender);
}

export function listCompetitions(db: Db, opts?: { status?: CompetitionStatus }): Competition[] {
  const rows = opts?.status
    ? (db.prepare(`SELECT * FROM competitions WHERE status = ? ORDER BY startedAt DESC`).all(opts.status) as Record<
        string,
        unknown
      >[])
    : (db.prepare(`SELECT * FROM competitions ORDER BY startedAt DESC`).all() as Record<string, unknown>[]);
  return rows.map(rowToCompetition);
}

export function insertCompetition(db: Db, c: Competition): void {
  db.prepare(
    `
    INSERT INTO competitions (
      id, runTypeId, runTypeKey, gender, title, status, startedAt, stoppedAt,
      winnerParticipantId, winnerRunSessionId, queuePaused
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    c.id,
    c.runTypeId,
    c.runTypeKey,
    c.gender,
    c.title,
    c.status,
    c.startedAt,
    c.stoppedAt ?? null,
    c.winnerParticipantId ?? null,
    c.winnerRunSessionId ?? null,
    c.queuePaused ? 1 : 0
  );
}

export function setQueuePaused(db: Db, id: string, paused: boolean): void {
  db.prepare(`UPDATE competitions SET queuePaused = ? WHERE id = ?`).run(paused ? 1 : 0, id);
}

export function updateCompetitionStatus(
  db: Db,
  id: string,
  status: CompetitionStatus,
  stoppedAt: string | null,
  winnerParticipantId: string | null,
  winnerRunSessionId: string | null
): void {
  db.prepare(
    `
    UPDATE competitions
    SET status = ?, stoppedAt = ?, winnerParticipantId = ?, winnerRunSessionId = ?
    WHERE id = ?
  `
  ).run(status, stoppedAt, winnerParticipantId, winnerRunSessionId, id);
}

export function updateCompetitionTitle(db: Db, id: string, title: string): void {
  db.prepare(`UPDATE competitions SET title = ? WHERE id = ?`).run(title, id);
}

export function updateCompetitionWinners(
  db: Db,
  id: string,
  winnerParticipantId: string | null,
  winnerRunSessionId: string | null
): void {
  db.prepare(`UPDATE competitions SET winnerParticipantId = ?, winnerRunSessionId = ? WHERE id = ?`).run(
    winnerParticipantId,
    winnerRunSessionId,
    id
  );
}

export function competitionRowCount(db: Db, id: string): { queued: number; running: number; finished: number } {
  const row = db
    .prepare(
      `
    SELECT
      SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as q,
      SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as r,
      SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END) as f
    FROM run_sessions WHERE competitionId = ?
  `
    )
    .get(id) as { q: number | null; r: number | null; f: number | null };
  return {
    queued: Number(row?.q ?? 0),
    running: Number(row?.r ?? 0),
    finished: Number(row?.f ?? 0),
  };
}

/** Build default title for a new competition. */
export function defaultCompetitionTitle(runTypeId: RunTypeId, gender: Gender): string {
  const cfg = getRunTypeById(runTypeId);
  const name = cfg?.name ?? 'Забег';
  const g = gender === 'male' ? 'Мужчины' : 'Женщины';
  return `${name} — ${g}`;
}
