import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RunTypeId } from '@treadmill-challenge/shared';
import { api } from '../api/client';
import { logEvent } from '../logging/logEvent';
import { RunQueueScreenShell } from '../features/run-queue/RunQueueScreenShell';
import { rq } from '../features/run-queue/runQueueScreensStyles';
import { formatParticipantDisplayName } from '../features/run-queue/participantDisplayName';
import type { RunSelectLocationState } from './RunSelectionPage';

export type RunQueueBusyLocationState = {
  participantId: string;
  participantFirstName?: string;
  participantSex: 'male' | 'female';
  runTypeId: RunTypeId;
};

export default function RunQueueBusyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RunQueueBusyLocationState | null;

  const participantId = state?.participantId ?? '';
  const [displayName, setDisplayName] = useState('УЧАСТНИК');

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
          setDisplayName(
            formatParticipantDisplayName(state.participantFirstName, '')
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [participantId, navigate, state?.participantFirstName]);

  useEffect(() => {
    if (!participantId) return;
    logEvent(
      'queue_busy_enter',
      {},
      {
        participantId,
        readableMessage: 'Пользователь увидел экран «Дорожка занята» (очередь заполнена)',
      }
    );
  }, [participantId]);

  if (!participantId || !state) {
    return null;
  }

  const retryState: RunSelectLocationState = {
    participantId,
    participantFirstName: state.participantFirstName ?? '',
    participantSex: state.participantSex,
  };

  return (
    <RunQueueScreenShell
      participantDisplayName={displayName}
      footer={
        <>
          <button
            type="button"
            style={rq.btnWide}
            onClick={() => {
              logEvent(
                'queue_busy_click_home',
                {},
                {
                  participantId,
                  readableMessage: 'Пользователь нажал «Сойти с забега» на экране «дорожка занята»',
                }
              );
              navigate('/');
            }}
          >
            Сойти с забега
          </button>
          <button
            type="button"
            style={rq.btnWideSolid}
            onClick={() => {
              logEvent(
                'queue_busy_retry',
                {},
                {
                  participantId,
                  readableMessage: 'Пользователь нажал «Занять очередь» (повторная попытка)',
                }
              );
              navigate('/run-select', { state: retryState, replace: true });
            }}
          >
            Занять очередь
          </button>
        </>
      }
    >
      <p style={rq.titleMain}>Дорожка пока занята</p>
      <p style={rq.subtitle}>
        Очередь для этого забега заполнена.
        <br />
        <span style={rq.subtitleStrong}>Попробуйте повторить позже.</span>
      </p>
    </RunQueueScreenShell>
  );
}
