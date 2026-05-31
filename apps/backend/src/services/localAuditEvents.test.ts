import test from 'node:test';
import assert from 'node:assert/strict';
import { openInMemoryDatabaseForTests } from '../db/sqlite.js';
import { initSchema } from '../db/schema.js';
import { runMigrations } from '../db/migrations.js';
import * as events from '../db/events.js';
import {
  recordPanelLoginAuditEvent,
  recordParticipantUpdateAuditEvent,
} from './localAuditEvents.js';

test('recordPanelLoginAuditEvent writes a readable manager/admin login event', async () => {
  const db = await openInMemoryDatabaseForTests();
  initSchema(db);
  runMigrations(db);

  recordPanelLoginAuditEvent(db, {
    role: 'manager',
    ip: '127.0.0.1',
    userAgent: 'test-agent',
  });

  const rows = events.listRecentEvents(db, 10);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.type, 'manager_panel_login');
  assert.match(rows[0]?.readableMessage ?? '', /Вход в менеджерскую панель/);
  assert.match(rows[0]?.readableMessage ?? '', /127\.0\.0\.1/);
  assert.deepEqual(JSON.parse(rows[0]?.payload ?? '{}'), {
    actorRole: 'manager',
    actorIp: '127.0.0.1',
    userAgent: 'test-agent',
  });
});

test('recordParticipantUpdateAuditEvent logs changed participant fields with before and after values', async () => {
  const db = await openInMemoryDatabaseForTests();
  initSchema(db);
  runMigrations(db);

  recordParticipantUpdateAuditEvent(db, {
    actorRole: 'manager',
    actorIp: '10.0.0.5',
    userAgent: 'test-agent',
    participantId: 'p1',
    before: {
      firstName: 'Иван',
      lastName: 'Петров',
      phone: '+79001000000',
      sex: 'male',
    },
    after: {
      firstName: 'Иван',
      lastName: 'Сидоров',
      phone: '+79002000000',
      sex: 'male',
    },
  });

  const rows = events.listRecentEvents(db, 10);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.type, 'participant_profile_updated');
  assert.equal(rows[0]?.participantId, 'p1');
  assert.match(rows[0]?.readableMessage ?? '', /Менеджер изменил данные участника/);
  assert.match(rows[0]?.readableMessage ?? '', /фамилия: Петров → Сидоров/);
  assert.match(rows[0]?.readableMessage ?? '', /телефон: \+79001000000 → \+79002000000/);

  const payload = JSON.parse(rows[0]?.payload ?? '{}');
  assert.equal(payload.actorRole, 'manager');
  assert.deepEqual(payload.changes.lastName, { before: 'Петров', after: 'Сидоров' });
  assert.deepEqual(payload.changes.phone, { before: '+79001000000', after: '+79002000000' });
  assert.equal(payload.changes.firstName, undefined);
});
