import { randomUUID } from 'node:crypto';
import type { Db } from './sqlite.js';

export interface EventRow {
  id: string;
  sessionId: string;
  participantId: string | null;
  runSessionId: string | null;
  type: string;
  payload: string;
  readableMessage: string;
  createdAt: string;
}

const MAX_PAYLOAD_BYTES = 16_384;
const MAX_READABLE_MESSAGE_CHARS = 2048;

export interface ListEventsFilters {
  type?: string | null;
  sessionId?: string | null;
  participantId?: string | null;
  runSessionId?: string | null;
  /** Default 'desc' (newest first). Use 'asc' for chronological journey. */
  order?: 'asc' | 'desc';
}

export function insertEvent(
  db: Db,
  row: {
    sessionId: string;
    participantId: string | null;
    runSessionId: string | null;
    type: string;
    payloadJson: string;
    readableMessage?: string | null;
  }
): string {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  let payloadJson = row.payloadJson;
  if (new TextEncoder().encode(payloadJson).length > MAX_PAYLOAD_BYTES) {
    payloadJson = JSON.stringify({ _truncated: true, note: 'payload too large' });
  }
  let readable =
    typeof row.readableMessage === 'string' ? row.readableMessage.trim() : '';
  if (readable.length > MAX_READABLE_MESSAGE_CHARS) {
    readable = `${readable.slice(0, MAX_READABLE_MESSAGE_CHARS)}…`;
  }
  db.prepare(
    `
    INSERT INTO events (id, sessionId, participantId, runSessionId, type, payload, readableMessage, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    id,
    row.sessionId,
    row.participantId,
    row.runSessionId,
    row.type,
    payloadJson,
    readable,
    createdAt
  );
  return id;
}

export function listRecentEvents(db: Db, limit: number, filters?: ListEventsFilters | string | null): EventRow[] {
  const cap = Math.min(500, Math.max(1, Math.floor(limit)));
  let typeFilter: string | null = null;
  let extra: ListEventsFilters = {};
  if (typeof filters === 'string') {
    typeFilter = filters.trim() || null;
  } else if (filters && typeof filters === 'object') {
    extra = filters;
    typeFilter = extra.type?.trim() ? extra.type.trim() : null;
  }

  const sessionId = extra.sessionId?.trim() ? extra.sessionId.trim() : null;
  const participantId = extra.participantId?.trim() ? extra.participantId.trim() : null;
  const runSessionId = extra.runSessionId?.trim() ? extra.runSessionId.trim() : null;
  const order = extra.order === 'asc' ? 'ASC' : 'DESC';

  const conds: string[] = [];
  const params: unknown[] = [];
  if (typeFilter) {
    conds.push('type = ?');
    params.push(typeFilter);
  }
  if (sessionId) {
    conds.push('sessionId = ?');
    params.push(sessionId);
  }
  if (participantId) {
    conds.push('participantId = ?');
    params.push(participantId);
  }
  if (runSessionId) {
    conds.push('runSessionId = ?');
    params.push(runSessionId);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  params.push(cap);

  const rows = db
    .prepare(
      `
      SELECT id, sessionId, participantId, runSessionId, type, payload, readableMessage, createdAt
      FROM events
      ${where}
      ORDER BY createdAt ${order}
      LIMIT ?
    `
    )
    .all(...params) as Record<string, unknown>[];
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
    readableMessage: row.readableMessage != null ? String(row.readableMessage) : '',
    createdAt: String(row.createdAt),
  };
}
