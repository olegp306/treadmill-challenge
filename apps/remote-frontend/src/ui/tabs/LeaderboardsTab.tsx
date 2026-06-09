import { useEffect, useState } from 'react';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { api } from '../../api/client';
import { RunsTab } from './RunsTab';

function formatIso(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function sourceLabelRu(s: 'local_refresh' | 'manual_import' | 'migrated_legacy' | null | undefined): string {
  if (s === 'local_refresh') return 'из свежего backup';
  if (s === 'manual_import') return 'ручной импорт JSON лидерборда';
  if (s === 'migrated_legacy') return 'миграция прежнего latest.json';
  return '—';
}

export function LeaderboardsTab() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof api.backupStatus>>['backup'] | null>(null);
  const [busy, setBusy] = useState<'download' | 'xlsx' | 'import' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const refreshStatus = async () => {
    try {
      const st = await api.backupStatus();
      setStatus(st.backup);
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  useEffect(() => {
    const h = () => void refreshStatus();
    window.addEventListener('remote-backup-updated', h);
    return () => window.removeEventListener('remote-backup-updated', h);
  }, []);

  const downloadActiveJson = async () => {
    setError(null);
    setOk(null);
    setBusy('download');
    try {
      const data = await api.latestRemoteBackupJson();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = 'leaderboard-active.json';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const downloadLeaderboardsExcel = async () => {
    setError(null);
    setOk(null);
    setBusy('xlsx');
    try {
      await api.downloadLeaderboardsXlsx();
      setOk('Excel лидербордов скачан через тот же экспорт, что и в менеджерской панели.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const importActiveJson = async (file: File) => {
    setError(null);
    setOk(null);
    setBusy('import');
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        setError('Некорректный JSON лидерборда');
        return;
      }
      const res = await api.importRemoteActiveBackup(parsed);
      setOk(`Активный JSON лидерборда обновлен: ${formatIso(res.activeUpdatedAt)}`);
      await refreshStatus();
      window.dispatchEvent(new CustomEvent('remote-backup-updated'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {ok ? <Alert severity="success">{ok}</Alert> : null}

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Лидерборды</Typography>
        <Typography sx={{ fontWeight: 800, mb: 1 }}>Активный JSON лидерборда</Typography>
        <Typography sx={{ color: '#bbb', fontSize: 14 }}>Источник: {sourceLabelRu(status?.activeSource)}</Typography>
        <Typography sx={{ color: '#bbb', fontSize: 14 }}>
          Данные JSON получены: {formatIso(status?.activeEnvelopeCreatedAt)}
        </Typography>
        <Typography sx={{ color: '#bbb', fontSize: 14 }}>
          Активирован на remote: {formatIso(status?.activeUpdatedAt)}
        </Typography>
        <Typography sx={{ color: '#777', fontSize: 12, mt: 0.5 }}>
          Именно этот JSON кормит публичный remote leaderboard и список забегов ниже.
        </Typography>
        <Alert severity="info" sx={{ mt: 1.5, bgcolor: '#10233f', color: '#dbeafe' }}>
          {status?.autoActivateLeaderboard ?? true
            ? 'Автообновление включено: каждый свежий backup автоматически становится активным JSON лидерборда.'
            : 'Автообновление выключено: свежие backup сохраняются в history, а активный JSON меняется только ручным импортом.'}
        </Alert>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2 }}>
          <Button
            variant="contained"
            disabled={busy != null || !status?.activeUpdatedAt}
            onClick={() => void downloadActiveJson()}
            sx={{ fontWeight: 900 }}
          >
            {busy === 'download' ? '...' : 'Скачать активный JSON'}
          </Button>
          <Button
            variant="contained"
            disabled={busy != null}
            onClick={() => void downloadLeaderboardsExcel()}
            sx={{ fontWeight: 900, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
          >
            {busy === 'xlsx' ? '...' : 'Скачать Excel лидербордов'}
          </Button>
          <Button
            component="label"
            variant="outlined"
            disabled={busy != null}
            sx={{ fontWeight: 900, borderColor: '#558b2f', color: '#c5e1a5' }}
          >
            {busy === 'import' ? '...' : 'Импортировать JSON лидерборда'}
            <input
              type="file"
              hidden
              accept="application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importActiveJson(f);
                e.currentTarget.value = '';
              }}
            />
          </Button>
        </Box>
        <Typography sx={{ color: '#777', fontSize: 12, mt: 1.5 }}>
          Excel скачивается с компьютера в магазине через существующий экспорт менеджерской панели.
        </Typography>
      </Paper>

      <RunsTab />
    </Box>
  );
}
