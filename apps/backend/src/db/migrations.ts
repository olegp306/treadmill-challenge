import type { Db } from './sqlite.js';
import {
  getRunTypeById,
  getRunTypeName,
  normalizeGender,
  runTypeKeyStringToId,
} from '@treadmill-challenge/shared';

function tableColumns(db: Db, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

/**
 * Evolve existing SQLite files toward current schema (idempotent).
 */
export function runMigrations(db: Db): void {
  migrateParticipants(db);
  migrateRunSessions(db);
  migrateCompetitionsAndSessions(db);
}

function migrateParticipants(db: Db): void {
  let cols = tableColumns(db, 'participants');

  if (!cols.has('firstName')) {
    db.exec(`
      ALTER TABLE participants ADD COLUMN firstName TEXT DEFAULT '';
      ALTER TABLE participants ADD COLUMN lastName TEXT DEFAULT '';
    `);
    if (cols.has('name')) {
      const rows = db.prepare('SELECT id, name FROM participants').all() as { id: string; name: string }[];
      const upd = db.prepare('UPDATE participants SET firstName = ?, lastName = ? WHERE id = ?');
      for (const r of rows) {
        const parts = String(r.name ?? '')
          .trim()
          .split(/\s+/);
        upd.run(parts[0] ?? '', parts.slice(1).join(' '), r.id);
      }
    }
    cols = tableColumns(db, 'participants');
  }

  if (cols.has('name') || cols.has('status')) {
    db.exec(`
      CREATE TABLE participants_new (
        id TEXT PRIMARY KEY,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        phone TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);
    const rows = db.prepare('SELECT * FROM participants').all() as Record<string, unknown>[];
    const ins = db.prepare(`
      INSERT INTO participants_new (id, firstName, lastName, phone, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const r of rows) {
      let firstName = String(r.firstName ?? '');
      let lastName = String(r.lastName ?? '');
      if (!firstName && r.name) {
        const parts = String(r.name).trim().split(/\s+/);
        firstName = parts[0] ?? '';
        lastName = parts.slice(1).join(' ');
      }
      ins.run(r.id, firstName, lastName, r.phone, r.createdAt);
    }
    db.exec(`DROP TABLE participants; ALTER TABLE participants_new RENAME TO participants;`);
  }

  cols = tableColumns(db, 'participants');
  if (!cols.has('sex')) {
    db.exec(`ALTER TABLE participants ADD COLUMN sex TEXT NOT NULL DEFAULT 'male'`);
  }
}

function migrateRunSessions(db: Db): void {
  const cols = tableColumns(db, 'run_sessions');
  if (!cols.size) return;

  if (!cols.has('runTypeId')) {
    db.exec(`ALTER TABLE run_sessions ADD COLUMN runTypeId INTEGER NOT NULL DEFAULT 0`);
    const rows = db.prepare('SELECT id, runType FROM run_sessions').all() as { id: string; runType: string }[];
    const upd = db.prepare('UPDATE run_sessions SET runTypeId = ? WHERE id = ?');
    for (const r of rows) {
      const id = runTypeKeyStringToId(r.runType) ?? 0;
      upd.run(id, r.id);
    }
  }

  if (!cols.has('queueNumber')) {
    db.exec(`
      ALTER TABLE run_sessions ADD COLUMN queueNumber INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE run_sessions ADD COLUMN resultTime REAL;
      ALTER TABLE run_sessions ADD COLUMN resultDistance REAL;
      ALTER TABLE run_sessions ADD COLUMN startedAt TEXT;
    `);
    assignQueueNumbers(db);
  }

  db.exec(`
    UPDATE run_sessions SET runType = CASE runType
      WHEN '5min' THEN 'max_5_min'
      WHEN 'sprint_5km' THEN 'stayer_sprint_5km'
      ELSE runType
    END
    WHERE runType IN ('5min', 'sprint_5km');
  `);
}

function assignQueueNumbers(db: Db): void {
  const types = db.prepare(`SELECT DISTINCT runTypeId FROM run_sessions`).all() as { runTypeId: number }[];
  for (const { runTypeId } of types) {
    const rows = db
      .prepare(
        `SELECT id FROM run_sessions WHERE runTypeId = ? ORDER BY createdAt ASC, id ASC`
      )
      .all(runTypeId) as { id: string }[];
    let n = 1;
    const upd = db.prepare(`UPDATE run_sessions SET queueNumber = ? WHERE id = ?`);
    for (const r of rows) {
      upd.run(n++, r.id);
    }
  }
}

function legacyCompetitionId(runTypeId: number, gender: string): string {
  return `legacy-${runTypeId}-${normalizeGender(gender)}`;
}

/** Reseed legacy competition rows + defaults after destructive test reset. */
export function reseedAfterReset(db: Db): void {
  seedLegacyCompetitions(db);
  seedAdminSettings(db);
}

function seedLegacyCompetitions(db: Db): void {
  const ins = db.prepare(`
    INSERT OR IGNORE INTO competitions (
      id, runTypeId, runTypeKey, gender, title, status, startedAt, stoppedAt,
      winnerParticipantId, winnerRunSessionId
    ) VALUES (?, ?, ?, ?, ?, 'archived', ?, ?, NULL, NULL)
  `);
  const old = new Date(Date.now() - 86400000 * 365).toISOString();
  for (let runTypeId = 0; runTypeId <= 2; runTypeId++) {
    const cfg = getRunTypeById(runTypeId);
    if (!cfg) continue;
    for (const gender of ['male', 'female'] as const) {
      const g = gender;
      const id = legacyCompetitionId(runTypeId, g);
      const title = `${getRunTypeName(runTypeId)} — ${g === 'male' ? 'Мужчины' : 'Женщины'}`;
      ins.run(id, runTypeId, cfg.key, g, title, old, old);
    }
  }
}

function seedAdminSettings(db: Db): void {
  const ins = db.prepare(`INSERT OR IGNORE INTO admin_settings (key, value) VALUES (?, ?)`);
  ins.run('adminPin', '555555');
  ins.run('tdHost', process.env.TD_HOST ?? '127.0.0.1');
  ins.run('tdPort', process.env.TD_PORT ?? '7000');
  ins.run('tdAdapter', process.env.TD_ADAPTER ?? 'mock');
  ins.run('testMode', 'false');
  ins.run('tdDemoMode', 'false');
  ins.run('eventTitle', 'Amazing Red');
  ins.run('maxQueueSizePerRun', '3');
  ins.run('lastTdSyncOk', '');
  ins.run('lastTdSyncError', '');
}

function reassignQueueNumbersByCompetition(db: Db): void {
  const comps = db
    .prepare(`SELECT DISTINCT competitionId FROM run_sessions WHERE competitionId IS NOT NULL`)
    .all() as { competitionId: string }[];
  const upd = db.prepare(`UPDATE run_sessions SET queueNumber = ? WHERE id = ?`);
  for (const { competitionId } of comps) {
    const rows = db
      .prepare(
        `
      SELECT id FROM run_sessions
      WHERE competitionId = ? AND status IN ('queued', 'running')
      ORDER BY queueNumber ASC, createdAt ASC, id ASC
    `
      )
      .all(competitionId) as { id: string }[];
    let n = 1;
    for (const r of rows) {
      upd.run(n++, r.id);
    }
  }
}

function migrateCompetitionsAndSessions(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitions (
      id TEXT PRIMARY KEY,
      runTypeId INTEGER NOT NULL,
      runTypeKey TEXT NOT NULL,
      gender TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      startedAt TEXT NOT NULL,
      stoppedAt TEXT,
      winnerParticipantId TEXT,
      winnerRunSessionId TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_active_pair
    ON competitions(runTypeId, gender) WHERE status = 'active';
    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  seedLegacyCompetitions(db);
  seedAdminSettings(db);

  const rsCols = tableColumns(db, 'run_sessions');
  if (!rsCols.size) return;

  if (!rsCols.has('competitionId')) {
    db.exec(`ALTER TABLE run_sessions ADD COLUMN competitionId TEXT`);
  }

  const needsBackfill = db
    .prepare(`SELECT COUNT(*) as c FROM run_sessions WHERE competitionId IS NULL`)
    .get() as { c: number };
  if (needsBackfill.c > 0) {
    const rows = db
      .prepare(
        `
      SELECT s.id as id, s.runTypeId as runTypeId, COALESCE(p.sex, 'male') as sex
      FROM run_sessions s
      LEFT JOIN participants p ON p.id = s.participantId
      WHERE s.competitionId IS NULL
    `
      )
      .all() as { id: string; runTypeId: number; sex: string }[];
    const upd = db.prepare(`UPDATE run_sessions SET competitionId = ? WHERE id = ?`);
    for (const r of rows) {
      const cid = legacyCompetitionId(r.runTypeId, r.sex);
      upd.run(cid, r.id);
    }
  }

  reassignQueueNumbersByCompetition(db);

  const runCols = tableColumns(db, 'runs');
  if (runCols.size) {
    if (!runCols.has('competitionId')) {
      db.exec(`ALTER TABLE runs ADD COLUMN competitionId TEXT`);
    }
    if (!runCols.has('runSessionId')) {
      db.exec(`ALTER TABLE runs ADD COLUMN runSessionId TEXT`);
    }

    const orphanRuns = db
      .prepare(`SELECT id FROM runs WHERE competitionId IS NULL OR competitionId = ''`)
      .all() as { id: string }[];
    if (orphanRuns.length > 0) {
      const runGet = db.prepare(`SELECT id, participantId, resultTime FROM runs WHERE id = ?`);
      const matchStmt = db.prepare(`
        SELECT s.id as sid, s.competitionId as cid FROM run_sessions s
        WHERE s.participantId = ? AND s.resultTime IS NOT NULL
        AND ABS(s.resultTime - ?) < 0.05
        ORDER BY s.finishedAt DESC LIMIT 1
      `);
      const partStmt = db.prepare(`SELECT sex FROM participants WHERE id = ?`);
      const updRun = db.prepare(`UPDATE runs SET competitionId = ?, runSessionId = ? WHERE id = ?`);
      for (const { id } of orphanRuns) {
        const run = runGet.get(id) as { id: string; participantId: string; resultTime: number };
        const m = matchStmt.get(run.participantId, run.resultTime) as
          | { sid: string; cid: string }
          | undefined;
        if (m) {
          updRun.run(m.cid, m.sid, id);
        } else {
          const p = partStmt.get(run.participantId) as { sex: string } | undefined;
          const g = normalizeGender(p?.sex);
          updRun.run(legacyCompetitionId(0, g), null, id);
        }
      }
    }
  }
}
