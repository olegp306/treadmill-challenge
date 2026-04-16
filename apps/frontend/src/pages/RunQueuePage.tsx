import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RunTypeId } from '@treadmill-challenge/shared';
import { h, w } from '../arOzio/dimensions';
import { api } from '../api/client';
import { RunQueueScreenShell } from '../features/run-queue/RunQueueScreenShell';
import { rq } from '../features/run-queue/runQueueScreensStyles';
import { formatParticipantDisplayName } from '../features/run-queue/participantDisplayName';
import { PrimaryButton } from '../features/registration/components';
import { getRunOption } from '../features/run-selection/runOptions';
import { rs } from '../features/run-selection/runSelectionStyles';
import { saveLastFinishedRunScope } from '../features/leaderboard/lastLeaderboardScope';
import { logEvent } from '../logging/logEvent';

export type RunQueueLocationState = {
  participantId: string;
  runSessionId: string;
  runTypeId: RunTypeId;
  position: number;
  participantSex: 'male' | 'female';
  participantFirstName?: string;
  demoMode?: boolean;
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
  const [liveStatus, setLiveStatus] = useState<'queued' | 'running' | null>('queued');
  const [livePosition, setLivePosition] = useState<number>(position);

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

  useEffect(() => {
    if (!participantId || !runSessionId || runTypeId === null) return;
    let cancelled = false;
    const POLL_MS = 2500;

    const load = async () => {
      try {
        const s = await api.getRunSessionState(runSessionId, participantId);
        if (cancelled) return;
        setLiveStatus(s.status === 'running' ? 'running' : s.status === 'queued' ? 'queued' : null);
        setLivePosition(s.queuePosition ?? 0);
        if (s.status === 'queued' && s.queuePosition === 1) {
          navigate('/run/prepare', {
            replace: true,
            state: {
              participantId,
              runSessionId,
              runTypeId,
              participantSex,
              participantFirstName: state?.participantFirstName,
            },
          });
          return;
        }
        if (s.status === 'finished') {
          saveLastFinishedRunScope({ runTypeId, sex: participantSex, participantId });
          const q = new URLSearchParams({
            runTypeId: String(runTypeId),
            sex: participantSex,
            highlightParticipantId: participantId,
          });
          navigate(`/leaderboard?${q.toString()}`, { replace: true });
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
  }, [participantId, runSessionId, runTypeId, participantSex, navigate, state?.participantFirstName]);

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
  const viewMode = liveStatus === 'running' ? 'running' : livePosition === 1 ? 'prepare' : 'queue';
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
        <p style={{ ...rq.titleMain, margin: 0 }}>Вы на дорожке. Забег идет.</p>
      ) : viewMode === 'prepare' ? (
        <p style={{ ...rq.titleMain, margin: 0 }}>Приготовься. Пройди на дорожку.</p>
      ) : (
        <>
          {demoEnabled ? (
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
