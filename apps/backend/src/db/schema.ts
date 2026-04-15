import type { Db } from './sqlite.js';

export function initSchema(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      phone TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS run_sessions (
      id TEXT PRIMARY KEY,
      participantId TEXT NOT NULL,
      runTypeId INTEGER NOT NULL,
      runType TEXT NOT NULL,
      status TEXT NOT NULL,
      queueNumber INTEGER NOT NULL,
      resultTime REAL,
      resultDistance REAL,
      createdAt TEXT NOT NULL,
      startedAt TEXT,
      finishedAt TEXT,
      FOREIGN KEY (participantId) REFERENCES participants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_run_sessions_participant ON run_sessions(participantId);
    CREATE INDEX IF NOT EXISTS idx_run_sessions_queue ON run_sessions(runTypeId, status, queueNumber);

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
      winnerRunSessionId TEXT,
      queuePaused INTEGER NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_active_pair
    ON competitions(runTypeId, gender) WHERE status = 'active';

    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      participantId TEXT,
      runSessionId TEXT,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      readableMessage TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_events_created ON events(createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(sessionId);
    CREATE INDEX IF NOT EXISTS idx_events_participant ON events(participantId);
  `);
}
