import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeShortName } from '@treadmill-challenge/shared';
import { api } from '../../api/client';
import { LogoMark } from '../../ui/components/LogoMark';
import { TdResultStaticDecor } from '../../features/td/TdResultStaticDecor';
import { TdDisplayShell } from '../../features/td/TdDisplayShell';
import { formatTdMetric } from '../../features/td/tdFormat';
import { td } from '../../features/td/tdTokens';
import type { LeaderboardEntry } from '../../hooks/useLeaderboard';

/** Fast poll while waiting for finish; slower refresh once leaderboard is visible. */
const POLL_PENDING_MS = 450;
const POLL_IDLE_MS = 2500;

function sliceAround(entries: LeaderboardEntry[], highlightParticipantId: string): LeaderboardEntry[] {
  const idx = entries.findIndex((e) => e.participantId === highlightParticipantId);
  if (idx < 0) return entries.slice(0, 12);
  const before = 3;
  const after = 3;
  const start = Math.max(0, idx - before);
  const end = Math.min(entries.length, idx + after + 1);
  return entries.slice(start, end);
}

/** Local `DrukWideCyr-400.woff2` — keep weight 400 so the real face applies (no faux bold). */
const fontDruk = "'Druk Wide Cyr', Oswald, system-ui, sans-serif";
/** Figma card column; highlight bar uses a wider inner track. */
const COL_W_CARDS = 970;
const COL_W_HIGHLIGHT = 1200;

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
    let wakeTimer: number | undefined;

    async function tick(): Promise<number> {
      try {
        const session = await api.getRunSessionState(runSessionId);
        if (cancelled) return POLL_PENDING_MS;
        setSessionStatus(session.status);
        setRunTypeId(session.runTypeId);
        setParticipantId(session.participantId);

        if (session.status !== 'finished') {
          setEntries([]);
          return POLL_PENDING_MS;
        }

        const participant = await api.getParticipant(session.participantId);
        if (cancelled) return POLL_IDLE_MS;

        const data = await api.getLeaderboard({
          runTypeId: session.runTypeId,
          sex: participant.sex,
        });
        if (cancelled) return POLL_IDLE_MS;

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
        return POLL_IDLE_MS;
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Ошибка загрузки');
        }
        return POLL_PENDING_MS;
      }
    }

    async function loop() {
      while (!cancelled) {
        const nextMs = await tick();
        if (cancelled) break;
        await new Promise<void>((resolve) => {
          wakeTimer = window.setTimeout(resolve, nextMs);
        });
      }
    }

    void loop();

    return () => {
      cancelled = true;
      if (wakeTimer !== undefined) window.clearTimeout(wakeTimer);
    };
  }, [runSessionId]);

  const visible = useMemo(() => {
    if (!participantId || entries.length === 0) return [];
    return sliceAround(entries, participantId);
  }, [entries, participantId]);

  const { rowsAbove, highlightRow, rowsBelow } = useMemo(() => {
    if (!participantId || visible.length === 0) {
      return { rowsAbove: [] as LeaderboardEntry[], highlightRow: null as LeaderboardEntry | null, rowsBelow: [] as LeaderboardEntry[] };
    }
    const hi = visible.findIndex((e) => e.participantId === participantId);
    if (hi < 0) {
      return { rowsAbove: visible, highlightRow: null, rowsBelow: [] };
    }
    return {
      rowsAbove: visible.slice(0, hi),
      highlightRow: visible[hi] ?? null,
      rowsBelow: visible.slice(hi + 1),
    };
  }, [visible, participantId]);

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
            fontFamily: fontDruk,
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
        <TdResultStaticDecor />

        <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', minHeight: '100%' }}>
        {error && (
          <div
            style={{
              position: 'absolute',
              left: 80,
              top: 80,
              color: td.red,
              fontFamily: fontDruk,
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
              fontFamily: fontDruk,
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
                    fontFamily: fontDruk,
                    fontWeight: 400,
                    fontSize: 30,
                    color: '#fff',
                    textTransform: 'uppercase',
                    fontSynthesis: 'none',
                  }}
                >
                  {title}
                </span>
              </div>
            </div>

            {/* Figma — center column + full-bleed highlight (1414:1771) */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 'calc(50% + 40px)',
                transform: 'translateY(-50%)',
                width: td.designW,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 30,
              }}
            >
              <div style={{ width: COL_W_CARDS, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {rowsAbove.map((e) => (
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
                      fontFamily: fontDruk,
                      fontWeight: 400,
                      fontSize: 26,
                      lineHeight: 1.2,
                      fontSynthesis: 'none',
                    }}
                  >
                    <span style={{ width: 45, flexShrink: 0, fontFamily: fontDruk, fontWeight: 400 }}>{e.rank ?? '—'}</span>
                    <span style={{ flex: 1, minWidth: 0, paddingLeft: 10 }}>{e.participantName}</span>
                    <span
                      style={{
                        width: 141,
                        textAlign: 'right',
                        fontFamily: fontDruk,
                        fontWeight: 400,
                        fontSize: 32,
                        letterSpacing: 3.2,
                        fontSynthesis: 'none',
                      }}
                    >
                      {formatTdMetric(e, runTypeId)}
                    </span>
                  </div>
                ))}
              </div>

              {highlightRow ? (
                <div
                  style={{
                    width: '100%',
                    background: td.red,
                    padding: '30px 20px',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    style={{
                      width: COL_W_HIGHLIGHT,
                      margin: '0 auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 24,
                      color: '#fff',
                      fontFamily: fontDruk,
                      fontWeight: 400,
                      fontSize: 48,
                      lineHeight: 1.2,
                      textTransform: 'uppercase',
                      fontSynthesis: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 40, alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <span style={{ flexShrink: 0, letterSpacing: '-0.96px', fontFamily: fontDruk, fontWeight: 400 }}>
                        {highlightRow.rank ?? '—'}
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                        {highlightRow.participantName}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: fontDruk,
                        fontWeight: 400,
                        letterSpacing: 3.84,
                        flexShrink: 0,
                        width: 160,
                        textAlign: 'right',
                        fontSynthesis: 'none',
                      }}
                    >
                      {formatTdMetric(highlightRow, runTypeId)}
                    </span>
                  </div>
                </div>
              ) : null}

              <div style={{ width: COL_W_CARDS, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {rowsBelow.map((e) => (
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
                      fontFamily: fontDruk,
                      fontWeight: 400,
                      fontSize: 26,
                      lineHeight: 1.2,
                      fontSynthesis: 'none',
                    }}
                  >
                    <span style={{ width: 45, flexShrink: 0, fontFamily: fontDruk, fontWeight: 400 }}>{e.rank ?? '—'}</span>
                    <span style={{ flex: 1, minWidth: 0, paddingLeft: 10 }}>{e.participantName}</span>
                    <span
                      style={{
                        width: 141,
                        textAlign: 'right',
                        fontFamily: fontDruk,
                        fontWeight: 400,
                        fontSize: 32,
                        letterSpacing: 3.2,
                        fontSynthesis: 'none',
                      }}
                    >
                      {formatTdMetric(e, runTypeId)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </TdDisplayShell>
  );
}
