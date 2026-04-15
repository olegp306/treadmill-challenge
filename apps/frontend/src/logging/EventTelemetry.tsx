import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { logEvent } from './logEvent';

const HEARTBEAT_MS = 30_000;

/** Logs screen_view on route change and heartbeat every 30s. */
export function EventTelemetry() {
  const location = useLocation();
  const pathRef = useRef<string>('');

  useEffect(() => {
    const path = `${location.pathname}${location.search || ''}`;
    if (pathRef.current === path) return;
    pathRef.current = path;
    logEvent('screen_view', { path: location.pathname, search: location.search || undefined });
  }, [location.pathname, location.search]);

  useEffect(() => {
    const id = window.setInterval(() => {
      logEvent('heartbeat', {});
    }, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
