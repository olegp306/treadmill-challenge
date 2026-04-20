import type { CSSProperties } from 'react';
import type { RunTypeId } from '@treadmill-challenge/shared';
import type { LeaderboardEntry } from '../../hooks/useLeaderboard';
import { td } from './tdTokens';
import { formatTdMetric, runTypeHeaderUpper } from './tdFormat';

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  color: td.text,
  textTransform: 'uppercase',
  fontFamily: td.fontDruk,
  fontWeight: 400,
  fontSize: 26,
  lineHeight: 1.1,
};

function formatWaitingDisplayName(fullName: string): string {
  const normalized = fullName.trim().replace(/\s+/g, ' ');
  if (normalized.length <= 23) return normalized;
  return `${normalized.slice(0, 23)}…`;
}

export function TdWaitingRunBlock({
  runTypeId,
  entries,
}: {
  runTypeId: RunTypeId;
  entries: LeaderboardEntry[];
}) {
  const top = entries.slice(0, 3);
  const slots = Array.from({ length: 3 }, (_, i) => top[i] ?? null);
  return (
    <div
      style={{
        background: td.card,
        borderTop: `2px solid ${td.cardBorderTop}`,
        borderRadius: 20,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: td.red,
          borderRadius: 16,
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: td.fontDruk,
            fontWeight: 400,
            fontSize: 26,
            lineHeight: 1.05,
            letterSpacing: '0.01em',
            color: '#fff',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          {runTypeHeaderUpper(runTypeId)}
        </span>
      </div>
      {slots.map((e, i) => (
        <div
          key={e?.runId ?? `placeholder-${runTypeId}-${i}`}
          style={{ ...rowStyle, minHeight: 32 }}
          aria-hidden={e ? undefined : true}
        >
          {e ? (
            <>
              <span style={{ width: 45, flexShrink: 0 }}>{e.rank ?? i + 1}</span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'clip',
                }}
              >
                {formatWaitingDisplayName(e.participantName)}
              </span>
              <span
                style={{
                  width: 141,
                  flexShrink: 0,
                  textAlign: 'right',
                  fontFamily: td.fontProxima,
                  fontWeight: 700,
                  fontSize: 32,
                  letterSpacing: 3.2,
                  lineHeight: 1,
                }}
              >
                {formatTdMetric(e, runTypeId)}
              </span>
            </>
          ) : (
            <>
              <span style={{ width: 45, flexShrink: 0, opacity: 0 }}>0</span>
              <span style={{ flex: 1, minWidth: 0, opacity: 0 }}>placeholder</span>
              <span style={{ width: 141, flexShrink: 0, opacity: 0 }}>00:00</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
