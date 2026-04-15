import type { Db } from './sqlite.js';
import type { Gender, Participant } from '@treadmill-challenge/shared';
import { normalizeGender } from '@treadmill-challenge/shared';

function rowToParticipant(row: Record<string, unknown>): Participant {
  return {
    id: row.id as string,
    firstName: String(row.firstName ?? ''),
    lastName: String(row.lastName ?? ''),
    phone: row.phone as string,
    sex: normalizeGender(row.sex != null ? String(row.sex) : 'male'),
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
  phone: string,
  sex: Gender
): Participant {
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO participants (id, firstName, lastName, phone, sex, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, firstName.trim(), lastName.trim(), phone, sex, createdAt);
  return { id, firstName: firstName.trim(), lastName: lastName.trim(), phone, sex, createdAt };
}

export function updateParticipantFields(
  db: Db,
  id: string,
  fields: Partial<Pick<Participant, 'firstName' | 'lastName' | 'phone' | 'sex'>>
): void {
  const cur = getParticipantById(db, id);
  if (!cur) throw new Error('Participant not found');
  const next = {
    firstName: fields.firstName ?? cur.firstName,
    lastName: fields.lastName ?? cur.lastName,
    phone: fields.phone ?? cur.phone,
    sex: fields.sex ?? cur.sex,
  };
  db.prepare(`UPDATE participants SET firstName = ?, lastName = ?, phone = ?, sex = ? WHERE id = ?`).run(
    next.firstName.trim(),
    next.lastName.trim(),
    next.phone.trim(),
    next.sex,
    id
  );
}

export function getParticipantById(db: Db, id: string): Participant | null {
  const row = db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToParticipant(row);
}
