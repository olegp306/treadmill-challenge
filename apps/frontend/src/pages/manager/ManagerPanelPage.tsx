import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeName } from '@treadmill-challenge/shared';
import { api } from '../../api/client';

type ManagerTab = 'queue' | 'runs' | 'system';

type QueueEntry = {
  runSessionId: string;
  queueNumber: number;
  participantId: string;
  participantName: string;
  runTypeId: RunTypeId;
  runType: string;
  status: string;
  competitionId: string;
};

type Slot = {
  runTypeId: RunTypeId;
  sex: Gender;
  competition: { id: string; title: string } | null;
};

type EditableParticipant = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
};

function slotLabel(slot: Slot): string {
  const sex = slot.sex === 'male' ? 'Мужчины' : 'Женщины';
  return `${sex} — ${getRunTypeName(slot.runTypeId)}`;
}

export default function ManagerPanelPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ManagerTab>('queue');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [queueRows, setQueueRows] = useState<QueueEntry[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<EditableParticipant[]>([]);
  const [drafts, setDrafts] = useState<Record<string, EditableParticipant>>({});

  const [restartPin, setRestartPin] = useState('');
  const [restartConfirm, setRestartConfirm] = useState(false);

  const maleSlots = useMemo(() => slots.filter((s) => s.sex === 'male'), [slots]);
  const femaleSlots = useMemo(() => slots.filter((s) => s.sex === 'female'), [slots]);

  const loadQueue = async () => {
    const q = await api.getRunQueue();
    setQueueRows((q.entries as QueueEntry[]).slice().sort((a, b) => a.queueNumber - b.queueNumber));
  };

  const loadSlots = async () => {
    const dashboard = await api.adminDashboard();
    const mapped = dashboard.slots.map((s) => ({
      runTypeId: s.runTypeId,
      sex: s.sex,
      competition: s.competition ? { id: s.competition.id, title: s.competition.title } : null,
    }));
    setSlots(mapped);
  };

  const loadParticipantsByCompetitionId = async (competitionId: string) => {
    const res = await api.adminCompetitionParticipants(competitionId);
    const mapped = res.participants.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
    }));
    setParticipants(mapped);
    setDrafts(Object.fromEntries(mapped.map((p) => [p.id, { ...p }])));
  };

  useEffect(() => {
    void (async () => {
      setBusy(true);
      setError(null);
      try {
        await Promise.all([loadQueue(), loadSlots()]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  const refreshQueue = async () => {
    setBusy(true);
    setError(null);
    try {
      await loadQueue();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка обновления очереди');
    } finally {
      setBusy(false);
    }
  };

  const moveQueue = async (row: QueueEntry, action: 'move-up' | 'move-down' | 'move-tail') => {
    if (row.status !== 'queued') return;
    setBusy(true);
    setError(null);
    try {
      await api.adminQueueAction(row.competitionId, row.runSessionId, action);
      await loadQueue();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить очередь');
    } finally {
      setBusy(false);
    }
  };

  const openSlotParticipants = async (slot: Slot) => {
    if (!slot.competition?.id) return;
    setBusy(true);
    setError(null);
    try {
      await loadParticipantsByCompetitionId(slot.competition.id);
      setSelectedCompetitionId(slot.competition.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить участников');
    } finally {
      setBusy(false);
    }
  };

  const saveParticipant = async (participantId: string) => {
    const draft = drafts[participantId];
    if (!draft) return;
    if (!selectedCompetitionId) return;
    setBusy(true);
    setError(null);
    try {
      await api.adminUpdateParticipant(participantId, {
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        phone: draft.phone.trim(),
      });
      await loadParticipantsByCompetitionId(selectedCompetitionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить участника');
    } finally {
      setBusy(false);
    }
  };

  const restartSystem = async () => {
    if (!restartConfirm) {
      setError('Подтвердите перезагрузку');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.adminSystemRestart(restartPin);
      setError('Команда отправлена. Система перезапускается...');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось перезагрузить систему');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Панель менеджера</h1>
        <div style={styles.tabs}>
          <button style={tab === 'queue' ? styles.tabActive : styles.tab} onClick={() => setTab('queue')} type="button">
            Очередь
          </button>
          <button style={tab === 'runs' ? styles.tabActive : styles.tab} onClick={() => setTab('runs')} type="button">
            Забеги
          </button>
          <button style={tab === 'system' ? styles.tabActive : styles.tab} onClick={() => setTab('system')} type="button">
            Система
          </button>
        </div>
      </header>

      {error ? <p style={styles.error}>{error}</p> : null}
      {busy ? <p style={styles.info}>Загрузка...</p> : null}

      {tab === 'queue' ? (
        <section>
          <div style={styles.homeMainWrap}>
            <button type="button" style={styles.btnHomeMain} onClick={() => navigate('/')}>
              Вернуться на главную
            </button>
          </div>
          <div style={styles.sectionHead}>
            <h2 style={styles.h2}>Текущая очередь</h2>
            <button type="button" style={styles.refreshBtn} onClick={refreshQueue}>
              Обновить
            </button>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Участник</th>
                <th style={styles.th}>Забег</th>
                <th style={styles.th}>Статус</th>
                <th style={styles.th}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {queueRows.map((row) => (
                <tr key={row.runSessionId} style={row.status === 'running' ? styles.runningRow : undefined}>
                  <td style={styles.td}>{row.queueNumber}</td>
                  <td style={styles.td}>{row.participantName}</td>
                  <td style={styles.td}>{row.runType}</td>
                  <td style={styles.td}>{row.status}</td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button
                        type="button"
                        style={row.status === 'queued' ? styles.smallBtn : styles.smallBtnDisabled}
                        disabled={busy || row.status !== 'queued'}
                        onClick={() => moveQueue(row, 'move-up')}
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        style={row.status === 'queued' ? styles.smallBtn : styles.smallBtnDisabled}
                        disabled={busy || row.status !== 'queued'}
                        onClick={() => moveQueue(row, 'move-down')}
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        style={row.status === 'queued' ? styles.tailBtn : styles.tailBtnDisabled}
                        disabled={busy || row.status !== 'queued'}
                        onClick={() => moveQueue(row, 'move-tail')}
                      >
                        В конец
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === 'runs' ? (
        <section>
          <h2 style={styles.h2}>Слоты забегов</h2>
          <div style={styles.slotGrid}>
            {maleSlots.map((slot, i) => (
              <button
                key={`m-${slot.runTypeId}-${i}`}
                type="button"
                style={
                  selectedCompetitionId === slot.competition?.id
                    ? styles.slotBtnActive
                    : styles.slotBtn
                }
                disabled={!slot.competition || busy}
                onClick={() => openSlotParticipants(slot)}
              >
                {slotLabel(slot)}
              </button>
            ))}
          </div>
          <div style={styles.slotGrid}>
            {femaleSlots.map((slot, i) => (
              <button
                key={`f-${slot.runTypeId}-${i}`}
                type="button"
                style={
                  selectedCompetitionId === slot.competition?.id
                    ? styles.slotBtnActive
                    : styles.slotBtn
                }
                disabled={!slot.competition || busy}
                onClick={() => openSlotParticipants(slot)}
              >
                {slotLabel(slot)}
              </button>
            ))}
          </div>

          {selectedCompetitionId ? (
            <>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Фамилия</th>
                    <th style={styles.th}>Имя</th>
                    <th style={styles.th}>Телефон</th>
                    <th style={styles.th}>Сохранение</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
                    <tr key={p.id}>
                      <td style={styles.td}>
                        <input
                          style={styles.input}
                          value={drafts[p.id]?.lastName ?? ''}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [p.id]: { ...(prev[p.id] ?? p), lastName: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          style={styles.input}
                          value={drafts[p.id]?.firstName ?? ''}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [p.id]: { ...(prev[p.id] ?? p), firstName: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          style={styles.input}
                          value={drafts[p.id]?.phone ?? ''}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [p.id]: { ...(prev[p.id] ?? p), phone: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td style={styles.td}>
                        <button type="button" style={styles.saveBtn} disabled={busy} onClick={() => saveParticipant(p.id)}>
                          Сохранить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </section>
      ) : null}

      {tab === 'system' ? (
        <section>
          <h2 style={styles.h2}>Перезагрузка системы</h2>
          <p style={styles.info}>Требуется подтверждение PIN менеджера</p>
          <div style={styles.systemCard}>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="PIN менеджера"
              value={restartPin}
              onChange={(e) => setRestartPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={styles.systemInput}
            />
            <label style={styles.check}>
              <input type="checkbox" checked={restartConfirm} onChange={(e) => setRestartConfirm(e.target.checked)} />
              Подтверждаю перезагрузку
            </label>
            <button type="button" style={styles.restartBtn} disabled={busy || restartPin.length !== 6} onClick={restartSystem}>
              Перезагрузить систему
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, color: '#fff', background: '#121212', minHeight: '100vh', boxSizing: 'border-box' },
  header: { display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { margin: 0, fontSize: 28, fontWeight: 700 },
  tabs: { display: 'flex', gap: 8 },
  tab: { padding: '10px 14px', borderRadius: 10, border: '1px solid #555', background: '#1b1b1b', color: '#ddd' },
  tabActive: { padding: '10px 14px', borderRadius: 10, border: '1px solid #e6233a', background: '#2a1115', color: '#fff' },
  h2: { margin: '8px 0 12px', fontSize: 22 },
  h3: { margin: '20px 0 12px', fontSize: 18 },
  info: { margin: '8px 0', color: '#b8b8b8' },
  error: { margin: '8px 0', color: '#ff7b7b' },
  homeMainWrap: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
  },
  btnHomeMain: {
    width: '100%',
    maxWidth: 560,
    minHeight: 56,
    padding: '14px 20px',
    borderRadius: 14,
    border: '1px solid #e6233a',
    background: '#e6233a',
    color: '#fff',
    fontSize: 18,
    fontWeight: 600,
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
  },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  refreshBtn: { padding: '8px 12px', borderRadius: 8, border: '1px solid #555', background: '#1e1e1e', color: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#171717' },
  th: { textAlign: 'left', padding: 10, borderBottom: '1px solid #333', fontSize: 14, color: '#ccc' },
  td: { padding: 10, borderBottom: '1px solid #2a2a2a', verticalAlign: 'middle' },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  smallBtn: {
    minWidth: 112,
    padding: '10px 18px',
    borderRadius: 8,
    border: '1px solid #666',
    background: '#202020',
    color: '#fff',
    fontSize: 15,
    boxSizing: 'border-box' as const,
  },
  smallBtnDisabled: {
    minWidth: 112,
    padding: '10px 18px',
    borderRadius: 8,
    border: '1px solid #555',
    background: '#2a2a2a',
    color: '#8f8f8f',
    cursor: 'not-allowed',
    fontSize: 15,
    boxSizing: 'border-box' as const,
  },
  tailBtn: {
    minWidth: 180,
    padding: '10px 18px',
    borderRadius: 8,
    border: '1px solid #e6233a',
    background: '#331217',
    color: '#fff',
    fontSize: 15,
    boxSizing: 'border-box' as const,
  },
  tailBtnDisabled: {
    minWidth: 180,
    padding: '10px 18px',
    borderRadius: 8,
    border: '1px solid #555',
    background: '#2a2a2a',
    color: '#8f8f8f',
    cursor: 'not-allowed',
    fontSize: 15,
    boxSizing: 'border-box' as const,
  },
  slotGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 10 },
  slotBtn: { padding: '12px 10px', borderRadius: 10, border: '1px solid #444', background: '#1a1a1a', color: '#fff' },
  slotBtnActive: {
    padding: '12px 10px',
    borderRadius: 10,
    border: '1px solid #e6233a',
    background: '#3a141a',
    color: '#fff',
  },
  runningRow: { background: '#232323', color: '#9f9f9f' },
  input: { width: '100%', minHeight: 34, borderRadius: 8, border: '1px solid #555', background: '#0f0f0f', color: '#fff', padding: '6px 8px', boxSizing: 'border-box' },
  saveBtn: { padding: '8px 12px', borderRadius: 8, border: '1px solid #e6233a', background: '#3a141a', color: '#fff' },
  systemCard: { display: 'grid', gap: 12, maxWidth: 420, background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: 16 },
  systemInput: { minHeight: 44, borderRadius: 8, border: '1px solid #555', background: '#0f0f0f', color: '#fff', padding: '8px 10px' },
  check: { display: 'flex', alignItems: 'center', gap: 8, color: '#d0d0d0' },
  restartBtn: { minHeight: 46, borderRadius: 10, border: 'none', background: '#e6233a', color: '#fff', fontWeight: 700 },
};
