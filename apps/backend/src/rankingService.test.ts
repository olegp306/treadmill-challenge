import test from 'node:test';
import assert from 'node:assert/strict';
import { openInMemoryDatabaseForTests } from './db/sqlite.js';
import { initSchema } from './db/schema.js';
import { runMigrations } from './db/migrations.js';
import { getRankedRuns } from './services/rankingService.js';

test('getRankedRuns keeps all finished results (no participant deduplication)', async () => {
  const db = await openInMemoryDatabaseForTests();
  initSchema(db);
  runMigrations(db);
  db.prepare(
    `INSERT INTO competitions (
      id, runTypeId, runTypeKey, gender, title, status, startedAt, stoppedAt, winnerParticipantId, winnerRunSessionId, queuePaused
    ) VALUES
      ('c5k-m', 2, 'max_5_km', 'male', 'M 5km', 'active', datetime('now'), NULL, NULL, NULL, 0),
      ('c5m-m', 0, 'max_5_min', 'male', 'M 5min', 'active', datetime('now'), NULL, NULL, NULL, 0)`
  ).run();
  db.prepare(
    `INSERT INTO participants (id, firstName, lastName, phone, createdAt, sex) VALUES
      ('p1', 'Ivan', 'Petrov', '+7 (900) 100-00-00', datetime('now'), 'male'),
      ('p2', 'Petr', 'Sidorov', '+7 (900) 200-00-00', datetime('now'), 'male')`
  ).run();

  const ins = db.prepare(`
    INSERT INTO run_sessions (
      id, participantId, runTypeId, runType, status, queueNumber, resultTime, resultDistance,
      createdAt, startedAt, finishedAt, competitionId
    ) VALUES (?, ?, ?, ?, 'finished', 1, ?, ?, datetime('now'), datetime('now'), datetime('now'), ?)
  `);

  // 5km men: lower time is better. p1 has two results, both must remain.
  ins.run('s1', 'p1', 2, 'Стайер-спринт 5 км', 300, 5000, 'c5k-m');
  ins.run('s2', 'p1', 2, 'Стайер-спринт 5 км', 260, 5000, 'c5k-m');
  ins.run('s3', 'p2', 2, 'Стайер-спринт 5 км', 280, 5000, 'c5k-m');

  // 5min men: higher distance is better.
  ins.run('s4', 'p1', 0, 'Максимум за 5 минут', 300, 1200, 'c5m-m');
  ins.run('s5', 'p2', 0, 'Максимум за 5 минут', 300, 1350, 'c5m-m');

  const ranked5k = getRankedRuns(db, { runTypeId: 2, sex: 'male', sortMode: 'best' });
  assert.equal(ranked5k.length, 3);
  assert.equal(ranked5k[0]?.participantId, 'p1');
  assert.equal(ranked5k[0]?.resultTime, 260);
  assert.equal(ranked5k[0]?.rank, 1);
  assert.equal(ranked5k[1]?.participantId, 'p2');
  assert.equal(ranked5k[1]?.rank, 2);
  assert.equal(ranked5k[2]?.participantId, 'p1');
  assert.equal(ranked5k[2]?.resultTime, 300);
  assert.equal(ranked5k[2]?.rank, 3);

  const ranked5m = getRankedRuns(db, { runTypeId: 0, sex: 'male', sortMode: 'best' });
  assert.equal(ranked5m.length, 2);
  assert.equal(ranked5m[0]?.participantId, 'p2');
  assert.equal(ranked5m[0]?.resultDistance, 1350);
});
