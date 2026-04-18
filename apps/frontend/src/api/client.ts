import type { Gender, RunTypeId } from '@treadmill-challenge/shared';

const API_BASE = '/api';

function hasNonEmptyRequestBody(body: RequestInit['body']): boolean {
  if (body === undefined || body === null) return false;
  if (typeof body === 'string') return body.length > 0;
  return true;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(hasNonEmptyRequestBody(options.body) ? { 'Content-Type': 'application/json' } : {}),
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

function adminHeaders(): HeadersInit {
  if (typeof sessionStorage === 'undefined') return {};
  const pin = sessionStorage.getItem('adminPin');
  return pin ? { 'X-Admin-Pin': pin } : {};
}

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return request<T>(path, {
    ...options,
    headers: { ...adminHeaders(), ...options.headers },
  });
}

export const api = {
  register(body: {
    name: string;
    phone: string;
    sex?: string;
    runMode?: 'time' | '1km' | '5km';
    runName?: string;
  }) {
    return request<{
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
      sex: Gender;
      createdAt: string;
    }>('/register', { method: 'POST', body: JSON.stringify(body) });
  },

  getLeaderboard(scope?: { runTypeId: RunTypeId; sex: Gender }) {
    const q = new URLSearchParams();
    if (scope) {
      q.set('runTypeId', String(scope.runTypeId));
      q.set('sex', scope.sex);
    }
    const qs = q.toString();
    return request<{
      scoped: boolean;
      runTypeId: RunTypeId | null;
      sex: Gender | null;
      runTypeName: string | null;
      competitionTitle: string | null;
      leaderboard: Array<{
        rank?: number;
        participantId: string;
        participantName: string;
        resultTime: number;
        distance: number;
        speed: number;
        runId: string;
        createdAt: string;
      }>;
    }>(`/leaderboard${qs ? `?${qs}` : ''}`);
  },

  getRunQueue(runTypeId?: RunTypeId, sex?: Gender) {
    const q = new URLSearchParams();
    if (runTypeId !== undefined) q.set('runTypeId', String(runTypeId));
    if (sex !== undefined) q.set('sex', sex);
    const qs = q.toString();
    return request<{
      entries: Array<{
        runSessionId: string;
        queueNumber: number;
        participantId: string;
        participantName: string;
        sex: Gender;
        competitionId: string;
        runTypeId: RunTypeId;
        runType: string;
        runName: string;
        status: string;
      }>;
    }>(`/run/queue${qs ? `?${qs}` : ''}`);
  },

  getRunSessionState(runSessionId: string, participantId?: string) {
    const q = new URLSearchParams();
    if (participantId) q.set('participantId', participantId);
    const qs = q.toString();
    return request<{
      runSessionId: string;
      participantId: string;
      competitionId: string;
      runTypeId: RunTypeId;
      status: 'queued' | 'running' | 'finished' | 'cancelled';
      queueNumber: number;
      queuePosition: number | null;
      startedAt: string | null;
      finishedAt: string | null;
    }>(`/run/session/${encodeURIComponent(runSessionId)}${qs ? `?${qs}` : ''}`);
  },

  getParticipant(id: string) {
    return request<{
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
      sex: Gender;
      createdAt: string;
      runs: Array<{
        id: string;
        participantId: string;
        runSessionId: string | null;
        resultTime: number;
        distance: number;
        speed: number;
        createdAt: string;
      }>;
    }>(`/participants/${id}`);
  },

  submitRunResult(body: { runSessionId: string; resultTime: number; distance: number }) {
    return request<{
      runId: string;
      runSessionId: string;
      participantId: string;
      competitionId: string;
      runTypeId: RunTypeId;
      rank: number | null;
    }>('/run-result', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async startRun(body: { participantId: string; runTypeId: RunTypeId }) {
    const res = await fetch(`${API_BASE}/run/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.status === 409 && data.reason === 'queue_full') {
      return { success: false as const, reason: 'queue_full' as const };
    }
    if (res.status === 409 && data.reason === 'queue_paused') {
      return { success: false as const, reason: 'queue_paused' as const };
    }
    if (res.status === 503 && data.reason === 'td_unavailable') {
      return { success: false as const, reason: 'td_unavailable' as const };
    }
    if (!res.ok) {
      throw new Error((data as { error?: string }).error ?? `Request failed: ${res.status}`);
    }
    return {
      success: true as const,
      reason: 'ok' as const,
      runSessionId: data.runSessionId as string,
      participantId: data.participantId as string,
      competitionId: data.competitionId as string,
      runTypeId: data.runTypeId as RunTypeId,
      runType: data.runType as string,
      runName: data.runName as string,
      status: data.status as string,
      queueNumber: data.queueNumber as number,
      position: data.position as number,
      queuePosition: (data.queuePosition ?? data.position) as number,
      createdAt: data.createdAt as string,
      demoMode: data.demoMode as boolean,
      treadmillStatus: (data.treadmillStatus ?? 'unknown') as 'free' | 'busy' | 'unknown',
    };
  },

  leaveQueue(body: { runSessionId: string; participantId: string }) {
    return request<{ ok: boolean }>('/run/leave-queue', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  devFinishRun() {
    return request<{ runSessionId: string; runId: string; participantId: string }>('/run/dev-finish', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  /** Hidden dev tool: global queue + treadmill simulation (non-production or ALLOW_DEV_QUEUE_CONTROL). */
  getDevQueueControlState() {
    return request<{
      running: {
        runSessionId: string;
        participantId: string;
        firstName: string;
        lastName: string;
        phone: string;
        runTypeId: RunTypeId;
        runTypeName: string;
        runTypeKey: string;
        gender: Gender;
        status: string;
        queueNumber: number;
        startedAt: string | null;
      } | null;
      queued: Array<{
        position: number;
        runSessionId: string;
        participantId: string;
        participantName: string;
        phone: string;
        runTypeId: RunTypeId;
        runTypeName: string;
        runTypeKey: string;
        gender: Gender;
        queueNumber: number;
      }>;
    }>('/dev/queue-control/state');
  },

  devQueueControlPromoteNext() {
    return request<{ runSessionId: string; treadmillStatus: string }>('/dev/queue-control/promote-next', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  devQueueControlFinishCurrent() {
    return request<{
      runId: string;
      runSessionId: string;
      participantId: string;
      competitionId: string;
      runTypeId: RunTypeId;
      rank: number | null;
      resultTime: number;
      distance: number;
    }>('/dev/queue-control/finish-current', { method: 'POST', body: JSON.stringify({}) });
  },

  devQueueControlCancelCurrent() {
    return request<{ cancelledRunSessionId: string }>('/dev/queue-control/cancel-current', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  devQueueControlRestartCurrent() {
    return request<{ runSessionId: string }>('/dev/queue-control/restart-current', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  adminLogin(pin: string) {
    return request<{ ok: boolean }>('/admin/login', { method: 'POST', body: JSON.stringify({ pin }) });
  },

  adminDashboard() {
    return adminRequest<{
      slots: Array<{
        runTypeId: RunTypeId;
        sex: Gender;
        competition: {
          id: string;
          runTypeId: RunTypeId;
          runTypeKey: string;
          sex: Gender;
          title: string;
          status: string;
          startedAt: string;
          stoppedAt: string | null;
          winnerParticipantId: string | null;
          winnerRunSessionId: string | null;
          queuePaused: boolean;
        } | null;
        queuePaused: boolean;
        queuedCount: number;
        leader: {
          participantName: string;
          resultTime: number;
          distance: number;
          runId: string;
        } | null;
      }>;
    }>('/admin/dashboard');
  },

  adminStartCompetition(body: { runTypeId: RunTypeId; sex: Gender }) {
    return adminRequest<{ competition: unknown }>('/admin/competitions/start', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  adminStopCompetition(competitionId: string) {
    return adminRequest<{ previous: unknown; next: unknown }>('/admin/competitions/stop', {
      method: 'POST',
      body: JSON.stringify({ competitionId }),
    });
  },

  adminRestartCompetition(body: { runTypeId: RunTypeId; sex: Gender }) {
    return adminRequest<{ competition: unknown }>('/admin/competitions/restart', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  adminStopAndStartCompetition(body: { runTypeId: RunTypeId; sex: Gender }) {
    return adminRequest<{ previous: unknown; next: unknown }>('/admin/competitions/stop-and-start', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  adminSetCompetitionQueuePause(competitionId: string, paused: boolean) {
    return adminRequest<{ competition: unknown }>(`/admin/competitions/${competitionId}/queue-pause`, {
      method: 'POST',
      body: JSON.stringify({ paused }),
    });
  },

  adminCompetitionDetail(id: string) {
    return adminRequest<{
      competition: {
        id: string;
        runTypeId: RunTypeId;
        runTypeKey: string;
        sex: Gender;
        title: string;
        status: string;
        startedAt: string;
        stoppedAt: string | null;
        queuePaused?: boolean;
      };
      counts: { queued: number; running: number; finished: number };
    }>(`/admin/competitions/${id}`);
  },

  adminCompetitionQueue(id: string) {
    return adminRequest<{
      entries: Array<{
        runSessionId: string;
        queueNumber: number;
        status: string;
        participantId: string;
        participantName: string;
        phone: string;
      }>;
    }>(`/admin/competitions/${id}/queue`);
  },

  adminCompetitionLeaderboard(id: string) {
    return adminRequest<{
      entries: Array<{
        rank: number;
        participantId: string;
        participantName: string;
        resultTime: number;
        distance: number;
        speed: number;
        runId: string;
        runSessionId: string | null;
        createdAt: string;
        verificationPhotoAvailable: boolean;
      }>;
    }>(`/admin/competitions/${id}/leaderboard`);
  },

  adminCompetitionParticipants(id: string) {
    return adminRequest<{
      participants: Array<{
        id: string;
        firstName: string;
        lastName: string;
        phone: string;
        sex: Gender;
        createdAt: string;
      }>;
    }>(`/admin/competitions/${id}/participants`);
  },

  adminQueueAction(
    competitionId: string,
    sessionId: string,
    action: 'remove' | 'move-up' | 'move-down' | 'mark-running' | 'mark-finished' | 'mark-cancelled',
    body?: { resultTime?: number; distance?: number }
  ) {
    return adminRequest<{ ok: boolean }>(`/admin/competitions/${competitionId}/queue/${sessionId}/${action}`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  adminUpdateRun(competitionId: string, runId: string, body: { resultTime: number; distance: number }) {
    return adminRequest<{ ok: boolean }>(`/admin/competitions/${competitionId}/leaderboard/${runId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  adminDeleteRun(competitionId: string, runId: string) {
    return adminRequest<{ ok: boolean }>(`/admin/competitions/${competitionId}/leaderboard/${runId}`, {
      method: 'DELETE',
    });
  },

  adminRecalculateLeaderboard(competitionId: string) {
    return adminRequest<{ ok: boolean; updated: number }>(`/admin/competitions/${competitionId}/leaderboard/recalculate`, {
      method: 'POST',
    });
  },

  adminUpdateParticipant(
    id: string,
    body: Partial<{ firstName: string; lastName: string; phone: string; sex: Gender }>
  ) {
    return adminRequest<{ participant: unknown }>(`/admin/participants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  adminRemoveParticipantFromCompetition(competitionId: string, participantId: string) {
    return adminRequest<{ ok: boolean }>(`/admin/competitions/${competitionId}/participants/${participantId}`, {
      method: 'DELETE',
    });
  },

  adminResendTd(competitionId: string) {
    return adminRequest<{ ok: boolean }>(`/admin/competitions/${competitionId}/actions/resend-td`, { method: 'POST' });
  },

  adminClearQueue(competitionId: string) {
    return adminRequest<{ ok: boolean; cancelled: number }>(`/admin/competitions/${competitionId}/actions/clear-queue`, {
      method: 'POST',
    });
  },

  adminResetRunner(competitionId: string) {
    return adminRequest<{ ok: boolean; reset: number }>(`/admin/competitions/${competitionId}/actions/reset-runner`, {
      method: 'POST',
    });
  },

  adminTdStatus() {
    return adminRequest<{
      adapter: string;
      host: string;
      port: string;
      lastSyncOk: string;
      lastSyncError: string;
    }>('/admin/td/status');
  },

  adminGetSettings() {
    return adminRequest<{
      adminPin: string;
      tdHost: string;
      tdPort: string;
      tdAdapter: string;
      tdDemoMode: boolean;
      maxGlobalQueueSize: number;
      maxQueueSizePerRun: number;
      eventTitle: string;
      heartbeatIntervalMin: 5 | 10 | 30 | 60;
      showIntegrationInfoMessages: boolean;
    }>('/admin/settings');
  },

  adminPutSettings(body: Partial<{
    adminPin: string;
    tdHost: string;
    tdPort: string;
    tdAdapter: string;
    tdDemoMode: boolean;
    maxGlobalQueueSize?: number;
    maxQueueSizePerRun?: number;
    eventTitle: string;
    heartbeatIntervalMin: 5 | 10 | 30 | 60;
    showIntegrationInfoMessages: boolean;
  }>) {
    return adminRequest<{ ok: boolean }>('/admin/settings', { method: 'PUT', body: JSON.stringify(body) });
  },

  getPublicSettings() {
    return request<{
      heartbeatIntervalMin: 5 | 10 | 30 | 60;
      tdDemoMode: boolean;
      showIntegrationInfoMessages: boolean;
      appVersion: string;
    }>('/public/settings');
  },

  getApiVersion() {
    return request<{ name: string; version: string }>('/version');
  },

  submitRunSessionStartPhoto(body: { runSessionId: string; participantId: string; imageBase64: string }) {
    return request<{ ok: boolean; path: string }>(
      `/run-session/${encodeURIComponent(body.runSessionId)}/start-photo`,
      {
        method: 'POST',
        body: JSON.stringify({
          participantId: body.participantId,
          imageBase64: body.imageBase64,
        }),
      }
    );
  },

  async adminGetRunVerificationPhotoBlob(runId: string): Promise<Blob> {
    const res = await fetch(`${API_BASE}/admin/runs/${encodeURIComponent(runId)}/verification-photo`, {
      headers: { ...adminHeaders() },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? `Request failed: ${res.status}`);
    }
    return res.blob();
  },

  adminResetTestData() {
    return adminRequest<{ ok: boolean }>('/admin/test-data/reset', { method: 'POST' });
  },

  adminArchive(params: { from?: string; to?: string; sex?: Gender; runTypeId?: RunTypeId }) {
    const q = new URLSearchParams();
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    if (params.sex) q.set('sex', params.sex);
    if (params.runTypeId !== undefined) q.set('runTypeId', String(params.runTypeId));
    const qs = q.toString();
    return adminRequest<{
      competitions: Array<{
        id: string;
        runTypeId: number;
        runTypeKey: string;
        sex: Gender;
        title: string;
        status: string;
        startedAt: string;
        stoppedAt: string | null;
        winnerParticipantId: string | null;
        winnerRunSessionId: string | null;
      }>;
    }>(`/admin/archive${qs ? `?${qs}` : ''}`);
  },

  adminAssignWinner(competitionId: string, body: { participantId: string; runSessionId?: string | null }) {
    return adminRequest<{ ok: boolean }>(`/admin/competitions/${competitionId}/winner`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  adminEvents(params?: {
    limit?: number;
    type?: string;
    sessionId?: string;
    participantId?: string;
    runSessionId?: string;
    order?: 'asc' | 'desc';
  }) {
    const q = new URLSearchParams();
    if (params?.limit != null) q.set('limit', String(params.limit));
    if (params?.type?.trim()) q.set('type', params.type.trim());
    if (params?.sessionId?.trim()) q.set('sessionId', params.sessionId.trim());
    if (params?.participantId?.trim()) q.set('participantId', params.participantId.trim());
    if (params?.runSessionId?.trim()) q.set('runSessionId', params.runSessionId.trim());
    if (params?.order) q.set('order', params.order);
    const qs = q.toString();
    return adminRequest<{
      events: Array<{
        id: string;
        createdAt: string;
        type: string;
        sessionId: string;
        participantId: string | null;
        runSessionId: string | null;
        readableMessage: string;
        payloadPreview: string;
      }>;
    }>(`/admin/events${qs ? `?${qs}` : ''}`);
  },
};
