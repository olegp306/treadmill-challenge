import { useEffect, useState } from 'react';
import { Alert, Box, Button, Checkbox, Divider, FormControlLabel, Paper, TextField, Typography } from '@mui/material';
import {
  api,
  type LocalConnectionSettings,
  type StoreHeartbeat,
  type TdHealthDiagnostics,
  type TelegramSettings,
} from '../../api/client';

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
    storeHeartbeat?: StoreHeartbeat;
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
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [telegramSaved, setTelegramSaved] = useState<string | null>(null);
  const [localConnectionError, setLocalConnectionError] = useState<string | null>(null);
  const [localConnectionSaved, setLocalConnectionSaved] = useState<string | null>(null);
  const [tdHealthError, setTdHealthError] = useState<string | null>(null);
  const [tdHealthSaved, setTdHealthSaved] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings | null>(null);
  const [localConnectionSettings, setLocalConnectionSettings] = useState<LocalConnectionSettings | null>(null);
  const [storeHeartbeat, setStoreHeartbeat] = useState<StoreHeartbeat | null>(null);
  const [tdHealthDiagnostics, setTdHealthDiagnostics] = useState<TdHealthDiagnostics | null>(null);
  const [localConnectionForm, setLocalConnectionForm] = useState({
    localBackendBaseUrl: '',
    localBackendAuthToken: '',
    remoteBackendPublicUrl: '',
    heartbeatToken: '',
  });
  const [telegramForm, setTelegramForm] = useState({
    botToken: '',
    chatId: '',
    statusPageUrl: '',
    webhookSecret: '',
    alertsEnabled: true,
  });
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [localConnectionBusy, setLocalConnectionBusy] = useState(false);
  const [tdHealthBusy, setTdHealthBusy] = useState(false);
  const [tdHealthFilePath, setTdHealthFilePath] = useState('');

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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setTdHealthError(null);
        const res = await api.localTdHealthDiagnostics();
        if (cancelled) return;
        setTdHealthDiagnostics(res.diagnostics);
        setTdHealthFilePath(res.diagnostics.source === 'admin_setting' ? (res.diagnostics.configuredValue ?? '') : '');
      } catch (e) {
        if (cancelled) return;
        setTdHealthError(e instanceof Error ? e.message : 'Failed');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLocalConnectionError(null);
        const res = await api.localConnectionSettings();
        if (cancelled) return;
        setLocalConnectionSettings(res.settings);
        setStoreHeartbeat(res.heartbeat);
        setLocalConnectionForm({
          localBackendBaseUrl: res.settings.localBackendBaseUrl ?? '',
          localBackendAuthToken: '',
          remoteBackendPublicUrl: res.settings.remoteBackendPublicUrl ?? '',
          heartbeatToken: '',
        });
      } catch (e) {
        if (cancelled) return;
        setLocalConnectionError(e instanceof Error ? e.message : 'Failed');
      }
    };
    void load();
    const t = window.setInterval(() => void load(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setTelegramError(null);
        const res = await api.telegramSettings();
        if (cancelled) return;
        setTelegramSettings(res.settings);
        setTelegramForm({
          botToken: '',
          chatId: res.settings.chatId ?? '',
          statusPageUrl: res.settings.statusPageUrl ?? '',
          webhookSecret: '',
          alertsEnabled: res.settings.alertsEnabled,
        });
      } catch (e) {
        if (cancelled) return;
        setTelegramError(e instanceof Error ? e.message : 'Failed');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveTelegramSettings = async () => {
    setTelegramBusy(true);
    setTelegramError(null);
    setTelegramSaved(null);
    try {
      const res = await api.updateTelegramSettings({
        botToken: telegramForm.botToken.trim() ? telegramForm.botToken : undefined,
        chatId: telegramForm.chatId,
        statusPageUrl: telegramForm.statusPageUrl,
        webhookSecret: telegramForm.webhookSecret.trim() ? telegramForm.webhookSecret : undefined,
        alertsEnabled: telegramForm.alertsEnabled,
      });
      setTelegramSettings(res.settings);
      setTelegramForm((f) => ({ ...f, botToken: '', webhookSecret: '' }));
      setTelegramSaved('Telegram settings saved');
    } catch (e) {
      setTelegramError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setTelegramBusy(false);
    }
  };

  const clearTelegramSecret = async (field: 'botToken' | 'webhookSecret') => {
    setTelegramBusy(true);
    setTelegramError(null);
    setTelegramSaved(null);
    try {
      const res = await api.updateTelegramSettings({ [field]: null });
      setTelegramSettings(res.settings);
      setTelegramForm((f) => ({ ...f, [field]: '' }));
      setTelegramSaved(field === 'botToken' ? 'Bot token cleared' : 'Webhook secret cleared');
    } catch (e) {
      setTelegramError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setTelegramBusy(false);
    }
  };

  const sendTestTelegram = async () => {
    setTelegramBusy(true);
    setTelegramError(null);
    setTelegramSaved(null);
    try {
      await api.sendTelegramTestAlert();
      setTelegramSaved('Test message sent');
    } catch (e) {
      setTelegramError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setTelegramBusy(false);
    }
  };

  const saveLocalConnectionSettings = async () => {
    setLocalConnectionBusy(true);
    setLocalConnectionError(null);
    setLocalConnectionSaved(null);
    try {
      const res = await api.updateLocalConnectionSettings({
        localBackendBaseUrl: localConnectionForm.localBackendBaseUrl,
        localBackendAuthToken: localConnectionForm.localBackendAuthToken.trim() ? localConnectionForm.localBackendAuthToken : undefined,
        remoteBackendPublicUrl: localConnectionForm.remoteBackendPublicUrl,
        heartbeatToken: localConnectionForm.heartbeatToken.trim() ? localConnectionForm.heartbeatToken : undefined,
      });
      setLocalConnectionSettings(res.settings);
      setStoreHeartbeat(res.heartbeat);
      setLocalConnectionForm((f) => ({ ...f, localBackendAuthToken: '', heartbeatToken: '' }));
      setLocalConnectionSaved('Store connection settings saved');
    } catch (e) {
      setLocalConnectionError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLocalConnectionBusy(false);
    }
  };

  const clearLocalConnectionSecret = async (field: 'localBackendAuthToken' | 'heartbeatToken') => {
    setLocalConnectionBusy(true);
    setLocalConnectionError(null);
    setLocalConnectionSaved(null);
    try {
      const res = await api.updateLocalConnectionSettings({ [field]: null });
      setLocalConnectionSettings(res.settings);
      setStoreHeartbeat(res.heartbeat);
      setLocalConnectionForm((f) => ({ ...f, [field]: '' }));
      setLocalConnectionSaved(field === 'localBackendAuthToken' ? 'Local backend token cleared' : 'Heartbeat token cleared');
    } catch (e) {
      setLocalConnectionError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLocalConnectionBusy(false);
    }
  };

  const refreshTdHealthDiagnostics = async () => {
    setTdHealthBusy(true);
    setTdHealthError(null);
    setTdHealthSaved(null);
    try {
      const res = await api.localTdHealthDiagnostics();
      setTdHealthDiagnostics(res.diagnostics);
      setTdHealthSaved('TD health diagnostics refreshed');
    } catch (e) {
      setTdHealthError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setTdHealthBusy(false);
    }
  };

  const saveTdHealthPath = async (value: string | null = tdHealthFilePath) => {
    setTdHealthBusy(true);
    setTdHealthError(null);
    setTdHealthSaved(null);
    try {
      const res = await api.updateLocalTdHealthSettings({ tdHealthFilePath: value });
      setTdHealthDiagnostics(res.diagnostics);
      setTdHealthFilePath(res.diagnostics.source === 'admin_setting' ? (res.diagnostics.configuredValue ?? '') : '');
      setTdHealthSaved(value === null ? 'TD health path cleared' : 'TD health path saved');
    } catch (e) {
      setTdHealthError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setTdHealthBusy(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {telegramError ? <Alert severity="error">{telegramError}</Alert> : null}
      {telegramSaved ? <Alert severity="success">{telegramSaved}</Alert> : null}
      {localConnectionError ? <Alert severity="error">{localConnectionError}</Alert> : null}
      {localConnectionSaved ? <Alert severity="success">{localConnectionSaved}</Alert> : null}
      {tdHealthError ? <Alert severity="error">{tdHealthError}</Alert> : null}
      {tdHealthSaved ? <Alert severity="success">{tdHealthSaved}</Alert> : null}

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
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Store server connection</Typography>
        <Typography sx={{ color: '#777', fontSize: 12, mb: 2 }}>
          Configure the store backend API URL and give the store-side developer a heartbeat URL to verify that the store can reach the hosting.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <TextField
            label="Store backend API URL"
            value={localConnectionForm.localBackendBaseUrl}
            onChange={(e) => setLocalConnectionForm((f) => ({ ...f, localBackendBaseUrl: e.target.value }))}
            placeholder="http://store-pc:3001"
            size="small"
            fullWidth
          />
          <TextField
            label={localConnectionSettings?.localBackendAuthTokenConfigured ? 'Store backend auth token (configured)' : 'Store backend auth token'}
            value={localConnectionForm.localBackendAuthToken}
            onChange={(e) => setLocalConnectionForm((f) => ({ ...f, localBackendAuthToken: e.target.value }))}
            placeholder={localConnectionSettings?.localBackendAuthTokenConfigured ? 'Leave empty to keep current token' : 'optional'}
            type="password"
            size="small"
            fullWidth
          />
          <TextField
            label="Remote backend public URL"
            value={localConnectionForm.remoteBackendPublicUrl}
            onChange={(e) => setLocalConnectionForm((f) => ({ ...f, remoteBackendPublicUrl: e.target.value }))}
            placeholder="https://your-domain"
            size="small"
            fullWidth
          />
          <TextField
            label={localConnectionSettings?.heartbeatTokenConfigured ? `Heartbeat token (${localConnectionSettings.heartbeatTokenPreview ?? 'configured'})` : 'Heartbeat token'}
            value={localConnectionForm.heartbeatToken}
            onChange={(e) => setLocalConnectionForm((f) => ({ ...f, heartbeatToken: e.target.value }))}
            placeholder={localConnectionSettings?.heartbeatTokenConfigured ? 'Leave empty to keep current token' : 'optional shared secret'}
            type="password"
            size="small"
            fullWidth
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
          <Button variant="contained" disabled={localConnectionBusy} onClick={() => void saveLocalConnectionSettings()} sx={{ fontWeight: 900 }}>
            Save store connection
          </Button>
          <Button
            variant="outlined"
            disabled={localConnectionBusy || !localConnectionSettings?.localBackendAuthTokenConfigured}
            onClick={() => void clearLocalConnectionSecret('localBackendAuthToken')}
          >
            Clear backend token
          </Button>
          <Button
            variant="outlined"
            disabled={localConnectionBusy || !localConnectionSettings?.heartbeatTokenConfigured}
            onClick={() => void clearLocalConnectionSecret('heartbeatToken')}
          >
            Clear heartbeat token
          </Button>
        </Box>
        <Divider sx={{ my: 1.5, borderColor: '#2a2a2a' }} />
        <Typography sx={{ color: '#bbb', fontSize: 12 }}>
          heartbeat URL for store developer: {localConnectionSettings?.heartbeatUrl ?? 'set Remote backend public URL first'}
        </Typography>
        <Typography sx={{ color: '#bbb', fontSize: 12 }}>
          last store heartbeat: {formatIso(storeHeartbeat?.lastHeartbeatAt ?? data?.local.storeHeartbeat?.lastHeartbeatAt)}
        </Typography>
        <Typography sx={{ color: '#bbb', fontSize: 12 }}>
          last heartbeat IP: {storeHeartbeat?.lastRemoteAddress ?? data?.local.storeHeartbeat?.lastRemoteAddress ?? '—'}
        </Typography>
        <Typography sx={{ color: '#777', fontSize: 12, mt: 1 }}>
          Developer can call the heartbeat URL with GET or POST. If a token is configured, it can also be sent in X-Store-Heartbeat-Token.
        </Typography>
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid #2a2a2a', bgcolor: '#161616' }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>TouchDesigner health file</Typography>
        <Typography sx={{ color: '#777', fontSize: 12, mb: 2 }}>
          Configure where the store backend should read TDHealth.json. This feeds the store status block in Monitoring.
        </Typography>
        <TextField
          label="TDHealth.json path on store PC"
          value={tdHealthFilePath}
          onChange={(e) => setTdHealthFilePath(e.target.value)}
          placeholder="C:\\path\\to\\TDHealth.json"
          size="small"
          fullWidth
        />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
          <Button variant="contained" disabled={tdHealthBusy} onClick={() => void saveTdHealthPath()} sx={{ fontWeight: 900 }}>
            Save TD health path
          </Button>
          <Button variant="outlined" disabled={tdHealthBusy} onClick={() => void refreshTdHealthDiagnostics()}>
            Check now
          </Button>
          <Button variant="outlined" disabled={tdHealthBusy || !tdHealthDiagnostics?.configuredValue} onClick={() => void saveTdHealthPath(null)}>
            Clear custom path
          </Button>
        </Box>
        <Divider sx={{ my: 1.5, borderColor: '#2a2a2a' }} />
        <Typography sx={{ color: '#bbb', fontSize: 12 }}>resolved path: {tdHealthDiagnostics?.path ?? 'вЂ”'}</Typography>
        <Typography sx={{ color: '#bbb', fontSize: 12 }}>source: {tdHealthDiagnostics?.source ?? 'вЂ”'}</Typography>
        <Typography sx={{ color: '#bbb', fontSize: 12 }}>backend cwd: {tdHealthDiagnostics?.cwd ?? 'вЂ”'}</Typography>
        <Typography sx={{ color: tdHealthDiagnostics?.exists ? '#86efac' : '#fca5a5', fontSize: 12 }}>
          file exists: {tdHealthDiagnostics ? (tdHealthDiagnostics.exists ? 'yes' : 'no') : 'вЂ”'}
        </Typography>
        <Typography sx={{ color: tdHealthDiagnostics?.parseOk ? '#86efac' : '#fca5a5', fontSize: 12 }}>
          JSON parsed: {tdHealthDiagnostics ? (tdHealthDiagnostics.parseOk ? 'yes' : 'no') : 'вЂ”'}
        </Typography>
        <Typography sx={{ color: '#bbb', fontSize: 12 }}>mtime: {formatIso(tdHealthDiagnostics?.mtime)}</Typography>
        <Typography sx={{ color: '#bbb', fontSize: 12 }}>size: {tdHealthDiagnostics?.sizeBytes ?? 'вЂ”'} bytes</Typography>
        <Typography sx={{ color: '#bbb', fontSize: 12 }}>
          keys: {tdHealthDiagnostics?.jsonKeys.length ? tdHealthDiagnostics.jsonKeys.join(', ') : 'вЂ”'}
        </Typography>
        <Typography sx={{ color: tdHealthDiagnostics?.error ? '#fca5a5' : '#777', fontSize: 12 }}>
          error: {tdHealthDiagnostics?.error ?? 'вЂ”'}
        </Typography>
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
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Telegram bot for system alerts</Typography>
        <Typography sx={{ color: '#777', fontSize: 12, mb: 2 }}>
          Bot sends alert messages and provides a button to open the Treadmill Challenge status page.
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <TextField
            label={telegramSettings?.botTokenConfigured ? `Bot token (${telegramSettings.botTokenPreview ?? 'configured'})` : 'Bot token'}
            value={telegramForm.botToken}
            onChange={(e) => setTelegramForm((f) => ({ ...f, botToken: e.target.value }))}
            placeholder={telegramSettings?.botTokenConfigured ? 'Leave empty to keep current token' : '123456:ABC...'}
            type="password"
            size="small"
            fullWidth
          />
          <TextField
            label="Telegram chat ID"
            value={telegramForm.chatId}
            onChange={(e) => setTelegramForm((f) => ({ ...f, chatId: e.target.value }))}
            placeholder="-1001234567890"
            size="small"
            fullWidth
          />
          <TextField
            label="Status page URL"
            value={telegramForm.statusPageUrl}
            onChange={(e) => setTelegramForm((f) => ({ ...f, statusPageUrl: e.target.value }))}
            placeholder="https://your-domain/admin"
            size="small"
            fullWidth
          />
          <TextField
            label={telegramSettings?.webhookSecretConfigured ? 'Webhook secret (configured)' : 'Webhook secret'}
            value={telegramForm.webhookSecret}
            onChange={(e) => setTelegramForm((f) => ({ ...f, webhookSecret: e.target.value }))}
            placeholder={telegramSettings?.webhookSecretConfigured ? 'Leave empty to keep current secret' : 'secret token for Telegram webhook'}
            type="password"
            size="small"
            fullWidth
          />
        </Box>

        <FormControlLabel
          sx={{ mt: 1 }}
          control={
            <Checkbox
              checked={telegramForm.alertsEnabled}
              onChange={(e) => setTelegramForm((f) => ({ ...f, alertsEnabled: e.target.checked }))}
            />
          }
          label="Send system alerts to this Telegram chat"
        />

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
          <Button variant="contained" disabled={telegramBusy} onClick={() => void saveTelegramSettings()} sx={{ fontWeight: 900 }}>
            Save Telegram settings
          </Button>
          <Button variant="outlined" disabled={telegramBusy || !telegramSettings?.botTokenConfigured} onClick={() => void sendTestTelegram()} sx={{ fontWeight: 900 }}>
            Send test message
          </Button>
          <Button variant="outlined" disabled={telegramBusy || !telegramSettings?.botTokenConfigured} onClick={() => void clearTelegramSecret('botToken')}>
            Clear bot token
          </Button>
          <Button variant="outlined" disabled={telegramBusy || !telegramSettings?.webhookSecretConfigured} onClick={() => void clearTelegramSecret('webhookSecret')}>
            Clear webhook secret
          </Button>
        </Box>

        <Divider sx={{ my: 1.5, borderColor: '#2a2a2a' }} />
        <Typography sx={{ color: '#bbb', fontSize: 12 }}>bot token: {telegramSettings?.botTokenConfigured ? `configured (${telegramSettings.source.botToken})` : 'missing'}</Typography>
        <Typography sx={{ color: '#bbb', fontSize: 12 }}>chat ID: {telegramSettings?.chatId ?? '—'} ({telegramSettings?.source.chatId ?? 'missing'})</Typography>
        <Typography sx={{ color: '#bbb', fontSize: 12 }}>status page: {telegramSettings?.statusPageUrl ?? '—'} ({telegramSettings?.source.statusPageUrl ?? 'missing'})</Typography>
        <Typography sx={{ color: '#bbb', fontSize: 12 }}>webhook secret: {telegramSettings?.webhookSecretConfigured ? `configured (${telegramSettings.source.webhookSecret})` : 'missing'}</Typography>
        <Typography sx={{ color: '#777', fontSize: 12, mt: 1 }}>
          Webhook URL: https://api.telegram.org/bot&lt;TOKEN&gt;/setWebhook?url=&lt;REMOTE_BACKEND_URL&gt;/api/telegram/webhook&amp;secret_token=&lt;WEBHOOK_SECRET&gt;
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
