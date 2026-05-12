import { useState } from 'react';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { api } from '../../api/client';

export function ExportImportTab() {
  const [busy, setBusy] = useState<'json' | 'xlsx' | 'import' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importOk, setImportOk] = useState<string | null>(null);

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

  const importJson = async (file: File) => {
    setError(null);
    setImportOk(null);
    setBusy('import');
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        setError('Некорректный JSON backup');
        return;
      }
      const res = await api.importJson(parsed);
      setImportOk(res.imported ? 'Импорт выполнен' : 'Импорт: OK');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
      <Typography sx={{ fontWeight: 900, mb: 2 }}>Экспорт / импорт (через remote proxy)</Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {importOk ? <Alert severity="success" sx={{ mb: 2 }}>{importOk}</Alert> : null}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <Button variant="contained" disabled={busy != null} onClick={() => void downloadJson()} sx={{ fontWeight: 900 }}>
          {busy === 'json' ? '...' : 'Скачать актуальный JSON backup'}
        </Button>
        <Button variant="contained" disabled={busy != null} onClick={() => void downloadXlsx()} sx={{ fontWeight: 900, bgcolor: '#17396b' }}>
          {busy === 'xlsx' ? '...' : 'Скачать актуальную Excel-таблицу'}
        </Button>
        <Button
          component="label"
          variant="outlined"
          disabled={busy != null}
          sx={{ fontWeight: 900, borderColor: '#444', color: '#eee' }}
        >
          {busy === 'import' ? '...' : 'Импортировать JSON backup'}
          <input
            type="file"
            hidden
            accept="application/json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importJson(f);
              e.currentTarget.value = '';
            }}
          />
        </Button>
      </Box>

      <Typography sx={{ mt: 2, color: '#777', fontSize: 12 }}>
        Важно: ручные download-операции не сохраняют файлы на remote сервере (только stream/proxy).
      </Typography>
    </Paper>
  );
}

