import { describe, expect, it } from 'vitest';
import { buildStatusMapModel } from './statusMapModel';

describe('buildStatusMapModel', () => {
  it('builds an ok mobile status map from live health and backup status', () => {
    const model = buildStatusMapModel({
      nowMs: new Date('2026-05-23T10:04:00.000Z').getTime(),
      healthLoadedAt: '2026-05-23T10:04:00.000Z',
      activeMonLoadedAt: '2026-05-23T10:03:50.000Z',
      health: {
        appVersion: '0.5.0',
        backendOnline: true,
        timestamp: '2026-05-23T10:03:59.000Z',
        ipad: {
          online: true,
          lastHeartbeatAt: '2026-05-23T10:03:30.000Z',
        },
        td: {
          lastTdEventAt: '2026-05-23T10:03:20.000Z',
          healthFile: { fps: 60, errors: [] },
        },
        system: {
          internetOk: true,
        },
        queue: {
          queuedCount: 2,
          runningCount: 0,
        },
        runs: {
          lastSuccessfulRunAt: '2026-05-23T09:51:00.000Z',
        },
        warnings: [],
        errors: [],
      },
      backupStatus: {
        hasBackup: true,
        lastBackupAt: '2026-05-23T09:57:00.000Z',
        lastBackupSha16: 'abc123',
        logsHours: 48,
        lastError: null,
        lastMirrorSuccessAt: '2026-05-23T09:57:00.000Z',
        lastHistoryMirrorAt: '2026-05-23T09:57:00.000Z',
        activeUpdatedAt: '2026-05-23T09:58:00.000Z',
        activeSource: 'local_refresh',
        activeEnvelopeCreatedAt: '2026-05-23T09:57:00.000Z',
      },
      activeMonitoringEmpty: false,
    });

    expect(model.overall.severity).toBe('ok');
    expect(model.overall.label).toBe('Все критичные системы работают');
    expect(model.store.status).toBe('ok');
    expect(model.connection.status).toBe('ok');
    expect(model.hosting.status).toBe('ok');
    expect(model.hosting.title).toBe('Хостинг: Remote Computer (Яндекс Cloud)');
    expect(model.hosting.services.map((s) => s.title)).toEqual([
      'Leaderboard + админка лидерборда',
      'Система бэкапов данных из магазина',
      'Система алертов о состоянии системы',
    ]);
    expect(model.events.map((event) => event.title)).toContain('Получен health-сигнал от магазина');
    expect(model.events.map((event) => event.title)).toContain('Backup сохранен на хостинге');
  });

  it('marks connection and hosting as critical when internet and backups fail', () => {
    const model = buildStatusMapModel({
      nowMs: new Date('2026-05-23T10:04:00.000Z').getTime(),
      healthLoadedAt: null,
      activeMonLoadedAt: null,
      health: {
        appVersion: '0.5.0',
        backendOnline: true,
        timestamp: '2026-05-23T10:03:59.000Z',
        system: { internetOk: false },
        warnings: ['no_internet'],
        errors: [],
      },
      backupStatus: {
        hasBackup: false,
        lastBackupAt: null,
        lastBackupSha16: null,
        logsHours: 48,
        lastError: 'mirror failed',
        lastMirrorSuccessAt: null,
        lastHistoryMirrorAt: null,
        activeUpdatedAt: null,
        activeSource: null,
        activeEnvelopeCreatedAt: null,
      },
      activeMonitoringEmpty: true,
    });

    expect(model.overall.severity).toBe('critical');
    expect(model.connection.status).toBe('critical');
    expect(model.hosting.services.find((s) => s.title === 'Система бэкапов данных из магазина')?.status).toBe('critical');
    expect(model.events[0]?.status).toBe('critical');
  });
});
