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
  // Важно: не разворачивать `...options` поверх `headers`, иначе при наличии `options.headers`
  // (например X-Admin-Pin) объект headers целиком перезапишется и пропадёт Content-Type для JSON-тела —
  // backend получит пустой body, PUT /admin/participants/:id перестаёт обновлять поля.
  const { headers: incomingHeaders, ...rest } = options;
  const mergedHeaders: HeadersInit = {
    ...(hasNonEmptyRequestBody(rest.body) ? { 'Content-Type': 'application/json' } : {}),
    ...(incomingHeaders ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: mergedHeaders,
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
        /** Из `participants.phone` в том же JOIN, что и очередь. */
        participantPhone: string;
        sex: Gender;
        competitionId: string;
        runTypeId: RunTypeId;
        runType: string;
        runName: string;
        status: string;
      }>;
      maxGlobalQueueSize: number;
      activeSessionCount: number;
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
      /** Another session is on the treadmill while this one is still queued. */
      otherSessionRunning: boolean;
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
      otherSessionRunning: Boolean(data.otherSessionRunning),
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

  /** Global queue operator API: `/api/dev/queue-control/*` (dev + production). */
  getDevQueueControlState() {
    return request<{
      maxGlobalQueueSize: number;
      activeSessionCount: number;
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

  devQueueControlMoveCurrentToEnd() {
    return request<{ demotedRunSessionId: string; promotedRunSessionId: string | null }>(
      '/dev/queue-control/move-current-to-end',
      { method: 'POST', body: JSON.stringify({}) }
    );
  },

  devQueueControlRemoveQueued(runSessionId: string) {
    return request<{ ok: boolean }>('/dev/queue-control/remove-queued', {
      method: 'POST',
      body: JSON.stringify({ runSessionId }),
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

  managerLogin(pin: string) {
    return request<{ ok: boolean }>('/manager/login', { method: 'POST', body: JSON.stringify({ pin }) });
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
          runSessionId: string | null;
          verificationPhotoAvailable: boolean;
        } | null;
      }>;
    }>('/admin/dashboard');
  },

  /** Панель менеджера: до 20 строк — сначала running, затем queued, затем недавние finished. */
  adminManagerQueueHistory() {
    return adminRequest<{
      entries: Array<{
        runSessionId: string;
        queueNumber: number;
        participantId: string;
        participantName: string;
        participantFirstName: string;
        participantLastName: string;
        participantPhone: string;
        sex: Gender;
        runTypeId: RunTypeId;
        runType: string;
        status: 'queued' | 'running' | 'finished';
        competitionId: string;
        displayTime: string;
        resultTime: number | null;
        resultDistance: number | null;
      }>;
    }>('/admin/manager/queue-history');
  },

  adminManagerRankedHistory(params: { runTypeId: RunTypeId; sex: Gender; order?: 'best' | 'worst' | 'new' | 'old' }) {
    const q = new URLSearchParams();
    q.set('runTypeId', String(params.runTypeId));
    q.set('sex', params.sex);
    if (params.order) q.set('order', params.order);
    return adminRequest<{
      entries: Array<{
        rank: number;
        runSessionId: string;
        participantId: string;
        participantName: string;
        participantFirstName: string;
        participantLastName: string;
        participantPhone: string;
        sex: Gender;
        runTypeId: RunTypeId;
        runType: string;
        status: 'finished';
        competitionId: string;
        displayTime: string;
        resultTime: number;
        resultDistance: number;
      }>;
    }>(`/admin/manager/ranked-history?${q.toString()}`);
  },

  adminManagerUpdateFinishedResult(runSessionId: string, body: { resultTime: number; resultDistance: number }) {
    return adminRequest<{ ok: boolean }>(`/admin/manager/queue-history/${encodeURIComponent(runSessionId)}/result`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  adminManagerDeleteRunEntry(runSessionId: string, pin: string) {
    return adminRequest<{ ok: boolean; deletedRuns: number; deletedRunSessionId: string }>(
      `/admin/manager/queue-history/${encodeURIComponent(runSessionId)}/entry`,
      {
        method: 'DELETE',
        body: JSON.stringify({ pin }),
      }
    );
  },

  adminManagerQueueRecoveryState() {
    return adminRequest<{
      runningCount: number;
      queuedCount: number;
      canStart: boolean;
    }>('/admin/manager/queue-recovery-state');
  },

  adminManagerQueueStart() {
    return adminRequest<{
      ok: boolean;
      status: 'success' | 'skipped_has_running' | 'skipped_empty_queue';
      message: string;
      runSessionId?: string;
      treadmillStatus?: string;
      runningCount?: number;
      queuedCount?: number;
    }>('/admin/manager/queue-start', {
      method: 'POST',
      body: JSON.stringify({}),
    });
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
        verificationPhotoAvailable: boolean;
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
        runSessions: Array<{
          runSessionId: string;
          status: string;
          queueNumber: number;
          createdAt: string;
          verificationPhotoAvailable: boolean;
        }>;
      }>;
    }>(`/admin/competitions/${id}/participants`);
  },

  adminQueueAction(
    competitionId: string,
    sessionId: string,
    action: 'remove' | 'move-up' | 'move-down' | 'move-tail' | 'mark-running' | 'mark-finished' | 'mark-cancelled',
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

  /** Скачивает JSON-снимок БД; имя файла приходит в `Content-Disposition`. */
  async adminExportDataDownload(): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/data/export`, { headers: { ...adminHeaders() } });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? `Request failed: ${res.status}`);
    }
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') ?? '';
    let filename = 'treadmill-export.json';
    const quoted = cd.match(/filename="([^"]+)"/);
    const bare = cd.match(/filename=([^;\s]+)/);
    if (quoted?.[1]) filename = quoted[1];
    else if (bare?.[1]) filename = bare[1].replace(/^"|"$/g, '');
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

  /** Полная замена данных на сервере по снимку (см. backend `dataSnapshot`). Тело — распарсенный JSON. */
  adminImportData(snapshot: unknown) {
    return adminRequest<{ ok: boolean; imported: boolean }>('/admin/data/import', {
      method: 'POST',
      body: JSON.stringify(snapshot),
    });
  },

  adminSuspensionState() {
    return adminRequest<{ state: { backupPath: string; createdAt: string } | null }>('/admin/suspension/state');
  },

  adminSuspensionCreateBackup() {
    return adminRequest<{ ok: boolean; state: { backupPath: string; createdAt: string } }>('/admin/suspension/create-backup', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  adminSuspensionClearAfterBackup() {
    return adminRequest<{ ok: boolean }>('/admin/suspension/clear-after-backup', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  adminSuspensionRestoreLast() {
    return adminRequest<{ ok: boolean; restoredFrom: { backupPath: string; createdAt: string } }>(
      '/admin/suspension/restore-last',
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    );
  },

  /** Download one XLSX file with all active leaderboard sheets. */
  async adminExportLeaderboardsXlsxDownload(): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/leaderboards/export-xlsx`, { headers: { ...adminHeaders() } });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? `Request failed: ${res.status}`);
    }
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') ?? '';
    let filename = 'treadmill-leaderboards.xlsx';
    const quoted = cd.match(/filename="([^"]+)"/);
    const bare = cd.match(/filename=([^;\s]+)/);
    if (quoted?.[1]) filename = quoted[1];
    else if (bare?.[1]) filename = bare[1].replace(/^"|"$/g, '');

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

  /** Prefer this: photo is always tied to a specific run session (pending or finished). */
  async adminGetRunSessionVerificationPhotoBlob(runSessionId: string): Promise<Blob> {
    const res = await fetch(
      `${API_BASE}/admin/run-sessions/${encodeURIComponent(runSessionId)}/verification-photo`,
      {
        headers: { ...adminHeaders() },
      }
    );
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

  adminSystemRestart(pin: string) {
    return adminRequest<{ ok: boolean; restarting: boolean }>('/admin/system/restart', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  },
};
