import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArOzioViewport } from '../arOzio/ArOzioViewport';
import { api } from '../api/client';
import { RegistrationLayout } from '../features/registration/RegistrationLayout';
import { PrimaryButton } from '../features/registration/components';
import { RunSelectionShell } from '../features/run-selection/RunSelectionShell';
import { rs } from '../features/run-selection/runSelectionStyles';

export type RunWaitingLocationState = {
  participantId: string;
  runSessionId: string;
  runType: string;
};

export default function RunWaitingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RunWaitingLocationState | null;

  const participantId = state?.participantId ?? '';
  const [devMsg, setDevMsg] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);

  useEffect(() => {
    if (!participantId) {
      navigate('/', { replace: true });
    }
  }, [participantId, navigate]);

  const handleDevFinish = async () => {
    setDevMsg(null);
    setDevLoading(true);
    try {
      const res = await api.devFinishRun();
      setDevMsg(`Забег завершён (dev). runId: ${res.runId.slice(0, 8)}…`);
    } catch (e) {
      setDevMsg(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setDevLoading(false);
    }
  };

  if (!participantId) {
    return null;
  }

  const showDevFinish = import.meta.env.DEV;

  return (
    <ArOzioViewport>
      <RegistrationLayout chrome="wizard">
        <RunSelectionShell
          footer={
            showDevFinish ? (
              <div style={rs.footerRow}>
                <PrimaryButton
                  variant="cta"
                  ready={!devLoading}
                  disabled={devLoading}
                  loading={devLoading}
                  onClick={handleDevFinish}
                >
                  Завершить забег
                </PrimaryButton>
              </div>
            ) : undefined
          }
        >
          <p style={rs.greeting}>Подойдите к дорожке</p>
          <p style={rs.subtitle}>Ожидайте вызова оператора</p>
          {devMsg ? (
            <p style={{ ...rs.subtitle, color: devMsg.startsWith('Забег') ? 'rgba(255,255,255,0.85)' : '#f85149' }}>
              {devMsg}
            </p>
          ) : null}
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
