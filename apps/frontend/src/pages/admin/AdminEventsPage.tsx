import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { AdminLayout } from '../../features/admin/AdminLayout';

export default function AdminEventsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [appliedType, setAppliedType] = useState('');
  const [events, setEvents] = useState<Awaited<ReturnType<typeof api.adminEvents>>['events']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminEvents({ limit: 50, type: appliedType || undefined });
      setEvents(res.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, [appliedType]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilter = () => {
    setAppliedType(typeFilter.trim());
  };

  const clearFilter = () => {
    setTypeFilter('');
    setAppliedType('');
  };

  return (
    <AdminLayout title="События">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ccc' }}>
          Тип
          <input
            type="text"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
            placeholder="heartbeat, screen_view…"
            style={{
              minWidth: 200,
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #333',
              background: '#161616',
              color: '#eee',
              fontSize: 14,
            }}
          />
        </label>
        <button type="button" onClick={applyFilter} style={btn}>
          Фильтр
        </button>
        <button type="button" onClick={clearFilter} style={btnMuted}>
          Сброс
        </button>
        <button type="button" onClick={() => void load()} style={btn}>
          Обновить
        </button>
        {appliedType ? (
          <span style={{ color: '#888', fontSize: 14 }}>показано: {appliedType}</span>
        ) : null}
      </div>

      {loading && <p style={{ color: '#888' }}>Загрузка…</p>}
      {error && <p style={{ color: '#f85149' }}>{error}</p>}

      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                <th style={th}>Время</th>
                <th style={th}>Тип</th>
                <th style={th}>Payload</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={tdMono}>{new Date(ev.createdAt).toLocaleString()}</td>
                  <td style={td}>{ev.type}</td>
                  <td style={{ ...td, wordBreak: 'break-word', maxWidth: 560 }}>{ev.payloadPreview}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 0 ? <p style={{ color: '#888', marginTop: 12 }}>Нет событий.</p> : null}
        </div>
      )}
    </AdminLayout>
  );
}

const th: React.CSSProperties = { padding: '10px 8px', color: '#aaa', fontWeight: 600 };
const td: React.CSSProperties = { padding: '10px 8px', verticalAlign: 'top', color: '#ddd' };
const tdMono: React.CSSProperties = { ...td, fontFamily: 'ui-monospace, monospace', fontSize: 13, whiteSpace: 'nowrap' };
const btn: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #444',
  background: '#1e1e1e',
  color: '#eee',
  cursor: 'pointer',
  fontSize: 14,
};
const btnMuted: React.CSSProperties = { ...btn, opacity: 0.85 };
