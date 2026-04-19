import { td } from './tdTokens';

type Item = { kind: 'plus' | 'dash'; x: number; y: number };

/**
 * Static + / — on the left and right of the 2560×1120 result layout (no animation).
 * `zIndex: 0` under the leaderboard column (zIndex 1+).
 */
const ITEMS: ReadonlyArray<Item> = [
  { kind: 'plus', x: 360, y: 300 },
  { kind: 'dash', x: 300, y: 460 },
  { kind: 'plus', x: 400, y: 600 },
  { kind: 'dash', x: 280, y: 760 },
  { kind: 'plus', x: 380, y: 900 },
  { kind: 'dash', x: 2200, y: 300 },
  { kind: 'plus', x: 2260, y: 460 },
  { kind: 'dash', x: 2160, y: 600 },
  { kind: 'plus', x: 2280, y: 760 },
  { kind: 'dash', x: 2180, y: 900 },
];

export function TdResultStaticDecor() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {ITEMS.map((item, i) => (
        <span
          key={`${item.kind}-${item.x}-${item.y}-${i}`}
          style={{
            position: 'absolute',
            left: item.x,
            top: item.y,
            transform: 'translate(-50%, -50%)',
            color: td.red,
            fontWeight: 400,
            fontSynthesis: 'none',
            lineHeight: 1,
            fontSize: item.kind === 'plus' ? 20 : 15,
          }}
        >
          {item.kind === 'plus' ? '+' : '—'}
        </span>
      ))}
    </div>
  );
}
