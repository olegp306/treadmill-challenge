import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeName } from '@treadmill-challenge/shared';
import { api } from '../../api/client';

type ManagerTab = 'queue' | 'runs' | 'system';

type HistoryRow = Awaited<ReturnType<typeof api.adminManagerQueueHistory>>['entries'][number];

type EditParticipantState = { id: string; firstName: string; lastName: string; phone: string };

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

function formatHistoryDisplayTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ManagerPanelPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ManagerTab>('queue');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [queueSearch, setQueueSearch] = useState('');
  const [editParticipant, setEditParticipant] = useState<EditParticipantState | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<EditableParticipant[]>([]);
  const [drafts, setDrafts] = useState<Record<string, EditableParticipant>>({});

  const [restartPin, setRestartPin] = useState('');
  const [restartConfirm, setRestartConfirm] = useState(false);

  const maleSlots = useMemo(() => slots.filter((s) => s.sex === 'male'), [slots]);
  const femaleSlots = useMemo(() => slots.filter((s) => s.sex === 'female'), [slots]);

  const loadQueueHistory = useCallback(async () => {
    const res = await api.adminManagerQueueHistory();
    setHistoryRows(res.entries);
  }, []);

  const displayedRows = useMemo(() => {
    const n = queueSearch.trim().toLowerCase();
    if (!n) return historyRows;
    return historyRows.filter((r) => {
      const hay = `${r.participantFirstName} ${r.participantLastName} ${r.participantName} ${r.participantPhone}`.toLowerCase();
      return hay.includes(n);
    });
  }, [historyRows, queueSearch]);

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
        await Promise.all([loadQueueHistory(), loadSlots()]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        setBusy(false);
      }
    })();
  }, [loadQueueHistory]);

  const refreshQueue = async () => {
    setBusy(true);
    setError(null);
    try {
      await loadQueueHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка обновления очереди');
    } finally {
      setBusy(false);
    }
  };

  const saveHistoryParticipant = async () => {
    if (!editParticipant) return;
    setBusy(true);
    setError(null);
    try {
      await api.adminUpdateParticipant(editParticipant.id, {
        firstName: editParticipant.firstName.trim(),
        lastName: editParticipant.lastName.trim(),
        phone: editParticipant.phone.trim(),
      });
      setEditParticipant(null);
      await loadQueueHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  const moveQueue = async (row: HistoryRow, action: 'move-up' | 'move-down' | 'move-tail') => {
    if (row.status !== 'queued') return;
    setBusy(true);
    setError(null);
    try {
      await api.adminQueueAction(row.competitionId, row.runSessionId, action);
      await loadQueueHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить очередь');
    } finally {
      setBusy(false);
    }
  };

  const openFinishedEdit = (row: HistoryRow) => {
    if (row.status !== 'finished') return;
    setEditParticipant({
      id: row.participantId,
      firstName: row.participantFirstName,
      lastName: row.participantLastName,
      phone: row.participantPhone,
    });
  };

  const stopRunningSession = async (row: HistoryRow) => {
    if (row.status !== 'running') return;
    if (
      !window.confirm(
        'Остановить забег и убрать участника с дорожки? Следующий в очереди сможет начать (как после обычного завершения).'
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.adminQueueAction(row.competitionId, row.runSessionId, 'mark-cancelled');
      await loadQueueHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось остановить забег');
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

  const exportLeaderboardsXlsx = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.adminExportLeaderboardsXlsxDownload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось экспортировать лидерборды');
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
            <h2 style={styles.h2}>История очереди</h2>
            <div style={styles.headActions}>
              <button type="button" style={styles.downloadBtn} onClick={() => void exportLeaderboardsXlsx()} disabled={busy}>
                Download Excel
              </button>
              <button type="button" style={styles.refreshBtn} onClick={refreshQueue} disabled={busy}>
                Обновить
              </button>
            </div>
          </div>
          <label style={styles.searchLabel}>
            Поиск
            <input
              type="search"
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              placeholder="Имя, фамилия или телефон (часть строки)"
              style={styles.searchInput}
            />
          </label>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Участник</th>
                <th style={styles.th}>Забег</th>
                <th style={styles.th}>Статус</th>
                <th style={styles.th}>Телефон</th>
                <th style={styles.th}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.map((row) => (
                <tr
                  key={row.runSessionId}
                  style={
                    row.status === 'running'
                      ? styles.runningRow
                      : row.status === 'finished'
                        ? styles.finishedRow
                        : undefined
                  }
                  onClick={() => openFinishedEdit(row)}
                >
                  <td style={styles.td}>{row.status === 'finished' ? '—' : row.queueNumber}</td>
                  <td style={styles.td}>
                    <div>{row.participantName}</div>
                    <div style={styles.timeHint}>{formatHistoryDisplayTime(row.displayTime)}</div>
                  </td>
                  <td style={styles.td}>{row.runType}</td>
                  <td style={styles.td}>{row.status}</td>
                  <td style={styles.td}>{row.participantPhone ?? ''}</td>
                  <td style={styles.td}>
                    {row.status === 'finished' ? (
                      <button
                        type="button"
                        style={styles.editOnlyBtn}
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          openFinishedEdit(row);
                        }}
                      >
                        Редактировать
                      </button>
                    ) : row.status === 'running' ? (
                      <button
                        type="button"
                        style={styles.stopRunBtn}
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          void stopRunningSession(row);
                        }}
                      >
                        Сойти с забега
                      </button>
                    ) : (
                      <div style={styles.actions} onClick={(e) => e.stopPropagation()}>
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
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {editParticipant ? (
            <div
              role="presentation"
              style={styles.modalBackdrop}
              onClick={() => !busy && setEditParticipant(null)}
            >
              <div role="dialog" style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Участник (завершил забег)</h3>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: '#888' }}>
                  Изменяются только фамилия, имя и телефон. Нажмите строку в таблице снова после сохранения при
                  необходимости.
                </p>
                <label style={styles.modalField}>
                  Фамилия
                  <input
                    style={styles.input}
                    value={editParticipant.lastName}
                    onChange={(e) => setEditParticipant({ ...editParticipant, lastName: e.target.value })}
                  />
                </label>
                <label style={styles.modalField}>
                  Имя
                  <input
                    style={styles.input}
                    value={editParticipant.firstName}
                    onChange={(e) => setEditParticipant({ ...editParticipant, firstName: e.target.value })}
                  />
                </label>
                <label style={styles.modalField}>
                  Телефон
                  <input
                    style={styles.input}
                    value={editParticipant.phone}
                    onChange={(e) => setEditParticipant({ ...editParticipant, phone: e.target.value })}
                  />
                </label>
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button type="button" style={styles.saveBtn} disabled={busy} onClick={() => void saveHistoryParticipant()}>
                    Сохранить
                  </button>
                  <button
                    type="button"
                    style={styles.refreshBtn}
                    disabled={busy}
                    onClick={() => setEditParticipant(null)}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          ) : null}
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
  headActions: { display: 'flex', alignItems: 'center', gap: 8 },
  refreshBtn: { padding: '8px 12px', borderRadius: 8, border: '1px solid #555', background: '#1e1e1e', color: '#fff' },
  downloadBtn: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #2e6fdb',
    background: '#13294f',
    color: '#d7e7ff',
    fontWeight: 600,
  },
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
  finishedRow: { background: '#161c18', cursor: 'pointer' },
  searchLabel: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, fontSize: 14, color: '#ccc', maxWidth: 720 },
  timeHint: { fontSize: 11, color: '#6a6a6a', marginTop: 3, lineHeight: 1.2 },
  editOnlyBtn: {
    minHeight: 40,
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #888',
    background: '#2a2a2a',
    color: '#eee',
    fontSize: 14,
    cursor: 'pointer',
  },
  stopRunBtn: {
    minHeight: 40,
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #c9a227',
    background: '#2a2410',
    color: '#f5e6a8',
    fontSize: 14,
    cursor: 'pointer',
  },
  searchInput: { minHeight: 44, borderRadius: 8, border: '1px solid #555', background: '#0f0f0f', color: '#fff', padding: '8px 10px', fontSize: 16 },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
    boxSizing: 'border-box' as const,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    background: '#1a1a1a',
    border: '1px solid #444',
    borderRadius: 12,
    padding: 20,
    boxSizing: 'border-box' as const,
  },
  modalField: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, fontSize: 14, color: '#ccc' },
  input: { width: '100%', minHeight: 34, borderRadius: 8, border: '1px solid #555', background: '#0f0f0f', color: '#fff', padding: '6px 8px', boxSizing: 'border-box' },
  saveBtn: { padding: '8px 12px', borderRadius: 8, border: '1px solid #e6233a', background: '#3a141a', color: '#fff' },
  systemCard: { display: 'grid', gap: 12, maxWidth: 420, background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: 16 },
  systemInput: { minHeight: 44, borderRadius: 8, border: '1px solid #555', background: '#0f0f0f', color: '#fff', padding: '8px 10px' },
  check: { display: 'flex', alignItems: 'center', gap: 8, color: '#d0d0d0' },
  restartBtn: { minHeight: 46, borderRadius: 10, border: 'none', background: '#e6233a', color: '#fff', fontWeight: 700 },
};
