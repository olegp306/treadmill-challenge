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

  const setAppHeight = () => {
    const vv = window.visualViewport;
    // Prefer visualViewport height to avoid 100vh issues on iOS (keyboard, toolbars).
    const h = Math.round((vv?.height ?? window.innerHeight) * 100) / 100;
    root.style.setProperty('--app-height', `${h}px`);
  };

  setAppHeight();
  window.addEventListener('resize', setAppHeight, { passive: true });
  window.visualViewport?.addEventListener('resize', setAppHeight, { passive: true });
  window.visualViewport?.addEventListener('scroll', setAppHeight, { passive: true });

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
