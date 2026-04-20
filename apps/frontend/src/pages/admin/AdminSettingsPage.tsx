import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_MAX_GLOBAL_QUEUE_SIZE } from '@treadmill-challenge/shared';
import { api } from '../../api/client';
import { AdminLayout } from '../../features/admin/AdminLayout';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof api.adminGetSettings>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [dataToolBusy, setDataToolBusy] = useState(false);
  const [dataToolMsg, setDataToolMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

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
        tdDemoMode: settings.tdDemoMode,
        maxGlobalQueueSize: settings.maxGlobalQueueSize ?? settings.maxQueueSizePerRun ?? DEFAULT_MAX_GLOBAL_QUEUE_SIZE,
        eventTitle: settings.eventTitle,
        heartbeatIntervalMin: settings.heartbeatIntervalMin,
        showIntegrationInfoMessages: settings.showIntegrationInfoMessages,
      });
      sessionStorage.setItem('adminPin', settings.adminPin);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  /** Persist immediately — toggles used to require «Сохранить», which confused operators. */
  const persistToggle = async (key: 'tdDemoMode' | 'showIntegrationInfoMessages', value: boolean) => {
    if (!settings) return;
    const prev = settings[key];
    setSettings({ ...settings, [key]: value });
    try {
      await api.adminPutSettings(
        key === 'tdDemoMode' ? { tdDemoMode: value } : { showIntegrationInfoMessages: value }
      );
      setError(null);
    } catch (e) {
      setSettings({ ...settings, [key]: prev });
      setError(e instanceof Error ? e.message : 'Ошибка');
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
              checked={settings.tdDemoMode ?? false}
              onChange={(e) => void persistToggle('tdDemoMode', e.target.checked)}
              style={{ width: 24, height: 24 }}
            />
            TouchDesigner demo mode
          </label>
          <p style={{ margin: '-6px 0 0', fontSize: 13, color: '#888', lineHeight: 1.4 }}>
            Сохраняется сразу при переключении (на сервер). Без этого режима бэкенд шлёт OSC на старт забега; в demo
            режиме старт/очередь идут без TouchDesigner.
          </p>
          <label style={{ ...lab, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <input
              type="checkbox"
              checked={settings.showIntegrationInfoMessages ?? false}
              onChange={(e) => void persistToggle('showIntegrationInfoMessages', e.target.checked)}
              style={{ width: 24, height: 24 }}
            />
            Показывать информационные сообщения
          </label>
          <p style={{ margin: '-6px 0 0', fontSize: 13, color: '#888' }}>
            Эта галочка тоже сохраняется сразу. Остальные поля ниже — кнопка «Сохранить».
          </p>
          <label style={lab}>
            Макс. размер глобальной очереди (в очереди + на дорожке, всего)
            <input
              type="number"
              min={1}
              max={500}
              value={settings.maxGlobalQueueSize ?? settings.maxQueueSizePerRun ?? DEFAULT_MAX_GLOBAL_QUEUE_SIZE}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxGlobalQueueSize: Math.max(
                    1,
                    Math.min(500, Number(e.target.value) || DEFAULT_MAX_GLOBAL_QUEUE_SIZE)
                  ),
                })
              }
              style={inp}
            />
          </label>
          <label style={lab}>
            Интервал heartbeat (минуты)
            <select
              value={settings.heartbeatIntervalMin}
              onChange={(e) =>
                setSettings({ ...settings, heartbeatIntervalMin: Number(e.target.value) as 5 | 10 | 30 | 60 })
              }
              style={inp}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
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

          <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid #333' }}>
            <p style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600 }}>Резервная копия (JSON)</p>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#888', lineHeight: 1.45 }}>
              Экспорт и импорт для переноса между версиями или бэкапа. В JSON попадают участники, соревнования, сессии,
              результаты забегов, события и настройки админки. Файлы фото в архив не входят — только пути в БД; при
              переносе скопируйте каталог <code style={{ color: '#ccc' }}>data/photos</code> отдельно, если нужны сами
              снимки.
            </p>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#c9a227', lineHeight: 1.45 }}>
              Импорт: <strong>полная замена</strong> перечисленных таблиц текущей базы содержимым файла (транзакция).
              Текущие данные будут удалены. Это не слияние и не upsert по отдельным строкам.
            </p>
            {dataToolMsg && (
              <p style={{ margin: '0 0 10px', fontSize: 14, color: dataToolMsg.kind === 'ok' ? '#3fb950' : '#f85149' }}>
                {dataToolMsg.text}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                disabled={saving || dataToolBusy}
                onClick={async () => {
                  setDataToolMsg(null);
                  setDataToolBusy(true);
                  try {
                    await api.adminExportDataDownload();
                    setDataToolMsg({ kind: 'ok', text: 'Файл экспорта скачан.' });
                  } catch (e) {
                    setDataToolMsg({
                      kind: 'err',
                      text: e instanceof Error ? e.message : 'Ошибка экспорта',
                    });
                  } finally {
                    setDataToolBusy(false);
                  }
                }}
                style={{
                  minHeight: 48,
                  fontSize: 16,
                  padding: '0 16px',
                  borderRadius: 10,
                  border: '1px solid #444',
                  background: '#1a1a1a',
                  color: '#fff',
                  cursor: saving || dataToolBusy ? 'wait' : 'pointer',
                }}
              >
                Экспорт данных
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept="application/json,.json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const input = e.target;
                  const file = input.files?.[0];
                  input.value = '';
                  if (!file) return;
                  void (async () => {
                    const ok = window.confirm(
                      'Импорт заменит все данные в базе (участники, соревнования, сессии, забеги, события, настройки). Продолжить?'
                    );
                    if (!ok) return;
                    setDataToolMsg(null);
                    setDataToolBusy(true);
                    try {
                      const text = await file.text();
                      let parsed: unknown;
                      try {
                        parsed = JSON.parse(text) as unknown;
                      } catch {
                        setDataToolMsg({ kind: 'err', text: 'Некорректный JSON в файле.' });
                        return;
                      }
                      await api.adminImportData(parsed);
                      await load();
                      setDataToolMsg({ kind: 'ok', text: 'Импорт выполнен, данные восстановлены.' });
                    } catch (err) {
                      setDataToolMsg({
                        kind: 'err',
                        text: err instanceof Error ? err.message : 'Ошибка импорта',
                      });
                    } finally {
                      setDataToolBusy(false);
                    }
                  })();
                }}
              />
              <button
                type="button"
                disabled={saving || dataToolBusy}
                onClick={() => importFileRef.current?.click()}
                style={{
                  minHeight: 48,
                  fontSize: 16,
                  padding: '0 16px',
                  borderRadius: 10,
                  border: '1px solid #c9a227',
                  background: 'transparent',
                  color: '#c9a227',
                  cursor: saving || dataToolBusy ? 'wait' : 'pointer',
                }}
              >
                Импорт данных…
              </button>
            </div>
          </div>

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
