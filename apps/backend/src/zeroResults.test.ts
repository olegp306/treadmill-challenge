import test from 'node:test';
import assert from 'node:assert/strict';
import { openInMemoryDatabaseForTests } from './db/sqlite.js';
import { initSchema } from './db/schema.js';
import { runMigrations } from './db/migrations.js';
import { getRankedRuns } from './services/rankingService.js';
import { validateRunSessionResultBody } from './utils/validation.js';
import { parseRunStateOscArgs } from './integrations/touchdesigner/touchDesignerProtocolCompat.js';
import { formatRunResult } from '../../frontend/src/utils/runResultFormat.ts';

test('formatRunResult renders zero metrics explicitly', () => {
  assert.equal(formatRunResult(0, 0, 0), '0 м');
  assert.equal(formatRunResult(1, 0, 0), '0:00');
  assert.equal(formatRunResult(2, 0, 0), '0:00');
});

test('validateRunSessionResultBody accepts zero/missing metrics as valid finish payload', () => {
  const withZero = validateRunSessionResultBody({ runSessionId: 'rs-1', resultTime: 0, distance: 0 });
  assert.equal(withZero.success, true);
  if (withZero.success) {
    assert.equal(withZero.data.resultTime, 0);
    assert.equal(withZero.data.distance, 0);
  }

  const withMissing = validateRunSessionResultBody({ runSessionId: 'rs-2', resultTime: null, distance: undefined });
  assert.equal(withMissing.success, true);
  if (withMissing.success) {
    assert.equal(withMissing.data.resultTime, 0);
    assert.equal(withMissing.data.distance, 0);
  }
});

test('parseRunStateOscArgs accepts stop with zero results', () => {
  const parsed = parseRunStateOscArgs([{ value: 'rs-3' }, { value: 'stop' }, { value: 0 }, { value: 0 }]);
  assert.equal(parsed.kind, 'stop');
  if (parsed.kind === 'stop') {
    assert.equal(parsed.dto.resultTime, 0);
    assert.equal(parsed.dto.distance, 0);
  }
});

test('getRankedRuns keeps finished rows with zero results', async () => {
  const db = await openInMemoryDatabaseForTests();
  initSchema(db);
  runMigrations(db);
  db.prepare(
    `INSERT INTO competitions (
      id, runTypeId, runTypeKey, gender, title, status, startedAt, stoppedAt, winnerParticipantId, winnerRunSessionId, queuePaused
    ) VALUES ('c5m-m', 0, 'max_5_min', 'male', 'M 5min', 'active', datetime('now'), NULL, NULL, NULL, 0)`
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
    ) VALUES (?, ?, 0, 'max_5_min', 'finished', 1, ?, ?, datetime('now'), datetime('now'), datetime('now'), 'c5m-m')
  `);
  ins.run('s1', 'p1', 300, 1200);
  ins.run('s2', 'p2', 0, 0);

  const ranked = getRankedRuns(db, { runTypeId: 0, sex: 'male', sortMode: 'best' });
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0]?.runSessionId, 's1');
  assert.equal(ranked[0]?.rank, 1);
  assert.equal(ranked[1]?.runSessionId, 's2');
  assert.equal(ranked[1]?.resultDistance, 0);
  assert.equal(ranked[1]?.rank, 2);
});
