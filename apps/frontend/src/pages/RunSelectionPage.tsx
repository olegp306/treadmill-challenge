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
import { logEvent, setLoggedRunSessionId } from '../logging/logEvent';

export type RunSelectLocationState = {
  participantId: string;
  participantFirstName: string;
  participantSex: 'male' | 'female';
};

function displayGreetingFirstName(raw: string): string {
  const part = raw.trim();
  if (!part) return 'участник';
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

export default function RunSelectionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RunSelectLocationState | null;

  const participantId = state?.participantId ?? '';
  const participantSex = state?.participantSex ?? 'male';
  const greetingName = useMemo(
    () => displayGreetingFirstName(state?.participantFirstName ?? ''),
    [state?.participantFirstName]
  );

  const [selected, setSelected] = useState<RunTypeId>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const res = await api.startRun({ participantId, runTypeId: selected });
      if (!res.success) {
        if (res.reason === 'queue_full') {
          logEvent(
            'queue_rejected',
            { runTypeId: selected, reason: 'queue_full' },
            {
              participantId,
              readableMessage: 'Очередь заполнена: пользователь перенаправлен на экран уведомления',
            }
          );
          navigate('/run/queue-busy', {
            replace: true,
            state: {
              participantId,
              participantFirstName: state?.participantFirstName,
              participantSex,
              runTypeId: selected,
            },
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
      setLoggedRunSessionId(res.runSessionId);
      logEvent(
        'run_started',
        { runTypeId: res.runTypeId, demoMode: res.demoMode, queuePosition: res.position },
        {
          participantId: res.participantId,
          runSessionId: res.runSessionId,
          readableMessage: res.demoMode
            ? 'Забег начат в демо-режиме (без TouchDesigner)'
            : `Забег начат, пользователь в очереди (позиция ${res.position})`,
        }
      );
      if (!res.demoMode) {
        logEvent(
          'touchdesigner_ack',
          { runTypeId: res.runTypeId, treadmillStatus: res.treadmillStatus },
          {
            participantId: res.participantId,
            runSessionId: res.runSessionId,
            readableMessage: `TouchDesigner ack: treadmill=${res.treadmillStatus}`,
          }
        );
        logEvent(
          'added_to_queue',
          { runTypeId: res.runTypeId, queuePosition: res.position },
          {
            participantId: res.participantId,
            runSessionId: res.runSessionId,
            readableMessage: `Пользователь добавлен в очередь. Номер в очереди: ${res.position}`,
          }
        );
      }
      if (!res.demoMode && res.treadmillStatus === 'busy') {
        navigate('/run/queue-busy', {
          replace: true,
          state: {
            participantId: res.participantId,
            participantFirstName: state?.participantFirstName,
            participantSex,
            runTypeId: res.runTypeId,
            reason: 'treadmill_busy',
            runSessionId: res.runSessionId,
          },
        });
        return;
      }
      if (res.demoMode) {
        if (res.status === 'running') {
          navigate('/run/prepare', {
            replace: true,
            state: {
              participantId: res.participantId,
              runSessionId: res.runSessionId,
              runTypeId: res.runTypeId,
              participantSex,
              participantFirstName: state?.participantFirstName,
              demoMode: true,
            },
          });
        } else {
          navigate('/run/queue', {
            replace: true,
            state: {
              participantId: res.participantId,
              runSessionId: res.runSessionId,
              runTypeId: res.runTypeId,
              position: res.position,
              participantSex,
              participantFirstName: state?.participantFirstName,
              demoMode: true,
            },
          });
        }
        return;
      }
      navigate('/run/queue', {
        replace: true,
        state: {
          participantId: res.participantId,
          runSessionId: res.runSessionId,
          runTypeId: res.runTypeId,
          position: res.position,
          participantSex,
          participantFirstName: state?.participantFirstName,
        },
      });
    } catch (e) {
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
              Привет, <span style={reg.logoRed}>{greetingName}!</span>
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
