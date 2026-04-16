import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeName } from '@treadmill-challenge/shared';
import { api } from '../../api/client';
import { AdminLayout } from '../../features/admin/AdminLayout';

export default function AdminArchivePage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sex, setSex] = useState<'' | Gender>('');
  const [runTypeId, setRunTypeId] = useState<'' | RunTypeId>('');
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.adminArchive>>['competitions']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminArchive({
        from: from || undefined,
        to: to || undefined,
        sex: sex || undefined,
        runTypeId: runTypeId === '' ? undefined : runTypeId,
      });
      setRows(data.competitions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, [from, to, sex, runTypeId]);

  useEffect(() => {
    void load();
    // initial load only; filters applied via "Обновить"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminLayout title="Архив соревнований">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, alignItems: 'flex-end' }}>
        <label style={lab}>
          С даты
          <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} style={inp} />
        </label>
        <label style={lab}>
          По дату
          <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} style={inp} />
        </label>
        <label style={lab}>
          Пол
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value as '' | Gender)}
            style={inp}
          >
            <option value="">Все</option>
            <option value="male">Мужчины</option>
            <option value="female">Женщины</option>
          </select>
        </label>
        <label style={lab}>
          Формат
          <select
            value={runTypeId === '' ? '' : String(runTypeId)}
            onChange={(e) => {
              const v = e.target.value;
              setRunTypeId(v === '' ? '' : (Number(v) as RunTypeId));
            }}
            style={inp}
          >
            <option value="">Все</option>
            <option value="0">Макс 5 мин</option>
            <option value="1">Золотой км</option>
            <option value="2">5 км</option>
          </select>
        </label>
        <button type="button" style={btn} onClick={() => void load()}>
          Обновить
        </button>
      </div>
      {loading && <p style={{ color: '#888' }}>Загрузка…</p>}
      {error && <p style={{ color: '#f85149' }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((c) => (
          <div
            key={c.id}
            style={{
              padding: 14,
              background: '#161616',
              borderRadius: 10,
              border: '1px solid #2a2a2a',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <strong>{c.title}</strong>
                <div style={{ color: '#888', fontSize: 14, marginTop: 4 }}>
                  {getRunTypeName(c.runTypeId as RunTypeId)} · {c.sex === 'male' ? 'М' : 'Ж'} · {c.status}
                </div>
                <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
                  {c.startedAt}
                  {c.stoppedAt ? ` → ${c.stoppedAt}` : ''}
                </div>
              </div>
              <Link to={`/admin/competition/${c.id}`} style={{ color: '#e6233a', alignSelf: 'center' }}>
                Открыть
              </Link>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

const lab: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 };
const inp: React.CSSProperties = {
  minHeight: 44,
  fontSize: 16,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #444',
  background: '#0d0d0d',
  color: '#fff',
};
const btn: React.CSSProperties = {
  minHeight: 44,
  padding: '0 20px',
  fontSize: 16,
  borderRadius: 10,
  background: '#e6233a',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
};
