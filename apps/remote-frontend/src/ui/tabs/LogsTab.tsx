import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material';
import { api } from '../../api/client';

type LogKind = 'audit' | 'health';

type UnifiedLogRow = {
  when: string; // ISO
  kind: LogKind;
  type: string;
  entity: string;
  severity: string;
  message: string;
};

type RemoteBackupEnvelope = {
  meta?: { createdAt?: string };
  local?: { snapshot?: { meta?: { createdAt?: string }; events?: Array<Record<string, unknown>> } };
  remote?: {
    audit?: { events?: unknown[] };
    monitoring?: { latestStates?: unknown[]; events?: unknown[] };
  };
};

function formatIso(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 10) return 'только что';
  if (diffSec < 60) return `${diffSec} секунд назад`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} минут назад`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} часов назад`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} дней назад`;
}

function truncateText(s: string, maxBytes: number): string {
  const b = new TextEncoder().encode(s);
  if (b.length <= maxBytes) return s;
  const cut = b.slice(0, Math.max(0, maxBytes - 3));
  return `${new TextDecoder().decode(cut)}...`;
}

function safeJsonPreview(v: unknown, maxBytes: number): string {
  try {
    const json = JSON.stringify(v);
    return truncateText(json, maxBytes);
  } catch {
    return '—';
  }
}

export function LogsTab() {
  const [data, setData] = useState<RemoteBackupEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'audit' | 'health'>('all');
  const [limit, setLimit] = useState<50 | 100 | 250 | 500>(100);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setError(null);
        const res = (await api.latestRemoteBackupJson()) as RemoteBackupEnvelope;
        if (cancelled) return;
        setData(res);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo((): UnifiedLogRow[] => {
    const out: UnifiedLogRow[] = [];

    // Remote audit events
    const audit = data?.remote?.audit?.events ?? [];
    for (const e of audit) {
      const r = e as Record<string, unknown>;
      const when = typeof r.timestamp === 'string' ? r.timestamp : '';
      if (!when) continue;
      out.push({
        when,
        kind: 'audit',
        type: String(r.action ?? 'AUDIT'),
        entity: String(r.entityId ?? r.userEmail ?? r.userId ?? r.ip ?? '—'),
        severity: '—',
        message: safeJsonPreview(r.metadata ?? null, 2 * 1024),
      });
    }

    // Remote monitoring events
    const healthEvents = data?.remote?.monitoring?.events ?? [];
    for (const e of healthEvents) {
      const r = e as Record<string, unknown>;
      const when = typeof r.receivedAt === 'string' ? r.receivedAt : '';
      if (!when) continue;
      const problems = Array.isArray(r.problems) ? r.problems : [];
      const problemCodes = problems
        .map((p: unknown) => (p && typeof p === 'object' ? String((p as Record<string, unknown>).code ?? '') : ''))
        .filter(Boolean)
        .join(', ');
      out.push({
        when,
        kind: 'health',
        type: 'HEALTH',
        entity: String(r.key ?? '—'),
        severity: String(r.severity ?? '—'),
        message: truncateText(problemCodes || safeJsonPreview(r.problems ?? null, 2 * 1024), 2 * 1024),
      });
    }

    // Local snapshot events (if present in export)
    const localEvents = data?.local?.snapshot?.events ?? [];
    for (const e of localEvents) {
      const r = e as Record<string, unknown>;
      const when = typeof r.createdAt === 'string' ? r.createdAt : '';
      if (!when) continue;
      out.push({
        when,
        kind: 'audit',
        type: String(r.type ?? 'EVENT'),
        entity: String(r.sessionId ?? '—'),
        severity: '—',
        message: truncateText(String(r.payload ?? ''), 2 * 1024),
      });
    }

    out.sort((a, b) => b.when.localeCompare(a.when));
    return out;
  }, [data]);

  const filtered = useMemo(() => {
    const base = filter === 'all' ? rows : rows.filter((r) => r.kind === filter);
    return base.slice(0, limit);
  }, [rows, filter, limit]);

  const period = useMemo(() => {
    if (!filtered.length) return { from: null as string | null, to: null as string | null };
    const times = filtered.map((r) => r.when).sort();
    return { from: times[0] ?? null, to: times[times.length - 1] ?? null };
  }, [filtered]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Логи</Typography>
        <Typography sx={{ color: '#bbb' }}>Данные взяты из последнего remote backup JSON</Typography>
        <Typography sx={{ color: '#777', fontSize: 12, mt: 0.5 }}>
          Период событий: {formatIso(period.from)} — {formatIso(period.to)}
        </Typography>
        <Divider sx={{ my: 1.5, borderColor: '#2a2a2a' }} />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel id="filter-label">Фильтр</InputLabel>
            <Select labelId="filter-label" value={filter} label="Фильтр" onChange={(e) => setFilter(e.target.value as any)}>
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="audit">Audit</MenuItem>
              <MenuItem value="health">Health</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel id="limit-label">Limit</InputLabel>
            <Select
              labelId="limit-label"
              value={limit}
              label="Limit"
              onChange={(e) => setLimit(Number(e.target.value) as 50 | 100 | 250 | 500)}
            >
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={250}>250</MenuItem>
              <MenuItem value={500}>500</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        {filtered.length ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filtered.map((r, idx) => (
              <Box key={`${r.when}-${idx}`} sx={{ border: '1px solid #2a2a2a', borderRadius: 2, p: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 900 }}>
                    {relativeTime(r.when)}
                    <Typography component="span" sx={{ color: '#777', fontSize: 12, ml: 1 }}>
                      {formatIso(r.when)}
                    </Typography>
                  </Typography>
                  <Typography sx={{ color: r.kind === 'health' && r.severity === 'critical' ? '#ff8a80' : '#bbb', fontWeight: 800 }}>
                    {r.kind.toUpperCase()} {r.severity !== '—' ? `· ${r.severity}` : ''}
                  </Typography>
                </Box>
                <Typography sx={{ color: '#bbb', mt: 0.5 }}>
                  <b>Тип:</b> {r.type}
                </Typography>
                <Typography sx={{ color: '#bbb' }}>
                  <b>Устройство / пользователь:</b> {r.entity}
                </Typography>
                <Typography sx={{ color: '#bbb' }}>
                  <b>Сообщение:</b> {r.message}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ color: '#777' }}>Нет событий</Typography>
        )}
      </Paper>
    </Box>
  );
}

