import { td } from './tdTokens';

type Item = { kind: 'plus' | 'dash'; x: number; y: number };

/**
 * Static + / — on the left and right of the 2560×1120 result layout (no animation).
 * `zIndex: 0` under the leaderboard column (zIndex 1+).
 */
const DASH_COUNT = 7;
const DASH_LEFT_X = 30;
const DASH_RIGHT_X = td.designW - 30;
const DASH_TOP = 37;
const DASH_BOTTOM = td.designH - 37;
const DASH_STEP = (DASH_BOTTOM - DASH_TOP) / (DASH_COUNT - 1);

const DASHES: ReadonlyArray<Item> = Array.from({ length: DASH_COUNT }, (_, i) => {
  const y = DASH_TOP + DASH_STEP * i;
  return [
    { kind: 'dash' as const, x: DASH_LEFT_X, y },
    { kind: 'dash' as const, x: DASH_RIGHT_X, y },
  ];
}).flat();

const PLUSES: ReadonlyArray<Item> = [
  { kind: 'plus', x: 200, y: 200 },
  { kind: 'plus', x: td.designW - 200, y: 200 },
  { kind: 'plus', x: 200, y: td.designH - 200 },
  { kind: 'plus', x: td.designW - 200, y: td.designH - 200 },
];

const ITEMS: ReadonlyArray<Item> = [...DASHES, ...PLUSES];
const DECOR_COLOR = 'rgba(230, 35, 58, 0.9)';
const PLUS_SIZE = 54;
const PLUS_STROKE = 2;
const DASH_WIDTH = 37;
const DASH_STROKE = 2;

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
      {ITEMS.map((item, i) => {
        if (item.kind === 'plus') {
          return (
            <span
              key={`${item.kind}-${item.x}-${item.y}-${i}`}
              style={{
                position: 'absolute',
                left: item.x,
                top: item.y,
                transform: 'translate(-50%, -50%)',
                width: PLUS_SIZE,
                height: PLUS_SIZE,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  width: PLUS_STROKE,
                  height: '100%',
                  transform: 'translateX(-50%)',
                  background: DECOR_COLOR,
                  borderRadius: PLUS_STROKE,
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  width: '100%',
                  height: PLUS_STROKE,
                  transform: 'translateY(-50%)',
                  background: DECOR_COLOR,
                  borderRadius: PLUS_STROKE,
                }}
              />
            </span>
          );
        }

        return (
          <span
            key={`${item.kind}-${item.x}-${item.y}-${i}`}
            style={{
              position: 'absolute',
              left: item.x,
              top: item.y,
              transform: 'translate(-50%, -50%)',
              width: DASH_WIDTH,
              height: DASH_STROKE,
              background: DECOR_COLOR,
              borderRadius: DASH_STROKE,
            }}
          />
        );
      })}
    </div>
  );
}
