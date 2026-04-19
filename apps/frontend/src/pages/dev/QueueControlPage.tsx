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

const mutedFooter: CSSProperties = {
  marginTop: 36,
  paddingTop: 24,
  borderTop: '1px solid #ddd',
  color: '#555',
  fontSize: 13,
  lineHeight: 1.5,
};

function absoluteResultLeaderboardUrl(runSessionId: string): string {
  const path = tdLeaderboardResultPath(runSessionId);
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

function genderLabel(g: string): string {
  const x = g.toLowerCase();
  if (x === 'male') return 'мужской слот';
  if (x === 'female') return 'женский слот';
  return g;
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
  const running = state?.running ?? null;

  const factChip: CSSProperties = {
    display: 'inline-block',
    marginRight: 10,
    marginBottom: 8,
    padding: '6px 12px',
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 8,
    background: '#fff',
    border: '1px solid #90caf9',
    color: '#0d47a1',
  };

  return (
    <div style={box}>
      <h1 style={{ marginTop: 0, marginBottom: 8 }}>Queue control (dev)</h1>

      {error && (
        <p style={{ color: '#b00020', marginBottom: 16 }} role="alert">
          {error}
        </p>
      )}

      <section style={{ marginBottom: 24 }} aria-label="Действия оператора">
        <h2 style={{ fontSize: 18, margin: '0 0 12px', color: '#111' }}>Действия</h2>
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
      </section>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          fontSize: 14,
          color: '#333',
        }}
      >
        <button type="button" onClick={() => void load()} disabled={busy}>
          Обновить сейчас
        </button>
        {state && (
          <span role="status">
            Пул (queued + running):{' '}
            <strong>
              {state.activeSessionCount} / {state.maxGlobalQueueSize}
            </strong>
            {state.queued.length > 0 ? (
              <span style={{ color: '#666', marginLeft: 8 }}>
                · в очереди: {state.queued.length}
              </span>
            ) : null}
          </span>
        )}
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Текущий runSession</h2>
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
            {running
              ? 'Активный забег — runSessionId'
              : 'Последний runSessionId (после завершения — можно открыть result)'}
          </p>
          <div
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.35,
              wordBreak: 'break-all',
              color: '#111',
              marginBottom: 12,
              userSelect: 'all',
            }}
          >
            {lastKnownRunSessionId}
          </div>

          {running ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <span style={factChip}>Формат: {running.runTypeName}</span>
                <span style={factChip}>Пол: {genderLabel(String(running.gender))}</span>
                <span style={{ ...factChip, borderColor: '#81c784', color: '#1b5e20', background: '#e8f5e9' }}>
                  Статус: {running.status}
                </span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: '#1565c0' }}>
                {running.firstName} {running.lastName}
              </p>
            </>
          ) : (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#555' }}>
              Нет активного running — метаданные формата / пола недоступны до следующего старта.
            </p>
          )}

          <p style={{ margin: '0 0 6px', fontSize: 12, color: '#444' }}>Финальный leaderboard (TD / external)</p>
          <a
            href={tdLeaderboardResultPath(lastKnownRunSessionId)}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block',
              fontSize: 15,
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
      {state && !state.running && !lastKnownRunSessionId && <p>Никто не бежит.</p>}
      {state && !state.running && lastKnownRunSessionId && (
        <p style={{ fontSize: 14, color: '#555' }}>Сейчас на дорожке никто не бежит.</p>
      )}

      <footer style={mutedFooter}>
        <p style={{ marginTop: 0 }}>
          Управление глобальной очередью: URL <code>/dev/queue-control</code> (в меню киоска не показывается).
          Работает на том же origin, что и API — эндпоинты <code>/api/dev/queue-control/*</code>.
        </p>
      </footer>
    </div>
  );
}
