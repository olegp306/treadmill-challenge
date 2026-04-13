import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { RunType } from '@treadmill-challenge/shared';
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

export type RunSelectLocationState = {
  participantId: string;
  participantFirstName: string;
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
  const greetingName = useMemo(
    () => displayGreetingFirstName(state?.participantFirstName ?? ''),
    [state?.participantFirstName]
  );

  const [selected, setSelected] = useState<RunType>('stayer_sprint_5km');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!participantId) {
      navigate('/', { replace: true });
    }
  }, [participantId, navigate]);

  const activeOption = getRunOption(selected);

  const handleStart = async () => {
    if (!participantId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.startRun({ participantId, runType: selected });
      navigate('/run/queue', {
        replace: true,
        state: {
          participantId: res.participantId,
          runSessionId: res.runSessionId,
          runType: res.runType,
          position: res.position,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось начать забег');
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
          <p style={rs.greeting}>Привет, {greetingName}!</p>
          <p style={rs.subtitle}>Выбери свой формат забега</p>
          {error ? <p style={{ ...reg.error, ...rs.subtitle, color: '#f85149' }}>{error}</p> : null}
          <RunTypeTabBar options={RUN_OPTIONS} selected={selected} onSelect={setSelected} />
          <RunDetailCard option={activeOption} />
          <p style={{ margin: 0, textAlign: 'center' }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85em' }}>
              На главную
            </Link>
          </p>
        </RunSelectionShell>
      </RegistrationLayout>
    </ArOzioViewport>
  );
}
