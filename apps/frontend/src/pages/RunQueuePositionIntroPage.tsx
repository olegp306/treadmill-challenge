import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { h } from '../arOzio/dimensions';
import { api } from '../api/client';
import { logEvent } from '../logging/logEvent';
import { RunQueueScreenShell } from '../features/run-queue/RunQueueScreenShell';
import { rq } from '../features/run-queue/runQueueScreensStyles';
import { formatParticipantDisplayName } from '../features/run-queue/participantDisplayName';
import type { RunQueueLocationState } from './RunQueuePage';

/** Экран «Ваш номер в очереди» (Figma 718:897) — после «Ок» главная форма (`/`), без повторного «дорожка занята». */
export default function RunQueuePositionIntroPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RunQueueLocationState | null;

  const participantId = state?.participantId ?? '';
  const runSessionId = state?.runSessionId ?? '';
  const position = state?.position ?? 0;

  const [displayName, setDisplayName] = useState('УЧАСТНИК');

  useEffect(() => {
    if (!participantId || !runSessionId || !state) {
      navigate('/', { replace: true });
      return;
    }
    logEvent(
      'queue_position_intro_view',
      { position },
      {
        participantId,
        runSessionId,
        readableMessage: `Пользователь увидел экран «Ваш номер в очереди»: ${position}`,
      }
    );
  }, [participantId, runSessionId, navigate, position, state]);

  useEffect(() => {
    if (!participantId) return;
    let cancelled = false;
    void api
      .getParticipant(participantId)
      .then((p) => {
        if (!cancelled) setDisplayName(formatParticipantDisplayName(p.firstName, p.lastName));
      })
      .catch(() => {
        if (!cancelled && state?.participantFirstName) {
          setDisplayName(formatParticipantDisplayName(state.participantFirstName, ''));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [participantId, state?.participantFirstName]);

  if (!participantId || !runSessionId || !state) {
    return null;
  }

  const continueToMain = () => {
    logEvent(
      'queue_position_intro_ok',
      { position },
      {
        participantId,
        runSessionId,
        readableMessage: `Подтверждён номер очереди ${position}, переход на главную форму`,
      }
    );
    navigate('/', { replace: true });
  };

  return (
    <RunQueueScreenShell
      participantDisplayName={displayName}
      footer={
        <button type="button" style={{ ...rq.btnWideSolid, flex: '1 1 auto', maxWidth: 'none' }} onClick={continueToMain}>
          Ок
        </button>
      }
    >
      <p style={{ ...rq.titleMain, margin: 0 }}>Ваш номер в очереди:</p>
      <p style={{ ...rq.titleMain, margin: `${h(28)} 0 0`, lineHeight: 1 }} aria-live="polite">
        <span style={rq.titleAccent}>{position}</span>
      </p>
    </RunQueueScreenShell>
  );
}
