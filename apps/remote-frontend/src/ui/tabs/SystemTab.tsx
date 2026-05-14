import { useEffect, useState } from 'react';
import { Alert, Box, Divider, Paper, Typography } from '@mui/material';
import { api } from '../../api/client';

type SystemStatus = {
  remote: {
    online: boolean;
    appVersion: string | null;
    serverTime: string;
    backupMirrorEnabled: boolean;
    backupRetentionCount: number;
  };
  local: {
    baseUrl: string | null;
    online: boolean;
    lastHealthCheckAt: string | null;
    lastError: string | null;
  };
  backups: {
    folderPath: string;
    backupRoot?: string;
    historyDir?: string;
    activeDir?: string;
    latestFileName: string | null;
    latestCreatedAt: string | null;
    lastBackupAt?: string | null;
    lastBackupSha16?: string | null;
    backupLogsHours?: number;
    totalCount: number;
    lastError: string | null;
    activeUpdatedAt?: string | null;
    activeSource?: string | null;
    activeEnvelopeCreatedAt?: string | null;
  };
};

function formatIso(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function SystemTab() {
  const [data, setData] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setError(null);
        const res = (await api.systemStatus()) as SystemStatus;
        if (cancelled) return;
        setData(res);
        setLastUpdatedAt(new Date().toISOString());
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const t = window.setInterval(() => void load(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 900 }}>Система</Typography>
          <Typography sx={{ color: '#777', fontSize: 12 }}>Last updated: {formatIso(lastUpdatedAt)}</Typography>
        </Box>
        <Typography sx={{ color: '#777', mt: 0.5, fontSize: 12 }}>(Auto refresh каждые 15 секунд)</Typography>
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Local system connection</Typography>
        <Typography sx={{ color: '#bbb' }}>local backend base URL: {data?.local.baseUrl ?? '—'}</Typography>
        <Typography sx={{ color: '#bbb' }}>local backend: {data?.local.online ? 'online' : 'offline'}</Typography>
        <Typography sx={{ color: '#bbb' }}>last successful health check: {formatIso(data?.local.lastHealthCheckAt)}</Typography>
        <Typography sx={{ color: '#bbb' }}>last error: {data?.local.lastError ?? '—'}</Typography>
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Remote server</Typography>
        <Typography sx={{ color: '#bbb' }}>remote backend: {data?.remote.online ? 'online' : 'offline'}</Typography>
        <Typography sx={{ color: '#bbb' }}>remote app version: {data?.remote.appVersion ?? '—'}</Typography>
        <Typography sx={{ color: '#bbb' }}>remote server time: {formatIso(data?.remote.serverTime)}</Typography>
        <Divider sx={{ my: 1.5, borderColor: '#2a2a2a' }} />
        <Typography sx={{ color: '#bbb' }}>
          backup mirror: {data?.remote.backupMirrorEnabled ? 'enabled' : 'disabled'} · retentionCount: {data?.remote.backupRetentionCount ?? '—'}
        </Typography>
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Backup storage (remote)</Typography>
        <Typography sx={{ color: '#bbb' }}>backup root: {data?.backups.backupRoot ?? '—'}</Typography>
        <Typography sx={{ color: '#bbb' }}>history (scheduled pulls): {data?.backups.historyDir ?? data?.backups.folderPath ?? '—'}</Typography>
        <Typography sx={{ color: '#bbb' }}>active (operator snapshot): {data?.backups.activeDir ?? '—'}</Typography>
        <Divider sx={{ my: 1.5, borderColor: '#2a2a2a' }} />
        <Typography sx={{ color: '#bbb' }}>latest history file: {data?.backups.latestFileName ?? '—'}</Typography>
        <Typography sx={{ color: '#bbb' }}>latest history mtime: {formatIso(data?.backups.latestCreatedAt)}</Typography>
        <Typography sx={{ color: '#bbb' }}>history file count: {data?.backups.totalCount ?? '—'}</Typography>
        <Typography sx={{ color: '#bbb' }}>mirror last error: {data?.backups.lastError ?? '—'}</Typography>
        <Divider sx={{ my: 1.5, borderColor: '#2a2a2a' }} />
        <Typography sx={{ color: '#bbb' }}>ACTIVE envelope createdAt: {formatIso(data?.backups.activeEnvelopeCreatedAt)}</Typography>
        <Typography sx={{ color: '#bbb' }}>ACTIVE applied on remote: {formatIso(data?.backups.activeUpdatedAt)}</Typography>
        <Typography sx={{ color: '#bbb' }}>ACTIVE source: {data?.backups.activeSource ?? '—'}</Typography>
        {loading ? <Typography sx={{ color: '#777', mt: 1 }}>Loading…</Typography> : null}
      </Paper>
    </Box>
  );
}

