import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { ArOzioViewport } from '../arOzio/ArOzioViewport';
import { h, w } from '../arOzio/dimensions';
import { api } from '../api/client';
import { RegistrationLayout } from '../features/registration/RegistrationLayout';
import { FooterActionsRow } from '../ui/components/FooterActionsRow';
import { LogoMark } from '../ui/components/LogoMark';
import { Sheet } from '../ui/components/Sheet';
import { rq } from '../features/run-queue/runQueueScreensStyles';
import { navigateAfterRunStart } from '../features/run-start/runStartNavigation';
import { useIntegrationInfo } from '../integrationInfo/IntegrationInfoContext';
import { logEvent } from '../logging/logEvent';

type RunReadyLocationState = {
  participantId: string;
  runTypeId: RunTypeId;
  participantSex: Gender;
  participantFirstName?: string;
  participantLastName?: string;
};

function formatDisplayPart(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function readyDisplayName(firstName?: string, lastName?: string): string {
  const first = formatDisplayPart(firstName);
  const last = formatDisplayPart(lastName);
  const full = [first, last].filter(Boolean).join(' ');
  return full || 'Участник';
}

export default function RunReadyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RunReadyLocationState | null;
  const participantId = state?.participantId ?? '';
  const runTypeId = state?.runTypeId ?? null;
  const participantSex = state?.participantSex ?? 'male';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { report, clearPhase } = useIntegrationInfo();

  const displayName = useMemo(
    () => readyDisplayName(state?.participantFirstName, state?.participantLastName),
    [state?.participantFirstName, state?.participantLastName]
  );

  useEffect(() => {
    if (!participantId || runTypeId === null) {
      navigate('/', { replace: true });
      return;
    }
    logEvent(
      'run_ready_screen_enter',
      { runTypeId },
      {
        participantId,
        readableMessage: 'Пользователь на экране готовности к старту',
      }
    );
  }, [participantId, runTypeId, navigate]);

  const goHome = () => {
    if (!participantId || runTypeId === null) return;
    logEvent(
      'run_ready_declined',
      { runTypeId },
      {
        participantId,
        readableMessage: 'Пользователь отказался начинать забег на экране готовности',
      }
    );
    navigate('/', { replace: true });
  };

  const startWhenReady = async () => {
    if (!participantId || runTypeId === null || loading) return;
    setError(null);
    setLoading(true);
    let phaseTimer: number | undefined;
    report('treadmill_check');
    phaseTimer = window.setTimeout(() => {
      report('sending_to_touchdesigner');
    }, 220);
    try {
      logEvent(
        'run_ready_confirmed',
        { runTypeId },
        {
          participantId,
          readableMessage: 'Пользователь подтвердил готовность к старту',
        }
      );
      const res = await api.startRun({ participantId, runTypeId });
      if (phaseTimer !== undefined) {
        window.clearTimeout(phaseTimer);
        phaseTimer = undefined;
      }
      if (!res.success) {
        clearPhase();
        if (res.reason === 'td_unavailable') {
          report('integration_error');
          setError('Беговая дорожка не отвечает. Попробуйте позже.');
        } else if (res.reason === 'queue_full') {
          navigate('/register/queue-full', {
            replace: true,
            state: { fromRunSelectionQueueFull: true as const },
          });
        } else if (res.reason === 'queue_paused') {
          setError('Очередь временно на паузе. Попробуйте позже.');
        }
        return;
      }
      navigateAfterRunStart({
        res,
        navigate,
        participantSex,
        participantFirstName: state?.participantFirstName,
        report,
        clearPhase,
        skipImmediatePrepare: true,
      });
    } catch (e) {
      if (phaseTimer !== undefined) {
        window.clearTimeout(phaseTimer);
        phaseTimer = undefined;
      }
      clearPhase();
      report('integration_error');
      const msg = e instanceof Error ? e.message : 'Не удалось начать забег';
      logEvent(
        'error_event',
        { context: 'run_ready_start', message: msg },
        {
          participantId,
          readableMessage: `Ошибка при старте с экрана готовности: ${msg}`,
        }
      );
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!participantId || runTypeId === null) return null;

  return (
    <ArOzioViewport>
      <RegistrationLayout chrome="wizard">
        <div style={rq.readyRoot}>
          <div style={rq.readyInner}>
            <Sheet style={rq.readySheet} overlay={<div style={rq.readySheetGlow} aria-hidden />}>
              <div style={rq.readyHeader}>
                <LogoMark aria-label="AMAZING RED" style={rq.readyLogo} />
              </div>
              <div style={rq.readyContent}>
                <p style={rq.readyNameBadge}>{displayName}</p>
                <h1 style={rq.readyTitle}>Готовы на старт?</h1>
                <p style={rq.readySubtitle}>Забег сейчас начнется!</p>
                {error ? <p style={rq.readyError}>{error}</p> : null}
              </div>
            </Sheet>
          </div>
          <FooterActionsRow style={{ ...rq.footerRow, marginTop: h(24) }} maxWidth={w(2120)}>
            <button type="button" style={rq.readyNoButton} onClick={goHome} disabled={loading}>
              Нет
            </button>
            <button type="button" style={rq.readyGoButton} onClick={startWhenReady} disabled={loading}>
              {loading ? '...' : 'Готов!'}
            </button>
          </FooterActionsRow>
        </div>
      </RegistrationLayout>
    </ArOzioViewport>
  );
}
