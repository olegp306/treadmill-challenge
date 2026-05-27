import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { api } from '../../api/client';

type RunSessionRow = {
  runSessionId: string;
  queueNumber: number;
  participantId: string;
  participantName: string;
  participantFirstName: string;
  participantLastName: string;
  participantPhone: string;
  sex: string;
  runTypeId: number;
  runType: string;
  status: 'queued' | 'running' | 'finished';
  competitionId: string;
  displayTime: string;
  resultTime: number | null;
  resultDistance: number | null;
};

type RunSessionsResponse = { entries: RunSessionRow[] };

type SortMode = 'date_desc' | 'date_asc' | 'result_best' | 'result_worst';

function formatIso(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function runTypeLabel(runTypeId: number): string {
  if (runTypeId === 0) return '5 мин';
  if (runTypeId === 1) return '1 км';
  if (runTypeId === 2) return '5 км';
  return String(runTypeId);
}

function compareResult(a: RunSessionRow, b: RunSessionRow, direction: 'best' | 'worst'): number {
  const is5min = (rt: number) => rt === 0;
  if (is5min(a.runTypeId) && is5min(b.runTypeId)) {
    const da = a.resultDistance ?? -1;
    const db = b.resultDistance ?? -1;
    return direction === 'best' ? db - da : da - db;
  }
  // For 1km/5km: lower time is better
  const ta = a.resultTime ?? Number.POSITIVE_INFINITY;
  const tb = b.resultTime ?? Number.POSITIVE_INFINITY;
  if (ta === tb) return 0;
  return direction === 'best' ? ta - tb : tb - ta;
}

export function RunsTab() {
  const [rows, setRows] = useState<RunSessionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [runTypeId, setRunTypeId] = useState<number | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('date_desc');

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<RunSessionRow | null>(null);
  const [editTime, setEditTime] = useState<string>('');
  const [editDistance, setEditDistance] = useState<string>('');
  const [editBusy, setEditBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<RunSessionRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const res = (await api.runSessions()) as RunSessionsResponse;
      setRows(res.entries ?? []);
      setLastUpdatedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // No auto refresh here: edits/deletes should be intentional; user can refresh by action.
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (runTypeId !== 'all' && r.runTypeId !== runTypeId) return false;
      if (!q) return true;
      const hay = `${r.participantName} ${r.participantPhone}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, runTypeId]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      if (sortMode === 'date_desc' || sortMode === 'date_asc') {
        const ta = `${a.displayTime}\t${a.runSessionId}`;
        const tb = `${b.displayTime}\t${b.runSessionId}`;
        return sortMode === 'date_desc' ? tb.localeCompare(ta) : ta.localeCompare(tb);
      }
      if (sortMode === 'result_best') {
        const c = compareResult(a, b, 'best');
        if (c !== 0) return c;
      }
      if (sortMode === 'result_worst') {
        const c = compareResult(a, b, 'worst');
        if (c !== 0) return c;
      }
      // stable tie-breaker: newer first
      const ta = `${a.displayTime}\t${a.runSessionId}`;
      const tb = `${b.displayTime}\t${b.runSessionId}`;
      return tb.localeCompare(ta);
    });
    return list;
  }, [filtered, sortMode]);

  const openEdit = (r: RunSessionRow) => {
    setEditRow(r);
    setEditTime(String(r.resultTime ?? (r.runTypeId === 0 ? 300 : 0)));
    setEditDistance(String(r.resultDistance ?? 0));
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editRow) return;
    const resultTime = Number(editTime);
    const resultDistance = Number(editDistance);
    if (!Number.isFinite(resultTime) || resultTime < 0 || !Number.isFinite(resultDistance) || resultDistance < 0) {
      setError('Некорректный результат: нужны неотрицательные числа');
      return;
    }
    try {
      setEditBusy(true);
      await api.updateRunSessionResult(editRow.runSessionId, { resultTime, resultDistance });
      setEditOpen(false);
      setEditRow(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setEditBusy(false);
    }
  };

  const openDelete = (r: RunSessionRow) => {
    setDeleteRow(r);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    try {
      setDeleteBusy(true);
      await api.deleteRunSession(deleteRow.runSessionId);
      setDeleteOpen(false);
      setDeleteRow(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Alert severity="info" sx={{ bgcolor: '#1a237e', color: '#e8eaf6' }}>
        Забеги и поиск — из <strong>активного JSON лидерборда</strong> на remote. Кнопки Edit и Delete обращаются к локальному
        backend и меняют <strong>живую</strong> систему в магазине.
      </Alert>

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 900 }}>Забеги лидерборда</Typography>
          <Typography sx={{ color: '#777', fontSize: 12 }}>Last updated: {formatIso(lastUpdatedAt)}</Typography>
        </Box>
        <Divider sx={{ my: 1.5, borderColor: '#2a2a2a' }} />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            label="Поиск (участник / телефон)"
            sx={{ minWidth: 320 }}
          />
          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel id="rt-label">Тип забега</InputLabel>
            <Select
              labelId="rt-label"
              value={runTypeId}
              label="Тип забега"
              onChange={(e) => setRunTypeId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value={0}>5 мин</MenuItem>
              <MenuItem value={1}>1 км</MenuItem>
              <MenuItem value={2}>5 км</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 240 }}>
            <InputLabel id="sort-label">Сортировка</InputLabel>
            <Select
              labelId="sort-label"
              value={sortMode}
              label="Сортировка"
              onChange={(e) => setSortMode(e.target.value as SortMode)}
            >
              <MenuItem value="date_desc">Дата: новые → старые</MenuItem>
              <MenuItem value="date_asc">Дата: старые → новые</MenuItem>
              <MenuItem value="result_best">Результат: лучший → хуже</MenuItem>
              <MenuItem value="result_worst">Результат: хуже → лучший</MenuItem>
            </Select>
          </FormControl>
          <Button onClick={() => void load()} variant="contained" sx={{ fontWeight: 800 }}>
            Обновить
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        {loading ? <Typography sx={{ color: '#777' }}>Loading…</Typography> : null}
        {!loading && sorted.length === 0 ? <Typography sx={{ color: '#777' }}>Нет данных</Typography> : null}
        {!loading && sorted.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {sorted.map((r) => (
              <Box
                key={r.runSessionId}
                sx={{
                  border: '1px solid #2a2a2a',
                  borderRadius: 2,
                  p: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Box sx={{ minWidth: 320 }}>
                  <Typography sx={{ fontWeight: 900 }}>{r.participantName}</Typography>
                  <Typography sx={{ color: '#bbb', fontSize: 13 }}>
                    {runTypeLabel(r.runTypeId)} · {r.status} · {formatIso(r.displayTime)}
                  </Typography>
                  <Typography sx={{ color: '#bbb', fontSize: 13 }}>
                    result: time={r.resultTime ?? '—'} · distance={r.resultDistance ?? '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button onClick={() => openEdit(r)} variant="outlined" sx={{ borderColor: '#444', color: '#fff', fontWeight: 800 }}>
                    Edit
                  </Button>
                  <Button
                    onClick={() => openDelete(r)}
                    variant="outlined"
                    sx={{ borderColor: '#b71c1c', color: '#ff8a80', fontWeight: 800 }}
                  >
                    Delete
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        ) : null}
      </Paper>

      <Dialog open={editOpen} onClose={() => (editBusy ? null : setEditOpen(false))} maxWidth="sm" fullWidth>
        <DialogTitle>Edit result</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#777', mb: 2 }}>
            {editRow ? `${editRow.participantName} · ${runTypeLabel(editRow.runTypeId)} · ${formatIso(editRow.displayTime)}` : ''}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="resultTime"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              helperText={editRow?.runTypeId === 0 ? 'Для 5 минут обычно 300 секунд' : undefined}
              sx={{ minWidth: 220 }}
            />
            <TextField
              label="resultDistance"
              value={editDistance}
              onChange={(e) => setEditDistance(e.target.value)}
              helperText={editRow?.runTypeId === 0 ? 'Для 5 минут сортировка по distance' : 'Для 1км/5км distance обычно фиксирована'}
              sx={{ minWidth: 220 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={editBusy}>
            Cancel
          </Button>
          <Button onClick={() => void submitEdit()} variant="contained" disabled={editBusy} sx={{ fontWeight: 800 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => (deleteBusy ? null : setDeleteOpen(false))} maxWidth="sm" fullWidth>
        <DialogTitle>Delete run session?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#bbb' }}>
            {deleteRow ? `${deleteRow.participantName} · ${runTypeLabel(deleteRow.runTypeId)} · ${formatIso(deleteRow.displayTime)}` : ''}
          </Typography>
          <Typography sx={{ color: '#ff8a80', mt: 1 }}>Это удалит run session и связанные runs. Действие необратимо.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>
            Cancel
          </Button>
          <Button onClick={() => void confirmDelete()} variant="contained" disabled={deleteBusy} sx={{ fontWeight: 900, bgcolor: '#b71c1c' }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
