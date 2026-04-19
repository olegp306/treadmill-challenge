import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RunTypeId } from '@treadmill-challenge/shared';
import { h, w } from '../arOzio/dimensions';
import { api } from '../api/client';
import { GoToTreadmillContent } from '../features/run-queue/GoToTreadmillContent';
import { RunQueueScreenShell } from '../features/run-queue/RunQueueScreenShell';
import { rq } from '../features/run-queue/runQueueScreensStyles';
import { formatParticipantDisplayName } from '../features/run-queue/participantDisplayName';
import { PrimaryButton } from '../features/registration/components';
import { getRunOption } from '../features/run-selection/runOptions';
import { rs } from '../features/run-selection/runSelectionStyles';
import { saveLastFinishedRunScope } from '../features/leaderboard/lastLeaderboardScope';
import { tdLeaderboardResultPath } from '../features/td/tdLeaderboardRoutes';
import { useIntegrationInfo } from '../integrationInfo/IntegrationInfoContext';
import { logEvent } from '../logging/logEvent';
/** After this time running without finish, show “waiting for TD callback” (real mode). */
const RESULT_CALLBACK_PENDING_MS = 90_000;

export type RunQueueLocationState = {
  participantId: string;
  runSessionId: string;
  runTypeId: RunTypeId;
  position: number;
  participantSex: 'male' | 'female';
  participantFirstName?: string;
  demoMode?: boolean;
  /** After user taps OK on `/run/prepare`, do not auto-navigate back there while still queued #1 (avoids queue/prepare oscillation). */
  prepareAcknowledged?: boolean;
  /** From startRun: avoids one frame of wrong UI before first poll (e.g. already running). */
  initialSessionStatus?: 'queued' | 'running';
  /** From startRun: someone else is on the treadmill while we are queued #1. */
  initialOtherSessionRunning?: boolean;
};

export default function RunQueuePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RunQueueLocationState | null;

  const participantId = state?.participantId ?? '';
  const runSessionId = state?.runSessionId ?? '';
  const runTypeId = state?.runTypeId ?? null;
  const position = state?.position ?? 0;
  const participantSex = state?.participantSex ?? 'male';
  const demoMode = state?.demoMode ?? false;

  const [displayName, setDisplayName] = useState('УЧАСТНИК');
  const [tdDemoMode, setTdDemoMode] = useState(false);
  const [devMsg, setDevMsg] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'queued' | 'running' | null>(() => {
    const init = state?.initialSessionStatus;
    if (init === 'running') return 'running';
    return 'queued';
  });
  const [livePosition, setLivePosition] = useState<number>(position);
  const [liveOtherRunning, setLiveOtherRunning] = useState(() => Boolean(state?.initialOtherSessionRunning));
  const [resultPendingLong, setResultPendingLong] = useState(false);
  const resultPendingLoggedRef = useRef(false);
  const waitingTdReportedRef = useRef(false);
  const finishNavigateScheduledRef = useRef(false);
  const { report } = useIntegrationInfo();

  useEffect(() => {
    resultPendingLoggedRef.current = false;
    waitingTdReportedRef.current = false;
    finishNavigateScheduledRef.current = false;
    setResultPendingLong(false);
    setLiveOtherRunning(Boolean(state?.initialOtherSessionRunning));
  }, [runSessionId, state?.initialOtherSessionRunning]);

  useEffect(() => {
    let cancelled = false;
    void api
      .getPublicSettings()
      .then((s) => {
        if (cancelled) return;
        setTdDemoMode(Boolean(s.tdDemoMode));
        logEvent('td_mode_loaded', { tdDemoMode: Boolean(s.tdDemoMode), source: 'public_settings' }, { readableMessage: 'Загружены публичные настройки TouchDesigner режима' });
      })
      .catch(() => {
        if (cancelled) return;
        setTdDemoMode(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        }
      } catch {
        if (!cancelled && state?.participantFirstName) {
          setDisplayName(formatParticipantDisplayName(state.participantFirstName, ''));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [participantId, runSessionId, runTypeId, navigate, state?.participantFirstName]);

  const prepareAck = Boolean(state?.prepareAcknowledged);

  /** Next in queue (#1) → full «Пройдите на дорожку» on `/run/prepare` (same as poll, without extra delay / duplicate logic). */
  useLayoutEffect(() => {
    if (!participantId || !runSessionId || runTypeId === null) return;
    if (prepareAck) return;
    if (liveOtherRunning) return;
    if (liveStatus !== 'queued') return;
    if (livePosition !== 1) return;
    navigate('/run/prepare', {
      replace: true,
      state: {
        participantId,
        runSessionId,
        runTypeId,
        participantSex,
        participantFirstName: state?.participantFirstName,
        demoMode,
      },
    });
  }, [
    participantId,
    runSessionId,
    runTypeId,
    participantSex,
    navigate,
    state?.participantFirstName,
    demoMode,
    prepareAck,
    livePosition,
    liveStatus,
    liveOtherRunning,
  ]);

  useEffect(() => {
    if (!participantId || !runSessionId || runTypeId === null) return;
    let cancelled = false;
    /** Keep aligned with TD result polling — faster detection of `finished` for navigation to `/td/leaderboard/result`. */
    const POLL_MS = 1200;

    const load = async () => {
      try {
        const s = await api.getRunSessionState(runSessionId, participantId);
        if (cancelled) return;
        setLiveStatus(s.status === 'running' ? 'running' : s.status === 'queued' ? 'queued' : null);
        setLivePosition(s.queuePosition ?? 0);
        setLiveOtherRunning(Boolean(s.otherSessionRunning));
        const demoEnabled = demoMode && tdDemoMode;
        if (s.status === 'running' && !demoEnabled) {
          if (!waitingTdReportedRef.current) {
            waitingTdReportedRef.current = true;
            report('waiting_for_touchdesigner');
          }
        } else if (s.status !== 'running') {
          waitingTdReportedRef.current = false;
        }
        if (s.status === 'running' && s.startedAt && !demoEnabled) {
          const elapsed = Date.now() - new Date(s.startedAt).getTime();
          const long = elapsed >= RESULT_CALLBACK_PENDING_MS;
          setResultPendingLong(long);
          if (long && !resultPendingLoggedRef.current) {
            resultPendingLoggedRef.current = true;
            logEvent(
              'td_result_pending_long',
              { elapsedMs: Math.round(elapsed) },
              {
                participantId,
                runSessionId,
                readableMessage: 'Долго нет результата от TouchDesigner (ожидание callback)',
              }
            );
          }
        } else {
          setResultPendingLong(false);
        }
        const prepareAcknowledged = Boolean(state?.prepareAcknowledged);
        const qp = s.queuePosition ?? 0;
        if (s.status === 'queued' && qp > 1 && prepareAcknowledged) {
          navigate('/run/queue', {
            replace: true,
            state: {
              participantId,
              runSessionId,
              runTypeId,
              participantSex,
              participantFirstName: state?.participantFirstName,
              demoMode,
              position: qp,
              prepareAcknowledged: false,
            },
          });
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
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('Run session not found')) {
          setLiveStatus(null);
          navigate('/', { replace: true });
        }
      }
    };

    void load();
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [
    participantId,
    runSessionId,
    runTypeId,
    participantSex,
    navigate,
    state?.participantFirstName,
    state?.prepareAcknowledged,
    demoMode,
    tdDemoMode,
    report,
  ]);

  useEffect(() => {
    if (!participantId || !runSessionId || runTypeId === null) return;
    logEvent(
      'queue_screen_enter',
      { position, runTypeId },
      {
        participantId,
        runSessionId,
        readableMessage: `Пользователь на экране очереди. Номер: ${position} («${getRunOption(runTypeId).title}»)`,
      }
    );
  }, [participantId, runSessionId, runTypeId, position]);

  const handleDevFinish = async () => {
    setDevMsg(null);
    setDevLoading(true);
    try {
      const res = await api.devFinishRun();
      logEvent(
        'run_finished',
        { runTypeId, source: 'dev_finish', runIdPrefix: res.runId.slice(0, 8) },
        {
          participantId,
          runSessionId: res.runSessionId,
          readableMessage: 'Забег завершён (режим разработчика), результат записан',
        }
      );
      setDevMsg(`Забег завершён (dev). runId: ${res.runId.slice(0, 8)}…`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка';
      logEvent(
        'error_event',
        { context: 'dev_finish_run', message: msg },
        {
          participantId,
          runSessionId,
          readableMessage: `Ошибка завершения забега (dev): ${msg}`,
        }
      );
      setDevMsg(msg);
    } finally {
      setDevLoading(false);
    }
  };

  const goLeaveConfirm = () => {
    if (liveStatus !== 'queued') return;
    if (!runSessionId || runTypeId === null) return;
    logEvent(
      'queue_leave_confirm_open',
      {},
      {
        participantId,
        runSessionId,
        readableMessage: 'Пользователь нажал «Сойти с забега» — переход к подтверждению',
      }
    );
    navigate('/run/leave-queue', {
      state: {
        runSessionId,
        participantId,
        participantSex,
        runTypeId,
        position: livePosition,
      },
    });
  };

  if (!participantId || !runSessionId || runTypeId === null) {
    return null;
  }

  const demoEnabled = demoMode && tdDemoMode;
  const showDevFinish = import.meta.env.DEV && tdDemoMode;
  const viewMode =
    liveStatus === 'running'
      ? 'running'
      : livePosition === 1 && prepareAck
        ? 'waiting'
        : livePosition === 1 && !prepareAck && !liveOtherRunning
          ? 'prepare'
          : 'queue';
  const peopleAhead = Math.max(0, livePosition - 1);
  const approxWaitMin = Math.max(0, peopleAhead * 2);

  return (
    <RunQueueScreenShell
      participantDisplayName={displayName}
      footer={
        <>
          <button type="button" style={rq.btnWide} onClick={goLeaveConfirm} disabled={liveStatus !== 'queued'}>
            Сойти с забега
          </button>
          {demoEnabled && liveStatus === 'queued' ? (
            <button
              type="button"
              style={rq.btnWideSolid}
              onClick={() => {
                logEvent(
                  'queue_demo_confirm',
                  { runTypeId, position: livePosition },
                  { participantId, runSessionId, readableMessage: 'Пользователь подтвердил ожидание очереди (демо)' }
                );
              }}
            >
              Занять очередь
            </button>
          ) : (
            <button type="button" style={rq.btnWideSolid} onClick={() => navigate('/')}>
              Ок
            </button>
          )}
        </>
      }
    >
      {viewMode === 'running' ? (
        <>
          <p style={{ ...rq.titleMain, margin: 0 }}>Вы на дорожке. Забег идет.</p>
          {resultPendingLong ? (
            <p style={{ ...rq.subtitle, marginTop: h(16), textAlign: 'center', maxWidth: w(900), marginLeft: 'auto', marginRight: 'auto' }}>
              Результат ещё не получен. Ожидаем ответ TouchDesigner…
            </p>
          ) : null}
        </>
      ) : viewMode === 'prepare' ? (
        <GoToTreadmillContent />
      ) : viewMode === 'waiting' ? (
        <>
          <p style={{ ...rq.titleMain, margin: 0 }}>Ожидайте начала</p>
          <p style={{ ...rq.subtitle, marginTop: h(40) }}>Забег скоро начнётся</p>
        </>
      ) : (
        <>
          {liveOtherRunning && liveStatus === 'queued' ? (
            <>
              <p style={{ ...rq.titleMain, margin: 0 }}>Дорожка занята</p>
              <p style={rq.subtitle}>Дождитесь, когда предыдущий участник закончит</p>
            </>
          ) : demoEnabled ? (
            <>
              <p style={{ ...rq.titleMain, margin: 0 }}>Дорожка занята</p>
              <p style={rq.subtitle}>
                <span>Перед тобой </span>
                <span style={rq.subtitleStrong}>
                  {peopleAhead} {peopleAhead === 1 ? 'человек' : peopleAhead >= 2 && peopleAhead <= 4 ? 'человека' : 'человек'}
                </span>
              </p>
              <p style={rq.subtitle}>
                Примерное ожидание: <span style={rq.subtitleStrong}>{approxWaitMin} мин</span>
              </p>
            </>
          ) : (
            <p style={{ ...rq.titleMain, margin: 0 }}>
              <span>Ваш номер в очереди: </span>
              <span style={rq.titleAccent}>{livePosition}</span>
            </p>
          )}
        </>
      )}
      {showDevFinish ? (
        <div style={{ marginTop: h(32), width: '100%', maxWidth: w(900), marginLeft: 'auto', marginRight: 'auto' }}>
          <PrimaryButton
            variant="cta"
            ready={!devLoading}
            disabled={devLoading}
            loading={devLoading}
            onClick={handleDevFinish}
          >
            Завершить забег (dev)
          </PrimaryButton>
          {devMsg ? (
            <p
              style={{
                ...rs.subtitle,
                marginTop: h(12),
                textAlign: 'center',
                color: devMsg.startsWith('Забег') ? 'rgba(255,255,255,0.85)' : '#f85149',
              }}
            >
              {devMsg}
            </p>
          ) : null}
        </div>
      ) : null}
    </RunQueueScreenShell>
  );
}
