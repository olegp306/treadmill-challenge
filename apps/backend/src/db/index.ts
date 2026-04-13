import { initDb, type Db } from './sqlite.js';
import { initSchema } from './schema.js';
import { runMigrations } from './migrations.js';
import * as participants from './participants.js';
import * as runs from './runs.js';
import * as runSessions from './runSessions.js';

let db: Db | null = null;

export async function ensureDb(): Promise<Db> {
  if (!db) {
    db = await initDb();
    initSchema(db);
    runMigrations(db);
  }
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error('Database not initialized. Call ensureDb() first.');
  return db;
}

export { participants, runs, runSessions };
