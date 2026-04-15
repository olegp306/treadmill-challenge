import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { AdminLayout } from '../../features/admin/AdminLayout';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof api.adminGetSettings>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await api.adminGetSettings();
      setSettings(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      await api.adminPutSettings({
        adminPin: settings.adminPin,
        tdHost: settings.tdHost,
        tdPort: settings.tdPort,
        tdAdapter: settings.tdAdapter,
        testMode: settings.testMode,
        tdDemoMode: settings.tdDemoMode,
        maxQueueSizePerRun: settings.maxQueueSizePerRun,
        eventTitle: settings.eventTitle,
      });
      sessionStorage.setItem('adminPin', settings.adminPin);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Настройки">
      {loading && <p style={{ color: '#888' }}>Загрузка…</p>}
      {error && <p style={{ color: '#f85149' }}>{error}</p>}
      {settings && (
        <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={lab}>
            PIN админки
            <input
              type="password"
              inputMode="numeric"
              value={settings.adminPin}
              onChange={(e) => setSettings({ ...settings, adminPin: e.target.value })}
              style={inp}
            />
          </label>
          <label style={lab}>
            TouchDesigner host
            <input
              value={settings.tdHost}
              onChange={(e) => setSettings({ ...settings, tdHost: e.target.value })}
              style={inp}
            />
          </label>
          <label style={lab}>
            TouchDesigner port
            <input
              value={settings.tdPort}
              onChange={(e) => setSettings({ ...settings, tdPort: e.target.value })}
              style={inp}
            />
          </label>
          <label style={lab}>
            TD adapter (mock | osc)
            <input
              value={settings.tdAdapter}
              onChange={(e) => setSettings({ ...settings, tdAdapter: e.target.value })}
              style={inp}
            />
          </label>
          <label style={{ ...lab, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <input
              type="checkbox"
              checked={settings.testMode}
              onChange={(e) => setSettings({ ...settings, testMode: e.target.checked })}
              style={{ width: 24, height: 24 }}
            />
            Тестовый режим
          </label>
          <label style={{ ...lab, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <input
              type="checkbox"
              checked={settings.tdDemoMode ?? false}
              onChange={(e) => setSettings({ ...settings, tdDemoMode: e.target.checked })}
              style={{ width: 24, height: 24 }}
            />
            TouchDesigner demo mode
          </label>
          <label style={lab}>
            Макс. размер очереди на забег (на активное соревнование)
            <input
              type="number"
              min={1}
              max={500}
              value={settings.maxQueueSizePerRun ?? 3}
              onChange={(e) =>
                setSettings({ ...settings, maxQueueSizePerRun: Math.max(1, Math.min(500, Number(e.target.value) || 3)) })
              }
              style={inp}
            />
          </label>
          <label style={lab}>
            Название события
            <input
              value={settings.eventTitle}
              onChange={(e) => setSettings({ ...settings, eventTitle: e.target.value })}
              style={inp}
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            style={{
              minHeight: 52,
              fontSize: 18,
              borderRadius: 12,
              border: 'none',
              background: '#e6233a',
              color: '#fff',
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              if (!window.confirm('Удалить все тестовые данные?')) return;
              setSaving(true);
              try {
                await api.adminResetTestData();
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Ошибка');
              } finally {
                setSaving(false);
              }
            }}
            style={{
              minHeight: 52,
              fontSize: 18,
              borderRadius: 12,
              border: '1px solid #f85149',
              background: 'transparent',
              color: '#f85149',
            }}
          >
            Сбросить тестовые данные
          </button>
        </div>
      )}
    </AdminLayout>
  );
}

const lab: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15 };
const inp: React.CSSProperties = {
  minHeight: 48,
  fontSize: 16,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #444',
  background: '#0d0d0d',
  color: '#fff',
};
