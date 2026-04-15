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
import { logEvent } from '../logging/logEvent';

export type RunQueueLocationState = {
  participantId: string;
  runSessionId: string;
  runTypeId: RunTypeId;
  position: number;
  participantSex: 'male' | 'female';
  participantFirstName?: string;
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

  const [displayName, setDisplayName] = useState('УЧАСТНИК');
  const [devMsg, setDevMsg] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);

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
        position,
      },
    });
  };

  if (!participantId || !runSessionId || runTypeId === null) {
    return null;
  }

  const showDevFinish = import.meta.env.DEV;

  return (
    <RunQueueScreenShell
      participantDisplayName={displayName}
      footer={
        <>
          <button type="button" style={rq.btnWide} onClick={goLeaveConfirm}>
            Сойти с забега
          </button>
          <button type="button" style={rq.btnWideSolid} onClick={() => navigate('/')}>
            Ок
          </button>
        </>
      }
    >
      <p style={{ ...rq.titleMain, margin: 0 }}>
        <span>Ваш номер в очереди: </span>
        <span style={rq.titleAccent}>{position}</span>
      </p>
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
