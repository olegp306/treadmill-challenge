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
const HEARTBEAT_THROTTLE_MS = Math.max(30_000, Number(process.env.EVENTS_HEARTBEAT_THROTTLE_MS ?? 45_000));
const SCREEN_VIEW_THROTTLE_MS = Math.max(10_000, Number(process.env.EVENTS_SCREEN_VIEW_THROTTLE_MS ?? 15_000));
const EVENTS_RETENTION_DAYS = Math.max(1, Number(process.env.EVENTS_RETENTION_DAYS ?? 60));
const EVENTS_MAX_ROWS = Math.max(1_000, Number(process.env.EVENTS_MAX_ROWS ?? 100_000));

type ThrottleCacheEntry = {
  atMs: number;
};

const throttleCache = new Map<string, ThrottleCacheEntry>();
const THROTTLE_CACHE_MAX = 50_000;

function maybeCleanupThrottleCache(nowMs: number): void {
  if (throttleCache.size < THROTTLE_CACHE_MAX) return;
  for (const [k, v] of throttleCache.entries()) {
    // Keep cache bounded; drop old keys first.
    if (nowMs - v.atMs > Math.max(HEARTBEAT_THROTTLE_MS, SCREEN_VIEW_THROTTLE_MS) * 8) {
      throttleCache.delete(k);
    }
    if (throttleCache.size < THROTTLE_CACHE_MAX * 0.8) break;
  }
}

function parsePayloadObject(payloadJson: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(payloadJson);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore invalid json for throttling logic */
  }
  return null;
}

function pickScreenIdentity(payloadJson: string): string {
  const payload = parsePayloadObject(payloadJson);
  if (!payload) return 'unknown';
  for (const key of ['screen', 'screenId', 'screenPath', 'path', 'pathname', 'route', 'step']) {
    const v = payload[key];
    if (typeof v === 'string' && v.trim().length > 0) {
      return v.trim();
    }
  }
  return 'unknown';
}

function shouldThrottle(row: { type: string; sessionId: string; payloadJson: string }): boolean {
  const nowMs = Date.now();
  maybeCleanupThrottleCache(nowMs);

  if (row.type === 'heartbeat') {
    const key = `heartbeat:${row.sessionId}`;
    const prev = throttleCache.get(key);
    if (prev && nowMs - prev.atMs < HEARTBEAT_THROTTLE_MS) {
      return true;
    }
    throttleCache.set(key, { atMs: nowMs });
    return false;
  }

  if (row.type === 'screen_view') {
    const screen = pickScreenIdentity(row.payloadJson);
    const key = `screen_view:${row.sessionId}:${screen}`;
    const prev = throttleCache.get(key);
    if (prev && nowMs - prev.atMs < SCREEN_VIEW_THROTTLE_MS) {
      return true;
    }
    throttleCache.set(key, { atMs: nowMs });
    return false;
  }

  return false;
}

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
): { id: string; throttled: boolean } {
  if (shouldThrottle(row)) {
    return { id: '', throttled: true };
  }
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
  return { id, throttled: false };
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

export function pruneEventsRetention(
  db: Db,
  now = new Date()
): { deletedByAge: number; deletedByLimit: number; remaining: number } {
  const cutoffMs = now.getTime() - EVENTS_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoffMs).toISOString();

  const byAgeRow = db
    .prepare(`SELECT COUNT(*) as c FROM events WHERE createdAt < ?`)
    .get(cutoffIso) as { c?: number } | undefined;
  const deletedByAge = Number(byAgeRow?.c ?? 0);
  if (deletedByAge > 0) {
    db.prepare(`DELETE FROM events WHERE createdAt < ?`).run(cutoffIso);
  }

  const totalRow = db.prepare(`SELECT COUNT(*) as c FROM events`).get() as { c?: number } | undefined;
  let total = Number(totalRow?.c ?? 0);
  let deletedByLimit = 0;
  if (total > EVENTS_MAX_ROWS) {
    deletedByLimit = total - EVENTS_MAX_ROWS;
    db.exec(`
      DELETE FROM events
      WHERE id IN (
        SELECT id FROM events
        ORDER BY createdAt ASC, id ASC
        LIMIT ${deletedByLimit}
      )
    `);
    total -= deletedByLimit;
  }

  return { deletedByAge, deletedByLimit, remaining: total };
}
