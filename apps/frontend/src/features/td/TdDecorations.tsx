import { td } from './tdTokens';

/** HUD-style corner ticks and edge marks (Figma-inspired, no external assets). */
export function TdDecorations() {
  const tick = { color: td.red, fontSize: 22, lineHeight: 1, opacity: 0.85 };
  const dash = { color: td.red, fontSize: 18, letterSpacing: 6, opacity: 0.7 };
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 48,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        <span style={tick}>+</span>
        <span style={dash}>—<br />—<br />—<br />—<br />—</span>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 48,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        <span style={tick}>+</span>
        <span style={dash}>—<br />—<br />—<br />—<br />—</span>
      </div>
    </>
  );
}
