import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { runtimeRootDir } from '../runtimePaths.js';

export type LocalConnectionSettings = {
  localBackendBaseUrl: string | null;
  localBackendAuthToken: string | null;
  remoteBackendPublicUrl: string | null;
  heartbeatToken: string | null;
};

export type PublicLocalConnectionSettings = {
  localBackendBaseUrl: string | null;
  localBackendAuthTokenConfigured: boolean;
  remoteBackendPublicUrl: string | null;
  heartbeatTokenConfigured: boolean;
  heartbeatTokenPreview: string | null;
  heartbeatUrl: string | null;
  source: {
    localBackendBaseUrl: 'runtime' | 'env' | 'missing';
    localBackendAuthToken: 'runtime' | 'env' | 'missing';
    remoteBackendPublicUrl: 'runtime' | 'env' | 'missing';
    heartbeatToken: 'runtime' | 'env' | 'missing';
  };
};

export type StoreHeartbeatState = {
  lastHeartbeatAt: string | null;
  lastRemoteAddress: string | null;
  lastUserAgent: string | null;
};

const SETTINGS_PATH = () => path.join(runtimeRootDir(), 'settings', 'local-connection.json');
const HEARTBEAT_PATH = () => path.join(runtimeRootDir(), 'monitoring', 'store-heartbeat.json');

function cleanString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s ? s.replace(/\/+$/, '') : null;
}

function cleanToken(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s ? s : null;
}

function env(name: string): string | null {
  return cleanString(process.env[name]);
}

function envToken(name: string): string | null {
  return cleanToken(process.env[name]);
}

function previewSecret(v: string | null): string | null {
  if (!v) return null;
  if (v.length <= 8) return 'configured';
  return `...${v.slice(-4)}`;
}

function readRuntimeSettingsSync(): Partial<LocalConnectionSettings> {
  try {
    const p = SETTINGS_PATH();
    if (!existsSync(p)) return {};
    const parsed = JSON.parse(readFileSync(p, 'utf8')) as Partial<LocalConnectionSettings>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function readRuntimeSettings(): Promise<Partial<LocalConnectionSettings>> {
  try {
    const raw = await readFile(SETTINGS_PATH(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalConnectionSettings>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function readEffectiveLocalConnectionSettingsSync(): LocalConnectionSettings {
  const runtime = readRuntimeSettingsSync();
  return {
    localBackendBaseUrl: cleanString(runtime.localBackendBaseUrl) ?? env('LOCAL_BACKEND_BASE_URL'),
    localBackendAuthToken: cleanToken(runtime.localBackendAuthToken) ?? envToken('LOCAL_BACKEND_AUTH_TOKEN'),
    remoteBackendPublicUrl: cleanString(runtime.remoteBackendPublicUrl) ?? env('REMOTE_BACKEND_PUBLIC_URL') ?? env('REMOTE_PUBLIC_BASE_URL'),
    heartbeatToken: cleanToken(runtime.heartbeatToken) ?? envToken('STORE_HEARTBEAT_TOKEN'),
  };
}

export async function readEffectiveLocalConnectionSettings(): Promise<LocalConnectionSettings> {
  return readEffectiveLocalConnectionSettingsSync();
}

function buildHeartbeatUrl(settings: LocalConnectionSettings): string | null {
  if (!settings.remoteBackendPublicUrl) return null;
  const base = settings.remoteBackendPublicUrl.replace(/\/+$/, '');
  const token = settings.heartbeatToken ? `?token=${encodeURIComponent(settings.heartbeatToken)}` : '';
  return `${base}/api/remote/store-heartbeat${token}`;
}

export async function readPublicLocalConnectionSettings(): Promise<PublicLocalConnectionSettings> {
  const runtime = await readRuntimeSettings();
  const effective = await readEffectiveLocalConnectionSettings();
  return {
    localBackendBaseUrl: effective.localBackendBaseUrl,
    localBackendAuthTokenConfigured: Boolean(effective.localBackendAuthToken),
    remoteBackendPublicUrl: effective.remoteBackendPublicUrl,
    heartbeatTokenConfigured: Boolean(effective.heartbeatToken),
    heartbeatTokenPreview: previewSecret(effective.heartbeatToken),
    heartbeatUrl: buildHeartbeatUrl(effective),
    source: {
      localBackendBaseUrl: cleanString(runtime.localBackendBaseUrl) ? 'runtime' : env('LOCAL_BACKEND_BASE_URL') ? 'env' : 'missing',
      localBackendAuthToken: cleanToken(runtime.localBackendAuthToken) ? 'runtime' : envToken('LOCAL_BACKEND_AUTH_TOKEN') ? 'env' : 'missing',
      remoteBackendPublicUrl: cleanString(runtime.remoteBackendPublicUrl)
        ? 'runtime'
        : env('REMOTE_BACKEND_PUBLIC_URL') || env('REMOTE_PUBLIC_BASE_URL')
          ? 'env'
          : 'missing',
      heartbeatToken: cleanToken(runtime.heartbeatToken) ? 'runtime' : envToken('STORE_HEARTBEAT_TOKEN') ? 'env' : 'missing',
    },
  };
}

export async function updateLocalConnectionSettings(update: Partial<LocalConnectionSettings>): Promise<PublicLocalConnectionSettings> {
  const current = await readRuntimeSettings();
  const next: LocalConnectionSettings = {
    localBackendBaseUrl:
      'localBackendBaseUrl' in update ? cleanString(update.localBackendBaseUrl) : cleanString(current.localBackendBaseUrl),
    localBackendAuthToken:
      'localBackendAuthToken' in update ? cleanToken(update.localBackendAuthToken) : cleanToken(current.localBackendAuthToken),
    remoteBackendPublicUrl:
      'remoteBackendPublicUrl' in update ? cleanString(update.remoteBackendPublicUrl) : cleanString(current.remoteBackendPublicUrl),
    heartbeatToken: 'heartbeatToken' in update ? cleanToken(update.heartbeatToken) : cleanToken(current.heartbeatToken),
  };
  await mkdir(path.dirname(SETTINGS_PATH()), { recursive: true });
  await writeFile(SETTINGS_PATH(), JSON.stringify(next, null, 2), 'utf8');
  return readPublicLocalConnectionSettings();
}

export async function writeStoreHeartbeat(state: Omit<StoreHeartbeatState, 'lastHeartbeatAt'> & { lastHeartbeatAt?: string }): Promise<StoreHeartbeatState> {
  const next: StoreHeartbeatState = {
    lastHeartbeatAt: state.lastHeartbeatAt ?? new Date().toISOString(),
    lastRemoteAddress: state.lastRemoteAddress,
    lastUserAgent: state.lastUserAgent,
  };
  await mkdir(path.dirname(HEARTBEAT_PATH()), { recursive: true });
  await writeFile(HEARTBEAT_PATH(), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

export async function readStoreHeartbeat(): Promise<StoreHeartbeatState> {
  try {
    const raw = await readFile(HEARTBEAT_PATH(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreHeartbeatState>;
    return {
      lastHeartbeatAt: cleanToken(parsed.lastHeartbeatAt),
      lastRemoteAddress: cleanToken(parsed.lastRemoteAddress),
      lastUserAgent: cleanToken(parsed.lastUserAgent),
    };
  } catch {
    return { lastHeartbeatAt: null, lastRemoteAddress: null, lastUserAgent: null };
  }
}
