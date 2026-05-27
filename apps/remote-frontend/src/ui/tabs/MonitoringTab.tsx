import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Divider, Paper, Typography } from '@mui/material';
import { api, type RemoteBackupStatus, type RemoteSystemStatus } from '../../api/client';
import { buildStatusMapModel, type StatusMapMetric, type StatusSeverity } from './statusMapModel';

type HealthStatusPayload = {
  appVersion: string;
  backendOnline: boolean;
  timestamp: string;
  ipad?: {
    deviceId?: string | null;
    lastHeartbeatAt?: string | null;
    online?: boolean;
    onlineThresholdSec?: number;
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

const STATUS_COLORS: Record<StatusSeverity, { bg: string; fg: string; border: string; glow: string }> = {
  ok: { bg: '#1b5e20', fg: '#ffffff', border: '#2e7d32', glow: 'rgba(76, 175, 80, 0.35)' },
  warning: { bg: '#5f4300', fg: '#ffe6a3', border: '#b7791f', glow: 'rgba(255, 193, 7, 0.25)' },
  critical: { bg: '#8a1118', fg: '#ffffff', border: '#e53935', glow: 'rgba(229, 57, 53, 0.32)' },
  unknown: { bg: '#2a2f36', fg: '#d8dee6', border: '#4a5564', glow: 'rgba(148, 163, 184, 0.18)' },
};

function statusLabel(status: StatusSeverity): string {
  if (status === 'ok') return 'OK';
  if (status === 'warning') return 'WARNING';
  if (status === 'critical') return 'CRITICAL';
  return 'UNKNOWN';
}

function StatusDot({ status }: { status: StatusSeverity }) {
  const c = STATUS_COLORS[status];
  return (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        bgcolor: c.border,
        boxShadow: `0 0 18px ${c.glow}`,
        flex: '0 0 auto',
      }}
    />
  );
}

function StatusBadge({ status, label }: { status: StatusSeverity; label?: string }) {
  const c = STATUS_COLORS[status];
  return (
    <Chip
      size="small"
      label={label ?? statusLabel(status)}
      sx={{
        bgcolor: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
        fontWeight: 900,
        height: 24,
      }}
    />
  );
}

function MetricRows({ rows }: { rows: StatusMapMetric[] }) {
  return (
    <Box sx={{ display: 'grid', gap: 0.75 }}>
      {rows.map((row) => (
        <Box
          key={row.label}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 1.5,
            pb: 0.75,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            fontSize: 13,
          }}
        >
          <Typography component="span" sx={{ color: '#e0e7ef', fontSize: 13, fontWeight: 800 }}>
            {row.label}
          </Typography>
          <Typography component="span" sx={{ color: '#98a6b8', fontSize: 13, textAlign: 'right' }}>
            {row.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function StatusMapOverview({
  health,
  backupStatus,
  systemStatus,
  activeMonEmpty,
  healthLoadedAt,
  activeMonLoadedAt,
}: {
  health: HealthStatusPayload | null;
  backupStatus: RemoteBackupStatus | null;
  systemStatus: RemoteSystemStatus | null;
  activeMonEmpty: boolean;
  healthLoadedAt: string | null;
  activeMonLoadedAt: string | null;
}) {
  const model = buildStatusMapModel({
    health,
    backupStatus,
    systemStatus,
    activeMonitoringEmpty: activeMonEmpty,
    healthLoadedAt,
    activeMonLoadedAt,
  });
  const overall = STATUS_COLORS[model.overall.severity];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper
        sx={{
          p: { xs: 1.5, sm: 2 },
          border: '1px solid #303b49',
          bgcolor: '#111820',
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'flex-start' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <Box>
            <Typography component="h2" sx={{ fontWeight: 950, fontSize: { xs: 22, sm: 28 }, lineHeight: 1.08 }}>
              Состояние Treadmill Challenge
            </Typography>
            <Typography sx={{ color: '#9aa8b8', fontSize: 13, mt: 0.5 }}>
              Быстрый экран для открытия из Telegram-бота: магазин, связь, хостинг, бэкапы и алерты.
            </Typography>
          </Box>
          <Box
            sx={{
              alignSelf: { xs: 'stretch', sm: 'flex-start' },
              textAlign: 'center',
              borderRadius: 999,
              px: 1.5,
              py: 1,
              bgcolor: overall.bg,
              color: overall.fg,
              border: `1px solid ${overall.border}`,
              boxShadow: `0 0 24px ${overall.glow}`,
              fontWeight: 950,
              whiteSpace: 'nowrap',
            }}
          >
            {model.overall.label}
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 1fr) 84px minmax(320px, 1.6fr)' },
            gap: 1.5,
            alignItems: 'stretch',
          }}
        >
          <Paper sx={{ p: 1.5, bgcolor: '#151b22', border: '1px solid #344153', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatusDot status={model.store.status} />
                <Typography sx={{ fontWeight: 950, fontSize: 18 }}>{model.store.title}</Typography>
              </Box>
              <StatusBadge status={model.store.status} label={model.store.badge} />
            </Box>
            <MetricRows rows={model.store.metrics} />
          </Paper>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'row', md: 'column' },
              justifyContent: 'center',
              alignItems: 'center',
              gap: 1,
              minHeight: { xs: 42, md: 'auto' },
              color: '#9aa8b8',
              textAlign: 'center',
              fontSize: 12,
            }}
          >
            <Box
              sx={{
                width: { xs: 54, md: '100%' },
                height: { xs: 9, md: 9 },
                borderRadius: 999,
                bgcolor: STATUS_COLORS[model.connection.status].border,
                boxShadow: `0 0 18px ${STATUS_COLORS[model.connection.status].glow}`,
              }}
            />
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1' }}>{model.connection.title}</Typography>
              <Typography sx={{ fontSize: 11, color: '#8794a5' }}>{model.connection.metrics[0]?.value}</Typography>
            </Box>
          </Box>

          <Paper sx={{ p: 1.5, bgcolor: '#151b22', border: '1px solid #344153', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatusDot status={model.hosting.status} />
                <Typography sx={{ fontWeight: 950, fontSize: 18 }}>{model.hosting.title}</Typography>
              </Box>
              <StatusBadge status={model.hosting.status} label={model.hosting.badge} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 1 }}>
              {model.hosting.services.map((service) => (
                <Box
                  key={service.title}
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    bgcolor: '#11171e',
                    border: `1px solid ${STATUS_COLORS[service.status].border}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                    <StatusDot status={service.status} />
                    <Typography sx={{ fontWeight: 950, fontSize: 14 }}>{service.title}</Typography>
                  </Box>
                  <Typography sx={{ color: '#9aa8b8', fontSize: 12, mb: 1 }}>{service.description}</Typography>
                  <MetricRows rows={service.rows} />
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      </Paper>

      <Paper sx={{ border: '1px solid #303b49', bgcolor: '#121820', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, p: 1.5, borderBottom: '1px solid #303b49' }}>
          <Typography sx={{ fontWeight: 950 }}>Последние события системы</Typography>
          <StatusBadge status={model.overall.severity} />
        </Box>
        <Box>
          {model.events.map((event, idx) => (
            <Box
              key={`${event.title}-${idx}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'auto 1fr', sm: 'auto 1fr auto' },
                gap: 1,
                p: 1.5,
                borderBottom: idx === model.events.length - 1 ? 0 : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <StatusDot status={event.status} />
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: 13 }}>{event.title}</Typography>
                <Typography sx={{ color: '#9aa8b8', fontSize: 12 }}>{event.detail}</Typography>
              </Box>
              <Typography sx={{ color: '#8794a5', fontSize: 12, gridColumn: { xs: '2', sm: 'auto' }, whiteSpace: 'nowrap' }}>
                {event.time}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}

function formatIso(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function StatusChip({ ok, okLabel, badLabel }: { ok: boolean | null | undefined; okLabel: string; badLabel: string }) {
  if (ok == null) return <Chip size="small" label="unknown" sx={{ bgcolor: '#2a2a2a', color: '#ddd' }} />;
  return ok ? (
    <Chip size="small" label={okLabel} sx={{ bgcolor: '#1b5e20', color: '#fff', fontWeight: 800 }} />
  ) : (
    <Chip size="small" label={badLabel} sx={{ bgcolor: '#b71c1c', color: '#fff', fontWeight: 800 }} />
  );
}

function safeJsonPreview(v: unknown, maxLen: number): string {
  try {
    const s = JSON.stringify(v);
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  } catch {
    return '—';
  }
}

export function MonitoringTab() {
  const [health, setHealth] = useState<HealthStatusPayload | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthBusy, setHealthBusy] = useState(false);
  const [healthLoadedAt, setHealthLoadedAt] = useState<string | null>(null);

  const [activeMon, setActiveMon] = useState<unknown>(null);
  const [activeMonEmpty, setActiveMonEmpty] = useState(true);
  const [activeMonError, setActiveMonError] = useState<string | null>(null);
  const [activeMonLoadedAt, setActiveMonLoadedAt] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<RemoteBackupStatus | null>(null);
  const [systemStatus, setSystemStatus] = useState<RemoteSystemStatus | null>(null);

  const loadLiveHealth = useCallback(async () => {
    try {
      setHealthError(null);
      setHealthBusy(true);
      const h = (await api.healthStatus()) as HealthStatusPayload;
      setHealth(h);
      setHealthLoadedAt(new Date().toISOString());
      setSystemStatus(await api.systemStatus());
    } catch (e) {
      setHealthError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setHealthBusy(false);
    }
  }, []);

  const loadActiveMonitoring = useCallback(async () => {
    try {
      setActiveMonError(null);
      const r = await api.activeBackupMonitoring();
      setActiveMonEmpty(r.empty);
      setActiveMon(r.remote);
      setActiveMonLoadedAt(new Date().toISOString());
    } catch (e) {
      setActiveMonError(e instanceof Error ? e.message : 'Failed');
    }
  }, []);

  const loadBackupStatus = useCallback(async () => {
    try {
      const r = await api.backupStatus();
      setBackupStatus(r.backup);
    } catch {
      setBackupStatus(null);
    }
  }, []);

  const loadSystemStatus = useCallback(async () => {
    try {
      setSystemStatus(await api.systemStatus());
    } catch {
      setSystemStatus(null);
    }
  }, []);

  useEffect(() => {
    void loadActiveMonitoring();
    void loadBackupStatus();
    void loadSystemStatus();
  }, [loadActiveMonitoring, loadBackupStatus, loadSystemStatus]);

  useEffect(() => {
    void loadLiveHealth();
  }, [loadLiveHealth]);

  useEffect(() => {
    const onUpdated = () => {
      void loadActiveMonitoring();
      void loadBackupStatus();
      void loadSystemStatus();
    };
    window.addEventListener('remote-backup-updated', onUpdated);
    return () => window.removeEventListener('remote-backup-updated', onUpdated);
  }, [loadActiveMonitoring, loadBackupStatus]);

  const tdOnline = (() => {
    const last = health?.td?.lastTdEventAt;
    if (!last) return null;
    const dt = new Date(last).getTime();
    if (!Number.isFinite(dt)) return null;
    return Date.now() - dt <= 120_000;
  })();

  const tdHealthErrors = (() => {
    const hf = health?.td?.healthFile;
    if (!hf || typeof hf !== 'object') return [];
    const raw = (hf as Record<string, unknown>).errors;
    if (!Array.isArray(raw)) return [];
    return raw.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).filter(Boolean);
  })();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {healthError ? <Alert severity="error">{healthError}</Alert> : null}
      {activeMonError ? <Alert severity="warning">{activeMonError}</Alert> : null}

      <StatusMapOverview
        health={health}
        backupStatus={backupStatus}
        systemStatus={systemStatus}
        activeMonEmpty={activeMonEmpty}
        healthLoadedAt={healthLoadedAt}
        activeMonLoadedAt={activeMonLoadedAt}
      />

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 900 }}>Live: статус с локального backend</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography sx={{ color: '#777', fontSize: 12 }}>обновлено: {formatIso(healthLoadedAt)}</Typography>
            <Button size="small" variant="contained" disabled={healthBusy} onClick={() => void loadLiveHealth()} sx={{ fontWeight: 800 }}>
              {healthBusy ? '...' : 'Обновить live'}
            </Button>
          </Box>
        </Box>
        <Divider sx={{ my: 1.5, borderColor: '#2a2a2a' }} />
        <Typography sx={{ color: '#777', fontSize: 12, mb: 1 }}>
          Не авто-polling: только по кнопке. Данные таблиц/лидерборда на remote идут из активного JSON лидерборда, не отсюда.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ color: '#bbb', minWidth: 140 }}>backend</Typography>
            <StatusChip ok={health?.backendOnline} okLabel="online" badLabel="offline" />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ color: '#bbb', minWidth: 140 }}>internetOk</Typography>
            <StatusChip ok={health?.system?.internetOk} okLabel="ok" badLabel="offline" />
          </Box>
          <Typography sx={{ color: '#bbb' }}>appVersion: {health?.appVersion ?? '—'}</Typography>
          <Typography sx={{ color: '#bbb' }}>timestamp: {formatIso(health?.timestamp)}</Typography>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>iPad status (live)</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ color: '#bbb', minWidth: 140 }}>online</Typography>
          <StatusChip ok={health?.ipad?.online} okLabel="online" badLabel="offline" />
        </Box>
        <Typography sx={{ color: '#bbb' }}>deviceId: {health?.ipad?.deviceId ?? '—'}</Typography>
        <Typography sx={{ color: '#bbb' }}>lastSeen: {formatIso(health?.ipad?.lastHeartbeatAt)}</Typography>
        {health?.ipad?.currentScreen ? <Typography sx={{ color: '#bbb' }}>currentScreen: {health.ipad.currentScreen}</Typography> : null}
        {health?.ipad?.route ? <Typography sx={{ color: '#bbb' }}>route: {health.ipad.route}</Typography> : null}
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>TouchDesigner (live)</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ color: '#bbb', minWidth: 140 }}>online</Typography>
          <StatusChip ok={tdOnline} okLabel="online" badLabel="offline" />
        </Box>
        <Typography sx={{ color: '#bbb' }}>lastSeen: {formatIso(health?.td?.lastTdEventAt)}</Typography>
        <Typography sx={{ color: '#bbb' }}>lastTdSyncOk: {formatIso(health?.td?.lastTdSyncOk)}</Typography>
        <Typography sx={{ color: '#bbb' }}>lastTdSyncError: {formatIso(health?.td?.lastTdSyncError)}</Typography>
        <Typography sx={{ color: '#bbb' }}>healthFile: {health?.td?.healthFile ? 'present' : 'missing'}</Typography>
        {tdHealthErrors.length ? (
          <Typography sx={{ color: '#f2b8b5', mt: 1 }}>healthFile errors: {tdHealthErrors.join(', ')}</Typography>
        ) : null}
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Queue / Runs (live)</Typography>
        <Typography sx={{ color: '#bbb' }}>current queue length: {health?.queue?.queuedCount ?? '—'}</Typography>
        <Typography sx={{ color: '#bbb' }}>
          waiting participants: {health?.queue?.waitingParticipants ?? health?.queue?.queuedCount ?? '—'}
        </Typography>
        <Typography sx={{ color: '#bbb' }}>
          active run: {health?.queue?.runningCount != null ? (health.queue.runningCount > 0 ? 'yes' : 'no') : '—'}
        </Typography>
        <Typography sx={{ color: '#bbb' }}>last run: {formatIso(health?.runs?.lastSuccessfulRunAt)}</Typography>
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>System metrics (live)</Typography>
        <Typography sx={{ color: '#bbb' }}>cpuPct: {health?.system?.cpuPct ?? '—'}</Typography>
        <Typography sx={{ color: '#bbb' }}>ramPct: {health?.system?.ramPct ?? '—'}</Typography>
        <Typography sx={{ color: '#bbb' }}>diskFreeGb: {health?.system?.diskFreeGb ?? '—'}</Typography>
        <Typography sx={{ color: '#bbb' }}>uptimeSec: {health?.system?.uptimeSec ?? '—'}</Typography>
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Warnings / Errors (live)</Typography>
        <Typography sx={{ fontWeight: 800, color: '#bbb', mb: 0.5 }}>warnings</Typography>
        {health?.warnings?.length ? (
          <Typography sx={{ color: '#fdd835' }}>{health.warnings.join(', ')}</Typography>
        ) : (
          <Typography sx={{ color: '#777' }}>Нет предупреждений</Typography>
        )}
        <Divider sx={{ my: 1.5, borderColor: '#2a2a2a' }} />
        <Typography sx={{ fontWeight: 800, color: '#bbb', mb: 0.5 }}>errors</Typography>
        {health?.errors?.length ? (
          <Typography sx={{ color: '#ff8a80' }}>{health.errors.join(', ')}</Typography>
        ) : (
          <Typography sx={{ color: '#777' }}>Нет ошибок</Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 900 }}>Активный JSON лидерборда: вложенный monitoring (remote)</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography sx={{ color: '#777', fontSize: 12 }}>загружено: {formatIso(activeMonLoadedAt)}</Typography>
            <Button size="small" variant="outlined" onClick={() => void loadActiveMonitoring()} sx={{ fontWeight: 800 }}>
              Обновить
            </Button>
          </Box>
        </Box>
        <Divider sx={{ my: 1.5, borderColor: '#2a2a2a' }} />
        {activeMonEmpty ? (
          <Typography sx={{ color: '#777' }}>Нет активного JSON лидерборда или блок remote отсутствует.</Typography>
        ) : (
          <Typography sx={{ color: '#bbb', fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {safeJsonPreview(activeMon, 8000)}
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
