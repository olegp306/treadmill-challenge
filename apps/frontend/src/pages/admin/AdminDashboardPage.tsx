import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeName } from '@treadmill-challenge/shared';
import { api } from '../../api/client';
import { AdminLayout } from '../../features/admin/AdminLayout';

export default function AdminDashboardPage() {
  const [slots, setSlots] = useState<Awaited<ReturnType<typeof api.adminDashboard>>['slots']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminDashboard();
      setSlots(data.slots);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminLayout title="Соревнования">
      {loading && <p style={{ color: '#888' }}>Загрузка…</p>}
      {error && <p style={{ color: '#f85149' }}>{error}</p>}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {slots.map((slot) => {
          const id = `${slot.runTypeId}-${slot.gender}`;
          const isActive = slot.competition?.status === 'active';
          const hasComp = !!slot.competition;
          const title = `${getRunTypeName(slot.runTypeId)} · ${slot.gender === 'male' ? 'М' : 'Ж'}`;
          return (
            <article
              key={id}
              style={{
                background: '#161616',
                border: '1px solid #2a2a2a',
                borderRadius: 14,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2>
              <p style={{ margin: 0, color: '#aaa', fontSize: 14 }}>
                Статус:{' '}
                <strong style={{ color: '#fff' }}>{slot.competition?.status ?? 'нет соревнования'}</strong>
              </p>
              <p style={{ margin: 0, fontSize: 14 }}>
                В очереди: <strong>{slot.queuedCount}</strong>
              </p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.3 }}>
                Лидер:{' '}
                {slot.leader ? (
                  <>
                    {slot.leader.participantName}{' '}
                    <span style={{ color: '#888' }}>
                      ({slot.leader.resultTime.toFixed(1)} c / {Math.round(slot.leader.distance)} м)
                    </span>
                  </>
                ) : (
                  <span style={{ color: '#666' }}>—</span>
                )}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  disabled={!!busy || isActive}
                  onClick={() =>
                    runAction(`start-${id}`, () =>
                      api.adminStartCompetition({ runTypeId: slot.runTypeId as RunTypeId, gender: slot.gender })
                    )
                  }
                  style={btn(false, !!busy || isActive)}
                >
                  Старт
                </button>
                <button
                  type="button"
                  disabled={!!busy || !isActive || !slot.competition}
                  onClick={() =>
                    runAction(`stop-${id}`, () => api.adminStopCompetition(slot.competition!.id))
                  }
                  style={btn(false, !!busy || !isActive || !slot.competition)}
                >
                  Стоп
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() =>
                    runAction(`restart-${id}`, () =>
                      api.adminRestartCompetition({ runTypeId: slot.runTypeId as RunTypeId, gender: slot.gender })
                    )
                  }
                  style={btn(false, !!busy)}
                >
                  Перезапуск
                </button>
                <Link
                  to={hasComp && slot.competition ? `/admin/competition/${slot.competition.id}` : '#'}
                  style={{
                    ...btn(true, !hasComp || !slot.competition),
                    textAlign: 'center',
                    textDecoration: 'none',
                    lineHeight: '48px',
                  }}
                  onClick={(e) => {
                    if (!hasComp || !slot.competition) e.preventDefault();
                  }}
                >
                  Подробнее
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </AdminLayout>
  );
}

function btn(isLink: boolean, disabled: boolean): React.CSSProperties {
  return {
    minHeight: 48,
    fontSize: 17,
    borderRadius: 10,
    border: isLink ? '1px solid #444' : 'none',
    background: isLink ? 'transparent' : '#2a2a2a',
    color: '#eee',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
  };
}
