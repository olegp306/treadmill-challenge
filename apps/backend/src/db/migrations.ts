import type { Db } from './sqlite.js';

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
}

function migrateRunSessions(db: Db): void {
  const cols = tableColumns(db, 'run_sessions');
  if (!cols.size) return;

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
  const types = db.prepare(`SELECT DISTINCT runType FROM run_sessions`).all() as { runType: string }[];
  for (const { runType } of types) {
    const rows = db
      .prepare(
        `SELECT id FROM run_sessions WHERE runType = ? ORDER BY createdAt ASC, id ASC`
      )
      .all(runType) as { id: string }[];
    let n = 1;
    const upd = db.prepare(`UPDATE run_sessions SET queueNumber = ? WHERE id = ?`);
    for (const r of rows) {
      upd.run(n++, r.id);
    }
  }
}
