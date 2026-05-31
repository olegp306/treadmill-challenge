import test from 'node:test';
import assert from 'node:assert/strict';
import { openInMemoryDatabaseForTests } from '../db/sqlite.js';
import { initSchema } from '../db/schema.js';
import { runMigrations } from '../db/migrations.js';
import * as adminSettings from '../db/adminSettings.js';
import { buildGodAdminPins, getManagerPins } from './adminPinPolicy.js';

test('god admin pins never include disabled legacy pin from any source', () => {
  const disabledPin = '5'.repeat(6);
  const pins = buildGodAdminPins({
    envPin: disabledPin,
    localBackendAuthToken: disabledPin,
    configuredPin: disabledPin,
  });

  assert.equal(pins.has(disabledPin), false);
  assert.equal(pins.has('191181'), true);
});

test('manager panel accepts only the manager pin 332277', () => {
  const pins = getManagerPins();

  assert.deepEqual([...pins], ['332277']);
});

test('migrations replace disabled stored admin pin with active admin pin', async () => {
  const disabledPin = '5'.repeat(6);
  const db = await openInMemoryDatabaseForTests();
  initSchema(db);
  adminSettings.setSetting(db, 'adminPin', disabledPin);

  runMigrations(db);

  assert.equal(adminSettings.getAdminPin(db), '191181');
});
