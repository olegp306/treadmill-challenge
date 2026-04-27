import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { api } from '../../api/client';
import { formatRunResult } from '../../utils/runResultFormat';

type ManagerTab = 'queue' | 'runs' | 'system' | 'suspension';

type HistoryRow = Awaited<ReturnType<typeof api.adminManagerQueueHistory>>['entries'][number];

type EditParticipantState = {
  id: string;
  runSessionId: string;
  firstName: string;
  lastName: string;
  phone: string;
  resultTime: string;
  resultDistance: string;
};

type QueueRecoveryState = {
  runningCount: number;
  queuedCount: number;
  canStart: boolean;
};

type QuickRunTypeFilter = RunTypeId | null;
type QuickSexFilter = Gender | null;
type HistorySortMode = 'best' | 'worst' | 'new' | 'old' | null;

function shortRunTypeLabel(runTypeId: RunTypeId): string {
  if (runTypeId === 0) return '5 мин';
  if (runTypeId === 1) return '1 км';
  return '5 км';
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

export default function ManagerPanelPage({ mode = 'manager' }: { mode?: 'manager' | 'admin' }) {
  const navigate = useNavigate();
  const inactivityTimerRef = useRef<number | null>(null);
  const [tab, setTab] = useState<ManagerTab>('queue');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [rankedHistoryRows, setRankedHistoryRows] = useState<HistoryRow[]>([]);
  const [queueRecovery, setQueueRecovery] = useState<QueueRecoveryState>({
    runningCount: 0,
    queuedCount: 0,
    canStart: false,
  });
  const [queueRecoveryHint, setQueueRecoveryHint] = useState<string | null>(null);
  const [queueSearch, setQueueSearch] = useState('');
  const [quickRunTypeFilter, setQuickRunTypeFilter] = useState<QuickRunTypeFilter>(null);
  const [quickSexFilter, setQuickSexFilter] = useState<QuickSexFilter>(null);
  const [historySortMode, setHistorySortMode] = useState<HistorySortMode>('new');
  const [editParticipant, setEditParticipant] = useState<EditParticipantState | null>(null);
  const [restartPin, setRestartPin] = useState('');
  const [restartConfirm, setRestartConfirm] = useState(false);
  const [suspensionState, setSuspensionState] = useState<{ backupPath: string; createdAt: string } | null>(null);
  const [suspensionBusy, setSuspensionBusy] = useState(false);

  const loadQueueHistory = useCallback(async () => {
    const res = await api.adminManagerQueueHistory();
    setHistoryRows(res.entries);
  }, []);

  const loadSuspensionState = useCallback(async () => {
    if (mode !== 'admin') return;
    const res = await api.adminSuspensionState();
    setSuspensionState(res.state);
  }, [mode]);

  const loadQueueRecovery = useCallback(async () => {
    const res = await api.adminManagerQueueRecoveryState();
    setQueueRecovery(res);
  }, []);

  const queueRecoveryReason = useMemo(() => {
    if (queueRecovery.runningCount + queueRecovery.queuedCount === 0) return 'Очередь пуста';
    return `В очереди: running ${queueRecovery.runningCount}, queued ${queueRecovery.queuedCount}`;
  }, [queueRecovery]);

  const activeQueueRows = useMemo(
    () => historyRows.filter((r) => r.status === 'running' || r.status === 'queued'),
    [historyRows]
  );

  const historyOnlyRows = useMemo(() => historyRows.filter((r) => r.status === 'finished'), [historyRows]);

  const filteredHistoryRows = useMemo(() => {
    const n = queueSearch.trim().toLowerCase();
    return historyOnlyRows.filter((r) => {
      const hay = `${r.participantFirstName} ${r.participantLastName} ${r.participantName} ${r.participantPhone}`.toLowerCase();
      const matchesSearch = !n || hay.includes(n);
      const matchesRunType = quickRunTypeFilter === null || r.runTypeId === quickRunTypeFilter;
      const matchesSex = quickSexFilter === null || r.sex === quickSexFilter;
      return matchesSearch && matchesRunType && matchesSex;
    });
  }, [historyOnlyRows, queueSearch, quickRunTypeFilter, quickSexFilter]);

  const historyRowsSorted = useMemo(() => {
    const byDisplayTimeDesc = (a: HistoryRow, b: HistoryRow) => {
      const ta = Date.parse(a.displayTime);
      const tb = Date.parse(b.displayTime);
      if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return tb - ta;
      return b.displayTime.localeCompare(a.displayTime);
    };
    const byDisplayTimeAsc = (a: HistoryRow, b: HistoryRow) => {
      const ta = Date.parse(a.displayTime);
      const tb = Date.parse(b.displayTime);
      if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb;
      return a.displayTime.localeCompare(b.displayTime);
    };
    const byResultBest = (a: HistoryRow, b: HistoryRow) => {
      if (a.runTypeId !== b.runTypeId) return byDisplayTimeDesc(a, b);
      if (a.runTypeId === 0) {
        const ad = a.resultDistance ?? 0;
        const bd = b.resultDistance ?? 0;
        return bd - ad;
      }
      const at = a.resultTime ?? Number.POSITIVE_INFINITY;
      const bt = b.resultTime ?? Number.POSITIVE_INFINITY;
      return at - bt;
    };
    const out = [...filteredHistoryRows];
    if (historySortMode === 'best') return out.sort(byResultBest);
    if (historySortMode === 'worst') return out.sort((a, b) => byResultBest(b, a));
    if (historySortMode === 'old') return out.sort(byDisplayTimeAsc);
    if (historySortMode === 'new') return out.sort(byDisplayTimeDesc);
    return out;
  }, [filteredHistoryRows, historySortMode]);

  const hasSearch = queueSearch.trim().length > 0;
  const showHistoryRank = !hasSearch && quickRunTypeFilter !== null && quickSexFilter !== null;
  const sortModeForRankedApi: 'best' | 'worst' | 'new' | 'old' =
    historySortMode === 'worst' || historySortMode === 'new' || historySortMode === 'old'
      ? historySortMode
      : 'best';

  useEffect(() => {
    let cancelled = false;
    if (!showHistoryRank) {
      setRankedHistoryRows([]);
      return;
    }
    setBusy(true);
    setError(null);
    void api
      .adminManagerRankedHistory({
        runTypeId: quickRunTypeFilter!,
        sex: quickSexFilter!,
        order: sortModeForRankedApi,
      })
      .then((res) => {
        if (!cancelled) setRankedHistoryRows(res.entries as HistoryRow[]);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Не удалось загрузить рейтинг');
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showHistoryRank, quickRunTypeFilter, quickSexFilter, sortModeForRankedApi]);

  const toggleHistorySort = useCallback((mode: Exclude<HistorySortMode, null>) => {
    setHistorySortMode((prev) => (prev === mode ? null : mode));
  }, []);

  const applyRunSexFilter = useCallback((runTypeId: RunTypeId, sex: Gender) => {
    setQueueSearch('');
    setQuickRunTypeFilter((prevRunTypeId) => {
      if (prevRunTypeId === runTypeId && quickSexFilter === sex) {
        setQuickSexFilter(null);
        return null;
      }
      setQuickSexFilter(sex);
      return runTypeId;
    });
  }, [quickSexFilter]);

  const onSearchChange = useCallback((value: string) => {
    setQueueSearch(value);
    if (value.trim().length > 0) {
      setQuickRunTypeFilter(null);
      setQuickSexFilter(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setBusy(true);
      setError(null);
      try {
        await Promise.all([loadQueueHistory(), loadQueueRecovery(), loadSuspensionState()]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        setBusy(false);
      }
    })();
  }, [loadQueueHistory, loadQueueRecovery, loadSuspensionState]);

  const refreshQueue = async () => {
    setBusy(true);
    setError(null);
    try {
      await Promise.all([loadQueueHistory(), loadQueueRecovery()]);
      setQueueRecoveryHint(null);
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
      if (mode === 'admin') {
        const t = Number(editParticipant.resultTime);
        const d = Number(editParticipant.resultDistance);
        if (Number.isFinite(t) && t >= 0 && Number.isFinite(d) && d >= 0) {
          await api.adminManagerUpdateFinishedResult(editParticipant.runSessionId, {
            resultTime: t,
            resultDistance: d,
          });
        }
      }
      setEditParticipant(null);
      await loadQueueHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  const openFinishedEdit = (row: HistoryRow) => {
    if (row.status !== 'finished') return;
    const openEditor = () =>
      setEditParticipant({
      id: row.participantId,
      runSessionId: row.runSessionId,
      firstName: row.participantFirstName,
      lastName: row.participantLastName,
      phone: row.participantPhone,
      resultTime: row.resultTime != null ? String(row.resultTime) : '',
      resultDistance: row.resultDistance != null ? String(row.resultDistance) : '',
    });
    if (mode === 'manager') {
      const pin = window.prompt('Введите пароль менеджера для редактирования участника');
      if (!pin || !pin.trim()) return;
      setBusy(true);
      setError(null);
      void api
        .managerLogin(pin.trim())
        .then(() => openEditor())
        .catch((e) => {
          setError(e instanceof Error ? e.message : 'Неверный пароль менеджера');
        })
        .finally(() => setBusy(false));
      return;
    }
    const hasAdminSession =
      typeof sessionStorage !== 'undefined' &&
      Boolean(sessionStorage.getItem('adminPin')) &&
      sessionStorage.getItem('adminRole') === 'god_admin';
    if (hasAdminSession) {
      openEditor();
      return;
    }
    const pin = window.prompt('Введите PIN администратора для редактирования участника');
    if (!pin || !pin.trim()) return;
    setBusy(true);
    setError(null);
    void api
      .adminLogin(pin.trim())
      .then(() => {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('adminPin', pin.trim());
          sessionStorage.setItem('adminRole', 'god_admin');
        }
        openEditor();
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Неверный PIN администратора');
      })
      .finally(() => setBusy(false));
  };

  const createSuspensionBackup = async () => {
    if (mode !== 'admin') return;
    setSuspensionBusy(true);
    setError(null);
    try {
      await api.adminExportDataDownload();
      const created = await api.adminSuspensionCreateBackup();
      setSuspensionState(created.state);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать backup');
    } finally {
      setSuspensionBusy(false);
    }
  };

  const clearAfterSuspensionBackup = async () => {
    if (mode !== 'admin' || !suspensionState) return;
    if (!window.confirm('Удалить текущие данные и начать заново? Действие необратимо до восстановления из backup.')) return;
    setSuspensionBusy(true);
    setError(null);
    try {
      await api.adminSuspensionClearAfterBackup();
      await Promise.all([loadQueueHistory(), loadQueueRecovery(), loadSuspensionState()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось очистить данные');
    } finally {
      setSuspensionBusy(false);
    }
  };

  const restoreSuspended = async () => {
    if (mode !== 'admin' || !suspensionState) return;
    if (!window.confirm(`Восстановить состояние из backup от ${formatHistoryDisplayTime(suspensionState.createdAt)}?`)) return;
    setSuspensionBusy(true);
    setError(null);
    try {
      await api.adminSuspensionRestoreLast();
      await Promise.all([loadQueueHistory(), loadQueueRecovery(), loadSuspensionState()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось восстановить backup');
    } finally {
      setSuspensionBusy(false);
    }
  };

  const deleteFinishedRunEntry = async () => {
    if (mode !== 'admin' || !editParticipant) return;
    const pin = window.prompt('Введите PIN администратора для удаления записи о забеге');
    if (!pin || !pin.trim()) return;
    if (!window.confirm('Удалить запись о завершенном забеге целиком? Действие необратимо.')) return;
    setBusy(true);
    setError(null);
    try {
      await api.adminManagerDeleteRunEntry(editParticipant.runSessionId, pin.trim());
      setEditParticipant(null);
      await loadQueueHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить запись о забеге');
    } finally {
      setBusy(false);
    }
  };

  const resetCurrentQueue = async () => {
    const activeRows = historyRows.filter((r) => r.status === 'queued' || r.status === 'running');
    if (activeRows.length === 0) {
      setError('Очередь уже пуста');
      return;
    }
    if (
      !window.confirm(
        'Сбросить всю текущую очередь (running + queued)? Завершенные результаты останутся без изменений.'
      )
    ) return;
    const pinPromptLabel =
      mode === 'admin'
        ? 'Введите PIN администратора для сброса очереди'
        : 'Введите пароль менеджера для сброса очереди';
    const pin = window.prompt(pinPromptLabel);
    if (!pin || !pin.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'admin') {
        await api.adminLogin(pin.trim());
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('adminPin', pin.trim());
          sessionStorage.setItem('adminRole', 'god_admin');
        }
      } else {
        await api.managerLogin(pin.trim());
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('adminPin', pin.trim());
          sessionStorage.setItem('adminRole', 'manager');
        }
      }
      const queuedFirst = [...activeRows].sort((a, b) => {
        if (a.status === b.status) return 0;
        return a.status === 'queued' ? -1 : 1;
      });
      for (const row of queuedFirst) {
        await api.adminQueueAction(row.competitionId, row.runSessionId, 'mark-cancelled');
      }
      await Promise.all([loadQueueHistory(), loadQueueRecovery()]);
      setQueueRecoveryHint('Очередь сброшена');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сбросить очередь');
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

  useEffect(() => {
    const INACTIVITY_MS = 2 * 60 * 1000;
    const clearTimer = () => {
      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
    const forceExitToMain = () => {
      setEditParticipant(null);
      sessionStorage.removeItem('adminPin');
      sessionStorage.removeItem('adminRole');
      navigate('/', { replace: true });
    };
    const resetTimer = () => {
      clearTimer();
      inactivityTimerRef.current = window.setTimeout(forceExitToMain, INACTIVITY_MS);
    };
    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'input', 'touchstart'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      clearTimer();
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [navigate]);

  return (
    <main style={{ ...styles.page, ...(mode === 'admin' ? styles.pageAdmin : {}) }}>
      <header style={styles.header}>
        <h1 style={{ ...styles.title, ...(mode === 'admin' ? styles.titleAdmin : {}) }}>
          {mode === 'admin' ? 'Панель администратора' : 'Панель менеджера'}
        </h1>
        <div style={styles.headerRight}>
          <div style={styles.tabs}>
            <button style={tab === 'queue' ? styles.tabActive : styles.tab} onClick={() => setTab('queue')} type="button">
              Очередь
            </button>
            {mode === 'admin' ? (
              <button
                style={tab === 'suspension' ? styles.tabActive : styles.tab}
                onClick={() => setTab('suspension')}
                type="button"
              >
                Приостановка
              </button>
            ) : null}
            <button style={tab === 'runs' ? styles.tabActive : styles.tab} onClick={() => setTab('runs')} type="button">
              Забеги
            </button>
            <button style={tab === 'system' ? styles.tabActive : styles.tab} onClick={() => setTab('system')} type="button">
              Система
            </button>
          </div>
          <button type="button" style={styles.btnHomeHeader} onClick={() => navigate('/')}>
            На главную
          </button>
        </div>
      </header>

      {error ? <p style={styles.error}>{error}</p> : null}
      {busy ? <p style={styles.info}>Загрузка...</p> : null}
      <div style={styles.contentArea}>
        {tab === 'queue' ? (
          <section style={styles.sectionScrollable}>
          <div style={styles.sectionHead}>
            <h2 style={styles.h2}>
              Текущая очередь
            </h2>
            <div style={styles.headActions}>
              <button
                type="button"
                style={styles.downloadBtn}
                disabled={busy}
                onClick={() => void resetCurrentQueue()}
              >
                <span style={styles.recoveryBtnMainText}>Сброс очереди</span>
                <span style={styles.recoveryBtnSubText}>
                  Сбрасывает текущего участника и всех, кто в очереди после него
                </span>
              </button>
              <button type="button" style={styles.refreshBtn} onClick={refreshQueue} disabled={busy}>
                Обновить
              </button>
            </div>
          </div>
          <div style={styles.recoveryWrap}>
            {queueRecoveryReason ? <p style={styles.recoveryReason}>{queueRecoveryReason}</p> : null}
          </div>
          <div style={styles.tableScrollWrapShort}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Участник</th>
                  <th style={styles.th}>Забег</th>
                  <th style={styles.th}>Статус</th>
                  <th style={styles.th}>Телефон</th>
                  <th style={styles.th}>Результат</th>
                </tr>
              </thead>
              <tbody>
                {activeQueueRows.map((row) => (
                  <tr key={row.runSessionId} style={row.status === 'running' ? styles.runningRow : undefined}>
                    <td style={styles.td}>{row.queueNumber}</td>
                    <td style={styles.td}>
                      <div>{row.participantName}</div>
                      <div style={styles.timeHint}>{formatHistoryDisplayTime(row.displayTime)}</div>
                    </td>
                    <td style={styles.td}>{row.runType}</td>
                    <td style={styles.td}>{row.status}</td>
                    <td style={styles.td}>{row.participantPhone ?? ''}</td>
                    <td style={styles.td}>{formatRunResult(row.runTypeId, row.resultTime, row.resultDistance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={styles.info}>История забегов и фильтры доступны на вкладке «Забеги».</p>
          {editParticipant ? (
            <div
              role="presentation"
              style={styles.modalBackdrop}
              onClick={() => !busy && setEditParticipant(null)}
            >
              <div role="dialog" style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Участник (завершил забег)</h3>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: '#888' }}>
                  {mode === 'admin'
                    ? 'Для admin доступны фамилия, имя, телефон и результат завершенного забега. Также можно удалить запись о забеге целиком.'
                    : 'Изменяются только фамилия, имя и телефон. Нажмите строку в таблице снова после сохранения при необходимости.'}
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
                {mode === 'admin' ? (
                  <>
                    <label style={styles.modalField}>
                      Результат (сек)
                      <input
                        style={styles.input}
                        value={editParticipant.resultTime}
                        onChange={(e) => setEditParticipant({ ...editParticipant, resultTime: e.target.value })}
                      />
                    </label>
                    <label style={styles.modalField}>
                      Результат (метры)
                      <input
                        style={styles.input}
                        value={editParticipant.resultDistance}
                        onChange={(e) => setEditParticipant({ ...editParticipant, resultDistance: e.target.value })}
                      />
                    </label>
                  </>
                ) : null}
                <div style={styles.modalActionsRow}>
                  <button type="button" style={styles.saveBtn} disabled={busy} onClick={() => void saveHistoryParticipant()}>
                    Сохранить
                  </button>
                  {mode === 'admin' ? (
                    <button
                      type="button"
                      style={{ ...styles.refreshBtn, borderColor: '#7a2222', background: '#341214', color: '#ffd8d8' }}
                      disabled={busy}
                      onClick={() => void deleteFinishedRunEntry()}
                    >
                      Удалить запись о забеге
                    </button>
                  ) : null}
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
          <section style={styles.sectionScrollable}>
          <div style={styles.sectionHead}>
            <h2 style={styles.h2}>Забеги</h2>
            <div style={styles.headActions}>
              <button type="button" style={styles.downloadBtn} onClick={() => void exportLeaderboardsXlsx()} disabled={busy}>
                Export all leaderboards
              </button>
            </div>
          </div>
          <input
            type="search"
            value={queueSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск по имени, фамилии или телефону, можно часть строки"
            style={styles.searchInput}
          />
          <div style={styles.slotFiltersRow}>
            <div style={styles.slotFiltersGroup}>
              <button type="button" style={quickRunTypeFilter === 0 && quickSexFilter === 'male' ? styles.slotBtnActive : styles.slotBtn} onClick={() => applyRunSexFilter(0, 'male')}>
              5 мин / М
              </button>
              <button type="button" style={quickRunTypeFilter === 1 && quickSexFilter === 'male' ? styles.slotBtnActive : styles.slotBtn} onClick={() => applyRunSexFilter(1, 'male')}>
              1 км / М
              </button>
              <button type="button" style={quickRunTypeFilter === 2 && quickSexFilter === 'male' ? styles.slotBtnActive : styles.slotBtn} onClick={() => applyRunSexFilter(2, 'male')}>
              5 км / М
              </button>
            </div>
            <div style={styles.slotFiltersDivider} />
            <div style={styles.slotFiltersGroup}>
              <button type="button" style={quickRunTypeFilter === 0 && quickSexFilter === 'female' ? styles.slotBtnFemaleActive : styles.slotBtnFemale} onClick={() => applyRunSexFilter(0, 'female')}>
                5 мин / Ж
              </button>
              <button type="button" style={quickRunTypeFilter === 1 && quickSexFilter === 'female' ? styles.slotBtnFemaleActive : styles.slotBtnFemale} onClick={() => applyRunSexFilter(1, 'female')}>
                1 км / Ж
              </button>
              <button type="button" style={quickRunTypeFilter === 2 && quickSexFilter === 'female' ? styles.slotBtnFemaleActive : styles.slotBtnFemale} onClick={() => applyRunSexFilter(2, 'female')}>
              5 км / Ж
              </button>
            </div>
          </div>
          <div style={styles.quickFiltersRow}>
            <div style={styles.quickFilterGroup}>
              <button type="button" style={historySortMode === 'best' ? styles.quickFilterBtnActive : styles.quickFilterBtn} onClick={() => toggleHistorySort('best')}>Лучшие</button>
              <button type="button" style={historySortMode === 'worst' ? styles.quickFilterBtnActive : styles.quickFilterBtn} onClick={() => toggleHistorySort('worst')}>Худшие</button>
              <button type="button" style={historySortMode === 'new' ? styles.quickFilterBtnActive : styles.quickFilterBtn} onClick={() => toggleHistorySort('new')}>Новые</button>
              <button type="button" style={historySortMode === 'old' ? styles.quickFilterBtnActive : styles.quickFilterBtn} onClick={() => toggleHistorySort('old')}>Старые</button>
            </div>
          </div>
          <div style={styles.tableScrollWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Место</th>
                  <th style={styles.th}>Участник</th>
                  <th style={styles.th}>Забег</th>
                  <th style={styles.th}>Телефон</th>
                  <th style={styles.th}>Результат</th>
                  <th style={styles.th}>Дата/время</th>
                  <th style={styles.th}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {(showHistoryRank ? rankedHistoryRows : historyRowsSorted).map((row, idx) => (
                  <tr key={row.runSessionId} style={styles.finishedRow} onClick={() => openFinishedEdit(row)}>
                    <td style={styles.td}>{(row as HistoryRow & { rank?: number }).rank ?? idx + 1}</td>
                    <td style={styles.td}>{row.participantName}</td>
                    <td style={styles.td}>{shortRunTypeLabel(row.runTypeId)}</td>
                    <td style={styles.td}>{row.participantPhone ?? ''}</td>
                    <td style={styles.td}>{formatRunResult(row.runTypeId, row.resultTime, row.resultDistance)}</td>
                    <td style={styles.td}>{formatHistoryDisplayTime(row.displayTime)}</td>
                    <td style={styles.td}>
                      <button type="button" style={styles.editOnlyBtn} disabled={busy} onClick={(e) => { e.stopPropagation(); openFinishedEdit(row); }}>
                        Редактировать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </section>
        ) : null}

        {tab === 'system' ? (
          <section style={styles.sectionScrollable}>
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
        {tab === 'suspension' && mode === 'admin' ? (
          <section style={styles.sectionScrollable}>
          <h2 style={styles.h2}>Приостановка</h2>
          <p style={styles.info}>Шаг 1: экспорт JSON в браузер + server-side backup в папку backup.</p>
          <div style={styles.systemCard}>
            <button type="button" style={styles.restartBtn} disabled={suspensionBusy} onClick={createSuspensionBackup}>
              Создать backup и скачать JSON
            </button>
            {suspensionState ? (
              <>
                <p style={{ margin: 0, color: '#b8b8b8' }}>
                  Последний backup: {formatHistoryDisplayTime(suspensionState.createdAt)}
                </p>
                <p style={{ margin: 0, color: '#888', fontSize: 12, wordBreak: 'break-all' }}>{suspensionState.backupPath}</p>
                <button
                  type="button"
                  style={{ ...styles.restartBtn, background: '#7a2222' }}
                  disabled={suspensionBusy}
                  onClick={clearAfterSuspensionBackup}
                >
                  Удалить текущие данные и начать заново
                </button>
                <button
                  type="button"
                  style={{ ...styles.restartBtn, background: '#1f3e7a' }}
                  disabled={suspensionBusy}
                  onClick={restoreSuspended}
                >
                  Вернуться к забегу, приостановленному {formatHistoryDisplayTime(suspensionState.createdAt)}
                </button>
              </>
            ) : (
              <p style={{ margin: 0, color: '#888' }}>
                Backup еще не создан. Кнопка удаления будет доступна только после успешного backup.
              </p>
            )}
          </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 24,
    color: '#fff',
    background: '#121212',
    height: '100vh',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  pageAdmin: {
    background:
      'radial-gradient(ellipse 78% 56% at 82% 92%, rgba(35, 48, 230, 0.30), rgba(17, 18, 22, 0) 60%), linear-gradient(180deg, rgba(35, 48, 230, 0.30) 0%, rgba(35, 48, 230, 0.08) 100%), #111216',
  },
  header: { display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerRight: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' },
  contentArea: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  sectionScrollable: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  title: { margin: 0, fontSize: 28, fontWeight: 700 },
  titleAdmin: {
    background: '#e6233a',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    padding: '6px 12px',
    borderRadius: 10,
  },
  tabs: { display: 'flex', gap: 8 },
  tab: { padding: '10px 14px', borderRadius: 10, border: '1px solid #555', background: '#1b1b1b', color: '#ddd' },
  tabActive: { padding: '10px 14px', borderRadius: 10, border: '1px solid #e6233a', background: '#2a1115', color: '#fff' },
  h2: { margin: '8px 0 12px', fontSize: 22 },
  h3: { margin: '20px 0 12px', fontSize: 18 },
  h2Secondary: { fontSize: 16, fontWeight: 500, color: '#b8b8b8' },
  info: { margin: '8px 0', color: '#b8b8b8' },
  error: { margin: '8px 0', color: '#ff7b7b' },
  btnHomeHeader: {
    minHeight: 42,
    minWidth: 220,
    padding: '8px 32px',
    borderRadius: 10,
    border: '1px solid #e6233a',
    background: '#e6233a',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
  },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headActions: { display: 'flex', alignItems: 'center', gap: 8 },
  recoveryWrap: { marginBottom: 14, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  downloadBtnDisabled: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #4b4b4b',
    background: '#2b2b2b',
    color: '#9a9a9a',
    fontWeight: 600,
    cursor: 'not-allowed',
  },
  recoveryBtnMainText: { display: 'block', lineHeight: 1.1 },
  recoveryBtnSubText: { display: 'block', lineHeight: 1.1, fontSize: 11, fontWeight: 500, marginTop: 2, opacity: 0.95 },
  recoveryReason: { margin: 0, color: '#a9a9a9', fontSize: 13 },
  quickFiltersRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  quickFilterGroup: { display: 'flex', alignItems: 'center', gap: 8, marginRight: 12 },
  quickFilterBtn: {
    minHeight: 30,
    padding: '4px 10px',
    borderRadius: 999,
    border: '1px solid #5a5a5a',
    background: '#1a1a1a',
    color: '#d4d4d4',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  quickFilterBtnActive: {
    minHeight: 30,
    padding: '4px 10px',
    borderRadius: 999,
    border: '1px solid #e6233a',
    background: '#3a141a',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  refreshBtn: { padding: '8px 12px', borderRadius: 8, border: '1px solid #555', background: '#1e1e1e', color: '#fff' },
  downloadBtn: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #2e6fdb',
    background: '#13294f',
    color: '#d7e7ff',
    fontWeight: 600,
  },
  tableScrollWrap: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    border: '1px solid #2a2a2a',
    borderRadius: 8,
  },
  tableScrollWrapShort: {
    maxHeight: 260,
    overflow: 'auto',
    border: '1px solid #2a2a2a',
    borderRadius: 8,
    marginBottom: 12,
  },
  table: { width: '100%', borderCollapse: 'collapse', background: '#171717' },
  th: { textAlign: 'left', padding: 10, borderBottom: '1px solid #333', fontSize: 14, color: '#ccc' },
  td: { padding: 10, borderBottom: '1px solid #2a2a2a', verticalAlign: 'middle' },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  smallBtn: {
    minWidth: 56,
    padding: '10px 18px',
    borderRadius: 8,
    border: '1px solid #666',
    background: '#202020',
    color: '#fff',
    fontSize: 15,
    boxSizing: 'border-box' as const,
  },
  smallBtnDisabled: {
    minWidth: 56,
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
  slotFiltersRow: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10, flexWrap: 'wrap' },
  slotFiltersGroup: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, minWidth: 420, flex: '1 1 420px' },
  slotFiltersDivider: { width: 10, minWidth: 10, height: 1 },
  slotBtn: { padding: '12px 10px', borderRadius: 10, border: '1px solid #444', background: '#1a1a1a', color: '#fff' },
  slotBtnActive: {
    padding: '12px 10px',
    borderRadius: 10,
    border: '1px solid #e6233a',
    background: '#3a141a',
    color: '#fff',
  },
  slotBtnFemale: {
    padding: '12px 10px',
    borderRadius: 10,
    border: '1px solid #6f5b67',
    background: '#2a2127',
    color: '#f0e4ea',
  },
  slotBtnFemaleActive: {
    padding: '12px 10px',
    borderRadius: 10,
    border: '1px solid #b58ba0',
    background: '#4a303f',
    color: '#ffeef7',
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
  searchInput: {
    minHeight: 44,
    borderRadius: 8,
    border: '1px solid #555',
    background: '#0f0f0f',
    color: '#fff',
    padding: '8px 10px',
    fontSize: 16,
    width: '100%',
    maxWidth: 820,
    marginBottom: 12,
    boxSizing: 'border-box',
  },
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
    maxWidth: 560,
    background: '#1a1a1a',
    border: '1px solid #444',
    borderRadius: 12,
    padding: 20,
    boxSizing: 'border-box' as const,
  },
  modalActionsRow: { display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' },
  modalField: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, fontSize: 14, color: '#ccc' },
  input: { width: '100%', minHeight: 34, borderRadius: 8, border: '1px solid #555', background: '#0f0f0f', color: '#fff', padding: '6px 8px', boxSizing: 'border-box' },
  saveBtn: { padding: '8px 12px', borderRadius: 8, border: '1px solid #e6233a', background: '#3a141a', color: '#fff' },
  systemCard: { display: 'grid', gap: 12, maxWidth: 420, background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: 16 },
  systemInput: { minHeight: 44, borderRadius: 8, border: '1px solid #555', background: '#0f0f0f', color: '#fff', padding: '8px 10px' },
  check: { display: 'flex', alignItems: 'center', gap: 8, color: '#d0d0d0' },
  restartBtn: { minHeight: 46, borderRadius: 10, border: 'none', background: '#e6233a', color: '#fff', fontWeight: 700 },
};
