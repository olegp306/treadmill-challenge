import type { Db } from '../db/sqlite.js';
import { getAppVersion } from '../version.js';

/** Bump when export payload shape changes (importer may support older values later). */
export const DATA_SNAPSHOT_EXPORT_FORMAT_VERSION = 1 as const;
/** Bump when DB schema for exported tables changes materially. */
export const DATA_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export type DataSnapshotMeta = {
  exportFormatVersion: typeof DATA_SNAPSHOT_EXPORT_FORMAT_VERSION;
  schemaVersion: typeof DATA_SNAPSHOT_SCHEMA_VERSION;
  createdAt: string;
  appVersion: string;
  /** JPEG bytes are not embedded; paths are relative to backend `data/` (see runPhotoStorage). */
  photosNote: 'paths_only_not_binary';
};

export type DataSnapshotV1 = {
  meta: DataSnapshotMeta;
  participants: Record<string, unknown>[];
  competitions: Record<string, unknown>[];
  runSessions: Record<string, unknown>[];
  runs: Record<string, unknown>[];
  /**
   * Optional for backward compatibility with older backups.
   * New exports always include `events`, but only rows with `createdAt` in the last 24 hours (see `buildDataSnapshot`).
   */
  events?: Record<string, unknown>[];
  adminSettings: { key: string; value: string }[];
};

/** Only events newer than this relative to export time are included in JSON backup. */
const EVENTS_EXPORT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

export function buildExportDownloadFilename(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `treadmill-export-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}-${p(d.getMinutes())}.json`;
}

function selectAll(db: Db, table: string): Record<string, unknown>[] {
  return db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
}

function selectEventsForExport(db: Db, exportAt: Date): Record<string, unknown>[] {
  const cutoffIso = new Date(exportAt.getTime() - EVENTS_EXPORT_LOOKBACK_MS).toISOString();
  return db
    .prepare(`SELECT * FROM events WHERE createdAt >= ? ORDER BY createdAt ASC, id ASC`)
    .all(cutoffIso) as Record<string, unknown>[];
}

export function buildDataSnapshot(db: Db): DataSnapshotV1 {
  const exportAt = new Date();
  return {
    meta: {
      exportFormatVersion: DATA_SNAPSHOT_EXPORT_FORMAT_VERSION,
      schemaVersion: DATA_SNAPSHOT_SCHEMA_VERSION,
      createdAt: exportAt.toISOString(),
      appVersion: getAppVersion(),
      photosNote: 'paths_only_not_binary',
    },
    participants: selectAll(db, 'participants'),
    competitions: selectAll(db, 'competitions'),
    runSessions: selectAll(db, 'run_sessions'),
    runs: selectAll(db, 'runs'),
    events: selectEventsForExport(db, exportAt),
    adminSettings: selectAll(db, 'admin_settings').map((r) => ({
      key: String(r.key),
      value: String(r.value),
    })),
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function err(msg: string): { ok: false; error: string } {
  return { ok: false, error: msg };
}

export function validateDataSnapshot(input: unknown): { ok: true; snapshot: DataSnapshotV1 } | { ok: false; error: string } {
  if (!isRecord(input)) return err('Корень JSON должен быть объектом');
  const meta = input.meta;
  if (!isRecord(meta)) return err('Отсутствует блок meta');
  if (meta.exportFormatVersion !== DATA_SNAPSHOT_EXPORT_FORMAT_VERSION) {
    return err(`Неподдерживаемый exportFormatVersion (ожидается ${DATA_SNAPSHOT_EXPORT_FORMAT_VERSION})`);
  }
  if (Number(meta.schemaVersion) !== DATA_SNAPSHOT_SCHEMA_VERSION) {
    return err(`Неподдерживаемый schemaVersion (ожидается ${DATA_SNAPSHOT_SCHEMA_VERSION})`);
  }
  for (const key of ['participants', 'competitions', 'runSessions', 'runs', 'adminSettings'] as const) {
    if (!Array.isArray(input[key])) return err(`Отсутствует или не массив: ${key}`);
  }
  if (input.events != null && !Array.isArray(input.events)) {
    return err('Некорректное поле events: ожидается массив');
  }
  const snap = input as DataSnapshotV1;
  for (const p of snap.participants) {
    if (!isRecord(p)) return err('Некорректная строка participants');
    for (const f of ['id', 'firstName', 'lastName', 'phone', 'createdAt', 'sex']) {
      if (p[f] == null || String(p[f]).trim() === '') return err(`participants: отсутствует поле ${f}`);
    }
    const sex = String(p.sex);
    if (sex !== 'male' && sex !== 'female') return err(`participants: неверный sex для ${p.id}`);
  }
  for (const c of snap.competitions) {
    if (!isRecord(c)) return err('Некорректная строка competitions');
    for (const f of ['id', 'runTypeId', 'runTypeKey', 'gender', 'title', 'status', 'startedAt']) {
      if (c[f] == null || String(c[f]).trim() === '') return err(`competitions: отсутствует поле ${f}`);
    }
  }
  for (const s of snap.runSessions) {
    if (!isRecord(s)) return err('Некорректная строка runSessions');
    for (const f of ['id', 'participantId', 'runTypeId', 'runType', 'status', 'createdAt']) {
      if (s[f] == null || String(s[f]).trim() === '') return err(`runSessions: отсутствует поле ${f}`);
    }
    if (s.queueNumber == null || Number.isNaN(Number(s.queueNumber))) {
      return err(`runSessions: неверный queueNumber для ${s.id}`);
    }
  }
  for (const r of snap.runs) {
    if (!isRecord(r)) return err('Некорректная строка runs');
    for (const f of ['id', 'participantId', 'competitionId', 'createdAt']) {
      if (r[f] == null) return err(`runs: отсутствует поле ${f}`);
    }
    if (r.resultTime == null || r.distance == null || r.speed == null) return err(`runs: нужны resultTime, distance, speed для ${r.id}`);
  }
  if (Array.isArray(snap.events)) {
    for (const e of snap.events) {
      if (!isRecord(e)) return err('Некорректная строка events');
      for (const f of ['id', 'sessionId', 'type', 'payload', 'createdAt']) {
        if (e[f] == null || String(e[f]).trim() === '') return err(`events: отсутствует поле ${f}`);
      }
    }
  }
  for (const a of snap.adminSettings) {
    if (!isRecord(a) || typeof a.key !== 'string' || a.key.trim() === '' || typeof a.value !== 'string') {
      return err('adminSettings: каждая запись должна быть { key, value }');
    }
  }
  return { ok: true, snapshot: snap };
}

/**
 * Полная замена данных в SQLite: удаляет все строки в экспортируемых таблицах и вставляет содержимое снапшота.
 * Не трогает файлы на диске (фото); пути в БД остаются как в JSON — при переносе скопируйте каталог `data/photos` отдельно при необходимости.
 */
export function applyDataSnapshot(db: Db, snapshot: DataSnapshotV1): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('DELETE FROM events');
    db.exec('DELETE FROM runs');
    db.exec('DELETE FROM run_sessions');
    db.exec('DELETE FROM competitions');
    db.exec('DELETE FROM participants');
    db.exec('DELETE FROM admin_settings');

    const insP = db.prepare(`
      INSERT INTO participants (id, firstName, lastName, phone, createdAt, sex)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const r of snapshot.participants) {
      insP.run(
        r.id,
        r.firstName,
        r.lastName,
        r.phone,
        r.createdAt,
        r.sex ?? 'male'
      );
    }

    const insC = db.prepare(`
      INSERT INTO competitions (
        id, runTypeId, runTypeKey, gender, title, status, startedAt, stoppedAt,
        winnerParticipantId, winnerRunSessionId, queuePaused
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of snapshot.competitions) {
      insC.run(
        r.id,
        r.runTypeId,
        r.runTypeKey,
        r.gender,
        r.title,
        r.status,
        r.startedAt,
        r.stoppedAt ?? null,
        r.winnerParticipantId ?? null,
        r.winnerRunSessionId ?? null,
        r.queuePaused != null ? Number(r.queuePaused) : 0
      );
    }

    const insS = db.prepare(`
      INSERT INTO run_sessions (
        id, participantId, runTypeId, runType, status, queueNumber, resultTime, resultDistance,
        createdAt, startedAt, finishedAt, competitionId, pending_photo_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of snapshot.runSessions) {
      insS.run(
        r.id,
        r.participantId,
        r.runTypeId,
        r.runType,
        r.status,
        r.queueNumber,
        r.resultTime ?? null,
        r.resultDistance ?? null,
        r.createdAt,
        r.startedAt ?? null,
        r.finishedAt ?? null,
        r.competitionId ?? null,
        r.pending_photo_path ?? null
      );
    }

    const insRun = db.prepare(`
      INSERT INTO runs (
        id, participantId, competitionId, runSessionId, resultTime, distance, speed, createdAt, verification_photo_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of snapshot.runs) {
      insRun.run(
        r.id,
        r.participantId,
        r.competitionId,
        r.runSessionId ?? null,
        r.resultTime,
        r.distance,
        r.speed,
        r.createdAt,
        r.verification_photo_path ?? null
      );
    }

    if (Array.isArray(snapshot.events)) {
      const insE = db.prepare(`
        INSERT INTO events (id, sessionId, participantId, runSessionId, type, payload, readableMessage, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const r of snapshot.events) {
        insE.run(
          r.id,
          r.sessionId,
          r.participantId ?? null,
          r.runSessionId ?? null,
          r.type,
          r.payload,
          r.readableMessage != null ? String(r.readableMessage) : '',
          r.createdAt
        );
      }
    }

    const insA = db.prepare(`INSERT INTO admin_settings (key, value) VALUES (?, ?)`);
    for (const r of snapshot.adminSettings) {
      insA.run(r.key, r.value);
    }

    db.exec('COMMIT');
  } catch (e) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw e;
  }
}
