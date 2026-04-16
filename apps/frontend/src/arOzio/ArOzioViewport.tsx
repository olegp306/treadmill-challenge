import type { ReactNode } from 'react';
import { useLayoutEffect, useRef } from 'react';

export function ArOzioViewport({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const supportsCq = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('width: 1cqw');

    const applyVars = () => {
      // If browser supports container query units, we can use them directly.
      if (supportsCq) {
        el.style.setProperty('--ar-cqw', '1cqw');
        el.style.setProperty('--ar-cqh', '1cqh');
        return;
      }
      // Fallback: calculate “1% of canvas size” in pixels.
      const r = el.getBoundingClientRect();
      const cqwPx = r.width / 100;
      const cqhPx = r.height / 100;
      el.style.setProperty('--ar-cqw', `${cqwPx}px`);
      el.style.setProperty('--ar-cqh', `${cqhPx}px`);
    };

    applyVars();

    // Keep vars updated on rotation/resize.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => applyVars()) : null;
    ro?.observe(el);
    const onResize = () => applyVars();
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <main className="ar-ozio-ipad ar-ozio-ipad-viewport">
      <div ref={canvasRef} className="ar-ozio-ipad-canvas">
        {children}
      </div>
    </main>
  );
}
