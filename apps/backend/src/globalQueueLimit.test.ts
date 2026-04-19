import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MAX_GLOBAL_QUEUE_SIZE } from '@treadmill-challenge/shared';
import { openInMemoryDatabaseForTests } from './db/sqlite.js';
import { initSchema } from './db/schema.js';
import { runMigrations } from './db/migrations.js';
import * as adminSettings from './db/adminSettings.js';
import * as runSessions from './db/runSessions.js';

test('default max global queue size after migrations matches shared constant (4)', async () => {
  const db = await openInMemoryDatabaseForTests();
  initSchema(db);
  runMigrations(db);
  assert.equal(adminSettings.getMaxGlobalQueueSize(db), DEFAULT_MAX_GLOBAL_QUEUE_SIZE);
  assert.equal(DEFAULT_MAX_GLOBAL_QUEUE_SIZE, 4);
});

test('migration migrateGlobalQueueMaxSizeDefaultTo4 bumps legacy 3 → 4 on re-run', async () => {
  const db = await openInMemoryDatabaseForTests();
  initSchema(db);
  runMigrations(db);
  db.prepare(`UPDATE admin_settings SET value = '3' WHERE key = 'maxGlobalQueueSize'`).run();
  runMigrations(db);
  assert.equal(adminSettings.getMaxGlobalQueueSize(db), 4);
});

test('countGlobalQueueOccupancy counts queued and running only', async () => {
  const db = await openInMemoryDatabaseForTests();
  initSchema(db);
  runMigrations(db);
  db.prepare(
    `INSERT INTO participants (id, firstName, lastName, phone, createdAt, sex)
     VALUES ('p1', 'A', 'B', '1', datetime('now'), 'male')`
  ).run();
  db.prepare(
    `INSERT INTO competitions (
       id, runTypeId, runTypeKey, gender, title, status, startedAt, stoppedAt,
       winnerParticipantId, winnerRunSessionId, queuePaused
     ) VALUES ('c1', 0, 'time', 'male', 'T', 'active', datetime('now'), NULL, NULL, NULL, 0)`
  ).run();
  const ins = db.prepare(`
    INSERT INTO run_sessions (
      id, participantId, runTypeId, runType, status, queueNumber,
      resultTime, resultDistance, createdAt, startedAt, finishedAt, competitionId
    ) VALUES (?, 'p1', 0, 'time', ?, 1, NULL, NULL, datetime('now'), NULL, NULL, 'c1')
  `);
  ins.run('s1', 'running');
  ins.run('s2', 'queued');
  ins.run('s3', 'queued');
  ins.run('s4', 'queued');
  assert.equal(runSessions.countGlobalQueueOccupancy(db), 4);
  db.prepare(`UPDATE run_sessions SET status = 'finished' WHERE id = 's4'`).run();
  assert.equal(runSessions.countGlobalQueueOccupancy(db), 3);
});
