import type { RemoteBackupStatus, RemoteSystemStatus } from '../../api/client';

export type StatusSeverity = 'ok' | 'warning' | 'critical' | 'unknown';

export type HealthStatusPayload = {
  appVersion: string;
  backendOnline: boolean;
  timestamp: string;
  ipad?: {
    deviceId?: string | null;
    lastHeartbeatAt?: string | null;
    online?: boolean;
    currentScreen?: string | null;
    route?: string | null;
    warnings?: string[] | null;
    errors?: string[] | null;
  };
  td?: {
    lastTdEventAt?: string | null;
    lastTdSyncOk?: string | null;
    lastTdSyncError?: string | null;
    healthFile?: Record<string, unknown> | null;
    errors?: string[] | null;
  };
  system?: {
    cpuPct?: number | null;
    ramPct?: number | null;
    diskFreeGb?: number | null;
    uptimeSec?: number | null;
    internetOk?: boolean | null;
  };
  queue?: {
    runningCount?: number;
    queuedCount?: number;
    waitingParticipants?: number | null;
  };
  runs?: {
    activeRun?: unknown | null;
    lastRun?: unknown | null;
    lastSuccessfulRunAt?: string | null;
  };
  warnings?: string[];
  errors?: string[];
};

export type StatusMapMetric = {
  label: string;
  value: string;
};

export type StatusMapNode = {
  title: string;
  status: StatusSeverity;
  badge: string;
  metrics: StatusMapMetric[];
};

export type HostingService = {
  title: string;
  status: StatusSeverity;
  description: string;
  rows: StatusMapMetric[];
};

export type StatusMapEvent = {
  status: StatusSeverity;
  title: string;
  detail: string;
  time: string;
};

export type StatusMapModel = {
  overall: {
    severity: StatusSeverity;
    label: string;
    detail: string;
  };
  store: StatusMapNode;
  connection: StatusMapNode;
  hosting: StatusMapNode & { services: HostingService[] };
  events: StatusMapEvent[];
};

export type BuildStatusMapModelInput = {
  health: HealthStatusPayload | null;
  backupStatus: RemoteBackupStatus | null;
  systemStatus?: RemoteSystemStatus | null;
  activeMonitoringEmpty: boolean;
  healthLoadedAt: string | null;
  activeMonLoadedAt: string | null;
  nowMs?: number;
};

function isRecent(iso: string | null | undefined, nowMs: number, thresholdMs: number): boolean | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return nowMs - t <= thresholdMs;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatAgo(iso: string | null | undefined, nowMs: number): string {
  if (!iso) return 'нет данных';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const diffSec = Math.max(0, Math.floor((nowMs - t) / 1000));
  if (diffSec < 60) return `${diffSec} сек назад`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} мин назад`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ч назад`;
  return `${Math.floor(diffHours / 24)} дн назад`;
}

function worstStatus(statuses: StatusSeverity[]): StatusSeverity {
  if (statuses.includes('critical')) return 'critical';
  if (statuses.includes('warning')) return 'warning';
  if (statuses.includes('unknown')) return 'unknown';
  return 'ok';
}

function statusFromBoolean(value: boolean | null | undefined): StatusSeverity {
  if (value == null) return 'unknown';
  return value ? 'ok' : 'critical';
}

function labelForOverall(severity: StatusSeverity): string {
  if (severity === 'critical') return 'Есть критичная проблема';
  if (severity === 'warning') return 'Есть предупреждения';
  if (severity === 'unknown') return 'Недостаточно данных';
  return 'Все критичные системы работают';
}

function extractHealthFileNumber(healthFile: Record<string, unknown> | null | undefined, key: string): number | null {
  const value = healthFile?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function buildStatusMapModel(input: BuildStatusMapModelInput): StatusMapModel {
  const nowMs = input.nowMs ?? Date.now();
  const health = input.health;
  const backup = input.backupStatus;
  const system = input.systemStatus;
  const tdRecent = isRecent(health?.td?.lastTdEventAt, nowMs, 120_000);
  const tdStatus = tdRecent == null ? 'unknown' : tdRecent ? 'ok' : 'critical';
  const internetStatus = statusFromBoolean(health?.system?.internetOk);
  const backendStatus = statusFromBoolean(health?.backendOnline);
  const remoteStoreStatus = statusFromBoolean(system?.local.online);
  const ipadStatus = statusFromBoolean(health?.ipad?.online);
  const backupStatus: StatusSeverity = backup?.lastError
    ? 'critical'
    : backup?.hasBackup || backup?.activeUpdatedAt
      ? 'ok'
      : 'warning';
  const leaderboardStatus: StatusSeverity = input.activeMonitoringEmpty ? 'warning' : 'ok';
  const alertsStatus: StatusSeverity = 'ok';
  const storeStatus = worstStatus([remoteStoreStatus, backendStatus, tdStatus, ipadStatus]);
  const connectionStatus = worstStatus([remoteStoreStatus, internetStatus]);
  const hostingStatus = worstStatus([leaderboardStatus, backupStatus, alertsStatus]);
  const overallStatus = worstStatus([storeStatus, connectionStatus, hostingStatus]);
  const tdFps = extractHealthFileNumber(health?.td?.healthFile, 'fps');

  const store: StatusMapNode = {
    title: 'Магазин',
    status: storeStatus,
    badge: storeStatus === 'ok' ? 'online' : storeStatus === 'critical' ? 'problem' : 'check',
    metrics: [
      { label: 'Дорожка / экран', value: tdStatus === 'ok' ? (tdFps ? `${tdFps} fps` : 'работает') : tdStatus === 'critical' ? 'нет сигнала' : 'нет данных' },
      { label: 'Локальный сервер', value: backendStatus === 'ok' ? 'online' : backendStatus === 'critical' ? 'offline' : 'нет данных' },
      { label: 'Remote -> магазин', value: remoteStoreStatus === 'ok' ? 'connected' : remoteStoreStatus === 'critical' ? 'offline' : 'нет данных' },
      { label: 'Интернет магазина', value: internetStatus === 'ok' ? 'доступен' : internetStatus === 'critical' ? 'нет связи' : 'нет данных' },
      { label: 'Последний забег', value: formatTime(health?.runs?.lastSuccessfulRunAt) },
      { label: 'Последнее касание', value: formatAgo(health?.ipad?.lastHeartbeatAt ?? health?.timestamp, nowMs) },
    ],
  };

  const connection: StatusMapNode = {
    title: 'Интернет-связь',
    status: connectionStatus,
    badge: connectionStatus === 'ok' ? 'connected' : connectionStatus === 'critical' ? 'offline' : 'unknown',
    metrics: [
      { label: 'Сигнал магазина', value: formatAgo(input.healthLoadedAt ?? health?.timestamp, nowMs) },
      { label: 'API магазина', value: system?.local.baseUrl ?? 'не настроен' },
      { label: 'Store heartbeat', value: formatAgo(system?.local.storeHeartbeat?.lastHeartbeatAt, nowMs) },
      { label: 'Remote API', value: 'online' },
    ],
  };

  const services: HostingService[] = [
    {
      title: 'Leaderboard + админка лидерборда',
      status: leaderboardStatus,
      description: 'Публичная таблица и ручное управление JSON.',
      rows: [
        { label: 'Админка', value: 'доступна' },
        { label: 'Публичный leaderboard', value: leaderboardStatus === 'ok' ? 'online' : 'ждет ACTIVE backup' },
        { label: 'JSON', value: backup?.activeSource === 'manual_import' ? 'ручной' : 'из ACTIVE backup' },
      ],
    },
    {
      title: 'Система бэкапов данных из магазина',
      status: backupStatus,
      description: 'Автоматическое хранение последних снимков.',
      rows: [
        { label: 'Последний backup', value: formatTime(backup?.lastBackupAt ?? backup?.lastMirrorSuccessAt ?? system?.backups.lastBackupAt) },
        { label: 'ACTIVE backup', value: backup?.activeUpdatedAt || system?.backups.activeUpdatedAt ? 'выбран' : 'не выбран' },
        { label: 'Ошибка', value: backup?.lastError ?? system?.backups.lastError ?? 'нет' },
      ],
    },
    {
      title: 'Система алертов о состоянии системы',
      status: alertsStatus,
      description: 'Сообщает о проблемах и восстановлении.',
      rows: [
        { label: 'Telegram bot', value: 'готов' },
        { label: 'TG-канал', value: 'кнопка на этот экран' },
        { label: 'Email', value: 'готов' },
      ],
    },
  ];

  const hosting: StatusMapNode & { services: HostingService[] } = {
    title: 'Хостинг: Remote Computer (Яндекс Cloud)',
    status: hostingStatus,
    badge: hostingStatus === 'ok' ? 'online' : hostingStatus === 'critical' ? 'problem' : 'warning',
    metrics: [
      { label: 'Leaderboard', value: services[0]!.status === 'ok' ? 'online' : 'warning' },
      { label: 'Backup', value: services[1]!.status === 'ok' ? 'ok' : services[1]!.status },
      { label: 'Alerts', value: 'ready' },
    ],
    services,
  };

  const events: StatusMapEvent[] = [];
  if (overallStatus !== 'ok') {
    events.push({
      status: overallStatus,
      title: labelForOverall(overallStatus),
      detail: health?.errors?.[0] ?? health?.warnings?.[0] ?? backup?.lastError ?? system?.local.lastError ?? 'Проверьте подсвеченные блоки схемы.',
      time: formatTime(input.healthLoadedAt ?? input.activeMonLoadedAt ?? system?.remote.serverTime),
    });
  }
  if (system?.local.online) {
    events.push({
      status: 'ok',
      title: 'Remote-сервер видит магазин',
      detail: `Подключение к ${system.local.baseUrl ?? 'local backend'} работает через Tailscale.`,
      time: formatTime(system.local.lastHealthCheckAt ?? system.remote.serverTime),
    });
  } else if (system?.local.lastError) {
    events.push({
      status: 'critical',
      title: 'Remote-сервер не видит магазин',
      detail: system.local.lastError,
      time: formatTime(system.remote.serverTime),
    });
  }
  if (health) {
    events.push({
      status: storeStatus,
      title: 'Получен health-сигнал от магазина',
      detail: 'Локальный сервер, интернет, экран и активность магазина обновлены в мониторинге.',
      time: formatTime(input.healthLoadedAt ?? health.timestamp),
    });
  }
  if (system?.local.storeHeartbeat?.lastHeartbeatAt) {
    events.push({
      status: 'ok',
      title: 'Получен heartbeat от магазина',
      detail: `Последний heartbeat: ${formatAgo(system.local.storeHeartbeat.lastHeartbeatAt, nowMs)}.`,
      time: formatTime(system.local.storeHeartbeat.lastHeartbeatAt),
    });
  }
  if (backup?.lastBackupAt || backup?.lastMirrorSuccessAt || system?.backups.lastBackupAt) {
    const lastBackupAt = backup?.lastBackupAt ?? backup?.lastMirrorSuccessAt ?? system?.backups.lastBackupAt;
    events.push({
      status: backupStatus,
      title: 'Backup сохранен на хостинге',
      detail: backup?.lastError ? backup.lastError : 'Последний снимок данных принят удаленной системой.',
      time: formatTime(lastBackupAt),
    });
  }
  if (health?.runs?.lastSuccessfulRunAt) {
    events.push({
      status: 'ok',
      title: 'Участник завершил забег',
      detail: 'Результат записан локально и попадет в следующие данные leaderboard/backup.',
      time: formatTime(health.runs.lastSuccessfulRunAt),
    });
  }
  if (backup?.activeUpdatedAt) {
    events.push({
      status: leaderboardStatus,
      title: 'Обновлен ACTIVE leaderboard JSON',
      detail: backup.activeSource === 'manual_import' ? 'Публичная таблица показывает ручную версию.' : 'Публичная таблица использует актуальный ACTIVE backup.',
      time: formatTime(backup.activeUpdatedAt),
    });
  }
  events.push({
    status: alertsStatus,
    title: 'Telegram / email alerts готовы',
    detail: 'При критичных проблемах удаленная система сможет отправить уведомление.',
    time: formatTime(input.activeMonLoadedAt ?? input.healthLoadedAt ?? system?.remote.serverTime),
  });

  return {
    overall: {
      severity: overallStatus,
      label: labelForOverall(overallStatus),
      detail: overallStatus === 'ok' ? 'Магазин, связь и хостинг отвечают.' : 'Откройте подсвеченные блоки и последние события ниже.',
    },
    store,
    connection,
    hosting,
    events: events.slice(0, 6),
  };
}
