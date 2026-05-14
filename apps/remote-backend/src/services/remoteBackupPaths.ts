import path from 'node:path';
import { backupDir } from './remoteBackupDir.js';

/** Scheduled / manual pulls from local (dated files only; does not set active). */
export function remoteHistoryDir(): string {
  return path.join(backupDir(), 'history');
}

/** Operator-controlled snapshot used by leaderboard, admin tabs, logs. */
export function remoteActiveDir(): string {
  return path.join(backupDir(), 'active');
}

export function remoteActiveJsonPath(): string {
  return path.join(remoteActiveDir(), 'active.json');
}

export function remoteActiveMetaPath(): string {
  return path.join(remoteActiveDir(), 'active-meta.json');
}
