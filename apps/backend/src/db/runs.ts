import type { Db } from './sqlite.js';
import type { Run, RunTypeId } from '@treadmill-challenge/shared';

function rowToRun(row: Record<string, unknown>): Run {
  return {
    id: row.id as string,
    participantId: row.participantId as string,
    competitionId: String(row.competitionId ?? ''),
    runSessionId: row.runSessionId != null ? String(row.runSessionId) : null,
    resultTime: Number(row.resultTime),
    distance: Number(row.distance),
    speed: Number(row.speed),
    createdAt: row.createdAt as string,
  };
}

export function speedFromTimeDistance(resultTime: number, distance: number): number {
  if (resultTime <= 0) return 0;
  return (distance / 1000 / resultTime) * 3600;
}

export function createRun(
  db: Db,
  id: string,
  participantId: string,
  competitionId: string,
  runSessionId: string | null,
  resultTime: number,
  distance: number,
  speed: number
): Run {
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO runs (id, participantId, competitionId, runSessionId, resultTime, distance, speed, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, participantId, competitionId, runSessionId, resultTime, distance, speed, createdAt);
  return { id, participantId, competitionId, runSessionId, resultTime, distance, speed, createdAt };
}

export function updateRunMetrics(
  db: Db,
  runId: string,
  resultTime: number,
  distance: number
): void {
  const speed = speedFromTimeDistance(resultTime, distance);
  db.prepare(`UPDATE runs SET resultTime = ?, distance = ?, speed = ? WHERE id = ?`).run(
    resultTime,
    distance,
    speed,
    runId
  );
}

export function deleteRunById(db: Db, runId: string): void {
  db.prepare(`DELETE FROM runs WHERE id = ?`).run(runId);
}

export function getRunsByParticipantId(db: Db, participantId: string): Run[] {
  const rows = db.prepare('SELECT * FROM runs WHERE participantId = ? ORDER BY createdAt DESC').all(participantId) as Record<
    string,
    unknown
  >[];
  return rows.map(rowToRun);
}

export interface LeaderboardEntry {
  run: Run;
  participantName: string;
}

/** Same ordering as before: by resultTime desc (legacy global board). */
export function getLeaderboardRuns(db: Db, limit = 50): LeaderboardEntry[] {
  const rows = db.prepare(`
    SELECT r.id, r.participantId, r.competitionId, r.runSessionId, r.resultTime, r.distance, r.speed, r.createdAt,
      TRIM(COALESCE(p.firstName, '') || ' ' || COALESCE(p.lastName, '')) as participantName
    FROM runs r
    JOIN competitions c ON c.id = r.competitionId
    JOIN participants p ON p.id = r.participantId
    WHERE c.status = 'active'
    ORDER BY r.resultTime DESC, r.distance DESC
    LIMIT ?
  `).all(limit) as Record<string, unknown>[];
  return rows.map((row) => {
    const { participantName, ...runRow } = row;
    return {
      run: rowToRun(runRow as Record<string, unknown>),
      participantName: participantName as string,
    };
  });
}

function orderClauseForRunType(runTypeId: RunTypeId): string {
  if (runTypeId === 0) return 'r.distance DESC, r.resultTime ASC';
  return 'r.resultTime ASC, r.distance DESC';
}

export function getLeaderboardForCompetition(db: Db, competitionId: string, runTypeId: RunTypeId, limit = 100): LeaderboardEntry[] {
  const order = orderClauseForRunType(runTypeId);
  const rows = db
    .prepare(
      `
    SELECT r.id, r.participantId, r.competitionId, r.runSessionId, r.resultTime, r.distance, r.speed, r.createdAt,
      TRIM(COALESCE(p.firstName, '') || ' ' || COALESCE(p.lastName, '')) as participantName
    FROM runs r
    JOIN participants p ON p.id = r.participantId
    WHERE r.competitionId = ?
    ORDER BY ${order}
    LIMIT ?
  `
    )
    .all(competitionId, limit) as Record<string, unknown>[];
  return rows.map((row) => {
    const { participantName, ...runRow } = row;
    return {
      run: rowToRun(runRow as Record<string, unknown>),
      participantName: participantName as string,
    };
  });
}

export function getRunById(db: Db, id: string): Run | null {
  const row = db.prepare(`SELECT * FROM runs WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToRun(row);
}

export function getTopLeaderboardEntryForCompetition(
  db: Db,
  competitionId: string,
  runTypeId: RunTypeId
): LeaderboardEntry | null {
  const list = getLeaderboardForCompetition(db, competitionId, runTypeId, 1);
  return list[0] ?? null;
}
