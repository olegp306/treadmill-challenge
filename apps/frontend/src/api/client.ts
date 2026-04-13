import type { RunTypeId } from '@treadmill-challenge/shared';

const API_BASE = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return data as T;
}

export const api = {
  register(body: {
    name: string;
    phone: string;
    sex?: string;
    runMode?: 'time' | '1km' | '5km';
    runName?: string;
  }) {
    return request<{ id: string; firstName: string; lastName: string; phone: string; createdAt: string }>(
      '/register',
      { method: 'POST', body: JSON.stringify(body) }
    );
  },

  getLeaderboard() {
    return request<{
      leaderboard: Array<{
        participantId: string;
        participantName: string;
        resultTime: number;
        distance: number;
        speed: number;
        runId: string;
        createdAt: string;
      }>;
    }>('/leaderboard');
  },

  getRunQueue(runTypeId?: RunTypeId) {
    const q = runTypeId !== undefined ? `?runTypeId=${runTypeId}` : '';
    return request<{
      entries: Array<{
        runSessionId: string;
        queueNumber: number;
        participantId: string;
        participantName: string;
        runTypeId: RunTypeId;
        runType: string;
        runName: string;
        status: string;
      }>;
    }>(`/run/queue${q}`);
  },

  getParticipant(id: string) {
    return request<{
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
      createdAt: string;
      runs: Array<{
        id: string;
        participantId: string;
        resultTime: number;
        distance: number;
        speed: number;
        createdAt: string;
      }>;
    }>(`/participants/${id}`);
  },

  submitRunResult(body: { runSessionId: string; resultTime: number; distance: number }) {
    return request<{ runId: string; runSessionId: string; participantId: string }>('/run-result', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  startRun(body: { participantId: string; runTypeId: RunTypeId }) {
    return request<{
      runSessionId: string;
      participantId: string;
      runTypeId: RunTypeId;
      runType: string;
      runName: string;
      status: string;
      queueNumber: number;
      position: number;
      createdAt: string;
    }>('/run/start', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  devFinishRun() {
    return request<{ runSessionId: string; runId: string; participantId: string }>('/run/dev-finish', {
      method: 'POST',
    });
  },
};
