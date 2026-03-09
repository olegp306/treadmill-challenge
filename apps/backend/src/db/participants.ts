import type { Db } from './sqlite.js';
import type { Participant, ParticipantStatus } from '@treadmill-challenge/shared';

const STATUS_VALUES: ParticipantStatus[] = ['registered', 'queued', 'running', 'finished'];

function rowToParticipant(row: Record<string, unknown>): Participant {
  return {
    id: row.id as string,
    name: row.name as string,
    phone: row.phone as string,
    status: (STATUS_VALUES.includes(row.status as ParticipantStatus) ? row.status : 'registered') as ParticipantStatus,
    createdAt: row.createdAt as string,
  };
}

export function createParticipant(
  db: Db,
  id: string,
  name: string,
  phone: string
): Participant {
  const createdAt = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO participants (id, name, phone, status, createdAt)
    VALUES (?, ?, ?, 'registered', ?)
  `);
  stmt.run(id, name, phone, createdAt);
  return { id, name, phone, status: 'registered', createdAt };
}

export function getParticipantById(db: Db, id: string): Participant | null {
  const row = db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToParticipant(row);
}

export function getLeaderboard(db: Db, limit = 50): Participant[] {
  const rows = db.prepare(`
    SELECT p.* FROM participants p
    LEFT JOIN runs r ON p.id = r.participantId
    ORDER BY COALESCE(MAX(r.resultTime), 0) DESC, p.createdAt DESC
    LIMIT ?
  `).all(limit) as Record<string, unknown>[];
  return rows.map(rowToParticipant);
}

export function updateParticipantStatus(db: Db, id: string, status: ParticipantStatus): void {
  db.prepare('UPDATE participants SET status = ? WHERE id = ?').run(status, id);
}
