import { useLayoutEffect, useState, type ReactNode } from 'react';
import { td } from './tdTokens';

/**
 * Scales the fixed 2560×1120 composition to fit the viewport (letterboxed, no scroll).
 */
export function TdDisplayShell({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const update = () => {
      const sx = window.innerWidth / td.designW;
      const sy = window.innerHeight / td.designH;
      setScale(Math.min(sx, sy));
    };
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: td.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="ar-ozio-ipad"
        style={{
          width: td.designW,
          height: td.designH,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          position: 'relative',
          flexShrink: 0,
          color: '#ffffff',
        }}
      >
        {children}
      </div>
    </div>
  );
}
