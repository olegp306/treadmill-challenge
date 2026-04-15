import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { AdminLayout } from '../../features/admin/AdminLayout';

export default function AdminEventsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [participantFilter, setParticipantFilter] = useState('');
  const [runSessionFilter, setRunSessionFilter] = useState('');
  const [orderChronological, setOrderChronological] = useState(false);
  const [applied, setApplied] = useState({
    type: '',
    sessionId: '',
    participantId: '',
    runSessionId: '',
    orderChronological: false,
  });
  const [events, setEvents] = useState<Awaited<ReturnType<typeof api.adminEvents>>['events']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const order =
        applied.orderChronological || applied.sessionId ? 'asc' : 'desc';
      const res = await api.adminEvents({
        limit: 200,
        type: applied.type || undefined,
        sessionId: applied.sessionId || undefined,
        participantId: applied.participantId || undefined,
        runSessionId: applied.runSessionId || undefined,
        order,
      });
      setEvents(res.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = () => {
    setApplied({
      type: typeFilter.trim(),
      sessionId: sessionFilter.trim(),
      participantId: participantFilter.trim(),
      runSessionId: runSessionFilter.trim(),
      orderChronological,
    });
  };

  const clearFilters = () => {
    setTypeFilter('');
    setSessionFilter('');
    setParticipantFilter('');
    setRunSessionFilter('');
    setOrderChronological(false);
    setApplied({
      type: '',
      sessionId: '',
      participantId: '',
      runSessionId: '',
      orderChronological: false,
    });
  };

  return (
    <AdminLayout title="События">
      <p style={{ color: '#888', marginTop: 0, marginBottom: 16, maxWidth: 900 }}>
        Хронология действий пользователя. Основной текст — понятное описание; тип события и технические поля
        ниже.
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'flex-end',
          marginBottom: 16,
        }}
      >
        <label style={lab}>
          Сообщение / тип
          <input
            type="text"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder="screen_view, error_event…"
            style={inp}
          />
        </label>
        <label style={lab}>
          sessionId
          <input
            type="text"
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            placeholder="UUID сессии браузера"
            style={inp}
          />
        </label>
        <label style={lab}>
          participantId
          <input
            type="text"
            value={participantFilter}
            onChange={(e) => setParticipantFilter(e.target.value)}
            style={inp}
          />
        </label>
        <label style={lab}>
          runSessionId
          <input
            type="text"
            value={runSessionFilter}
            onChange={(e) => setRunSessionFilter(e.target.value)}
            style={inp}
          />
        </label>
        <label style={{ ...lab, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={orderChronological}
            onChange={(e) => setOrderChronological(e.target.checked)}
          />
          Сначала старые (как история)
        </label>
        <button type="button" onClick={applyFilters} style={btn}>
          Применить
        </button>
        <button type="button" onClick={clearFilters} style={btnMuted}>
          Сброс
        </button>
        <button type="button" onClick={() => void load()} style={btn}>
          Обновить
        </button>
      </div>

      {loading && <p style={{ color: '#888' }}>Загрузка…</p>}
      {error && <p style={{ color: '#f85149' }}>{error}</p>}

      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                <th style={th}>Время</th>
                <th style={th}>Что произошло</th>
                <th style={th}>Тип</th>
                <th style={th}>Payload</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={tdMono}>{new Date(ev.createdAt).toLocaleString()}</td>
                  <td style={tdMain}>
                    {ev.readableMessage && ev.readableMessage.trim().length > 0
                      ? ev.readableMessage
                      : `(без текста) ${ev.type}`}
                  </td>
                  <td style={tdType}>{ev.type}</td>
                  <td style={{ ...td, wordBreak: 'break-word', maxWidth: 280, fontSize: 12, color: '#888' }}>
                    <div>session: {ev.sessionId.slice(0, 8)}…</div>
                    {ev.participantId ? <div>participant: {ev.participantId.slice(0, 8)}…</div> : null}
                    {ev.runSessionId ? <div>runSession: {ev.runSessionId.slice(0, 8)}…</div> : null}
                    <div style={{ marginTop: 6 }}>{ev.payloadPreview}</div>
                  </td>
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

const lab: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  color: '#ccc',
  fontSize: 13,
};
const inp: React.CSSProperties = {
  minWidth: 140,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #333',
  background: '#161616',
  color: '#eee',
  fontSize: 14,
};
const th: React.CSSProperties = { padding: '10px 8px', color: '#aaa', fontWeight: 600 };
const td: React.CSSProperties = { padding: '10px 8px', verticalAlign: 'top', color: '#ddd' };
const tdMono: React.CSSProperties = { ...td, fontFamily: 'ui-monospace, monospace', fontSize: 13, whiteSpace: 'nowrap' };
const tdMain: React.CSSProperties = { ...td, maxWidth: 520, lineHeight: 1.45 };
const tdType: React.CSSProperties = { ...td, fontSize: 12, color: '#888', whiteSpace: 'nowrap' };
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
