import { readEffectiveLocalConnectionSettingsSync } from './localConnectionSettings.js';

function localBaseUrl(): string {
  return readEffectiveLocalConnectionSettingsSync().localBackendBaseUrl ?? '';
}

export function getLocalBaseUrl(): string {
  return localBaseUrl();
}

export function getLocalAdminToken(): string {
  return readEffectiveLocalConnectionSettingsSync().localBackendAuthToken ?? '';
}

function localAdminHeaders(): HeadersInit {
  const token = getLocalAdminToken();
  if (!token) return {};
  // Stage 1 dev: use token-based auth for local admin endpoints.
  return { Authorization: `Bearer ${token}` };
}

/** Thrown when proxying to local backend returns a non-OK HTTP status. */
export class LocalProxyHttpError extends Error {
  readonly httpStatus: number;

  constructor(message: string, httpStatus: number) {
    super(message);
    this.name = 'LocalProxyHttpError';
    this.httpStatus = httpStatus;
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? `HTTP ${response.status}`);
  }
  return data as T;
}

export async function getLocalHealthStatus(): Promise<unknown> {
  const base = localBaseUrl();
  if (!base) throw new Error('LOCAL_BACKEND_BASE_URL is not configured');
  const res = await fetch(`${base}/api/health/status`);
  return parseJson(res);
}

export async function getLocalAdminRecentRuns(): Promise<unknown> {
  const base = localBaseUrl();
  if (!base) throw new Error('LOCAL_BACKEND_BASE_URL is not configured');
  const res = await fetch(`${base}/api/admin/recent-runs`, { headers: { ...localAdminHeaders() } });
  return parseJson(res);
}

export async function getLocalTdHealthDiagnostics(): Promise<unknown> {
  const base = localBaseUrl();
  if (!base) throw new Error('LOCAL_BACKEND_BASE_URL is not configured');
  const res = await fetch(`${base}/api/admin/td/health-diagnostics`, { headers: { ...localAdminHeaders() } });
  return parseJson(res);
}

export async function updateLocalTdHealthFilePath(tdHealthFilePath: string | null): Promise<unknown> {
  const base = localBaseUrl();
  if (!base) throw new Error('LOCAL_BACKEND_BASE_URL is not configured');
  const res = await fetch(`${base}/api/admin/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...localAdminHeaders() },
    body: JSON.stringify({ tdHealthFilePath }),
  });
  return parseJson(res);
}

export async function proxyLocalAdminJsonExport(logsHours?: number): Promise<Response> {
  const base = localBaseUrl();
  if (!base) throw new Error('LOCAL_BACKEND_BASE_URL is not configured');
  const q = new URLSearchParams();
  if (logsHours != null) q.set('logsHours', String(logsHours));
  return fetch(`${base}/api/admin/data/export${q.toString() ? `?${q.toString()}` : ''}`, {
    headers: { ...localAdminHeaders() },
  });
}

export async function proxyLocalAdminLeaderboardsXlsx(): Promise<Response> {
  const base = localBaseUrl();
  if (!base) throw new Error('LOCAL_BACKEND_BASE_URL is not configured');
  return fetch(`${base}/api/admin/leaderboards/export-xlsx`, {
    headers: { ...localAdminHeaders() },
  });
}

export async function proxyLocalAdminImportJson(body: unknown): Promise<unknown> {
  const base = localBaseUrl();
  if (!base) throw new Error('LOCAL_BACKEND_BASE_URL is not configured');
  let res: Response;
  try {
    res = await fetch(`${base}/api/admin/data/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...localAdminHeaders() },
      body: JSON.stringify(body),
    });
  } catch {
    throw new LocalProxyHttpError('Локальный сервер недоступен', 502);
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new LocalProxyHttpError(data.error ?? `HTTP ${res.status}`, res.status);
  }
  return data;
}

export async function getLocalAdminRunSessions(): Promise<unknown> {
  const base = localBaseUrl();
  if (!base) throw new Error('LOCAL_BACKEND_BASE_URL is not configured');
  const res = await fetch(`${base}/api/admin/manager/queue-history`, { headers: { ...localAdminHeaders() } });
  return parseJson(res);
}

export async function updateLocalAdminRunSessionResult(runSessionId: string, resultTime: number, resultDistance: number): Promise<unknown> {
  const base = localBaseUrl();
  if (!base) throw new Error('LOCAL_BACKEND_BASE_URL is not configured');
  const res = await fetch(`${base}/api/admin/manager/queue-history/${encodeURIComponent(runSessionId)}/result`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...localAdminHeaders() },
    body: JSON.stringify({ resultTime, resultDistance }),
  });
  return parseJson(res);
}

export async function deleteLocalAdminRunSessionEntry(runSessionId: string, pin: string): Promise<unknown> {
  const base = localBaseUrl();
  if (!base) throw new Error('LOCAL_BACKEND_BASE_URL is not configured');
  const res = await fetch(`${base}/api/admin/manager/queue-history/${encodeURIComponent(runSessionId)}/entry`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...localAdminHeaders() },
    body: JSON.stringify({ pin }),
  });
  return parseJson(res);
}
