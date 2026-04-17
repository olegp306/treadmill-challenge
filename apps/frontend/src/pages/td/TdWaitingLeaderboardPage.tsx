import { useEffect, useState } from 'react';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { api } from '../../api/client';
import { LogoMark } from '../../ui/components/LogoMark';
import { TdDecorations } from '../../features/td/TdDecorations';
import { TdDisplayShell } from '../../features/td/TdDisplayShell';
import { genderHeaderLabel } from '../../features/td/tdFormat';
import { td } from '../../features/td/tdTokens';
import { TdWaitingRunBlock } from '../../features/td/TdWaitingBlocks';
import type { LeaderboardEntry } from '../../hooks/useLeaderboard';

const RUN_ORDER: RunTypeId[] = [0, 1, 2];
const ROTATE_MS = 5000;

export default function TdWaitingLeaderboardPage() {
  const [gender, setGender] = useState<Gender>('male');
  const [blocks, setBlocks] = useState<Record<RunTypeId, LeaderboardEntry[]>>({
    0: [],
    1: [],
    2: [],
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      setGender((g) => (g === 'male' ? 'female' : 'male'));
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const results = await Promise.all(
          RUN_ORDER.map((runTypeId) => api.getLeaderboard({ runTypeId, sex: gender }))
        );
        if (cancelled) return;
        const next: Record<RunTypeId, LeaderboardEntry[]> = { 0: [], 1: [], 2: [] };
        RUN_ORDER.forEach((rt, i) => {
          next[rt] = results[i].leaderboard;
        });
        setBlocks(next);
      } catch {
        if (!cancelled) {
          setBlocks({ 0: [], 1: [], 2: [] });
        }
      }
    }
    void load();
    const poll = window.setInterval(() => void load(), ROTATE_MS);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [gender]);

  const columnLeft = Math.round(2560 * 0.25 + 155);
  const columnW = 970;

  useEffect(() => {
    document.body.classList.add('td-route');
    return () => document.body.classList.remove('td-route');
  }, []);

  return (
    <TdDisplayShell>
      <div style={{ width: '100%', height: '100%', position: 'relative', background: td.bg }}>
        <TdDecorations />
        <div
          style={{
            position: 'absolute',
            left: columnLeft,
            top: 56,
            width: columnW,
            height: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <LogoMark
            aria-label="AMAZING RED"
            style={{
              margin: 0,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: '0.28em',
              fontSize: 23,
              lineHeight: 1,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              fontWeight: 400,
            }}
          />
          <span
            style={{
              fontFamily: '"Oswald", sans-serif',
              fontWeight: 500,
              fontSize: 30,
              color: td.text,
              textTransform: 'uppercase',
            }}
          >
            {genderHeaderLabel(gender)}
          </span>
        </div>

        <div
          style={{
            position: 'absolute',
            left: columnLeft,
            top: 144,
            width: columnW,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {RUN_ORDER.map((runTypeId) => (
            <TdWaitingRunBlock key={runTypeId} runTypeId={runTypeId} entries={blocks[runTypeId]} />
          ))}
        </div>
      </div>
    </TdDisplayShell>
  );
}
