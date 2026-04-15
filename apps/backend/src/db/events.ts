import { randomUUID } from 'node:crypto';
import type { Db } from './sqlite.js';

export interface EventRow {
  id: string;
  sessionId: string;
  participantId: string | null;
  runSessionId: string | null;
  type: string;
  payload: string;
  createdAt: string;
}

const MAX_PAYLOAD_BYTES = 16_384;

export function insertEvent(
  db: Db,
  row: {
    sessionId: string;
    participantId: string | null;
    runSessionId: string | null;
    type: string;
    payloadJson: string;
  }
): string {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  let payloadJson = row.payloadJson;
  if (new TextEncoder().encode(payloadJson).length > MAX_PAYLOAD_BYTES) {
    payloadJson = JSON.stringify({ _truncated: true, note: 'payload too large' });
  }
  db.prepare(
    `
    INSERT INTO events (id, sessionId, participantId, runSessionId, type, payload, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    id,
    row.sessionId,
    row.participantId,
    row.runSessionId,
    row.type,
    payloadJson,
    createdAt
  );
  return id;
}

export function listRecentEvents(db: Db, limit: number, typeFilter?: string | null): EventRow[] {
  const cap = Math.min(200, Math.max(1, Math.floor(limit)));
  if (typeFilter && typeFilter.trim()) {
    const rows = db
      .prepare(
        `
      SELECT id, sessionId, participantId, runSessionId, type, payload, createdAt
      FROM events
      WHERE type = ?
      ORDER BY createdAt DESC
      LIMIT ?
    `
      )
      .all(typeFilter.trim(), cap) as Record<string, unknown>[];
    return rows.map(rowToEvent);
  }
  const rows = db
    .prepare(
      `
    SELECT id, sessionId, participantId, runSessionId, type, payload, createdAt
    FROM events
    ORDER BY createdAt DESC
    LIMIT ?
  `
    )
    .all(cap) as Record<string, unknown>[];
  return rows.map(rowToEvent);
}

function rowToEvent(row: Record<string, unknown>): EventRow {
  return {
    id: String(row.id),
    sessionId: String(row.sessionId),
    participantId: row.participantId != null ? String(row.participantId) : null,
    runSessionId: row.runSessionId != null ? String(row.runSessionId) : null,
    type: String(row.type),
    payload: String(row.payload),
    createdAt: String(row.createdAt),
  };
}
