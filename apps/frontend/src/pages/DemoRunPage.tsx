import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateDemoMetrics } from '@treadmill-challenge/shared';
import type { RunTypeId } from '@treadmill-challenge/shared';
import { ArOzioViewport } from '../arOzio/ArOzioViewport';
import { h, w } from '../arOzio/dimensions';
import { api } from '../api/client';
import { RegistrationLayout } from '../features/registration/RegistrationLayout';
import { PrimaryButton } from '../features/registration/components';
import { RunSelectionShell } from '../features/run-selection/RunSelectionShell';
import { getRunOption } from '../features/run-selection/runOptions';
import { rs } from '../features/run-selection/runSelectionStyles';

export type DemoRunLocationState = {
  participantId: string;
  runSessionId: string;
  runTypeId: RunTypeId;
  participantSex: 'male' | 'female';
  competitionId: string;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  const sStr = s < 10 ? `0${s.toFixed(1)}` : s.toFixed(1);
  return `${m}:${sStr}`;
}

export default function DemoRunPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as DemoRunLocationState | null;

  const [participantName, setParticipantName] = useState<string>('');
  const [loadingName, setLoadingName] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSessionId = state?.runSessionId ?? '';
  const runTypeId = state?.runTypeId ?? 0;
  const participantId = state?.participantId ?? '';
  const participantSex = state?.participantSex ?? 'male';

  const metrics = useMemo(
    () => (runSessionId ? generateDemoMetrics(runTypeId, runSessionId) : { resultTime: 0, distance: 0 }),
    [runSessionId, runTypeId]
  );

  useEffect(() => {
    if (!participantId || !runSessionId) {
      navigate('/', { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingName(true);
      try {
        const p = await api.getParticipant(participantId);
        if (!cancelled) {
          const name = `${p.firstName} ${p.lastName}`.trim() || p.firstName;
          setParticipantName(name);
        }
      } catch {
        if (!cancelled) setParticipantName('Участник');
      } finally {
        if (!cancelled) setLoadingName(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [participantId, runSessionId, navigate]);

  const runTitle = getRunOption(runTypeId).title;
  const primaryLabel = runTypeId === 0 ? 'Дистанция' : 'Время';
  const primaryValue =
    runTypeId === 0 ? `${metrics.distance.toFixed(1)} м` : formatTime(metrics.resultTime);
  const secondaryLabel = runTypeId === 0 ? 'Время' : 'Дистанция';
  const secondaryValue =
    runTypeId === 0 ? formatTime(metrics.resultTime) : `${Math.round(metrics.distance)} м`;

  const handleNext = async () => {
    if (!runSessionId) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.submitRunResult({
        runSessionId,
        resultTime: metrics.resultTime,
        distance: metrics.distance,
      });
      const q = new URLSearchParams({
        runTypeId: String(runTypeId),
        gender: participantSex,
        highlightParticipantId: participantId,
      });
      navigate(`/leaderboard?${q.toString()}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить результат');
    } finally {
      setSubmitting(false);
    }
  };

  if (!participantId || !runSessionId) {
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
                ready={!submitting && !loadingName}
                disabled={submitting || loadingName}
                loading={submitting}
                onClick={() => void handleNext()}
              >
                Далее
              </PrimaryButton>
            </div>
          }
        >
          <div style={rs.runSelectTopBlock}>
            <p
              style={{
                ...rs.greeting,
                fontSize: w(40),
                textAlign: 'center',
              }}
            >
              Тестовый забег
            </p>
            <p
              style={{
                ...rs.subtitle,
                textAlign: 'center',
                color: '#8b949e',
                maxWidth: w(900),
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              Демо-режим для проверки без TouchDesigner
            </p>
            {error ? (
              <p style={{ ...rs.subtitle, color: '#f85149', textAlign: 'center' }}>{error}</p>
            ) : null}
          </div>
          <div
            style={{
              ...rs.runSelectCardZone,
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: w(920),
                margin: '0 auto',
                padding: `${h(28)} ${w(36)}`,
                borderRadius: w(40),
                background: '#141414',
                border: '1px solid #e6233a',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: h(20),
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: w(22),
                  color: '#f08896',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Демо / тест
              </p>
              <p style={{ margin: 0, fontSize: w(32), color: '#fff', textTransform: 'uppercase' }}>
                {loadingName ? '…' : participantName}
              </p>
              <p style={{ margin: 0, fontSize: w(26), color: '#8b949e' }}>{runTitle}</p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: w(24),
                  marginTop: h(8),
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: w(20), color: '#8b949e' }}>{primaryLabel}</p>
                  <p style={{ margin: `${h(6)} 0 0`, fontSize: w(44), color: '#fff' }}>{primaryValue}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: w(20), color: '#8b949e' }}>{secondaryLabel}</p>
                  <p style={{ margin: `${h(6)} 0 0`, fontSize: w(36), color: '#c9d1d9' }}>{secondaryValue}</p>
                </div>
              </div>
            </div>
          </div>
        </RunSelectionShell>
      </RegistrationLayout>
    </ArOzioViewport>
  );
}
