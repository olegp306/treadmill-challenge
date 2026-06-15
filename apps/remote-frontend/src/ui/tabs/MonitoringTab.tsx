import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Chip, Paper, Typography } from '@mui/material';
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            {row.status ? <StatusDot status={row.status} /> : null}
            <Typography component="span" sx={{ color: '#e0e7ef', fontSize: 13, fontWeight: 800 }}>
              {row.label}
            </Typography>
          </Box>
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
              <Typography sx={{ fontWeight: 950, fontSize: 18 }}>{model.store.title}</Typography>
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

export function MonitoringTab() {
  const [health, setHealth] = useState<HealthStatusPayload | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoadedAt, setHealthLoadedAt] = useState<string | null>(null);

  const [activeMonEmpty, setActiveMonEmpty] = useState(true);
  const [activeMonError, setActiveMonError] = useState<string | null>(null);
  const [activeMonLoadedAt, setActiveMonLoadedAt] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<RemoteBackupStatus | null>(null);
  const [systemStatus, setSystemStatus] = useState<RemoteSystemStatus | null>(null);

  const loadLiveHealth = useCallback(async () => {
    try {
      setHealthError(null);
      const h = (await api.healthStatus()) as HealthStatusPayload;
      setHealth(h);
      setHealthLoadedAt(new Date().toISOString());
      setSystemStatus(await api.systemStatus());
    } catch (e) {
      setHealthError(e instanceof Error ? e.message : 'Failed');
    }
  }, []);

  const loadActiveMonitoring = useCallback(async () => {
    try {
      setActiveMonError(null);
      const r = await api.activeBackupMonitoring();
      setActiveMonEmpty(r.empty);
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
    </Box>
  );
}
