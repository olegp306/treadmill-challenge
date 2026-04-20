import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { api } from '../../api/client';
import { LogoMark } from '../../ui/components/LogoMark';
import { TdResultStaticDecor } from '../../features/td/TdResultStaticDecor';
import { TdDisplayShell } from '../../features/td/TdDisplayShell';
import { td } from '../../features/td/tdTokens';
import { TdWaitingRunBlock } from '../../features/td/TdWaitingBlocks';
import type { LeaderboardEntry } from '../../hooks/useLeaderboard';

const RUN_ORDER: RunTypeId[] = [0, 1, 2];
const REFRESH_MS = 5000;

export default function TdWaitingLeaderboardPage() {
  const [searchParams] = useSearchParams();
  const sexParam = (searchParams.get('sex') ?? '').trim().toLowerCase();
  const gender: Gender = sexParam === 'female' ? 'female' : 'male';
  const [blocks, setBlocks] = useState<Record<RunTypeId, LeaderboardEntry[]>>({
    0: [],
    1: [],
    2: [],
  });

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
    const poll = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [gender]);

  const columnLeft = Math.round(2560 * 0.25 + 155);
  const columnW = 970;
  const gradientLayer =
    gender === 'female'
      ? 'radial-gradient(ellipse 72% 42% at 50% 100%, rgba(115, 16, 42, 0.7) 0%, rgba(87, 10, 34, 0.35) 34%, rgba(0, 0, 3, 0) 72%)'
      : 'radial-gradient(ellipse 72% 42% at 50% 100%, rgba(58, 71, 138, 0.72) 0%, rgba(35, 49, 105, 0.34) 34%, rgba(0, 0, 3, 0) 72%)';
  const sideLabel = gender === 'female' ? 'женский зачет' : 'мужской зачет';
  const sideBadgeBase = {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    color: td.red,
    fontFamily: td.fontProxima,
    fontWeight: 400,
    fontSize: 25.6,
    letterSpacing: 7.16,
    lineHeight: 1,
    textTransform: 'lowercase' as const,
    padding: '10px 20px',
    boxSizing: 'border-box' as const,
  };
  const cornerSize = 14;
  const cornerOffset = 9;
  const cornerStroke = `1px solid ${td.red}`;

  useEffect(() => {
    document.body.classList.add('td-route');
    return () => document.body.classList.remove('td-route');
  }, []);

  return (
    <TdDisplayShell>
      <div style={{ width: '100%', height: '100%', position: 'relative', background: td.bg }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: gradientLayer,
          }}
        />
        <TdResultStaticDecor />
        <div
          aria-hidden
          style={{
            ...sideBadgeBase,
            left: 274,
          }}
        >
          {sideLabel}
          <span
            style={{
              position: 'absolute',
              left: -cornerOffset,
              top: -cornerOffset,
              width: cornerSize,
              height: cornerSize,
              borderTop: cornerStroke,
              borderLeft: cornerStroke,
              boxSizing: 'border-box',
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: -cornerOffset,
              top: -cornerOffset,
              width: cornerSize,
              height: cornerSize,
              borderTop: cornerStroke,
              borderRight: cornerStroke,
              boxSizing: 'border-box',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: -cornerOffset,
              bottom: -cornerOffset,
              width: cornerSize,
              height: cornerSize,
              borderBottom: cornerStroke,
              borderLeft: cornerStroke,
              boxSizing: 'border-box',
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: -cornerOffset,
              bottom: -cornerOffset,
              width: cornerSize,
              height: cornerSize,
              borderBottom: cornerStroke,
              borderRight: cornerStroke,
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div
          aria-hidden
          style={{
            ...sideBadgeBase,
            right: 274,
          }}
        >
          {sideLabel}
          <span
            style={{
              position: 'absolute',
              left: -cornerOffset,
              top: -cornerOffset,
              width: cornerSize,
              height: cornerSize,
              borderTop: cornerStroke,
              borderLeft: cornerStroke,
              boxSizing: 'border-box',
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: -cornerOffset,
              top: -cornerOffset,
              width: cornerSize,
              height: cornerSize,
              borderTop: cornerStroke,
              borderRight: cornerStroke,
              boxSizing: 'border-box',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: -cornerOffset,
              bottom: -cornerOffset,
              width: cornerSize,
              height: cornerSize,
              borderBottom: cornerStroke,
              borderLeft: cornerStroke,
              boxSizing: 'border-box',
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: -cornerOffset,
              bottom: -cornerOffset,
              width: cornerSize,
              height: cornerSize,
              borderBottom: cornerStroke,
              borderRight: cornerStroke,
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 56,
            width: 640,
            height: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'translateX(-50%)',
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
        </div>

        <div
          style={{
            position: 'absolute',
            left: columnLeft,
            top: 139,
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
