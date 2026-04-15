import { getDb } from '../db/index.js';
import { reseedAfterReset } from '../db/migrations.js';

export function resetTestData(): void {
  const db = getDb();
  db.exec(`PRAGMA foreign_keys = OFF`);
  db.exec(`DELETE FROM runs`);
  db.exec(`DELETE FROM run_sessions`);
  db.exec(`DELETE FROM competitions`);
  db.exec(`DELETE FROM participants`);
  db.exec(`PRAGMA foreign_keys = ON`);
  reseedAfterReset(db);
}
