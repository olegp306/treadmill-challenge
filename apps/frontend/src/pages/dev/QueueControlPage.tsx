import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { api } from '../../api/client';
import { tdLeaderboardResultPath } from '../../features/td/tdLeaderboardRoutes';

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

function absoluteResultLeaderboardUrl(runSessionId: string): string {
  const path = tdLeaderboardResultPath(runSessionId);
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

export default function QueueControlPage() {
  const [state, setState] = useState<QueueState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Обновляется при активном забеге; после fake finish не сбрасывается — для dev-ссылки на TD result. */
  const [lastKnownRunSessionId, setLastKnownRunSessionId] = useState<string | null>(null);

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

  useEffect(() => {
    document.body.classList.add('dev-queue-control-route');
    return () => document.body.classList.remove('dev-queue-control-route');
  }, []);

  useEffect(() => {
    const id = state?.running?.runSessionId?.trim();
    if (id) setLastKnownRunSessionId(id);
  }, [state?.running?.runSessionId]);

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
      <p style={{ color: '#444', fontSize: 14, lineHeight: 1.45 }}>
        Управление глобальной очередью: URL <code>/dev/queue-control</code> (в меню киоска не показывается).
        Работает и на dev, и на production при том же origin, что и API (<code>/api/dev/queue-control/*</code>).
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
      {state && (
        <p style={{ fontSize: 14, color: '#333', marginBottom: 16 }} role="status">
          Глобальный пул (в очереди + на дорожке):{' '}
          <strong>
            {state.activeSessionCount} / {state.maxGlobalQueueSize}
          </strong>
        </p>
      )}

      <h2>Сейчас на дорожке</h2>
      {!state && !error && <p>Загрузка…</p>}
      {lastKnownRunSessionId && (
        <div
          style={{
            marginBottom: 20,
            padding: '16px 18px',
            borderRadius: 10,
            border: '2px solid #1565c0',
            background: '#e3f2fd',
          }}
        >
          <p style={{ margin: '0 0 10px', fontSize: 13, color: '#0d47a1', fontWeight: 600 }}>
            {state?.running
              ? 'Текущий runSessionId'
              : 'Последний runSessionId (сохранён после завершения — можно открыть result)'}
          </p>
          <div
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 20,
              fontWeight: 600,
              lineHeight: 1.35,
              wordBreak: 'break-all',
              color: '#111',
              marginBottom: 14,
              userSelect: 'all',
            }}
          >
            {lastKnownRunSessionId}
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: '#444' }}>Финальный leaderboard (TD / external)</p>
          <a
            href={tdLeaderboardResultPath(lastKnownRunSessionId)}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block',
              fontSize: 17,
              fontFamily: 'ui-monospace, monospace',
              wordBreak: 'break-all',
              color: '#0d47a1',
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            {absoluteResultLeaderboardUrl(lastKnownRunSessionId)}
          </a>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              style={{
                padding: '12px 18px',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                background: '#1565c0',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
              }}
              onClick={() => {
                window.open(tdLeaderboardResultPath(lastKnownRunSessionId), '_blank', 'noopener,noreferrer');
              }}
            >
              Открыть result leaderboard
            </button>
            <button
              type="button"
              style={{
                padding: '12px 18px',
                fontSize: 14,
                cursor: 'pointer',
                background: '#fff',
                color: '#1565c0',
                border: '1px solid #1565c0',
                borderRadius: 8,
              }}
              onClick={() => {
                void navigator.clipboard.writeText(absoluteResultLeaderboardUrl(lastKnownRunSessionId));
              }}
            >
              Копировать URL
            </button>
          </div>
        </div>
      )}
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
              <td style={{ ...thtd, wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 16 }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>{state.running.runSessionId}</span>
                <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>См. также крупный блок и ссылку на result выше.</div>
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
              <th style={thtd}>Действие</th>
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
                <td style={thtd}>
                  <button
                    type="button"
                    disabled={busy}
                    title="Убрать из очереди без результата (cancel)"
                    style={{
                      padding: '6px 10px',
                      fontSize: 13,
                      cursor: busy ? 'not-allowed' : 'pointer',
                      background: '#fff',
                      border: '1px solid #c62828',
                      color: '#c62828',
                      borderRadius: 6,
                    }}
                    onClick={() =>
                      void runAction(() => api.devQueueControlRemoveQueued(q.runSessionId))
                    }
                  >
                    Удалить из очереди
                  </button>
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
        style={{ ...btnBase, background: '#0d47a1', color: '#fff', border: 'none' }}
        disabled={busy || !showRunnerActions}
        onClick={() => void runAction(() => api.devQueueControlMoveCurrentToEnd())}
        title="Текущий забег → в конец FIFO; следующий из очереди стартует (если есть)"
      >
        Переставить текущего в конец очереди
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
