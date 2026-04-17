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
  fontFamily: '"Oswald", sans-serif',
  fontWeight: 500,
  fontSize: 26,
  lineHeight: 1,
};

export function TdWaitingRunBlock({
  runTypeId,
  entries,
}: {
  runTypeId: RunTypeId;
  entries: LeaderboardEntry[];
}) {
  const top = entries.slice(0, 3);
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
            fontFamily: '"Oswald", sans-serif',
            fontWeight: 500,
            fontSize: 26,
            color: '#fff',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          {runTypeHeaderUpper(runTypeId)}
        </span>
      </div>
      {top.map((e, i) => (
        <div key={e.runId} style={rowStyle}>
          <span style={{ width: 45, flexShrink: 0 }}>{e.rank ?? i + 1}</span>
          <span style={{ flex: 1, minWidth: 0 }}>{e.participantName}</span>
          <span
            style={{
              width: 141,
              flexShrink: 0,
              textAlign: 'right',
              fontFamily: '"Oswald", sans-serif',
              fontWeight: 700,
              fontSize: 32,
              letterSpacing: 3.2,
            }}
          >
            {formatTdMetric(e, runTypeId)}
          </span>
        </div>
      ))}
    </div>
  );
}
