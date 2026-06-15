import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RunTypeId } from '@treadmill-challenge/shared';
import { ArOzioViewport } from '../arOzio/ArOzioViewport';
import { RegistrationLayout } from '../features/registration/RegistrationLayout';
import { PrimaryButton } from '../features/registration/components';
import { reg } from '../features/registration/registrationStyles';
import { getRunOption, RUN_OPTIONS } from '../features/run-selection/runOptions';
import { RunDetailCard } from '../features/run-selection/RunDetailCard';
import { RunSelectionShell } from '../features/run-selection/RunSelectionShell';
import { RunTypeTabBar } from '../features/run-selection/RunTypeTabBar';
import { rs } from '../features/run-selection/runSelectionStyles';
import { api } from '../api/client';
import { useIntegrationInfo } from '../integrationInfo/IntegrationInfoContext';
import { clearLoggedParticipantId, clearLoggedRunSessionId, logEvent } from '../logging/logEvent';
import { navigateAfterRunStart } from '../features/run-start/runStartNavigation';
import { useInactivityReset } from '../hooks/useInactivityReset';

export type RunSelectLocationState = {
  participantId: string;
  participantFirstName: string;
  /** Отдельно от имени — для приветствия на двух строках и обрезки по полям. */
  participantLastName?: string;
  participantSex: 'male' | 'female';
};

/** Максимум символов в строке приветствия до добавления «...» (имя и фамилия по отдельности). */
const GREETING_NAME_FIELD_MAX = 15;

function formatGreetingPart(raw: string, whenEmpty: string): string {
  const part = raw.trim();
  if (!part) return whenEmpty;
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

function truncateGreetingField(formatted: string): string {
  if (formatted.length <= GREETING_NAME_FIELD_MAX) return formatted;
  return `${formatted.slice(0, GREETING_NAME_FIELD_MAX)}...`;
}

export default function RunSelectionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RunSelectLocationState | null;

  const participantId = state?.participantId ?? '';
  const participantSex = state?.participantSex ?? 'male';
  const greetingFirstLine = useMemo(
    () =>
      truncateGreetingField(formatGreetingPart(state?.participantFirstName ?? '', 'участник')),
    [state?.participantFirstName]
  );

  const [selected, setSelected] = useState<RunTypeId>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { report, clearPhase } = useIntegrationInfo();

  useInactivityReset({
    onTimeout: () => {
      clearLoggedRunSessionId();
      clearLoggedParticipantId();
      navigate('/', { replace: true });
    },
  });

  useEffect(() => {
    if (!participantId) {
      navigate('/', { replace: true });
    }
  }, [participantId, navigate]);

  useEffect(() => {
    if (!participantId) return;
    logEvent(
      'run_select_enter',
      {},
      {
        participantId,
        readableMessage: 'Пользователь на экране выбора формата забега (после регистрации)',
      }
    );
  }, [participantId]);

  useEffect(() => {
    if (!participantId) return;
    const opt = getRunOption(selected);
    logEvent(
      'run_type_selected',
      { runTypeId: selected },
      {
        participantId,
        readableMessage: `Пользователь выбрал забег: ${opt.title}`,
      }
    );
  }, [selected, participantId]);

  const activeOption = getRunOption(selected);

  const handleStart = async () => {
    if (!participantId) return;
    setError(null);
    setLoading(true);
    logEvent('button_click_start', { runTypeId: selected }, { participantId });
    let phaseTimer: number | undefined;
    try {
      try {
        const queue = await api.getRunQueue();
        if (queue.activeSessionCount === 0) {
          logEvent(
            'run_ready_screen_required',
            { runTypeId: selected },
            {
              participantId,
              readableMessage: 'Очередь пуста: перед стартом показан экран готовности',
            }
          );
          navigate('/run/ready', {
            replace: true,
            state: {
              participantId,
              runTypeId: selected,
              participantSex,
              participantFirstName: state?.participantFirstName,
              participantLastName: state?.participantLastName,
            },
          });
          return;
        }
      } catch {
        // If the queue check is unavailable, keep the previous start behavior.
      }

      report('treadmill_check');
      phaseTimer = window.setTimeout(() => {
        report('sending_to_touchdesigner');
      }, 220);
      const res = await api.startRun({ participantId, runTypeId: selected });
      if (phaseTimer !== undefined) {
        window.clearTimeout(phaseTimer);
        phaseTimer = undefined;
      }
      if (!res.success) {
        clearPhase();
        if (res.reason === 'td_unavailable') {
          report('integration_error');
        }
        if (res.reason === 'queue_full') {
          logEvent(
            'queue_rejected',
            { runTypeId: selected, reason: 'queue_full' },
            {
              participantId,
              readableMessage: 'Очередь заполнена: экран переполнения (не смешивается с «дорожка занята»)',
            }
          );
          navigate('/register/queue-full', {
            replace: true,
            state: { fromRunSelectionQueueFull: true as const },
          });
        } else if (res.reason === 'queue_paused') {
          logEvent(
            'queue_rejected',
            { runTypeId: selected, reason: 'queue_paused' },
            {
              participantId,
              readableMessage: 'Очередь на паузе (оператор). Попробуйте позже.',
            }
          );
          setError('Очередь временно на паузе. Попробуйте позже.');
        } else if (res.reason === 'td_unavailable') {
          logEvent(
            'run_start_td_unavailable',
            { runTypeId: selected },
            {
              participantId,
              readableMessage: 'TouchDesigner недоступен: старт забега не подтвержден',
            }
          );
          setError('Беговая дорожка не отвечает. Попробуйте позже.');
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
        { context: 'run_start', message: msg },
        {
          participantId,
          readableMessage: `Ошибка при старте забега: ${msg}`,
        }
      );
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!participantId) {
    return null;
  }

  return (
    <ArOzioViewport>
      <RegistrationLayout chrome="wizard">
        <RunSelectionShell
          runSelectBody
          footer={
            <div style={rs.footerRow}>
              <PrimaryButton
                variant="cta"
                ready={!loading}
                disabled={loading}
                loading={loading}
                onClick={handleStart}
              >
                Старт
              </PrimaryButton>
            </div>
          }
        >
          <div style={rs.runSelectTopBlock}>
            <p style={rs.greeting}>
              <span style={rs.greetingSingleLine}>Привет, {greetingFirstLine}!</span>
            </p>
            <p style={rs.subtitle}>Выбери свой формат забега</p>
            {error ? <p style={{ ...reg.error, ...rs.subtitle, color: '#f85149' }}>{error}</p> : null}
            <RunTypeTabBar options={RUN_OPTIONS} selected={selected} onSelect={setSelected} />
          </div>
          <div style={rs.runSelectCardZone}>
            <RunDetailCard option={activeOption} />
          </div>
        </RunSelectionShell>
      </RegistrationLayout>
    </ArOzioViewport>
  );
}
