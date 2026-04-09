import type { ReactNode } from 'react';

export function ArOzioViewport({ children }: { children: ReactNode }) {
  return (
    <main className="ar-ozio-ipad ar-ozio-ipad-viewport">
      <div className="ar-ozio-ipad-canvas">{children}</div>
    </main>
  );
}
