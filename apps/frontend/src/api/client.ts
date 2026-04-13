import type { RunType } from '@treadmill-challenge/shared';

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
    return request<{ id: string; name: string; phone: string; status: string; createdAt: string }>(
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

  getParticipant(id: string) {
    return request<{
      id: string;
      name: string;
      phone: string;
      status: string;
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

  submitRunResult(body: { participantId: string; resultTime: number; distance: number; speed: number }) {
    return request<{ runId: string; participantId: string }>('/run-result', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  startRun(body: { participantId: string; runType: RunType }) {
    return request<{
      runSessionId: string;
      participantId: string;
      runType: RunType;
      status: string;
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
