import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/oswald/400.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';
import '@fontsource/oswald/700.css';
import App from './App';
import './index.css';

function setupKioskViewport(): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  let baseHeight = 0;

  const setAppMetrics = () => {
    const vv = window.visualViewport;
    const vvHeight = vv?.height ?? 0;
    const innerHeight = window.innerHeight;

    // Use the largest observed viewport height as stable app height.
    // This prevents full-canvas shrinking when iOS keyboard appears.
    const observed = Math.max(innerHeight, vvHeight);
    if (observed > baseHeight) {
      baseHeight = observed;
    }
    if (baseHeight <= 0) {
      baseHeight = observed || innerHeight || 0;
    }

    const keyboardHeight = Math.max(0, Math.round(baseHeight - vvHeight));
    root.style.setProperty('--app-height', `${Math.round(baseHeight * 100) / 100}px`);
    root.style.setProperty('--keyboard-inset', `${keyboardHeight}px`);
    root.classList.toggle('vk-open', keyboardHeight > 80);
  };

  setAppMetrics();
  window.addEventListener('resize', setAppMetrics, { passive: true });
  window.visualViewport?.addEventListener('resize', setAppMetrics, { passive: true });
  window.visualViewport?.addEventListener('scroll', setAppMetrics, { passive: true });
  window.addEventListener(
    'orientationchange',
    () => {
      // Re-capture baseline after rotation settles.
      window.setTimeout(() => {
        baseHeight = 0;
        setAppMetrics();
      }, 220);
    },
    { passive: true }
  );

  // iOS Safari: prevent pinch zoom (gesture events exist only on iOS).
  const prevent = (e: Event) => {
    e.preventDefault();
  };
  document.addEventListener('gesturestart', prevent, { passive: false });
  document.addEventListener('gesturechange', prevent, { passive: false });
  document.addEventListener('gestureend', prevent, { passive: false });

  // Prevent double-tap zoom.
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 350) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );
}

setupKioskViewport();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
