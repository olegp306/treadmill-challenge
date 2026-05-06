import { useEffect, useState } from 'react';
import { AppBar, Box, Button, Container, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import { MonitoringTab } from './tabs/MonitoringTab';
import { LogsTab } from './tabs/LogsTab';
import { ExportImportTab } from './tabs/ExportImportTab';
import { RunsTab } from './tabs/RunsTab';
import { SystemTab } from './tabs/SystemTab';
import { api } from '../api/client';

type TabKey = 'monitoring' | 'logs' | 'export' | 'runs' | 'system';

const TAB_ORDER: Array<{ key: TabKey; label: string }> = [
  { key: 'monitoring', label: 'Мониторинг' },
  { key: 'logs', label: 'Логи' },
  { key: 'export', label: 'Экспорт-импорт' },
  { key: 'runs', label: 'Забеги' },
  { key: 'system', label: 'Система' },
];

export function RemoteAdminShell() {
  const [tab, setTab] = useState<TabKey>('monitoring');

  useEffect(() => {
    document.body.style.background = '#0d0d0d';
    return () => {
      document.body.style.background = '';
    };
  }, []);

  const logout = () => {
    void api.logout().catch(() => undefined);
    sessionStorage.removeItem('remoteAdminToken');
    window.location.reload();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0d0d0d', color: '#eee' }}>
      <AppBar position="sticky" sx={{ bgcolor: '#e6233a' }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 0.5 }}>REMOTE ADMINISTRATOR</Typography>
          <Button onClick={logout} variant="contained" sx={{ bgcolor: '#111', color: '#fff', fontWeight: 800 }}>
            Выход
          </Button>
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
        {tab === 'logs' ? <LogsTab /> : null}
        {tab === 'export' ? <ExportImportTab /> : null}
        {tab === 'runs' ? <RunsTab /> : null}
        {tab === 'system' ? <SystemTab /> : null}
      </Container>
    </Box>
  );
}

