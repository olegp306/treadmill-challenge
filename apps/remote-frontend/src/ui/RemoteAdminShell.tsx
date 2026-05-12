import { useEffect, useMemo, useState } from 'react';
import { AppBar, Box, Button, Container, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import { MonitoringTab } from './tabs/MonitoringTab';
import { ExportImportTab } from './tabs/ExportImportTab';
import { RunsTab } from './tabs/RunsTab';
import { SystemTab } from './tabs/SystemTab';
import { api } from '../api/client';

type TabKey = 'monitoring' | 'export' | 'runs' | 'system';

const TAB_ORDER: Array<{ key: TabKey; label: string }> = [
  { key: 'monitoring', label: 'Мониторинг' },
  { key: 'export', label: 'Экспорт-импорт' },
  { key: 'runs', label: 'Забеги' },
  { key: 'system', label: 'Система' },
];

function formatBackupAbsolute(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Russian plural: n + " " + form */
function ruPluralForm(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return `${n} ${many}`;
  if (n1 > 1 && n1 < 5) return `${n} ${few}`;
  if (n1 === 1) return `${n} ${one}`;
  return `${n} ${many}`;
}

/** Text inside parentheses, e.g. "2 минуты назад", "1 час назад". */
function relativeTimeRu(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 10) return 'только что';
  if (diffSec < 60) return ruPluralForm(diffSec, 'секунду', 'секунды', 'секунд') + ' назад';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return ruPluralForm(diffMin, 'минуту', 'минуты', 'минут') + ' назад';
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return ruPluralForm(diffH, 'час', 'часа', 'часов') + ' назад';
  const diffD = Math.floor(diffH / 24);
  return ruPluralForm(diffD, 'день', 'дня', 'дней') + ' назад';
}

export function RemoteAdminShell() {
  const [tab, setTab] = useState<TabKey>('monitoring');
  const [backupStatus, setBackupStatus] = useState<{
    lastBackupAt: string | null;
    lastError: string | null;
  }>({ lastBackupAt: null, lastError: null });
  const [pullBusy, setPullBusy] = useState(false);

  useEffect(() => {
    document.body.style.background = '#0d0d0d';
    return () => {
      document.body.style.background = '';
    };
  }, []);

  const close = () => {
    void api.logout().catch(() => undefined);
    sessionStorage.removeItem('remoteAdminToken');
    // Try closing (works only if opened by script); fallback to reload (login screen).
    window.close();
    window.location.reload();
  };

  const pullNow = async () => {
    setPullBusy(true);
    try {
      await api.pullBackupNow();
      const st = await api.backupStatus();
      setBackupStatus({ lastBackupAt: st.backup.lastBackupAt, lastError: st.backup.lastError });
      window.dispatchEvent(new CustomEvent('remote-backup-updated'));
    } catch {
      // Status tab and Monitoring tab will show details; keep header stable.
    } finally {
      setPullBusy(false);
    }
  };

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const st = await api.backupStatus();
        if (cancelled) return;
        setBackupStatus({ lastBackupAt: st.backup.lastBackupAt, lastError: st.backup.lastError });
      } catch {
        if (cancelled) return;
        setBackupStatus({ lastBackupAt: null, lastError: null });
      }
    };
    void load();
    const t = window.setInterval(() => void load(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [tick]);

  const backupMetaLine = useMemo(() => {
    if (!backupStatus.lastBackupAt) return 'Бэкап: не получен';
    const abs = formatBackupAbsolute(backupStatus.lastBackupAt);
    const rel = relativeTimeRu(backupStatus.lastBackupAt);
    return `Бэкап: ${abs} (${rel})`;
  }, [backupStatus.lastBackupAt, tick]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0d0d0d', color: '#eee' }}>
      <AppBar position="sticky" sx={{ bgcolor: '#e6233a' }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 240 }}>
            <Typography
              component="h1"
              sx={{
                fontWeight: 900,
                letterSpacing: 1.2,
                fontSize: { xs: '1.35rem', sm: '1.6rem' },
                lineHeight: 1.15,
                textTransform: 'uppercase',
                textShadow: '0 1px 2px rgba(0,0,0,0.35)',
              }}
            >
              REMOTE PANEL
            </Typography>
            <Typography
              sx={{
                mt: 0.5,
                fontSize: { xs: '0.95rem', sm: '1.05rem' },
                fontWeight: 700,
                color: 'rgba(255,255,255,0.95)',
                letterSpacing: 0.2,
              }}
            >
              {backupMetaLine}
            </Typography>
            {backupStatus.lastError ? (
              <Typography sx={{ fontSize: 12, color: 'rgba(0,0,0,0.85)' }}>
                Ошибка: {backupStatus.lastError}
              </Typography>
            ) : null}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              onClick={() => void pullNow()}
              variant="contained"
              disabled={pullBusy}
              sx={{ bgcolor: '#111', color: '#fff', fontWeight: 900 }}
            >
              {pullBusy ? '...' : 'Получить обновление'}
            </Button>
            <Button onClick={close} variant="contained" sx={{ bgcolor: '#111', color: '#fff', fontWeight: 900 }}>
              Закрыть
            </Button>
          </Box>
        </Toolbar>
        <Tabs
          value={TAB_ORDER.findIndex((t) => t.key === tab)}
          onChange={(_e, idx) => setTab(TAB_ORDER[idx]!.key)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            bgcolor: '#0d0d0d',
            '& .MuiTab-root': { color: '#eee', fontWeight: 800 },
            '& .MuiTabs-indicator': { bgcolor: '#e6233a' },
          }}
        >
          {TAB_ORDER.map((t) => (
            <Tab key={t.key} label={t.label} />
          ))}
        </Tabs>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {tab === 'monitoring' ? <MonitoringTab /> : null}
        {tab === 'export' ? <ExportImportTab /> : null}
        {tab === 'runs' ? <RunsTab /> : null}
        {tab === 'system' ? <SystemTab /> : null}
      </Container>
    </Box>
  );
}

