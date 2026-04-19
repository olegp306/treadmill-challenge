import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RunTypeId } from '@treadmill-challenge/shared';
import { api } from '../api/client';
import { logEvent } from '../logging/logEvent';
import { RunQueueScreenShell } from '../features/run-queue/RunQueueScreenShell';
import { rq } from '../features/run-queue/runQueueScreensStyles';
import { formatParticipantDisplayName } from '../features/run-queue/participantDisplayName';
import { computeAheadFromGlobalQueueEntries } from '../features/run-queue/queueAheadFromApi';
import { QueueBusyEstimateLines } from '../features/run-queue/QueueBusyEstimateLines';
import type { RunSelectLocationState } from './RunSelectionPage';
import { h } from '../arOzio/dimensions';

export type RunQueueBusyLocationState = {
  participantId: string;
  participantFirstName?: string;
  participantSex: 'male' | 'female';
  runTypeId: RunTypeId;
  reason?: 'queue_full' | 'treadmill_busy';
  runSessionId?: string;
};

export default function RunQueueBusyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RunQueueBusyLocationState | null;

  const participantId = state?.participantId ?? '';
  const [displayName, setDisplayName] = useState('УЧАСТНИК');
  /** Только для treadmill_busy: расчёт «перед тобой» и ожидания по глобальной очереди. */
  const [peopleAhead, setPeopleAhead] = useState(0);
  const [waitMinutes, setWaitMinutes] = useState(0);
  const [queuePosition, setQueuePosition] = useState(1);

  useEffect(() => {
    if (!participantId) {
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
  }, [participantId, navigate, state?.participantFirstName]);

  const isTreadmillBusy = state?.reason === 'treadmill_busy';

  useEffect(() => {
    if (!participantId || !state) return;
    logEvent(
      'queue_busy_enter',
      { reason: state?.reason ?? 'queue_full' },
      {
        participantId,
        readableMessage:
          state?.reason === 'treadmill_busy'
            ? 'Экран решения «дорожка занята» (можно занять очередь или выйти)'
            : 'Экран «очередь заполнена» после старта забега',
      }
    );
  }, [participantId, state]);

  useEffect(() => {
    if (!isTreadmillBusy || !state?.runSessionId || !participantId) return;

    let cancelled = false;

    const load = async () => {
      try {
        const [q, session] = await Promise.all([
          api.getRunQueue(),
          api.getRunSessionState(state.runSessionId!, participantId),
        ]);
        if (cancelled) return;
        const entries = q.entries.map((e) => ({
          runSessionId: e.runSessionId,
          runTypeId: e.runTypeId as RunTypeId,
        }));
        const { peopleAhead: pa, waitMinutes: wm } = computeAheadFromGlobalQueueEntries(
          entries,
          state.runSessionId!
        );
        setPeopleAhead(pa);
        setWaitMinutes(wm);
        const qp = session.queuePosition ?? 1;
        setQueuePosition(Math.max(1, qp));
      } catch {
        /* keep previous */
      }
    };

    void load();
    const t = window.setInterval(() => void load(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [isTreadmillBusy, state?.runSessionId, participantId]);

  if (!participantId || !state) {
    return null;
  }

  const retryState: RunSelectLocationState = {
    participantId,
    participantFirstName: state.participantFirstName ?? '',
    participantSex: state.participantSex,
  };

  const goLeaveConfirm = () => {
    if (!state.runSessionId) return;
    logEvent(
      'queue_busy_click_leave_confirm',
      {},
      {
        participantId,
        readableMessage: 'С экрана «дорожка занята» — подтверждение выхода из забега',
      }
    );
    navigate('/run/leave-queue', {
      state: {
        runSessionId: state.runSessionId,
        participantId,
        participantSex: state.participantSex,
        runTypeId: state.runTypeId,
        position: queuePosition,
        cancelNavigate: {
          to: '/run/queue-busy',
          state: {
            participantId,
            participantFirstName: state.participantFirstName,
            participantSex: state.participantSex,
            runTypeId: state.runTypeId,
            reason: 'treadmill_busy' as const,
            runSessionId: state.runSessionId,
          },
        },
      },
    });
  };

  const goJoinQueue = () => {
    if (!state.runSessionId) return;
    logEvent(
      'queue_busy_join_queue',
      { reason: state.reason ?? 'unknown' },
      {
        participantId,
        readableMessage: 'Пользователь нажал «Занять очередь» на экране дорожки',
      }
    );
    navigate('/run/queue/position', {
      replace: true,
      state: {
        participantId,
        runSessionId: state.runSessionId,
        runTypeId: state.runTypeId,
        position: queuePosition,
        participantSex: state.participantSex,
        participantFirstName: state.participantFirstName,
        initialSessionStatus: 'queued' as const,
        initialOtherSessionRunning: true,
      },
    });
  };

  const goRetryOrHome = () => {
    logEvent(
      'queue_busy_click_home',
      {},
      {
        participantId,
        readableMessage: 'Пользователь нажал «Сойти с забега» (очередь полная / без сессии)',
      }
    );
    navigate('/');
  };

  const goRetryRunSelect = () => {
    logEvent('queue_busy_retry_run_select', {}, { participantId });
    navigate('/run-select', { state: retryState, replace: true });
  };

  return (
    <RunQueueScreenShell
      participantDisplayName={displayName}
      footer={
        isTreadmillBusy && state.runSessionId ? (
          <>
            <button type="button" style={rq.btnWide} onClick={goLeaveConfirm}>
              Сойти с забега
            </button>
            <button type="button" style={rq.btnWideSolid} onClick={goJoinQueue}>
              Занять очередь
            </button>
          </>
        ) : (
          <>
            <button type="button" style={rq.btnWide} onClick={goRetryOrHome}>
              Сойти с забега
            </button>
            <button type="button" style={rq.btnWideSolid} onClick={goRetryRunSelect}>
              Попробовать снова
            </button>
          </>
        )
      }
    >
      {isTreadmillBusy ? (
        <>
          <p style={{ ...rq.titleMain, margin: 0 }}>Дорожка пока занята</p>
          <QueueBusyEstimateLines peopleAhead={peopleAhead} waitMinutes={waitMinutes} />
        </>
      ) : (
        <>
          <p style={{ ...rq.titleMain, margin: 0 }}>Очередь заполнена</p>
          <p style={{ ...rq.subtitle, marginTop: h(24) }}>
            Сейчас нет свободного места в очереди.
            <br />
            <span style={rq.subtitleStrong}>Попробуйте позже.</span>
          </p>
        </>
      )}
    </RunQueueScreenShell>
  );
}
