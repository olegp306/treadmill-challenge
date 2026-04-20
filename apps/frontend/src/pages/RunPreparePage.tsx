import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RunTypeId } from '@treadmill-challenge/shared';
import { generateDemoMetrics } from '@treadmill-challenge/shared';
import { api } from '../api/client';
import { saveLastFinishedRunScope } from '../features/leaderboard/lastLeaderboardScope';
import { GoToTreadmillContent } from '../features/run-queue/GoToTreadmillContent';
import { RunQueueScreenShell } from '../features/run-queue/RunQueueScreenShell';
import { rq } from '../features/run-queue/runQueueScreensStyles';
import { formatParticipantDisplayName } from '../features/run-queue/participantDisplayName';
import { useIntegrationInfo } from '../integrationInfo/IntegrationInfoContext';
import { logEvent } from '../logging/logEvent';
import { ui } from '../ui/tokens';
import { tdLeaderboardResultPath } from '../features/td/tdLeaderboardRoutes';

type RunPrepareLocationState = {
  participantId: string;
  runSessionId: string;
  runTypeId: RunTypeId;
  participantSex: 'male' | 'female';
  participantFirstName?: string;
  demoMode?: boolean;
  /** Passed through to `/run/queue` so polling does not re-open this screen after OK. */
  prepareAcknowledged?: boolean;
  /** Сессия уже `running` при входе (дорожка была свободна) — не уводим на `/run/queue` до «Ок». */
  immediateRunning?: boolean;
};

function formatPrepareCornerName(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const last = lastName.trim();
  if (!first && !last) return 'Участник';
  const firstNormalized = first
    ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
    : 'Участник';
  const lastInitial = last ? `${last.charAt(0).toUpperCase()}.` : '';
  return lastInitial ? `${firstNormalized} ${lastInitial}` : firstNormalized;
}

export default function RunPreparePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RunPrepareLocationState | null;

  const participantId = state?.participantId ?? '';
  const runSessionId = state?.runSessionId ?? '';
  const runTypeId = state?.runTypeId ?? null;
  const participantSex = state?.participantSex ?? 'male';
  const demoMode = state?.demoMode ?? false;
  const immediateRunning = Boolean(state?.immediateRunning);

  const [displayName, setDisplayName] = useState('УЧАСТНИК');
  const [cornerName, setCornerName] = useState('Участник');
  const [tdDemoMode, setTdDemoMode] = useState(false);
  const [demoMsg, setDemoMsg] = useState<string | null>(null);
  const [demoRank, setDemoRank] = useState<number | null>(null);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const finishNavigateScheduledRef = useRef(false);
  const closedRef = useRef(false);
  const prevStatusRef = useRef<string | null>(immediateRunning ? 'running' : null);
  const { report } = useIntegrationInfo();
  const autoCloseEnabled = true;

  const closeToMain = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    navigate('/', { replace: true });
  };

  useEffect(() => {
    finishNavigateScheduledRef.current = false;
    closedRef.current = false;
    prevStatusRef.current = immediateRunning ? 'running' : null;
  }, [runSessionId]);

  useEffect(() => {
    if (!autoCloseEnabled) return;
    const timer = window.setTimeout(() => {
      closeToMain();
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [autoCloseEnabled, runSessionId]);

  useEffect(() => {
    let cancelled = false;
    void api
      .getPublicSettings()
      .then((s) => {
        if (cancelled) return;
        setTdDemoMode(Boolean(s.tdDemoMode));
        logEvent(
          'td_mode_loaded',
          { tdDemoMode: Boolean(s.tdDemoMode), source: 'public_settings' },
          { readableMessage: 'Загружены публичные настройки TouchDesigner режима' }
        );
      })
      .catch(() => {
        if (cancelled) return;
        setTdDemoMode(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const demoMetrics = useMemo(() => {
    if (!runSessionId || runTypeId === null) return null;
    return generateDemoMetrics(runTypeId, runSessionId);
  }, [runSessionId, runTypeId]);

  const demoEnabled = demoMode && tdDemoMode;

  useEffect(() => {
    if (!participantId || !runSessionId || runTypeId === null) {
      navigate('/', { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const p = await api.getParticipant(participantId);
        if (!cancelled) {
          setDisplayName(formatParticipantDisplayName(p.firstName, p.lastName));
          setCornerName(formatPrepareCornerName(p.firstName, p.lastName));
        }
      } catch {
        if (!cancelled && state?.participantFirstName) {
          setDisplayName(formatParticipantDisplayName(state.participantFirstName, ''));
          setCornerName(formatPrepareCornerName(state.participantFirstName, ''));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [participantId, runSessionId, runTypeId, navigate, state?.participantFirstName]);

  useEffect(() => {
    if (!participantId || !runSessionId || runTypeId === null) return;
    logEvent(
      'prepare_screen_enter',
      { runTypeId },
      {
        participantId,
        runSessionId,
        readableMessage: 'Пользователь на экране «Пройдите на дорожку»',
      }
    );
  }, [participantId, runSessionId, runTypeId]);

  useEffect(() => {
    if (!participantId || !runSessionId || runTypeId === null) return;
    let cancelled = false;
    const POLL_MS = 1200;
    const load = async () => {
      try {
        const s = await api.getRunSessionState(runSessionId, participantId);
        if (cancelled) return;
        if (s.status === 'running') {
          const startedNow = prevStatusRef.current !== 'running';
          prevStatusRef.current = 'running';
          if (autoCloseEnabled && startedNow) {
            closeToMain();
            return;
          }
        } else if (s.status === 'queued') {
          prevStatusRef.current = 'queued';
        }
        if (s.status === 'queued' && s.queuePosition === 1 && s.otherSessionRunning) {
          navigate('/run/queue', {
            replace: true,
            state: {
              participantId,
              runSessionId,
              runTypeId,
              participantSex,
              participantFirstName: state?.participantFirstName,
              demoMode: state?.demoMode,
              position: 1,
              prepareAcknowledged: false,
              initialSessionStatus: 'queued',
              initialOtherSessionRunning: true,
            },
          });
          return;
        }
        if (s.status === 'queued' && s.queuePosition && s.queuePosition > 1) {
          navigate('/run/queue', {
            replace: true,
            state: {
              participantId,
              runSessionId,
              runTypeId,
              participantSex,
              participantFirstName: state?.participantFirstName,
              demoMode: state?.demoMode,
              position: s.queuePosition,
              prepareAcknowledged: false,
            },
          });
          return;
        }
        if (s.status === 'finished') {
          if (!finishNavigateScheduledRef.current) {
            finishNavigateScheduledRef.current = true;
            report('result_received', { autoHideMs: 4500 });
            saveLastFinishedRunScope({ runTypeId, sex: participantSex, participantId });
            window.setTimeout(() => {
              navigate(tdLeaderboardResultPath(runSessionId), { replace: true });
            }, 480);
          }
          return;
        }
        if (s.status === 'cancelled') {
          navigate('/', { replace: true });
        }
      } catch {
        // ignore transient network issues
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [participantId, runSessionId, runTypeId, participantSex, navigate, state?.participantFirstName, report, immediateRunning, autoCloseEnabled]);

  if (!participantId || !runSessionId || runTypeId === null) return null;

  return (
    <RunQueueScreenShell
      participantDisplayName={displayName}
      headerRightLabel={cornerName}
      centerAgainstSheet
      sheetStyle={rq.prepareSheet}
      overlay={<div style={rq.prepareSheetGlow} aria-hidden />}
      onSheetClick={autoCloseEnabled ? closeToMain : undefined}
    >
      <GoToTreadmillContent />
      {demoEnabled && demoMetrics ? (
        <div style={{ marginTop: 24, width: '100%', maxWidth: 980, marginLeft: 'auto', marginRight: 'auto' }}>
          <div
            style={{
              borderRadius: 24,
              padding: '18px 20px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' }}>
              Тестовые данные
            </p>
            <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.7)' }}>
              runSessionId: <span style={{ color: '#fff' }}>{runSessionId}</span>
            </p>
            <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.7)' }}>
              resultTime: <span style={{ color: '#fff' }}>{demoMetrics.resultTime.toFixed(1)} сек</span>
              {' · '}
              distance: <span style={{ color: '#fff' }}>{Math.round(demoMetrics.distance)} м</span>
            </p>
            {demoRank != null ? (
              <p style={{ margin: '10px 0 0', color: '#fff' }}>
                Финиш: место <span style={{ color: ui.color.red }}>{demoRank}</span> (отправлено в TouchDesigner — эмуляция)
              </p>
            ) : null}
            {demoMsg ? <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.85)' }}>{demoMsg}</p> : null}
          </div>
          <button
            type="button"
            style={{ ...rq.btnWideSolid, marginTop: 16, width: '100%' }}
            disabled={demoSubmitting}
            onClick={async () => {
              if (demoSubmitting) return;
              setDemoSubmitting(true);
              setDemoMsg(null);
              setDemoRank(null);
              try {
                logEvent(
                  'demo_finish_click',
                  { runTypeId },
                  { participantId, runSessionId, readableMessage: 'Пользователь завершает забег тестовыми данными (демо)' }
                );
                const res = await api.submitRunResult({
                  runSessionId,
                  resultTime: demoMetrics.resultTime,
                  distance: demoMetrics.distance,
                });
                setDemoRank(res.rank ?? null);
                setDemoMsg(`Результат сохранён. Место: ${res.rank ?? '—'}`);
                logEvent(
                  'demo_finish_saved',
                  { runTypeId, rank: res.rank },
                  {
                    participantId: res.participantId,
                    runSessionId: res.runSessionId,
                    readableMessage: `Демо-финиш сохранён. Место: ${res.rank ?? 'не определено'}. Данные отправлены в TouchDesigner (эмуляция)`,
                  }
                );
                saveLastFinishedRunScope({ runTypeId, sex: participantSex, participantId });
                navigate(tdLeaderboardResultPath(runSessionId), { replace: true });
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Ошибка';
                setDemoMsg(msg);
              } finally {
                setDemoSubmitting(false);
              }
            }}
          >
            Завершить забег с тестовыми данными
          </button>
        </div>
      ) : null}
    </RunQueueScreenShell>
  );
}

