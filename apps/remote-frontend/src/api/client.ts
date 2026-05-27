import {
  BACKUP_IMPORT_DEFAULT_BYTES,
  backupImportFileTooLargeMessage,
} from '@treadmill-challenge/shared';

type LoginResponse = { ok: true; token: string };

const API_BASE = (import.meta.env.VITE_REMOTE_API_BASE_URL as string | undefined)?.trim() || '';

function readBackupImportMaxBytesFromVite(): number {
  const raw = (import.meta.env.VITE_BACKUP_IMPORT_MAX_BYTES as string | undefined)?.trim();
  if (!raw) return BACKUP_IMPORT_DEFAULT_BYTES;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : BACKUP_IMPORT_DEFAULT_BYTES;
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch (e) {
    if (e instanceof TypeError || (e instanceof Error && e.message === 'Failed to fetch')) {
      throw new Error(
        'Не удалось выполнить запрос к remote API. Проверьте VITE_REMOTE_API_BASE_URL, сеть, HTTPS и CORS.'
      );
    }
    throw e;
  }

  const readJson = async (): Promise<{ error?: string }> => {
    const ct = res.headers.get('Content-Type') ?? '';
    if (!ct.includes('application/json')) return {};
    return (await res.json().catch(() => ({}))) as { error?: string };
  };

  if (!res.ok) {
    const data = await readJson();
    const errText = data.error ?? `HTTP ${res.status}`;
    if (res.status === 413) {
      throw new Error(
        data.error ?? backupImportFileTooLargeMessage(readBackupImportMaxBytesFromVite())
      );
    }
    if (res.status === 502 && path === '/api/remote/import-json') {
      if (
        errText === 'Локальный сервер недоступен' ||
        errText.startsWith('Local backend unavailable')
      ) {
        throw new Error('Локальный сервер недоступен');
      }
    }
    throw new Error(errText);
  }

  const data = (await res.json().catch(() => ({}))) as T;
  return data;
}

function getToken(): string {
  if (typeof sessionStorage === 'undefined') return '';
  return sessionStorage.getItem('remoteAdminToken') ?? '';
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type RemoteBackupStatus = {
  hasBackup: boolean;
  lastBackupAt: string | null;
  lastBackupSha16: string | null;
  lastBackupFileName: string | null;
  logsHours: number;
  lastError: string | null;
  lastMirrorSuccessAt: string | null;
  lastHistoryMirrorAt: string | null;
  activeUpdatedAt: string | null;
  activeSource: 'local_refresh' | 'manual_import' | 'migrated_legacy' | null;
  activeEnvelopeCreatedAt: string | null;
  remoteBackendVersion: string | null;
};

export type TelegramSettings = {
  botTokenConfigured: boolean;
  botTokenPreview: string | null;
  chatId: string | null;
  statusPageUrl: string | null;
  webhookSecretConfigured: boolean;
  alertsEnabled: boolean;
  source: {
    botToken: 'runtime' | 'env' | 'missing';
    chatId: 'runtime' | 'env' | 'missing';
    statusPageUrl: 'runtime' | 'env' | 'derived' | 'missing';
    webhookSecret: 'runtime' | 'env' | 'missing';
  };
};

export type LocalConnectionSettings = {
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

export type StoreHeartbeat = {
  lastHeartbeatAt: string | null;
  lastRemoteAddress: string | null;
  lastUserAgent: string | null;
};

export type RemoteSystemStatus = {
  remote: {
    online: boolean;
    appVersion: string | null;
    serverTime: string;
    backupMirrorEnabled: boolean;
    backupRetentionCount: number;
  };
  local: {
    baseUrl: string | null;
    online: boolean;
    lastHealthCheckAt: string | null;
    lastError: string | null;
    storeHeartbeat?: StoreHeartbeat;
  };
  backups: {
    folderPath: string;
    backupRoot: string;
    historyDir: string;
    activeDir: string;
    latestFileName: string | null;
    latestCreatedAt: string | null;
    lastBackupAt: string | null;
    lastBackupSha16: string | null;
    backupLogsHours: number;
    totalCount: number;
    lastError: string | null;
    activeUpdatedAt: string | null;
    activeSource: string | null;
    activeEnvelopeCreatedAt: string | null;
  };
};

export const api = {
  async login(pin: string): Promise<void> {
    const res = await requestJson<LoginResponse>('/api/remote/admin/login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    sessionStorage.setItem('remoteAdminToken', res.token);
  },

  logout() {
    return requestJson<{ ok: boolean }>('/api/remote/admin/logout', { method: 'POST', headers: { ...authHeaders() } });
  },

  healthStatus() {
    return requestJson<unknown>('/api/remote/health/status', { headers: { ...authHeaders() } });
  },

  recentRuns() {
    return requestJson<unknown>('/api/remote/admin/recent-runs', { headers: { ...authHeaders() } });
  },

  activeBackupMonitoring() {
    return requestJson<{ empty: boolean; remote: unknown }>('/api/remote/admin/active-backup/monitoring', {
      headers: { ...authHeaders() },
    });
  },

  async downloadBackupJson(): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/remote/downloads/backup-json`, { headers: { ...authHeaders() } });
    } catch (e) {
      if (e instanceof TypeError || (e instanceof Error && e.message === 'Failed to fetch')) {
        throw new Error(
          'Не удалось выполнить запрос к remote API. Проверьте VITE_REMOTE_API_BASE_URL, сеть, HTTPS и CORS.'
        );
      }
      throw e;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') ?? '';
    const quoted = cd.match(/filename="([^"]+)"/);
    const bare = cd.match(/filename=([^;\s]+)/);
    const filename = quoted?.[1] ?? bare?.[1]?.replace(/^"|"$/g, '') ?? 'backup.json';
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
  },

  /** Current ACTIVE remote backup (operator snapshot), same JSON as Logs tab. */
  latestRemoteBackupJson() {
    return requestJson<unknown>('/api/remote/downloads/backup-json?source=remote-backup&format=json', {
      headers: { ...authHeaders() },
    });
  },

  latestHistoryBackupJson() {
    return requestJson<unknown>('/api/remote/downloads/backup-json?source=latest-history&format=json', {
      headers: { ...authHeaders() },
    });
  },

  async downloadLatestHistoryBackup(): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/remote/downloads/backup-json?source=latest-history`, { headers: { ...authHeaders() } });
    } catch (e) {
      if (e instanceof TypeError || (e instanceof Error && e.message === 'Failed to fetch')) {
        throw new Error(
          'Не удалось выполнить запрос к remote API. Проверьте VITE_REMOTE_API_BASE_URL, сеть, HTTPS и CORS.'
        );
      }
      throw e;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') ?? '';
    const quoted = cd.match(/filename="([^"]+)"/);
    const bare = cd.match(/filename=([^;\s]+)/);
    const filename = quoted?.[1] ?? bare?.[1]?.replace(/^"|"$/g, '') ?? 'remote-backup-latest.json';
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
  },

  async downloadLeaderboardsXlsx(): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/remote/downloads/leaderboards-xlsx`, { headers: { ...authHeaders() } });
    } catch (e) {
      if (e instanceof TypeError || (e instanceof Error && e.message === 'Failed to fetch')) {
        throw new Error(
          'Не удалось выполнить запрос к remote API. Проверьте VITE_REMOTE_API_BASE_URL, сеть, HTTPS и CORS.'
        );
      }
      throw e;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') ?? '';
    const quoted = cd.match(/filename="([^"]+)"/);
    const bare = cd.match(/filename=([^;\s]+)/);
    const filename = quoted?.[1] ?? bare?.[1]?.replace(/^"|"$/g, '') ?? 'leaderboards.xlsx';
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
  },

  /** Restore / import JSON on the local treadmill backend (remote → local). */
  importJsonToLocalTreadmill(snapshot: unknown) {
    return requestJson<{ ok: boolean; imported?: boolean }>('/api/remote/import-json', {
      method: 'POST',
      headers: { ...authHeaders() },
      body: JSON.stringify(snapshot),
    });
  },

  /** Set the active leaderboard JSON on this remote server only (does not call local backend). */
  importRemoteActiveBackup(snapshot: unknown) {
    return requestJson<{ ok: true; activeUpdatedAt: string }>('/api/remote/admin/backup/import-remote-active', {
      method: 'POST',
      headers: { ...authHeaders() },
      body: JSON.stringify(snapshot),
    });
  },

  /** Store a JSON backup in remote history without making it the leaderboard JSON. */
  importRemoteHistoryBackup(snapshot: unknown) {
    return requestJson<{ ok: true; importedAt: string; historyFile: string }>('/api/remote/admin/backup/import-history', {
      method: 'POST',
      headers: { ...authHeaders() },
      body: JSON.stringify(snapshot),
    });
  },

  runSessions() {
    return requestJson<unknown>('/api/remote/admin/run-sessions', { headers: { ...authHeaders() } });
  },

  updateRunSessionResult(runSessionId: string, payload: { resultTime: number; resultDistance: number }) {
    return requestJson<{ ok: boolean }>(`/api/remote/admin/run-sessions/${encodeURIComponent(runSessionId)}/result`, {
      method: 'PUT',
      headers: { ...authHeaders() },
      body: JSON.stringify(payload),
    });
  },

  deleteRunSession(runSessionId: string) {
    return requestJson<{ ok: boolean }>(`/api/remote/admin/run-sessions/${encodeURIComponent(runSessionId)}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });
  },

  systemStatus() {
    return requestJson<RemoteSystemStatus>('/api/remote/system/status', { headers: { ...authHeaders() } });
  },

  backupStatus() {
    return requestJson<{ backup: RemoteBackupStatus }>('/api/remote/admin/backup/status', {
      headers: { ...authHeaders() },
    });
  },

  telegramSettings() {
    return requestJson<{ settings: TelegramSettings }>('/api/remote/admin/telegram/settings', {
      headers: { ...authHeaders() },
    });
  },

  localConnectionSettings() {
    return requestJson<{ settings: LocalConnectionSettings; heartbeat: StoreHeartbeat }>(
      '/api/remote/admin/local-connection/settings',
      { headers: { ...authHeaders() } }
    );
  },

  updateLocalConnectionSettings(payload: {
    localBackendBaseUrl?: string | null;
    localBackendAuthToken?: string | null;
    remoteBackendPublicUrl?: string | null;
    heartbeatToken?: string | null;
  }) {
    return requestJson<{ settings: LocalConnectionSettings; heartbeat: StoreHeartbeat }>(
      '/api/remote/admin/local-connection/settings',
      {
        method: 'PUT',
        headers: { ...authHeaders() },
        body: JSON.stringify(payload),
      }
    );
  },

  updateTelegramSettings(payload: {
    botToken?: string | null;
    chatId?: string | null;
    statusPageUrl?: string | null;
    webhookSecret?: string | null;
    alertsEnabled?: boolean;
  }) {
    return requestJson<{ settings: TelegramSettings }>('/api/remote/admin/telegram/settings', {
      method: 'PUT',
      headers: { ...authHeaders() },
      body: JSON.stringify(payload),
    });
  },

  sendTelegramTestAlert() {
    return requestJson<{ ok: boolean }>('/api/remote/admin/telegram/test-alert', {
      method: 'POST',
      headers: { ...authHeaders() },
      body: JSON.stringify({}),
    });
  },

  pullBackupNow() {
    return requestJson<{ ok: true; pulledAt: string; activeRefreshed: false }>('/api/remote/admin/backup/pull', {
      method: 'POST',
      headers: { ...authHeaders() },
      body: JSON.stringify({}),
    });
  },
};
