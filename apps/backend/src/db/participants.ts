import type { Db } from './sqlite.js';
import type { Participant } from '@treadmill-challenge/shared';

function rowToParticipant(row: Record<string, unknown>): Participant {
  return {
    id: row.id as string,
    firstName: String(row.firstName ?? ''),
    lastName: String(row.lastName ?? ''),
    phone: row.phone as string,
    createdAt: row.createdAt as string,
  };
}

export function displayName(p: Pick<Participant, 'firstName' | 'lastName'>): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

export function createParticipant(
  db: Db,
  id: string,
  firstName: string,
  lastName: string,
  phone: string
): Participant {
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO participants (id, firstName, lastName, phone, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, firstName.trim(), lastName.trim(), phone, createdAt);
  return { id, firstName: firstName.trim(), lastName: lastName.trim(), phone, createdAt };
}

export function getParticipantById(db: Db, id: string): Participant | null {
  const row = db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToParticipant(row);
}
