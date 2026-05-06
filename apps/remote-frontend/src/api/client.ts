type LoginResponse = { ok: true; token: string };

const API_BASE = (import.meta.env.VITE_REMOTE_API_BASE_URL as string | undefined)?.trim() || '';

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
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
    const res = await fetch(`${API_BASE}/api/remote/downloads/backup-json`, { headers: { ...authHeaders() } });
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
    const res = await fetch(`${API_BASE}/api/remote/downloads/leaderboards-xlsx`, { headers: { ...authHeaders() } });
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
};

