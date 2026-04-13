import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { RunType } from '@treadmill-challenge/shared';
import { ArOzioViewport } from '../arOzio/ArOzioViewport';
import { h, w } from '../arOzio/dimensions';
import { api } from '../api/client';
import { RegistrationLayout } from '../features/registration/RegistrationLayout';
import { PrimaryButton } from '../features/registration/components';
import { RunSelectionShell } from '../features/run-selection/RunSelectionShell';
import { rs } from '../features/run-selection/runSelectionStyles';
import { useQueue } from '../hooks/useQueue';

export type RunQueueLocationState = {
  participantId: string;
  runSessionId: string;
  runType: RunType;
  position: number;
};

function rankLabel(i: number): string {
  return String(i + 1).padStart(2, '0');
}

const listStyles: Record<string, CSSProperties> = {
  sheet: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: h(12),
    borderRadius: w(48),
    background: '#080809',
    border: '1px solid #1e1e1e',
    boxShadow: 'inset 0 -120px 120px -160px #e6233a',
    padding: `${h(24)} ${w(32)}`,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  list: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: h(12),
    WebkitOverflowScrolling: 'touch',
  },
  listRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(20),
    padding: `${h(16)} ${w(20)}`,
    borderRadius: w(24),
    background: '#1e1e1e',
    border: '1px solid #30363d',
    boxSizing: 'border-box',
  },
  listRowHighlight: {
    borderColor: '#e6233a',
    boxShadow: '0 0 0 1px rgba(230, 35, 58, 0.45)',
  },
  listRank: {
    fontWeight: 400,
    fontSize: w(28),
    color: '#e6233a',
    minWidth: w(48),
    textTransform: 'uppercase',
  },
  listMain: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: h(4),
  },
  listName: {
    fontWeight: 400,
    fontSize: w(26),
    textTransform: 'uppercase',
    color: '#fff',
  },
  muted: {
    margin: 0,
    textAlign: 'center',
    color: '#8b949e',
    fontSize: w(28),
    textTransform: 'none',
  },
  error: {
    margin: 0,
    textAlign: 'center',
    color: '#f85149',
    fontSize: w(28),
    textTransform: 'none',
  },
  okRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: w(32),
    width: '100%',
    flexShrink: 0,
    alignItems: 'stretch',
    marginTop: h(16),
  },
};

export default function RunQueuePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RunQueueLocationState | null;

  const participantId = state?.participantId ?? '';
  const runSessionId = state?.runSessionId ?? '';
  const runType = state?.runType ?? null;
  const position = state?.position ?? 0;

  const { entries, loading, error } = useQueue(runType);
  const [devMsg, setDevMsg] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);

  useEffect(() => {
    if (!participantId || !runSessionId || !runType) {
      navigate('/', { replace: true });
    }
  }, [participantId, runSessionId, runType, navigate]);

  const handleDevFinish = async () => {
    setDevMsg(null);
    setDevLoading(true);
    try {
      const res = await api.devFinishRun();
      setDevMsg(`Забег завершён (dev). runId: ${res.runId.slice(0, 8)}…`);
    } catch (e) {
      setDevMsg(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setDevLoading(false);
    }
  };

  if (!participantId || !runSessionId || !runType) {
    return null;
  }

  const showDevFinish = import.meta.env.DEV;

  return (
    <ArOzioViewport>
      <RegistrationLayout chrome="wizard">
        <RunSelectionShell
          footer={
            <div style={{ display: 'flex', flexDirection: 'column', gap: h(16), width: '100%' }}>
              <div style={listStyles.okRow}>
                <PrimaryButton variant="cta" ready={true} onClick={() => navigate('/')}>
                  OK
                </PrimaryButton>
              </div>
              {showDevFinish ? (
                <div style={rs.footerRow}>
                  <PrimaryButton
                    variant="cta"
                    ready={!devLoading}
                    disabled={devLoading}
                    loading={devLoading}
                    onClick={handleDevFinish}
                  >
                    Завершить забег
                  </PrimaryButton>
                </div>
              ) : null}
            </div>
          }
        >
          <p style={rs.greeting}>Вы в очереди</p>
          <p style={rs.subtitle}>Ваш номер: {position}</p>
          {devMsg ? (
            <p
              style={{
                ...rs.subtitle,
                color: devMsg.startsWith('Забег') ? 'rgba(255,255,255,0.85)' : '#f85149',
              }}
            >
              {devMsg}
            </p>
          ) : null}

          <section style={listStyles.sheet} aria-label="Очередь">
            {loading && <p style={listStyles.muted}>Загрузка…</p>}
            {error && <p style={listStyles.error}>{error}</p>}
            {!loading && !error && entries.length === 0 && (
              <p style={listStyles.muted}>В очереди пока никого.</p>
            )}
            {!loading && !error && entries.length > 0 && (
              <div className="ar-ozio-lb-list" style={listStyles.list}>
                {entries.map((e, index) => {
                  const highlight = e.runSessionId === runSessionId;
                  return (
                    <div
                      key={e.runSessionId}
                      style={{
                        ...listStyles.listRow,
                        ...(highlight ? listStyles.listRowHighlight : {}),
                      }}
                    >
                      <span style={listStyles.listRank}>{rankLabel(index)}</span>
                      <div style={listStyles.listMain}>
                        <span style={listStyles.listName}>{e.participantName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <p style={{ margin: 0, textAlign: 'center' }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85em' }}>
              На главную
            </Link>
          </p>
        </RunSelectionShell>
      </RegistrationLayout>
    </ArOzioViewport>
  );
}
