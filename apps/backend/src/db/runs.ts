import type { Db } from './sqlite.js';
import type { Run } from '@treadmill-challenge/shared';

function rowToRun(row: Record<string, unknown>): Run {
  return {
    id: row.id as string,
    participantId: row.participantId as string,
    resultTime: Number(row.resultTime),
    distance: Number(row.distance),
    speed: Number(row.speed),
    createdAt: row.createdAt as string,
  };
}

export function createRun(
  db: Db,
  id: string,
  participantId: string,
  resultTime: number,
  distance: number,
  speed: number
): Run {
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO runs (id, participantId, resultTime, distance, speed, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, participantId, resultTime, distance, speed, createdAt);
  return { id, participantId, resultTime, distance, speed, createdAt };
}

export function getRunsByParticipantId(db: Db, participantId: string): Run[] {
  const rows = db.prepare('SELECT * FROM runs WHERE participantId = ? ORDER BY createdAt DESC').all(participantId) as Record<string, unknown>[];
  return rows.map(rowToRun);
}

export interface LeaderboardEntry {
  run: Run;
  participantName: string;
}

export function getLeaderboardRuns(db: Db, limit = 50): LeaderboardEntry[] {
  const rows = db.prepare(`
    SELECT r.id, r.participantId, r.resultTime, r.distance, r.speed, r.createdAt, p.name as participantName
    FROM runs r
    JOIN participants p ON p.id = r.participantId
    ORDER BY r.resultTime DESC, r.distance DESC
    LIMIT ?
  `).all(limit) as (Record<string, unknown>)[];
  return rows.map((row) => {
    const { participantName, ...runRow } = row;
    return {
      run: rowToRun(runRow as Record<string, unknown>),
      participantName: participantName as string,
    };
  });
}
