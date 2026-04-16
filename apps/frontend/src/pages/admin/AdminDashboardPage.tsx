import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeName } from '@treadmill-challenge/shared';
import { api } from '../../api/client';
import { AdminLayout } from '../../features/admin/AdminLayout';

type Slot = Awaited<ReturnType<typeof api.adminDashboard>>['slots'][number];

function CompetitionCard({
  slot,
  busy,
  onPauseToggle,
  onStopAndStart,
}: {
  slot: Slot;
  busy: boolean;
  onPauseToggle: () => void;
  onStopAndStart: () => void;
}) {
  const comp = slot.competition;
  const hasComp = !!comp;
  const paused = slot.queuePaused;
  const title = getRunTypeName(slot.runTypeId);
  const genderLabel = slot.sex === 'male' ? 'Мужчины' : 'Женщины';

  return (
    <article
      style={{
        background: '#161616',
        border: `1px solid ${paused ? '#6b4f1a' : '#2a2a2a'}`,
        borderRadius: 14,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 17, lineHeight: 1.25 }}>{title}</h2>
      <p style={{ margin: 0, color: '#888', fontSize: 13 }}>{genderLabel}</p>
      <p style={{ margin: 0, color: '#aaa', fontSize: 14 }}>
        Статус:{' '}
        <strong style={{ color: '#fff' }}>{comp?.status ?? '—'}</strong>
        {paused ? (
          <span style={{ color: '#d4a017', marginLeft: 8 }}>· на паузе</span>
        ) : (
          <span style={{ color: '#3fb950', marginLeft: 8 }}>· очередь открыта</span>
        )}
      </p>
      <p style={{ margin: 0, fontSize: 14 }}>
        В очереди: <strong>{slot.queuedCount}</strong>
      </p>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.35, flex: 1 }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
        <button
          type="button"
          disabled={busy || !hasComp}
          onClick={onPauseToggle}
          style={touchBtn(!!busy || !hasComp, paused)}
        >
          {paused ? 'Продолжить' : 'Пауза'}
        </button>
        <button
          type="button"
          disabled={busy || !hasComp}
          onClick={onStopAndStart}
          style={touchBtn(!!busy || !hasComp, false)}
        >
          Остановить и запустить новый
        </button>
        <Link
          to={hasComp && comp ? `/admin/competition/${comp.id}` : '#'}
          style={{
            ...touchLink(!hasComp || !comp),
            textAlign: 'center',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => {
            if (!hasComp || !comp) e.preventDefault();
          }}
        >
          Подробнее
        </Link>
      </div>
    </article>
  );
}

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

  const maleSlots = useMemo(
    () =>
      slots
        .filter((s) => s.sex === 'male')
        .sort((a, b) => a.runTypeId - b.runTypeId),
    [slots]
  );
  const femaleSlots = useMemo(
    () =>
      slots
        .filter((s) => s.sex === 'female')
        .sort((a, b) => a.runTypeId - b.runTypeId),
    [slots]
  );

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

  const renderRow = (label: string, rowSlots: Slot[]) => (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          margin: '0 0 14px',
          fontSize: 22,
          fontWeight: 600,
          color: '#e6e6e6',
        }}
      >
        {label}
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 14,
          alignItems: 'stretch',
        }}
      >
        {rowSlots.map((slot) => {
          const id = `${slot.runTypeId}-${slot.sex}`;
          const compId = slot.competition?.id;
          return (
            <CompetitionCard
              key={id}
              slot={slot}
              busy={!!busy}
              onPauseToggle={() => {
                if (!compId) return;
                const next = !slot.queuePaused;
                void runAction(`pause-${id}`, () => api.adminSetCompetitionQueuePause(compId, next));
              }}
              onStopAndStart={() =>
                void runAction(`stopstart-${id}`, () =>
                  api.adminStopAndStartCompetition({
                    runTypeId: slot.runTypeId as RunTypeId,
                    sex: slot.sex as Gender,
                  })
                )
              }
            />
          );
        })}
      </div>
    </section>
  );

  return (
    <AdminLayout title="Соревнования">
      {loading && <p style={{ color: '#888' }}>Загрузка…</p>}
      {error && <p style={{ color: '#f85149' }}>{error}</p>}
      {!loading && (
        <>
          {renderRow('Мужчины', maleSlots)}
          {renderRow('Женщины', femaleSlots)}
        </>
      )}
    </AdminLayout>
  );
}

function touchBtn(disabled: boolean, accentPause: boolean): React.CSSProperties {
  return {
    minHeight: 52,
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 12,
    border: 'none',
    background: disabled ? '#2a2a2a' : accentPause ? '#3d3420' : '#2d333b',
    color: '#eee',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    padding: '0 12px',
  };
}

function touchLink(disabled: boolean): React.CSSProperties {
  return {
    minHeight: 48,
    fontSize: 16,
    borderRadius: 12,
    border: '1px solid #444',
    background: 'transparent',
    color: '#eee',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
  };
}
