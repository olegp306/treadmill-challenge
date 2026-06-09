import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { runtimeRootDir } from '../runtimePaths.js';

export type RemoteBackupSettings = {
  autoActivateLeaderboard: boolean;
};

export type PublicRemoteBackupSettings = RemoteBackupSettings & {
  source: {
    autoActivateLeaderboard: 'runtime' | 'env' | 'default';
  };
};

const SETTINGS_PATH = () => path.join(runtimeRootDir(), 'settings', 'remote-backup.json');

function boolFromUnknown(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'off'].includes(s)) return false;
  return null;
}

function readRuntimeSettingsSync(): Partial<RemoteBackupSettings> {
  try {
    const p = SETTINGS_PATH();
    if (!existsSync(p)) return {};
    const parsed = JSON.parse(readFileSync(p, 'utf8')) as Partial<RemoteBackupSettings>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function readRuntimeSettings(): Promise<Partial<RemoteBackupSettings>> {
  try {
    const raw = await readFile(SETTINGS_PATH(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<RemoteBackupSettings>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function readEffectiveRemoteBackupSettingsSync(): RemoteBackupSettings {
  const runtime = readRuntimeSettingsSync();
  return {
    autoActivateLeaderboard:
      boolFromUnknown(runtime.autoActivateLeaderboard) ??
      boolFromUnknown(process.env.REMOTE_BACKUP_AUTO_ACTIVATE_LEADERBOARD) ??
      true,
  };
}

export async function readPublicRemoteBackupSettings(): Promise<PublicRemoteBackupSettings> {
  const runtime = await readRuntimeSettings();
  const runtimeAuto = boolFromUnknown(runtime.autoActivateLeaderboard);
  const envAuto = boolFromUnknown(process.env.REMOTE_BACKUP_AUTO_ACTIVATE_LEADERBOARD);
  return {
    autoActivateLeaderboard: runtimeAuto ?? envAuto ?? true,
    source: {
      autoActivateLeaderboard: runtimeAuto != null ? 'runtime' : envAuto != null ? 'env' : 'default',
    },
  };
}

export async function updateRemoteBackupSettings(update: Partial<RemoteBackupSettings>): Promise<PublicRemoteBackupSettings> {
  const current = await readRuntimeSettings();
  const next: RemoteBackupSettings = {
    autoActivateLeaderboard:
      'autoActivateLeaderboard' in update
        ? Boolean(update.autoActivateLeaderboard)
        : boolFromUnknown(current.autoActivateLeaderboard) ?? true,
  };
  await mkdir(path.dirname(SETTINGS_PATH()), { recursive: true });
  await writeFile(SETTINGS_PATH(), JSON.stringify(next, null, 2), 'utf8');
  return readPublicRemoteBackupSettings();
}
