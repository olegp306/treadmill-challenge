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
    healthFilePath?: string | null;
    healthFilePathSource?: string | null;
    healthFileUpdatedAt?: string | null;
    healthFileSizeBytes?: number | null;
    healthFileError?: string | null;
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
  status?: StatusSeverity;
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
  sortAt?: number | null;
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

function timeMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
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

function extractHealthFileNumberAny(
  healthFile: Record<string, unknown> | null | undefined,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = extractHealthFileNumber(healthFile, key);
    if (value != null) return value;
  }
  return null;
}

function extractHealthFileBooleanAny(
  healthFile: Record<string, unknown> | null | undefined,
  keys: string[]
): boolean | null {
  for (const key of keys) {
    const value = healthFile?.[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', 'ok', 'online', 'connected', 'running', 'yes', '1'].includes(normalized)) return true;
      if (['false', 'error', 'offline', 'disconnected', 'stopped', 'no', '0'].includes(normalized)) return false;
    }
  }
  return null;
}

function statusFromOptionalBoolean(value: boolean | null): StatusSeverity {
  if (value == null) return 'unknown';
  return value ? 'ok' : 'critical';
}

function redGreenStatus(status: StatusSeverity): StatusSeverity {
  return status === 'ok' ? 'ok' : 'critical';
}

function statusFromOptionalBooleanRedGreen(value: boolean | null): StatusSeverity {
  return value === true ? 'ok' : 'critical';
}

function statusFromFps(value: number | null): StatusSeverity {
  if (value == null) return 'unknown';
  if (value < 30) return 'critical';
  if (value < 60) return 'warning';
  return 'ok';
}

function statusFromTemperature(value: number | null): StatusSeverity {
  if (value == null) return 'unknown';
  if (value >= 110) return 'critical';
  if (value >= 90) return 'warning';
  return 'ok';
}

function worstKnownStatus(statuses: StatusSeverity[]): StatusSeverity {
  const known = statuses.filter((s) => s !== 'unknown');
  return known.length ? worstStatus(known) : 'unknown';
}

function formatOptionalBoolean(value: boolean | null, okLabel = 'online', badLabel = 'offline'): string {
  if (value == null) return 'нет данных';
  return value ? okLabel : badLabel;
}

function formatPct(value: number | null | undefined): string {
  return value == null ? 'нет данных' : `${value}%`;
}

function formatGb(value: number | null | undefined): string {
  return value == null ? 'нет данных' : `${value} GB`;
}

function formatTemp(value: number | null): string {
  return value == null ? '—' : `${value}°C`;
}

function formatTemperatureSummary(healthFile: Record<string, unknown> | null | undefined): string {
  const cpu = extractHealthFileNumberAny(healthFile, ['cpuTemp', 'cpuTemperature', 'cpuTemperatureC', 'cpu_temp']);
  const gpu = extractHealthFileNumberAny(healthFile, ['gpuTemp', 'gpuTemperature', 'gpuTemperatureC', 'gpu_temp']);
  const ram = extractHealthFileNumberAny(healthFile, ['ramTemp', 'memoryTemp', 'ramTemperature', 'ram_temp']);
  const ssd = extractHealthFileNumberAny(healthFile, ['ssdTemp', 'diskTemp', 'ssdTemperature', 'ssd_temp']);
  if ([cpu, gpu, ram, ssd].every((v) => v == null)) return 'нет данных';
  return `CPU ${formatTemp(cpu)} / GPU ${formatTemp(gpu)} / RAM ${formatTemp(ram)} / SSD ${formatTemp(ssd)}`;
}

function statusFromTemperatures(healthFile: Record<string, unknown> | null | undefined): StatusSeverity {
  const temps = [
    extractHealthFileNumberAny(healthFile, ['cpuTemp', 'cpuTemperature', 'cpuTemperatureC', 'cpu_temp']),
    extractHealthFileNumberAny(healthFile, ['gpuTemp', 'gpuTemperature', 'gpuTemperatureC', 'gpu_temp']),
    extractHealthFileNumberAny(healthFile, ['ramTemp', 'memoryTemp', 'ramTemperature', 'ram_temp']),
    extractHealthFileNumberAny(healthFile, ['ssdTemp', 'diskTemp', 'ssdTemperature', 'ssd_temp']),
  ];
  return worstKnownStatus(temps.map(statusFromTemperature));
}

export function buildStatusMapModel(input: BuildStatusMapModelInput): StatusMapModel {
  const nowMs = input.nowMs ?? Date.now();
  const health = input.health;
  const backup = input.backupStatus;
  const system = input.systemStatus;
  const internetStatus = statusFromBoolean(health?.system?.internetOk);
  const backendStatus = statusFromBoolean(health?.backendOnline);
  const remoteStoreStatus = statusFromBoolean(system?.local.online);
  const ipadStatus = statusFromBoolean(health?.ipad?.online);
  const healthFile = health?.td?.healthFile;
  const tdRecent = isRecent(health?.td?.lastTdEventAt, nowMs, 120_000);
  const tdHealthFileRecent = isRecent(health?.td?.healthFileUpdatedAt, nowMs, 35 * 60_000);
  const tdSignalStatus = health?.td?.healthFileError
    ? 'critical'
    : tdHealthFileRecent != null
      ? tdHealthFileRecent
        ? 'ok'
        : 'critical'
      : tdRecent == null
        ? 'unknown'
        : tdRecent
          ? 'ok'
          : 'critical';
  const tdFps = extractHealthFileNumberAny(healthFile, ['fps', 'tdFps', 'touchDesignerFps']);
  const fpsStatus = statusFromFps(tdFps);
  const treadmillOnline = extractHealthFileBooleanAny(healthFile, [
    'treadmillOnline',
    'treadmillConnected',
    'treadmillAvailable',
    'trackOnline',
  ]);
  const screenOnline = extractHealthFileBooleanAny(healthFile, [
    'screenOnline',
    'displayOnline',
    'outputAvailable',
    'bigScreenOnline',
    'screenConnected',
  ]);
  const tdAppRunning = extractHealthFileBooleanAny(healthFile, ['appRunning', 'tdRunning', 'touchDesignerRunning']);
  const tdProjectLoaded = extractHealthFileBooleanAny(healthFile, ['projectLoaded', 'projectOpen', 'toeLoaded']);
  const tdBackendReachable = extractHealthFileBooleanAny(healthFile, [
    'backendReachable',
    'localBackendReachable',
    'localServerOnline',
  ]);
  const landingReachable = extractHealthFileBooleanAny(healthFile, ['landingReachable', 'remoteReachable', 'leaderboardReachable']);
  const powerOk = extractHealthFileBooleanAny(healthFile, ['powerOk', 'hasPower', 'powerOnline', 'upsOnline']);
  const temperatureStatus = statusFromTemperatures(healthFile);
  const tdStatus = worstKnownStatus([
    tdSignalStatus,
    fpsStatus,
    statusFromOptionalBoolean(treadmillOnline),
    statusFromOptionalBoolean(screenOnline),
    statusFromOptionalBoolean(tdAppRunning),
    statusFromOptionalBoolean(tdProjectLoaded),
    statusFromOptionalBoolean(tdBackendReachable),
    statusFromOptionalBoolean(powerOk),
    temperatureStatus,
  ]);
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
  const pcCpu = health?.system?.cpuPct ?? extractHealthFileNumberAny(healthFile, ['cpu', 'cpuPct', 'cpuLoad']);
  const pcRam = health?.system?.ramPct ?? extractHealthFileNumberAny(healthFile, ['ram', 'ramPct', 'memoryPct']);
  const pcDisk = health?.system?.diskFreeGb ?? extractHealthFileNumberAny(healthFile, ['diskFreeGb', 'ssdFreeGb']);
  const pcStatus = redGreenStatus(
    worstKnownStatus([
      pcCpu == null ? 'unknown' : pcCpu >= 95 ? 'critical' : pcCpu >= 85 ? 'warning' : 'ok',
      pcRam == null ? 'unknown' : pcRam >= 95 ? 'critical' : pcRam >= 85 ? 'warning' : 'ok',
      pcDisk == null ? 'unknown' : pcDisk <= 2 ? 'critical' : pcDisk <= 10 ? 'warning' : 'ok',
    ])
  );
  const tdJsonValue = health?.td?.healthFileError
    ? health.td.healthFileError
    : health?.td?.healthFileUpdatedAt
      ? formatAgo(health.td.healthFileUpdatedAt, nowMs)
      : 'нет данных';
  const lastTouchStatus = isRecent(health?.ipad?.lastHeartbeatAt ?? health?.timestamp, nowMs, 35 * 60_000) === true ? 'ok' : 'critical';
  const storeMetricStatuses: StatusSeverity[] = [
    statusFromOptionalBooleanRedGreen(treadmillOnline),
    redGreenStatus(worstKnownStatus([statusFromOptionalBooleanRedGreen(screenOnline), fpsStatus])),
    redGreenStatus(tdSignalStatus),
    statusFromOptionalBooleanRedGreen(tdAppRunning),
    statusFromOptionalBooleanRedGreen(tdProjectLoaded),
    redGreenStatus(backendStatus),
    statusFromOptionalBooleanRedGreen(tdBackendReachable),
    redGreenStatus(remoteStoreStatus),
    redGreenStatus(internetStatus),
    statusFromOptionalBooleanRedGreen(landingReachable),
    statusFromOptionalBooleanRedGreen(powerOk),
    pcStatus,
    redGreenStatus(temperatureStatus),
    health?.runs?.lastSuccessfulRunAt ? 'ok' : 'critical',
    lastTouchStatus,
  ];

  const store: StatusMapNode = {
    title: 'Магазин',
    status: storeStatus,
    badge: '',
    metrics: [
      { label: 'Дорожка', value: formatOptionalBoolean(treadmillOnline, 'готова', 'нет связи') },
      {
        label: 'Экран / TouchDesigner',
        value: `${formatOptionalBoolean(screenOnline, 'есть сигнал', 'нет сигнала')}${tdFps != null ? `, ${tdFps} fps` : ''}`,
      },
      { label: 'TDHealth.json', value: tdJsonValue },
      { label: 'TouchDesigner app', value: formatOptionalBoolean(tdAppRunning, 'запущен', 'не запущен') },
      { label: 'TD project', value: formatOptionalBoolean(tdProjectLoaded, 'загружен', 'не загружен') },
      { label: 'Локальный сервер', value: backendStatus === 'ok' ? 'online' : backendStatus === 'critical' ? 'offline' : 'нет данных' },
      { label: 'TD -> backend', value: formatOptionalBoolean(tdBackendReachable, 'connected', 'нет связи') },
      { label: 'Remote -> магазин', value: remoteStoreStatus === 'ok' ? 'connected' : remoteStoreStatus === 'critical' ? 'offline' : 'нет данных' },
      { label: 'Интернет магазина', value: internetStatus === 'ok' ? 'доступен' : internetStatus === 'critical' ? 'нет связи' : 'нет данных' },
      { label: 'Backend -> landing', value: formatOptionalBoolean(landingReachable, 'connected', 'нет связи') },
      { label: 'Питание', value: formatOptionalBoolean(powerOk, 'есть', 'нет питания') },
      { label: 'CPU / RAM / disk', value: `${formatPct(pcCpu)} / ${formatPct(pcRam)} / ${formatGb(pcDisk)}` },
      { label: 'Температуры', value: formatTemperatureSummary(healthFile) },
      { label: 'Последний забег', value: formatTime(health?.runs?.lastSuccessfulRunAt) },
      { label: 'Последнее касание', value: formatAgo(health?.ipad?.lastHeartbeatAt ?? health?.timestamp, nowMs) },
    ].map((metric, index) => ({ ...metric, status: storeMetricStatuses[index] ?? 'critical' })),
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
        { label: 'Публичный leaderboard', value: leaderboardStatus === 'ok' ? 'online' : 'ждет активный JSON' },
        { label: 'JSON', value: backup?.activeSource === 'manual_import' ? 'ручной' : 'активный JSON лидерборда' },
      ],
    },
    {
      title: 'Система бэкапов данных из магазина',
      status: backupStatus,
      description: 'Автоматическое хранение последних снимков.',
      rows: [
        { label: 'Последний backup', value: formatTime(backup?.lastBackupAt ?? backup?.lastMirrorSuccessAt ?? system?.backups.lastBackupAt) },
        { label: 'Активный JSON лидерборда', value: backup?.activeUpdatedAt || system?.backups.activeUpdatedAt ? 'выбран' : 'не выбран' },
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
  if (system?.local.online) {
    const sortAt = timeMs(system.local.lastHealthCheckAt ?? system.remote.serverTime);
    events.push({
      status: 'ok',
      title: 'Remote-сервер видит магазин',
      detail: `Подключение к ${system.local.baseUrl ?? 'local backend'} работает через Tailscale.`,
      time: formatTime(system.local.lastHealthCheckAt ?? system.remote.serverTime),
      sortAt,
    });
  } else if (system?.local.lastError) {
    const sortAt = timeMs(system.remote.serverTime);
    events.push({
      status: 'critical',
      title: 'Remote-сервер не видит магазин',
      detail: system.local.lastError,
      time: formatTime(system.remote.serverTime),
      sortAt,
    });
  }
  if (health) {
    const sortAt = timeMs(input.healthLoadedAt ?? health.timestamp);
    events.push({
      status: storeStatus,
      title: 'Получен health-сигнал от магазина',
      detail: 'Локальный сервер, интернет, экран и активность магазина обновлены в мониторинге.',
      time: formatTime(input.healthLoadedAt ?? health.timestamp),
      sortAt,
    });
  }
  if (system?.local.storeHeartbeat?.lastHeartbeatAt) {
    const sortAt = timeMs(system.local.storeHeartbeat.lastHeartbeatAt);
    events.push({
      status: 'ok',
      title: 'Получен heartbeat от магазина',
      detail: `Последний heartbeat: ${formatAgo(system.local.storeHeartbeat.lastHeartbeatAt, nowMs)}.`,
      time: formatTime(system.local.storeHeartbeat.lastHeartbeatAt),
      sortAt,
    });
  }
  if (backup?.lastBackupAt || backup?.lastMirrorSuccessAt || system?.backups.lastBackupAt) {
    const lastBackupAt = backup?.lastBackupAt ?? backup?.lastMirrorSuccessAt ?? system?.backups.lastBackupAt;
    events.push({
      status: backupStatus,
      title: 'Backup сохранен на хостинге',
      detail: backup?.lastError ? backup.lastError : 'Последний снимок данных принят удаленной системой.',
      time: formatTime(lastBackupAt),
      sortAt: timeMs(lastBackupAt),
    });
  }
  if (health?.runs?.lastSuccessfulRunAt) {
    events.push({
      status: 'ok',
      title: 'Участник завершил забег',
      detail: 'Результат записан локально и попадет в следующие данные leaderboard/backup.',
      time: formatTime(health.runs.lastSuccessfulRunAt),
      sortAt: timeMs(health.runs.lastSuccessfulRunAt),
    });
  }
  if (backup?.activeUpdatedAt) {
    events.push({
      status: leaderboardStatus,
      title: 'Обновлен активный JSON лидерборда',
      detail: backup.activeSource === 'manual_import' ? 'Публичная таблица показывает ручную версию.' : 'Публичная таблица использует выбранный JSON лидерборда.',
      time: formatTime(backup.activeUpdatedAt),
      sortAt: timeMs(backup.activeUpdatedAt),
    });
  }
  const alertsSortAt = timeMs(input.activeMonLoadedAt ?? input.healthLoadedAt ?? system?.remote.serverTime);
  events.push({
    status: alertsStatus,
    title: 'Telegram / email alerts готовы',
    detail: 'При критичных проблемах удаленная система сможет отправить уведомление.',
    time: formatTime(input.activeMonLoadedAt ?? input.healthLoadedAt ?? system?.remote.serverTime),
    sortAt: alertsSortAt,
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
    events: events.sort((a, b) => (b.sortAt ?? 0) - (a.sortAt ?? 0)).slice(0, 6),
  };
}
