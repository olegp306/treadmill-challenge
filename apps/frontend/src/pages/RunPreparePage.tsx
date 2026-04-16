import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RunTypeId } from '@treadmill-challenge/shared';
import { api } from '../api/client';
import { saveLastFinishedRunScope } from '../features/leaderboard/lastLeaderboardScope';
import { RunQueueScreenShell } from '../features/run-queue/RunQueueScreenShell';
import { rq } from '../features/run-queue/runQueueScreensStyles';
import { formatParticipantDisplayName } from '../features/run-queue/participantDisplayName';
import { logEvent } from '../logging/logEvent';

type RunPrepareLocationState = {
  participantId: string;
  runSessionId: string;
  runTypeId: RunTypeId;
  participantSex: 'male' | 'female';
  participantFirstName?: string;
};

export default function RunPreparePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RunPrepareLocationState | null;

  const participantId = state?.participantId ?? '';
  const runSessionId = state?.runSessionId ?? '';
  const runTypeId = state?.runTypeId ?? null;
  const participantSex = state?.participantSex ?? 'male';

  const [displayName, setDisplayName] = useState('УЧАСТНИК');

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
      'prepare_screen_enter',
      { runTypeId },
      {
        participantId,
        runSessionId,
        readableMessage: 'Пользователь на экране «Приготовься / Пройди на дорожку»',
      }
    );
  }, [participantId, runSessionId, runTypeId]);

  useEffect(() => {
    if (!participantId || !runSessionId || runTypeId === null) return;
    let cancelled = false;
    const POLL_MS = 2000;
    const load = async () => {
      try {
        const s = await api.getRunSessionState(runSessionId, participantId);
        if (cancelled) return;
        if (s.status === 'running') {
          navigate('/run/queue', {
            replace: true,
            state: {
              participantId,
              runSessionId,
              runTypeId,
              participantSex,
              participantFirstName: state?.participantFirstName,
              position: 1,
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
              position: s.queuePosition,
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
  }, [participantId, runSessionId, runTypeId, participantSex, navigate, state?.participantFirstName]);

  if (!participantId || !runSessionId || runTypeId === null) return null;

  return (
    <RunQueueScreenShell
      participantDisplayName={displayName}
      footer={
        <button type="button" style={rq.btnWideSolid} onClick={() => navigate('/run/queue', { replace: true, state })}>
          Ок
        </button>
      }
    >
      <p style={rq.titleMain}>
        Приготовься
        <br />
        Пройди на дорожку
      </p>
    </RunQueueScreenShell>
  );
}

