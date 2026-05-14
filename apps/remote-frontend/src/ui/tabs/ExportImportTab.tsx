import { useEffect, useState } from 'react';
import { Alert, Box, Button, Divider, Paper, Typography } from '@mui/material';
import { api } from '../../api/client';

function sourceLabelRu(
  s: 'local_refresh' | 'manual_import' | 'migrated_legacy' | null | undefined
): string {
  if (s === 'local_refresh') return 'обновление с дорожки';
  if (s === 'manual_import') return 'ручной импорт (remote)';
  if (s === 'migrated_legacy') return 'миграция с прежнего latest.json';
  return '—';
}

export function ExportImportTab() {
  const [busy, setBusy] = useState<'json' | 'xlsx' | 'importLocal' | 'importRemote' | 'activeDl' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importOk, setImportOk] = useState<string | null>(null);
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

  const downloadJson = async () => {
    setError(null);
    setImportOk(null);
    setBusy('json');
    try {
      await api.downloadBackupJson();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const downloadXlsx = async () => {
    setError(null);
    setImportOk(null);
    setBusy('xlsx');
    try {
      await api.downloadLeaderboardsXlsx();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const importToTreadmill = async (file: File) => {
    setError(null);
    setImportOk(null);
    setBusy('importLocal');
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        setError('Некорректный JSON backup');
        return;
      }
      const res = await api.importJsonToLocalTreadmill(parsed);
      setImportOk(res.imported ? 'Импорт на дорожку выполнен' : 'Импорт на дорожку: OK');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const importForRemoteActive = async (file: File) => {
    setError(null);
    setImportOk(null);
    setBusy('importRemote');
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        setError('Некорректный JSON backup');
        return;
      }
      const res = await api.importRemoteActiveBackup(parsed);
      setImportOk(`ACTIVE backup обновлён (${res.activeUpdatedAt})`);
      await refreshStatus();
      window.dispatchEvent(new CustomEvent('remote-backup-updated'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const downloadActive = async () => {
    setError(null);
    setImportOk(null);
    setBusy('activeDl');
    try {
      const data = await api.latestRemoteBackupJson();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = `active-remote-backup.json`;
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

  return (
    <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
      <Typography sx={{ fontWeight: 900, mb: 2 }}>Экспорт / импорт</Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {importOk ? <Alert severity="success" sx={{ mb: 2 }}>{importOk}</Alert> : null}

      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 800, mb: 1 }}>Текущий ACTIVE backup</Typography>
        <Typography sx={{ color: '#bbb', fontSize: 14 }}>
          Данные снимка:{' '}
          {status?.activeEnvelopeCreatedAt
            ? new Date(status.activeEnvelopeCreatedAt).toLocaleString()
            : '—'}
        </Typography>
        <Typography sx={{ color: '#bbb', fontSize: 14 }}>
          Применён на remote:{' '}
          {status?.activeUpdatedAt ? new Date(status.activeUpdatedAt).toLocaleString() : '—'}
        </Typography>
        <Typography sx={{ color: '#bbb', fontSize: 14 }}>
          Источник: {sourceLabelRu(status?.activeSource)}
        </Typography>
        <Typography sx={{ color: '#777', fontSize: 12, mt: 0.5 }}>
          Планировщик складывает файлы в <code>history/</code>; панель читает только ACTIVE, пока вы не обновите его.
        </Typography>
      </Box>

      <Divider sx={{ my: 2, borderColor: '#2a2a2a' }} />

      <Typography sx={{ fontWeight: 800, mb: 1 }}>Получить обновление</Typography>
      <Typography sx={{ color: '#777', fontSize: 13, mb: 1 }}>
        Кнопка в шапке панели: скачать свежий снимок с локального backend, сохранить в history и сделать его ACTIVE.
      </Typography>

      <Divider sx={{ my: 2, borderColor: '#2a2a2a' }} />

      <Typography sx={{ fontWeight: 800, mb: 1 }}>Импортировать данные на беговую дорожку</Typography>
      <Typography sx={{ color: '#ff8a80', fontSize: 13, mb: 1 }}>
        Отправляет JSON на локальный сервер (live SQLite). Меняет систему на дорожке.
      </Typography>
      <Button
        component="label"
        variant="outlined"
        disabled={busy != null}
        sx={{ fontWeight: 900, borderColor: '#b71c1c', color: '#ff8a80' }}
      >
        {busy === 'importLocal' ? '...' : 'Импортировать данные на беговую дорожку'}
        <input
          type="file"
          hidden
          accept="application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importToTreadmill(f);
            e.currentTarget.value = '';
          }}
        />
      </Button>

      <Divider sx={{ my: 2, borderColor: '#2a2a2a' }} />

      <Typography sx={{ fontWeight: 800, mb: 1 }}>Импорт данных для Remote обновления</Typography>
      <Typography sx={{ color: '#8bc34a', fontSize: 13, mb: 1 }}>
        Только remote: сохраняет файл в history и делает его ACTIVE. Локальный backend не вызывается.
      </Typography>
      <Button
        component="label"
        variant="outlined"
        disabled={busy != null}
        sx={{ fontWeight: 900, borderColor: '#558b2f', color: '#c5e1a5' }}
      >
        {busy === 'importRemote' ? '...' : 'Импорт данных для Remote обновления'}
        <input
          type="file"
          hidden
          accept="application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importForRemoteActive(f);
            e.currentTarget.value = '';
          }}
        />
      </Button>

      <Divider sx={{ my: 2, borderColor: '#2a2a2a' }} />

      <Typography sx={{ fontWeight: 800, mb: 1 }}>Скачать с локального сервера (proxy)</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <Button variant="contained" disabled={busy != null} onClick={() => void downloadJson()} sx={{ fontWeight: 900 }}>
          {busy === 'json' ? '...' : 'Скачать JSON с дорожки'}
        </Button>
        <Button variant="contained" disabled={busy != null} onClick={() => void downloadXlsx()} sx={{ fontWeight: 900, bgcolor: '#17396b' }}>
          {busy === 'xlsx' ? '...' : 'Скачать Excel с дорожки'}
        </Button>
      </Box>

      <Divider sx={{ my: 2, borderColor: '#2a2a2a' }} />

      <Typography sx={{ fontWeight: 800, mb: 1 }}>Скачать текущий ACTIVE backup</Typography>
      <Button variant="contained" disabled={busy != null} onClick={() => void downloadActive()} sx={{ fontWeight: 900, bgcolor: '#444' }}>
        {busy === 'activeDl' ? '...' : 'Скачать ACTIVE JSON (remote)'}
      </Button>

      <Typography sx={{ mt: 2, color: '#777', fontSize: 12 }}>
        Скачать JSON/Excel «с дорожки» — поток через remote, файл на сервере не обязателен. ACTIVE — уже сохранённый
        снимок на remote.
      </Typography>
    </Paper>
  );
}
