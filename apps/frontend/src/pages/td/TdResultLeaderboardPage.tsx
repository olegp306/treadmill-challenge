import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeShortName } from '@treadmill-challenge/shared';
import { api } from '../../api/client';
import { LogoMark } from '../../ui/components/LogoMark';
import { TdDecorations } from '../../features/td/TdDecorations';
import { TdDisplayShell } from '../../features/td/TdDisplayShell';
import { formatTdMetric } from '../../features/td/tdFormat';
import { td } from '../../features/td/tdTokens';
import type { LeaderboardEntry } from '../../hooks/useLeaderboard';

const POLL_MS = 1500;

function sliceAround(entries: LeaderboardEntry[], highlightParticipantId: string): LeaderboardEntry[] {
  const idx = entries.findIndex((e) => e.participantId === highlightParticipantId);
  if (idx < 0) return entries.slice(0, 12);
  const before = 3;
  const after = 3;
  const start = Math.max(0, idx - before);
  const end = Math.min(entries.length, idx + after + 1);
  return entries.slice(start, end);
}

export default function TdResultLeaderboardPage() {
  const [searchParams] = useSearchParams();
  const runSessionId = searchParams.get('runSessionId')?.trim() ?? '';

  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [runTypeId, setRunTypeId] = useState<RunTypeId | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!runSessionId) return;
    let cancelled = false;

    async function tick() {
      try {
        const session = await api.getRunSessionState(runSessionId);
        if (cancelled) return;
        setSessionStatus(session.status);
        setRunTypeId(session.runTypeId);
        setParticipantId(session.participantId);

        if (session.status !== 'finished') {
          setEntries([]);
          return;
        }

        const participant = await api.getParticipant(session.participantId);
        if (cancelled) return;

        const data = await api.getLeaderboard({
          runTypeId: session.runTypeId,
          sex: participant.sex,
        });
        if (cancelled) return;

        let list = data.leaderboard;
        const found = list.some((e) => e.participantId === session.participantId);
        if (!found) {
          const run = participant.runs.find((r) => r.runSessionId === runSessionId);
          if (run) {
            const name = `${participant.firstName} ${participant.lastName}`.trim() || 'Участник';
            const synthetic: LeaderboardEntry = {
              participantId: participant.id,
              participantName: name,
              resultTime: run.resultTime,
              distance: run.distance,
              speed: run.speed,
              runId: run.id,
              createdAt: run.createdAt,
              rank: undefined,
            };
            list = [...list, synthetic];
          }
        }

        setEntries(list);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Ошибка загрузки');
        }
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [runSessionId]);

  const visible = useMemo(() => {
    if (!participantId || entries.length === 0) return [];
    return sliceAround(entries, participantId);
  }, [entries, participantId]);

  const title = runTypeId != null ? getRunTypeShortName(runTypeId).toUpperCase() : '—';

  useEffect(() => {
    document.body.classList.add('td-route');
    return () => document.body.classList.remove('td-route');
  }, []);

  if (!runSessionId) {
    return (
      <TdDisplayShell>
        <div
          style={{
            color: td.text,
            fontFamily: '"Oswald", sans-serif',
            fontSize: 32,
            padding: 40,
          }}
        >
          Добавьте параметр ?runSessionId=
        </div>
      </TdDisplayShell>
    );
  }

  return (
    <TdDisplayShell>
      <div style={{ width: '100%', height: '100%', position: 'relative', background: td.bg }}>
        <TdDecorations />

        {error && (
          <div
            style={{
              position: 'absolute',
              left: 80,
              top: 80,
              color: td.red,
              fontFamily: '"Oswald", sans-serif',
              fontSize: 24,
              zIndex: 2,
            }}
          >
            {error}
          </div>
        )}

        {sessionStatus && sessionStatus !== 'finished' && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'rgba(255,255,255,0.85)',
              fontFamily: '"Oswald", sans-serif',
              fontSize: 36,
              textTransform: 'uppercase',
              zIndex: 1,
            }}
          >
            Ожидаем результат…
          </div>
        )}

        {runTypeId != null && visible.length > 0 && participantId && (
          <>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 36,
                transform: 'translateX(-50%)',
                width: 640,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 20,
              }}
            >
              <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogoMark
                  aria-label="AMAZING RED"
                  style={{
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'baseline',
                    gap: '0.28em',
                    fontSize: 28,
                    lineHeight: 1,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    fontWeight: 400,
                  }}
                />
              </div>
              <div
                style={{
                  background: td.red,
                  borderRadius: 16,
                  padding: '12px 20px',
                }}
              >
                <span
                  style={{
                    fontFamily: '"Oswald", sans-serif',
                    fontWeight: 500,
                    fontSize: 30,
                    color: '#fff',
                    textTransform: 'uppercase',
                  }}
                >
                  {title}
                </span>
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, calc(-50% + 40px))',
                width: 970,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {visible.map((e) => {
                const isHi = e.participantId === participantId;
                if (isHi) {
                  return (
                    <div
                      key={e.runId}
                      style={{
                        background: td.red,
                        padding: '36px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: '#fff',
                        fontFamily: '"Oswald", sans-serif',
                        fontWeight: 500,
                        fontSize: 48,
                        lineHeight: 1.2,
                        textTransform: 'uppercase',
                        width: '100%',
                        boxSizing: 'border-box',
                        gap: 24,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 40, alignItems: 'center', flex: 1, minWidth: 0 }}>
                        <span style={{ flexShrink: 0 }}>{e.rank ?? '—'}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.participantName}</span>
                      </div>
                      <span style={{ letterSpacing: 3.84, flexShrink: 0 }}>{formatTdMetric(e, runTypeId)}</span>
                    </div>
                  );
                }
                return (
                  <div
                    key={e.runId}
                    style={{
                      background: td.card,
                      borderTop: `2px solid ${td.cardBorderTop}`,
                      borderRadius: 20,
                      padding: 24,
                      display: 'flex',
                      alignItems: 'center',
                      color: td.text,
                      textTransform: 'uppercase',
                      fontFamily: '"Oswald", sans-serif',
                      fontWeight: 500,
                      fontSize: 26,
                    }}
                  >
                    <span style={{ width: 45, flexShrink: 0 }}>{e.rank ?? '—'}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>{e.participantName}</span>
                    <span
                      style={{
                        width: 141,
                        textAlign: 'right',
                        fontWeight: 700,
                        fontSize: 32,
                        letterSpacing: 3.2,
                      }}
                    >
                      {formatTdMetric(e, runTypeId)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </TdDisplayShell>
  );
}
