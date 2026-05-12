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

  latestRemoteBackupJson() {
    return requestJson<unknown>('/api/remote/downloads/backup-json?source=remote-backup&format=json', {
      headers: { ...authHeaders() },
    });
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

  importJson(snapshot: unknown) {
    return requestJson<{ ok: boolean; imported?: boolean }>('/api/remote/import-json', {
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
    return requestJson<unknown>('/api/remote/system/status', { headers: { ...authHeaders() } });
  },

  backupStatus() {
    return requestJson<{
      backup: {
        hasBackup: boolean;
        lastBackupAt: string | null;
        lastBackupSha16: string | null;
        logsHours: number;
        lastError: string | null;
      };
    }>('/api/remote/admin/backup/status', { headers: { ...authHeaders() } });
  },

  pullBackupNow() {
    return requestJson<{ ok: true; pulledAt: string }>('/api/remote/admin/backup/pull', {
      method: 'POST',
      headers: { ...authHeaders() },
      body: JSON.stringify({}),
    });
  },
};

