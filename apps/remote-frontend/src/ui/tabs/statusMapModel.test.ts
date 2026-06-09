import { describe, expect, it } from 'vitest';
import { buildStatusMapModel } from './statusMapModel';

describe('buildStatusMapModel', () => {
  it('builds an ok mobile status map from live health, remote connectivity, and backup status', () => {
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
      systemStatus: {
        remote: {
          online: true,
          appVersion: null,
          serverTime: '2026-05-23T10:04:00.000Z',
          backupMirrorEnabled: true,
          backupRetentionCount: 24,
        },
        local: {
          baseUrl: 'http://100.111.14.30:3001',
          online: true,
          lastHealthCheckAt: '2026-05-23T10:04:00.000Z',
          lastError: null,
          storeHeartbeat: {
            lastHeartbeatAt: '2026-05-23T10:03:00.000Z',
            lastRemoteAddress: '100.111.14.30',
            lastUserAgent: 'store-backend',
          },
        },
        backups: {
          folderPath: '/tmp/history',
          backupRoot: '/tmp/backups',
          historyDir: '/tmp/history',
          activeDir: '/tmp/active',
          latestFileName: 'remote-backup.json',
          latestCreatedAt: '2026-05-23T09:57:00.000Z',
          lastBackupAt: '2026-05-23T09:57:00.000Z',
          lastBackupSha16: 'abc123',
          backupLogsHours: 48,
          totalCount: 1,
          lastError: null,
          activeUpdatedAt: '2026-05-23T09:58:00.000Z',
          activeSource: 'local_refresh',
          activeEnvelopeCreatedAt: '2026-05-23T09:57:00.000Z',
        },
      },
      backupStatus: {
        hasBackup: true,
        lastBackupAt: '2026-05-23T09:57:00.000Z',
        lastBackupSha16: 'abc123',
        lastBackupFileName: 'remote-backup.json',
        logsHours: 48,
        lastError: null,
        lastMirrorSuccessAt: '2026-05-23T09:57:00.000Z',
        lastHistoryMirrorAt: '2026-05-23T09:57:00.000Z',
        activeUpdatedAt: '2026-05-23T09:58:00.000Z',
        activeSource: 'local_refresh',
        activeEnvelopeCreatedAt: '2026-05-23T09:57:00.000Z',
        autoActivateLeaderboard: true,
        autoActivateLeaderboardSource: 'default',
        remoteBackendVersion: '0.1.0',
      },
      activeMonitoringEmpty: false,
    });

    expect(model.overall.severity).toBe('ok');
    expect(model.overall.label).toBe('Все критичные системы работают');
    expect(model.store.status).toBe('ok');
    expect(model.connection.status).toBe('ok');
    expect(model.hosting.status).toBe('ok');
    expect(model.hosting.title).toBe('Хостинг: Remote Computer (Яндекс Cloud)');
    expect(model.store.metrics).toContainEqual({ label: 'Remote -> магазин', value: 'connected' });
    expect(model.connection.metrics).toContainEqual({ label: 'API магазина', value: 'http://100.111.14.30:3001' });
    expect(model.hosting.services.map((s) => s.title)).toEqual([
      'Leaderboard + админка лидерборда',
      'Система бэкапов данных из магазина',
      'Система алертов о состоянии системы',
    ]);
    expect(model.events.map((event) => event.title)).toContain('Remote-сервер видит магазин');
    expect(model.events.map((event) => event.title)).toContain('Получен health-сигнал от магазина');
    expect(model.events.map((event) => event.title)).toContain('Backup сохранен на хостинге');
  });

  it('marks connection and hosting as critical when remote cannot reach store and backups fail', () => {
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
      systemStatus: {
        remote: {
          online: true,
          appVersion: null,
          serverTime: '2026-05-23T10:04:00.000Z',
          backupMirrorEnabled: true,
          backupRetentionCount: 24,
        },
        local: {
          baseUrl: 'http://100.111.14.30:3001',
          online: false,
          lastHealthCheckAt: null,
          lastError: 'fetch failed',
        },
        backups: {
          folderPath: '/tmp/history',
          backupRoot: '/tmp/backups',
          historyDir: '/tmp/history',
          activeDir: '/tmp/active',
          latestFileName: null,
          latestCreatedAt: null,
          lastBackupAt: null,
          lastBackupSha16: null,
          backupLogsHours: 48,
          totalCount: 0,
          lastError: 'mirror failed',
          activeUpdatedAt: null,
          activeSource: null,
          activeEnvelopeCreatedAt: null,
        },
      },
      backupStatus: {
        hasBackup: false,
        lastBackupAt: null,
        lastBackupSha16: null,
        lastBackupFileName: null,
        logsHours: 48,
        lastError: 'mirror failed',
        lastMirrorSuccessAt: null,
        lastHistoryMirrorAt: null,
        activeUpdatedAt: null,
        activeSource: null,
        activeEnvelopeCreatedAt: null,
        autoActivateLeaderboard: true,
        autoActivateLeaderboardSource: 'default',
        remoteBackendVersion: null,
      },
      activeMonitoringEmpty: true,
    });

    expect(model.overall.severity).toBe('critical');
    expect(model.connection.status).toBe('critical');
    expect(model.store.metrics).toContainEqual({ label: 'Remote -> магазин', value: 'offline' });
    expect(model.hosting.services.find((s) => s.title === 'Система бэкапов данных из магазина')?.status).toBe('critical');
    expect(model.events[0]?.status).toBe('critical');
  });
});
