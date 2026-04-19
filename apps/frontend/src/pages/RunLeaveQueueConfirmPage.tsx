import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RunTypeId } from '@treadmill-challenge/shared';
import { h } from '../arOzio/dimensions';
import { api } from '../api/client';
import { clearLoggedRunSessionId, logEvent } from '../logging/logEvent';
import { RunQueueScreenShell } from '../features/run-queue/RunQueueScreenShell';
import { rq } from '../features/run-queue/runQueueScreensStyles';
import { formatParticipantDisplayName } from '../features/run-queue/participantDisplayName';

export type RunLeaveQueueLocationState = {
  runSessionId: string;
  participantId: string;
  participantSex: 'male' | 'female';
  runTypeId: RunTypeId;
  position: number;
  /** Если задано, «Нет» возвращает сюда вместо `/run/queue` (напр. экран «дорожка занята» до входа в очередь). */
  cancelNavigate?: { to: string; state?: Record<string, unknown> };
};

export default function RunLeaveQueueConfirmPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RunLeaveQueueLocationState | null;

  const runSessionId = state?.runSessionId ?? '';
  const participantId = state?.participantId ?? '';
  const [displayName, setDisplayName] = useState('УЧАСТНИК');
  const [loading, setLoading] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!runSessionId || !participantId) {
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
        if (!cancelled) setDisplayName('УЧАСТНИК');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runSessionId, participantId, navigate]);

  useEffect(() => {
    if (!runSessionId || !participantId) return;
    logEvent(
      'leave_queue_confirm_enter',
      {},
      {
        participantId,
        runSessionId,
        readableMessage: 'Пользователь на экране подтверждения выхода из очереди',
      }
    );
  }, [runSessionId, participantId]);

  const handleConfirmLeave = async () => {
    if (!runSessionId || !participantId) return;
    logEvent(
      'button_click_leave_queue',
      { runSessionId },
      {
        participantId,
        runSessionId,
        readableMessage: 'Пользователь подтвердил выход из очереди («Сойти с забега»)',
      }
    );
    setLeaveError(null);
    setLoading(true);
    try {
      await api.leaveQueue({ runSessionId, participantId });
      clearLoggedRunSessionId();
      navigate('/', { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось выйти из очереди';
      logEvent(
        'error_event',
        { context: 'leave_queue', message: msg },
        {
          participantId,
          runSessionId,
          readableMessage: `Ошибка выхода из очереди: ${msg}`,
        }
      );
      setLeaveError(msg);
      setLoading(false);
    }
  };

  if (!runSessionId || !participantId || !state) {
    return null;
  }

  const backToQueue = () => {
    const cancel = state.cancelNavigate;
    if (cancel) {
      navigate(cancel.to, { replace: true, state: cancel.state });
      return;
    }
    navigate('/run/queue', {
      replace: true,
      state: {
        participantId,
        runSessionId,
        runTypeId: state.runTypeId,
        position: state.position,
        participantSex: state.participantSex,
      },
    });
  };

  return (
    <RunQueueScreenShell
      participantDisplayName={displayName}
      footer={
        <>
          <button type="button" style={rq.btnWideSolid} disabled={loading} onClick={backToQueue}>
            Нет
          </button>
          <button
            type="button"
            style={rq.btnWide}
            disabled={loading}
            onClick={() => void handleConfirmLeave()}
          >
            Сойти с забега
          </button>
        </>
      }
    >
      <p style={rq.titleMain}>Вы уверены, что хотите сойти с забега?</p>
      {leaveError ? (
        <p style={{ ...rq.subtitle, color: '#f85149', marginTop: h(16) }}>{leaveError}</p>
      ) : null}
    </RunQueueScreenShell>
  );
}
