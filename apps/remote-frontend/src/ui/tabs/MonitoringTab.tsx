import { useEffect, useState } from 'react';
import { Alert, Box, Chip, Divider, Paper, Typography } from '@mui/material';
import { api } from '../../api/client';

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

export function MonitoringTab() {
  const [health, setHealth] = useState<HealthStatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setError(null);
        const h = (await api.healthStatus()) as HealthStatusPayload;
        if (cancelled) return;
        setHealth(h);
        setLastSyncAt(new Date().toISOString());
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed');
      }
    };
    void load();
    const t = window.setInterval(() => void load(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

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
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 900 }}>Main system status</Typography>
          <Typography sx={{ color: '#777', fontSize: 12 }}>Last updated: {formatIso(lastSyncAt)}</Typography>
        </Box>
        <Divider sx={{ my: 1.5, borderColor: '#2a2a2a' }} />

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
        <Typography sx={{ color: '#777', mt: 1, fontSize: 12 }}>
          (Auto refresh каждые 15 секунд)
        </Typography>
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>iPad status</Typography>
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
        <Typography sx={{ fontWeight: 900, mb: 1 }}>TouchDesigner status</Typography>
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
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Queue / Runs</Typography>
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
        <Typography sx={{ fontWeight: 900, mb: 1 }}>System metrics</Typography>
        <Typography sx={{ color: '#bbb' }}>cpuPct: {health?.system?.cpuPct ?? '—'}</Typography>
        <Typography sx={{ color: '#bbb' }}>ramPct: {health?.system?.ramPct ?? '—'}</Typography>
        <Typography sx={{ color: '#bbb' }}>diskFreeGb: {health?.system?.diskFreeGb ?? '—'}</Typography>
        <Typography sx={{ color: '#bbb' }}>uptimeSec: {health?.system?.uptimeSec ?? '—'}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 1 }}>
          <Typography sx={{ color: '#bbb', minWidth: 140 }}>internetOk</Typography>
          <StatusChip ok={health?.system?.internetOk} okLabel="ok" badLabel="offline" />
        </Box>
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Warnings / Errors</Typography>
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
    </Box>
  );
}

