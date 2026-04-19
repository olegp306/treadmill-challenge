import { useLayoutEffect, useState, type ReactNode } from 'react';
import { td } from './tdTokens';

/**
 * Scales the fixed 2560×1120 composition to fit the viewport (letterboxed, no scroll).
 */
export function TdDisplayShell({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState({ scale: 1, topOffset: 0 });

  useLayoutEffect(() => {
    const update = () => {
      // External wide display priority: always occupy full viewport width.
      const scale = window.innerWidth / td.designW;
      const scaledH = td.designH * scale;
      const topOffset = Math.max(0, (window.innerHeight - scaledH) / 2);
      setLayout({ scale, topOffset });
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
        position: 'relative',
      }}
    >
      <div
        className="ar-ozio-ipad"
        style={{
          width: td.designW,
          height: td.designH,
          transform: `translateX(-50%) scale(${layout.scale})`,
          transformOrigin: 'top center',
          position: 'absolute',
          left: '50%',
          top: layout.topOffset,
          flexShrink: 0,
          color: '#ffffff',
        }}
      >
        {children}
      </div>
    </div>
  );
}
