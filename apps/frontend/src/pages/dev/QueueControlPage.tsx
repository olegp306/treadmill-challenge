import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { api } from '../../api/client';

type QueueState = Awaited<ReturnType<typeof api.getDevQueueControlState>>;

const box: CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 960,
  margin: '0 auto',
  padding: 16,
};

const btnBase: CSSProperties = {
  display: 'block',
  width: '100%',
  maxWidth: 480,
  marginBottom: 12,
  padding: '14px 18px',
  fontSize: 16,
  cursor: 'pointer',
};

const btnDisabledGhost: CSSProperties = {
  ...btnBase,
  opacity: 0.45,
  cursor: 'not-allowed',
  background: '#e0e0e0',
  color: '#757575',
  border: '1px solid #bdbdbd',
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
};

const thtd: CSSProperties = {
  border: '1px solid #ccc',
  padding: '6px 8px',
  textAlign: 'left',
};

export default function QueueControlPage() {
  const [state, setState] = useState<QueueState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api.getDevQueueControlState();
      setState(s);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 2500);
    return () => clearInterval(t);
  }, [load]);

  async function runAction(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const showPromote = Boolean(state && !state.running && state.queued.length > 0);
  const showRunnerActions = Boolean(state?.running);

  return (
    <div style={box}>
      <h1 style={{ marginTop: 0 }}>Queue control (dev)</h1>
      <p style={{ color: '#444', fontSize: 14 }}>
        Скрытая страница для локальной проверки глобальной очереди. В production API выключен без{' '}
        <code>ALLOW_DEV_QUEUE_CONTROL=true</code>. Для старта без OSC включите TouchDesigner demo mode в админке.
      </p>
      {error && (
        <p style={{ color: '#b00020', marginBottom: 16 }} role="alert">
          {error}
        </p>
      )}
      <p style={{ fontSize: 13, color: '#666' }}>
        <button type="button" onClick={() => void load()} disabled={busy}>
          Обновить сейчас
        </button>
      </p>

      <h2>Сейчас на дорожке</h2>
      {!state && !error && <p>Загрузка…</p>}
      {state && !state.running && <p>Никто не бежит.</p>}
      {state?.running && (
        <table style={tableStyle}>
          <tbody>
            <tr>
              <th style={thtd}>Имя</th>
              <td style={thtd}>
                {state.running.firstName} {state.running.lastName}
              </td>
            </tr>
            <tr>
              <th style={thtd}>runSessionId</th>
              <td style={{ ...thtd, wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 12 }}>
                {state.running.runSessionId}
              </td>
            </tr>
            <tr>
              <th style={thtd}>Формат</th>
              <td style={thtd}>{state.running.runTypeName}</td>
            </tr>
            <tr>
              <th style={thtd}>Пол (слот)</th>
              <td style={thtd}>{state.running.gender}</td>
            </tr>
            <tr>
              <th style={thtd}>Статус</th>
              <td style={thtd}>{state.running.status}</td>
            </tr>
          </tbody>
        </table>
      )}

      <h2>Глобальная очередь (queued)</h2>
      {state && state.queued.length === 0 && <p>Очередь пуста.</p>}
      {state && state.queued.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thtd}>Позиция</th>
              <th style={thtd}>Участник</th>
              <th style={thtd}>Формат</th>
              <th style={thtd}>runSessionId</th>
            </tr>
          </thead>
          <tbody>
            {state.queued.map((q) => (
              <tr key={q.runSessionId}>
                <td style={thtd}>{q.position}</td>
                <td style={thtd}>{q.participantName}</td>
                <td style={thtd}>{q.runTypeName}</td>
                <td style={{ ...thtd, wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 11 }}>
                  {q.runSessionId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Действия</h2>

      {showPromote && (
        <button
          type="button"
          style={{ ...btnBase, background: '#6a1b9a', color: '#fff', border: 'none' }}
          disabled={busy}
          onClick={() => void runAction(() => api.devQueueControlPromoteNext())}
        >
          Поставить следующего на дорожку
        </button>
      )}

      <button
        type="button"
        style={{ ...btnBase, background: '#1a7f37', color: '#fff', border: 'none' }}
        disabled={busy || !showRunnerActions}
        onClick={() => void runAction(() => api.devQueueControlFinishCurrent())}
      >
        Добежал (фейковые результаты)
      </button>
      <button
        type="button"
        style={{ ...btnBase, background: '#c62828', color: '#fff', border: 'none' }}
        disabled={busy || !showRunnerActions}
        onClick={() => void runAction(() => api.devQueueControlCancelCurrent())}
      >
        Остановить и удалить запись
      </button>

      <button
        type="button"
        style={btnDisabledGhost}
        disabled
        title="Пока не реализовано"
      >
        Перезапустить
      </button>
    </div>
  );
}
