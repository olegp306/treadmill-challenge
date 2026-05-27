import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { api } from '../../api/client';

type LogKind = 'audit' | 'health';

type UnifiedLogRow = {
  when: string; // ISO
  kind: LogKind;
  type: string;
  entity: string;
  severity: string;
  message: string;
  raw: unknown;
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

const ALERT_AUDIT_ACTIONS = new Set([
  'ADMIN_LOGIN',
  'ADMIN_LOGIN_FAILED',
  'DATABASE_RECORD_UPDATED',
  'DATABASE_RECORD_DELETED',
  'IMPORT_STARTED',
  'IMPORT_COMPLETED',
  'IMPORT_FAILED',
  'BACKUP_PULL',
  'REMOTE_ACTIVE_IMPORT',
  'REMOTE_HISTORY_IMPORT',
  'TELEGRAM_SETTINGS_UPDATED',
  'TELEGRAM_TEST_ALERT_SENT',
]);

function isAlertLogRow(row: UnifiedLogRow): boolean {
  if (row.kind === 'health') return row.severity !== 'ok' && row.severity !== '—';
  return ALERT_AUDIT_ACTIONS.has(row.type);
}

function displayEntity(entity: string): string {
  return entity && entity !== '—' ? entity : 'не указан';
}

function logStory(row: UnifiedLogRow): { title: string; detail: string; actor: string } {
  const actor = displayEntity(row.entity);
  if (row.kind === 'health') {
    const severity = row.severity === 'critical' ? 'критичная проблема' : row.severity === 'warning' ? 'предупреждение' : 'событие';
    return {
      title: `Мониторинг зафиксировал: ${severity}`,
      detail: row.message && row.message !== '—' ? row.message : 'Состояние устройства изменилось.',
      actor: `Источник: ${actor}`,
    };
  }

  switch (row.type) {
    case 'ADMIN_LOGIN':
      return {
        title: 'Оператор вошел в remote admin',
        detail: 'В систему удаленного администрирования выполнен вход.',
        actor: `IP: ${actor}`,
      };
    case 'ADMIN_LOGIN_FAILED':
      return {
        title: 'Неудачная попытка входа в remote admin',
        detail: 'Кто-то попытался войти в удаленную админку с неверным PIN.',
        actor: `IP: ${actor}`,
      };
    case 'TELEGRAM_SETTINGS_UPDATED':
      return {
        title: 'Изменены настройки Telegram-алертов',
        detail: 'Оператор поменял параметры бота, канала, webhook или включение алертов.',
        actor: `IP: ${actor}`,
      };
    case 'TELEGRAM_TEST_ALERT_SENT':
      return {
        title: 'Отправлен тестовый Telegram-алерт',
        detail: 'Оператор проверил доставку уведомлений в Telegram.',
        actor: `IP: ${actor}`,
      };
    case 'BACKUP_PULL':
      return {
        title: 'Remote получил backup из магазина',
        detail: 'Удаленный сервер забрал свежий снимок данных и сохранил его в backup history.',
        actor: `IP: ${actor}`,
      };
    case 'REMOTE_HISTORY_IMPORT':
      return {
        title: 'Backup вручную добавлен в remote history',
        detail: 'Оператор загрузил JSON в хранилище backup без смены активного JSON лидерборда.',
        actor: `IP: ${actor}`,
      };
    case 'REMOTE_ACTIVE_IMPORT':
      return {
        title: 'Обновлен активный JSON лидерборда',
        detail: 'Оператор выбрал JSON, который будет использоваться публичным лидербордом и списком забегов.',
        actor: `IP: ${actor}`,
      };
    case 'DATABASE_RECORD_UPDATED':
      return {
        title: 'В магазине изменили запись в базе данных',
        detail: `Изменена запись ${actor}. Обычно это правка результата или данных забега через админку.`,
        actor: `Запись: ${actor}`,
      };
    case 'DATABASE_RECORD_DELETED':
      return {
        title: 'В магазине удалили запись из базы данных',
        detail: `Удалена запись ${actor}. Это влияет на данные забегов и лидерборда.`,
        actor: `Запись: ${actor}`,
      };
    case 'IMPORT_STARTED':
      return {
        title: 'Начался импорт данных в магазин',
        detail: 'Remote отправил JSON на локальный сервер магазина для восстановления или обновления данных.',
        actor: `IP: ${actor}`,
      };
    case 'IMPORT_COMPLETED':
      return {
        title: 'Импорт данных в магазин завершен',
        detail: 'Локальный сервер магазина принял JSON и завершил импорт.',
        actor: `IP: ${actor}`,
      };
    case 'IMPORT_FAILED':
      return {
        title: 'Импорт данных в магазин не прошел',
        detail: 'Remote попытался отправить JSON на локальный сервер магазина, но операция завершилась ошибкой.',
        actor: `IP: ${actor}`,
      };
    case 'RUN_SESSIONS_VIEWED':
      return {
        title: 'Оператор открыл забеги лидерборда',
        detail: 'В remote admin просмотрели список забегов, построенный по JSON лидерборда.',
        actor: `IP: ${actor}`,
      };
    case 'HEALTH_STATUS_VIEWED':
      return {
        title: 'Оператор открыл мониторинг системы',
        detail: 'В remote admin запросили текущий live-статус магазина и remote-системы.',
        actor: `IP: ${actor}`,
      };
    case 'heartbeat':
      return {
        title: 'Получен heartbeat от устройства магазина',
        detail: 'Планшет или связанный компонент магазина сообщил, что он на связи.',
        actor: `Устройство: ${actor}`,
      };
    default:
      return {
        title: `Системное событие: ${row.type}`,
        detail: row.message && row.message !== '—' ? row.message : 'Remote admin записал техническое событие.',
        actor: `Источник: ${actor}`,
      };
  }
}

export function LogsTab() {
  const [data, setData] = useState<RemoteBackupEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<Awaited<ReturnType<typeof api.backupStatus>>['backup'] | null>(null);
  const [filter, setFilter] = useState<'all' | 'audit' | 'health'>('all');
  const [limit, setLimit] = useState<50 | 100 | 250 | 500>(100);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setError(null);
        const [res, st] = await Promise.all([api.latestHistoryBackupJson(), api.backupStatus()]);
        if (cancelled) return;
        setData(res as RemoteBackupEnvelope);
        setBackupStatus(st.backup);
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
        raw: r,
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
        raw: r,
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
        raw: r,
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
        <Typography sx={{ color: '#eee', fontSize: { xs: 18, sm: 22 }, fontWeight: 900, lineHeight: 1.2, mt: 0.5 }}>
          Период событий: {formatIso(period.from)} — {formatIso(period.to)}
        </Typography>
        <Typography sx={{ color: '#888', fontSize: 12, mt: 0.75 }}>
          Данные взяты из последнего полученного backup: {backupStatus?.lastBackupFileName ?? '—'} · получен {formatIso(backupStatus?.lastBackupAt)}
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
            {filtered.map((r, idx) => {
              const story = logStory(r);
              return (
                <Box
                  key={`${r.when}-${idx}`}
                  sx={{
                    border: isAlertLogRow(r) ? '1px solid #d97706' : '1px solid #2a2a2a',
                    borderRadius: 2,
                    p: 1.5,
                    bgcolor: isAlertLogRow(r) ? 'rgba(217,119,6,0.12)' : 'transparent',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 260, flex: '1 1 420px' }}>
                      <Typography sx={{ fontWeight: 900, fontSize: { xs: 17, sm: 19 }, lineHeight: 1.15 }}>
                        {story.title}
                      </Typography>
                      <Typography sx={{ color: '#d6d6d6', mt: 0.75 }}>{story.detail}</Typography>
                      <Typography sx={{ color: '#999', fontSize: 12, mt: 0.75 }}>
                        {story.actor} · {formatIso(r.when)} · {relativeTime(r.when)}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      <Typography sx={{ color: isAlertLogRow(r) ? '#fbbf24' : '#bbb', fontWeight: 900 }}>
                        {isAlertLogRow(r) ? 'ALERT' : r.kind.toUpperCase()}
                      </Typography>
                      {r.severity !== '—' ? (
                        <Typography sx={{ color: '#bbb', fontSize: 12 }}>{r.severity}</Typography>
                      ) : null}
                    </Box>
                  </Box>

                  <Accordion
                    disableGutters
                    sx={{
                      mt: 1,
                      bgcolor: 'rgba(0,0,0,0.18)',
                      color: '#ddd',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: 'none',
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#aaa' }} />}>
                      <Typography sx={{ color: '#aaa', fontSize: 13, fontWeight: 800 }}>Технические детали</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography component="pre" sx={{ m: 0, color: '#aaa', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {safeJsonPreview(r.raw, 4 * 1024)}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Typography sx={{ color: '#777' }}>Нет событий</Typography>
        )}
      </Paper>
    </Box>
  );
}
