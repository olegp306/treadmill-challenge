import type { Db } from './sqlite.js';

export function initSchema(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'registered',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      participantId TEXT NOT NULL,
      resultTime REAL NOT NULL,
      distance REAL NOT NULL,
      speed REAL NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (participantId) REFERENCES participants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_runs_participant ON runs(participantId);
    CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
  `);
}
