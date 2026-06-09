import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { rm } from 'node:fs/promises';
import { runRemoteBackupMirrorOnce } from './backupMirrorScheduler.js';
import { readActiveBackupMetaFile, readActiveBackupRaw } from './activeBackupStore.js';

vi.mock('../local/localClient.js', () => ({
  proxyLocalAdminJsonExport: vi.fn(async () => {
    const snapshot = {
      meta: {
        exportFormatVersion: 1,
        schemaVersion: 1,
        createdAt: '2026-06-09T10:00:00.000Z',
        appVersion: 'test',
        photosNote: 'paths_only_not_binary',
      },
      participants: [],
      competitions: [],
      runSessions: [],
      runs: [],
      events: [],
      adminSettings: [],
    };
    return new Response(JSON.stringify(snapshot), { status: 200 });
  }),
}));

function restoreEnv(name: string, value: string | undefined): void {
  if (value == null) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe('remote backup mirror', () => {
  const prevRuntime = process.env.REMOTE_RUNTIME_DIR;
  const prevStorage = process.env.BACKUP_STORAGE_PATH;
  const prevAutoActive = process.env.REMOTE_BACKUP_AUTO_ACTIVATE_LEADERBOARD;
  let tmp = '';

  beforeEach(() => {
    tmp = path.join(os.tmpdir(), `treadmill-remote-backup-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.REMOTE_RUNTIME_DIR = tmp;
    delete process.env.BACKUP_STORAGE_PATH;
    delete process.env.REMOTE_BACKUP_AUTO_ACTIVATE_LEADERBOARD;
  });

  afterEach(async () => {
    restoreEnv('REMOTE_RUNTIME_DIR', prevRuntime);
    restoreEnv('BACKUP_STORAGE_PATH', prevStorage);
    restoreEnv('REMOTE_BACKUP_AUTO_ACTIVATE_LEADERBOARD', prevAutoActive);
    await rm(tmp, { recursive: true, force: true });
  });

  it('promotes a successful fresh backup to active leaderboard JSON by default', async () => {
    const log = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const result = await runRemoteBackupMirrorOnce(log);
    const activeRaw = await readActiveBackupRaw();
    const activeMeta = await readActiveBackupMetaFile();

    expect(result.ok).toBe(true);
    expect(activeRaw).toBeTruthy();
    expect(activeMeta?.source).toBe('local_refresh');
    expect(activeMeta?.historySourceFile).toMatch(/^remote-backup-/);
  });
});
