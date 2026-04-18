import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRunTypeName } from '@treadmill-challenge/shared';
import { api } from '../../api/client';
import { AdminLayout } from '../../features/admin/AdminLayout';

type Tab = 'queue' | 'leaderboard' | 'participants' | 'actions';

export default function AdminCompetitionPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('queue');
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof api.adminCompetitionDetail>> | null>(null);
  const [queue, setQueue] = useState<Awaited<ReturnType<typeof api.adminCompetitionQueue>>['entries']>([]);
  const [leaderboard, setLeaderboard] = useState<
    Awaited<ReturnType<typeof api.adminCompetitionLeaderboard>>['entries']
  >([]);
  const [participants, setParticipants] = useState<
    Awaited<ReturnType<typeof api.adminCompetitionParticipants>>['participants']
  >([]);
  const [td, setTd] = useState<Awaited<ReturnType<typeof api.adminTdStatus>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editRun, setEditRun] = useState<{ runId: string; resultTime: string; distance: string } | null>(null);
  const [verificationPhoto, setVerificationPhoto] = useState<{ runId: string; url: string } | null>(null);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    const d = await api.adminCompetitionDetail(id);
    setDetail(d);
  }, [id]);

  const loadQueue = useCallback(async () => {
    if (!id) return;
    const q = await api.adminCompetitionQueue(id);
    setQueue(q.entries);
  }, [id]);

  const loadLb = useCallback(async () => {
    if (!id) return;
    const l = await api.adminCompetitionLeaderboard(id);
    setLeaderboard(l.entries);
  }, [id]);

  const loadPart = useCallback(async () => {
    if (!id) return;
    const p = await api.adminCompetitionParticipants(id);
    setParticipants(p.participants);
  }, [id]);

  const loadTd = useCallback(async () => {
    const t = await api.adminTdStatus();
    setTd(t);
  }, []);

  useEffect(() => {
    return () => {
      if (verificationPhoto?.url) URL.revokeObjectURL(verificationPhoto.url);
    };
  }, [verificationPhoto?.url]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadDetail();
        await loadQueue();
        await loadLb();
        await loadPart();
        await loadTd();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, loadDetail, loadQueue, loadLb, loadPart, loadTd]);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await loadDetail();
      await loadQueue();
      await loadLb();
      await loadPart();
      await loadTd();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(null);
    }
  };

  if (!id) return null;

  const comp = detail?.competition;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'queue', label: 'Очередь' },
    { id: 'leaderboard', label: 'Лидерборд' },
    { id: 'participants', label: 'Участники' },
    { id: 'actions', label: 'Действия' },
  ];

  return (
    <AdminLayout title={comp ? comp.title : 'Соревнование'}>
      <p style={{ margin: '0 0 12px' }}>
        <Link to="/admin" style={{ color: '#e6233a', fontSize: 16 }}>
          ← К слотам
        </Link>
      </p>
      {comp && (
        <p style={{ color: '#888', margin: '0 0 16px', fontSize: 14 }}>
          {getRunTypeName(comp.runTypeId)} · {comp.sex === 'male' ? 'Мужчины' : 'Женщины'} · {comp.status}
        </p>
      )}
      {loading && <p style={{ color: '#888' }}>Загрузка…</p>}
      {error && <p style={{ color: '#f85149' }}>{error}</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              minHeight: 48,
              padding: '0 18px',
              fontSize: 16,
              borderRadius: 10,
              border: tab === t.id ? '2px solid #e6233a' : '1px solid #333',
              background: tab === t.id ? '#2a1518' : '#1a1a1a',
              color: '#eee',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'queue' && (
        <section>
          {queue.map((row) => (
            <div
              key={row.runSessionId}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 10,
                padding: 12,
                marginBottom: 8,
                background: '#161616',
                borderRadius: 10,
                border: '1px solid #2a2a2a',
              }}
            >
              <span style={{ minWidth: 36, fontWeight: 600 }}>#{row.queueNumber}</span>
              <span style={{ flex: '1 1 160px' }}>{row.participantName}</span>
              <span style={{ color: '#888', fontSize: 14 }}>{row.status}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => run(`mvu-${row.runSessionId}`, () => api.adminQueueAction(id, row.runSessionId, 'move-up'))}
                  style={smallBtn}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => run(`mvd-${row.runSessionId}`, () => api.adminQueueAction(id, row.runSessionId, 'move-down'))}
                  style={smallBtn}
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => run(`run-${row.runSessionId}`, () => api.adminQueueAction(id, row.runSessionId, 'mark-running'))}
                  style={smallBtn}
                >
                  Бежит
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() =>
                    run(`fin-${row.runSessionId}`, () =>
                      api.adminQueueAction(id, row.runSessionId, 'mark-finished', { resultTime: 300, distance: 1000 })
                    )
                  }
                  style={smallBtn}
                >
                  Финиш
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => run(`can-${row.runSessionId}`, () => api.adminQueueAction(id, row.runSessionId, 'mark-cancelled'))}
                  style={smallBtn}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => run(`rem-${row.runSessionId}`, () => api.adminQueueAction(id, row.runSessionId, 'remove'))}
                  style={smallBtn}
                >
                  Убрать
                </button>
              </div>
            </div>
          ))}
          {queue.length === 0 && <p style={{ color: '#666' }}>Пусто</p>}
        </section>
      )}

      {tab === 'leaderboard' && (
        <section>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run('recalc', () => api.adminRecalculateLeaderboard(id))}
            style={{ ...smallBtn, marginBottom: 12, minHeight: 48, fontSize: 16 }}
          >
            Пересчитать скорости
          </button>
          {leaderboard.map((row) => (
            <div
              key={row.runId}
              style={{
                padding: 12,
                marginBottom: 8,
                background: '#161616',
                borderRadius: 10,
                border: '1px solid #2a2a2a',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <strong>#{row.rank}</strong>
                <span style={{ flex: '1 1 200px' }}>{row.participantName}</span>
                <span style={{ color: '#888' }}>
                  {row.resultTime.toFixed(2)} c · {Math.round(row.distance)} м
                </span>
                {row.verificationPhotoAvailable ? (
                  <button
                    type="button"
                    style={{ ...smallBtn, borderColor: '#3fb950' }}
                    onClick={() => {
                      void (async () => {
                        try {
                          const blob = await api.adminGetRunVerificationPhotoBlob(row.runId);
                          setVerificationPhoto((prev) => {
                            if (prev?.url) URL.revokeObjectURL(prev.url);
                            return { runId: row.runId, url: URL.createObjectURL(blob) };
                          });
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Не удалось загрузить фото');
                        }
                      })();
                    }}
                  >
                    Фото
                  </button>
                ) : null}
                <button
                  type="button"
                  style={smallBtn}
                  onClick={() =>
                    setEditRun({
                      runId: row.runId,
                      resultTime: String(row.resultTime),
                      distance: String(row.distance),
                    })
                  }
                >
                  Правка
                </button>
                <button
                  type="button"
                  style={smallBtn}
                  disabled={!!busy}
                  onClick={() => run(`del-${row.runId}`, () => api.adminDeleteRun(id, row.runId))}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && <p style={{ color: '#666' }}>Нет результатов</p>}

          {verificationPhoto ? (
            <div
              role="dialog"
              aria-modal
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: 16,
              }}
              onClick={() => {
                setVerificationPhoto((prev) => {
                  if (prev?.url) URL.revokeObjectURL(prev.url);
                  return null;
                });
              }}
            >
              <div
                style={{ maxWidth: 'min(920px, 100%)', maxHeight: '90vh' }}
                onClick={(e) => e.stopPropagation()}
              >
                <p style={{ margin: '0 0 8px', color: '#ccc' }}>Фото в начале забега (проверка)</p>
                <img
                  src={verificationPhoto.url}
                  alt="Проверочное фото участника"
                  style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8, display: 'block' }}
                />
                <button
                  type="button"
                  style={{ ...smallBtn, marginTop: 12, minHeight: 48 }}
                  onClick={() => {
                    setVerificationPhoto((prev) => {
                      if (prev?.url) URL.revokeObjectURL(prev.url);
                      return null;
                    });
                  }}
                >
                  Закрыть
                </button>
              </div>
            </div>
          ) : null}

          {editRun && (
            <div style={{ marginTop: 16, padding: 16, background: '#1a1a1a', borderRadius: 10 }}>
              <p style={{ marginTop: 0 }}>Редактировать результат</p>
              <label style={{ display: 'block', marginBottom: 8 }}>
                Время (с)
                <input
                  value={editRun.resultTime}
                  onChange={(e) => setEditRun({ ...editRun, resultTime: e.target.value })}
                  style={inp}
                />
              </label>
              <label style={{ display: 'block', marginBottom: 8 }}>
                Дистанция (м)
                <input
                  value={editRun.distance}
                  onChange={(e) => setEditRun({ ...editRun, distance: e.target.value })}
                  style={inp}
                />
              </label>
              <button
                type="button"
                style={{ ...smallBtn, minHeight: 48 }}
                onClick={() => {
                  const rt = Number(editRun.resultTime);
                  const dist = Number(editRun.distance);
                  void run(`save-${editRun.runId}`, () =>
                    api.adminUpdateRun(id, editRun.runId, { resultTime: rt, distance: dist })
                  ).then(() => setEditRun(null));
                }}
              >
                Сохранить
              </button>
              <button type="button" style={{ ...smallBtn, marginLeft: 8 }} onClick={() => setEditRun(null)}>
                Закрыть
              </button>
            </div>
          )}
        </section>
      )}

      {tab === 'participants' && (
        <section>
          {participants.map((p) => (
            <ParticipantRow
              key={p.id}
              competitionId={id}
              participant={p}
              busy={!!busy}
              onError={setError}
              onRefresh={async () => {
                await loadPart();
                await loadQueue();
              }}
            />
          ))}
          {participants.length === 0 && <p style={{ color: '#666' }}>Нет участников с сессиями</p>}
        </section>
      )}

      {tab === 'actions' && td && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, color: '#888' }}>
            TD: {td.adapter} @ {td.host}:{td.port}
          </p>
          <p style={{ margin: 0, fontSize: 14 }}>
            Последний успех: {td.lastSyncOk || '—'}
          </p>
          <p style={{ margin: 0, fontSize: 14, color: td.lastSyncError ? '#f85149' : '#888' }}>
            Ошибка: {td.lastSyncError || '—'}
          </p>
          <button
            type="button"
            disabled={!!busy}
            style={{ ...smallBtn, minHeight: 52, fontSize: 17 }}
            onClick={() => run('resend', () => api.adminResendTd(id))}
          >
            Отправить данные в TouchDesigner
          </button>
          <button
            type="button"
            disabled={!!busy}
            style={{ ...smallBtn, minHeight: 52, fontSize: 17 }}
            onClick={() => run('clear', () => api.adminClearQueue(id))}
          >
            Очистить очередь
          </button>
          <button
            type="button"
            disabled={!!busy}
            style={{ ...smallBtn, minHeight: 52, fontSize: 17 }}
            onClick={() => run('reset', () => api.adminResetRunner(id))}
          >
            Сбросить текущего бегуна
          </button>
          <button type="button" disabled={!!busy} style={{ ...smallBtn, minHeight: 48 }} onClick={() => void loadTd()}>
            Обновить статус TD
          </button>
        </section>
      )}
    </AdminLayout>
  );
}

function ParticipantRow({
  competitionId,
  participant,
  busy,
  onError,
  onRefresh,
}: {
  competitionId: string;
  participant: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    sex: string;
  };
  busy: boolean;
  onError: (s: string | null) => void;
  onRefresh: () => Promise<void>;
}) {
  const [edit, setEdit] = useState(false);
  const [firstName, setFirstName] = useState(participant.firstName);
  const [lastName, setLastName] = useState(participant.lastName);
  const [phone, setPhone] = useState(participant.phone);
  const [sex, setSex] = useState(participant.sex);

  useEffect(() => {
    setFirstName(participant.firstName);
    setLastName(participant.lastName);
    setPhone(participant.phone);
    setSex(participant.sex);
  }, [participant]);

  return (
    <div style={{ padding: 14, marginBottom: 10, background: '#161616', borderRadius: 10, border: '1px solid #2a2a2a' }}>
      {!edit ? (
        <>
          <p style={{ margin: '0 0 8px' }}>
            <strong>
              {participant.firstName} {participant.lastName}
            </strong>
          </p>
          <p style={{ margin: '0 0 8px', color: '#888', fontSize: 14 }}>
            {participant.phone} · {participant.sex}
          </p>
          <button type="button" style={smallBtn} disabled={busy} onClick={() => setEdit(true)}>
            Править
          </button>
          <button
            type="button"
            style={{ ...smallBtn, marginLeft: 8 }}
            disabled={busy}
            onClick={async () => {
              if (!window.confirm('Удалить участника из этого соревнования?')) return;
              try {
                await api.adminRemoveParticipantFromCompetition(competitionId, participant.id);
                await onRefresh();
              } catch (e) {
                onError(e instanceof Error ? e.message : 'Ошибка');
              }
            }}
          >
            Удалить из соревнования
          </button>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inp} placeholder="Имя" />
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} style={inp} placeholder="Фамилия" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inp} placeholder="Телефон" />
          <select value={sex} onChange={(e) => setSex(e.target.value)} style={inp}>
            <option value="male">male</option>
            <option value="female">female</option>
          </select>
          <div>
            <button
              type="button"
              style={smallBtn}
              disabled={busy}
              onClick={async () => {
                try {
                  await api.adminUpdateParticipant(participant.id, { firstName, lastName, phone, sex: sex as 'male' | 'female' });
                  setEdit(false);
                  await onRefresh();
                } catch (e) {
                  onError(e instanceof Error ? e.message : 'Ошибка');
                }
              }}
            >
              Сохранить
            </button>
            <button type="button" style={{ ...smallBtn, marginLeft: 8 }} onClick={() => setEdit(false)}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  minHeight: 40,
  padding: '0 12px',
  fontSize: 15,
  borderRadius: 8,
  border: '1px solid #444',
  background: '#222',
  color: '#eee',
};

const inp: React.CSSProperties = {
  width: '100%',
  maxWidth: 400,
  minHeight: 44,
  fontSize: 16,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #444',
  background: '#0d0d0d',
  color: '#fff',
  boxSizing: 'border-box',
};
