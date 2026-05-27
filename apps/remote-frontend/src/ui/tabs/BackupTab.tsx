import { useEffect, useState } from 'react';
import { Alert, Box, Button, Divider, Paper, Typography } from '@mui/material';
import { api } from '../../api/client';

function formatIso(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function BackupTab() {
  const [busy, setBusy] = useState<'download' | 'importHistory' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof api.backupStatus>>['backup'] | null>(null);

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

  const downloadLatestBackup = async () => {
    setError(null);
    setOk(null);
    setBusy('download');
    try {
      await api.downloadLatestHistoryBackup();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const importHistoryBackup = async (file: File) => {
    setError(null);
    setOk(null);
    setBusy('importHistory');
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        setError('Некорректный JSON backup');
        return;
      }
      const res = await api.importRemoteHistoryBackup(parsed);
      setOk(`Backup сохранен в remote history: ${res.historyFile}`);
      await refreshStatus();
      window.dispatchEvent(new CustomEvent('remote-backup-updated'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
      <Typography sx={{ fontWeight: 900, mb: 2 }}>Бэкапирование системы</Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {ok ? <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert> : null}

      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 800, mb: 1 }}>Последний backup в remote history</Typography>
        <Typography sx={{ color: '#bbb', fontSize: 14 }}>
          Файл: {status?.lastBackupFileName ?? '—'}
        </Typography>
        <Typography sx={{ color: '#bbb', fontSize: 14 }}>
          Получен: {formatIso(status?.lastBackupAt)}
        </Typography>
        <Typography sx={{ color: '#bbb', fontSize: 14 }}>
          SHA16: {status?.lastBackupSha16 ?? '—'}
        </Typography>
        <Typography sx={{ color: '#777', fontSize: 12, mt: 0.5 }}>
          Автоматические обновления только складываются в history. Они не меняют активный JSON лидерборда.
        </Typography>
        {status?.lastError ? (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            Ошибка последнего зеркалирования: {status.lastError}
          </Alert>
        ) : null}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <Button variant="contained" disabled={busy != null || !status?.hasBackup} onClick={() => void downloadLatestBackup()} sx={{ fontWeight: 900 }}>
          {busy === 'download' ? '...' : 'Скачать копию последнего backup'}
        </Button>
        <Button
          component="label"
          variant="outlined"
          disabled={busy != null}
          sx={{ fontWeight: 900, borderColor: '#558b2f', color: '#c5e1a5' }}
        >
          {busy === 'importHistory' ? '...' : 'Импорт данных для remote backup'}
          <input
            type="file"
            hidden
            accept="application/json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importHistoryBackup(f);
              e.currentTarget.value = '';
            }}
          />
        </Button>
      </Box>

      <Divider sx={{ my: 2, borderColor: '#2a2a2a' }} />

      <Typography sx={{ color: '#777', fontSize: 12 }}>
        Скачивание JSON-дорожек, Excel-дорожек и активного JSON лидерборда вынесено из этой вкладки. Здесь только хранение backup-слоя.
      </Typography>
    </Paper>
  );
}
