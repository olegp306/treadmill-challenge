import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RunTypeId } from '@treadmill-challenge/shared';
import { h } from '../arOzio/dimensions';
import { api } from '../api/client';
import { RunQueueScreenShell } from '../features/run-queue/RunQueueScreenShell';
import { rq } from '../features/run-queue/runQueueScreensStyles';
import { formatParticipantDisplayName } from '../features/run-queue/participantDisplayName';

export type RunLeaveQueueLocationState = {
  runSessionId: string;
  participantId: string;
  participantSex: 'male' | 'female';
  runTypeId: RunTypeId;
  position: number;
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

  const handleConfirmLeave = async () => {
    if (!runSessionId || !participantId) return;
    setLeaveError(null);
    setLoading(true);
    try {
      await api.leaveQueue({ runSessionId, participantId });
      navigate('/', { replace: true });
    } catch (e) {
      setLeaveError(e instanceof Error ? e.message : 'Не удалось выйти из очереди');
      setLoading(false);
    }
  };

  if (!runSessionId || !participantId || !state) {
    return null;
  }

  const backToQueue = () => {
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
      <p style={rq.titleMain}>
        Вы уверены что
        <br />
        хотите сойти с забега?
      </p>
      {leaveError ? (
        <p style={{ ...rq.subtitle, color: '#f85149', marginTop: h(16) }}>{leaveError}</p>
      ) : null}
    </RunQueueScreenShell>
  );
}
