import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { logEvent } from './logEvent';
import { getScreenReadableMessage } from './screenPathLabels';

const HEARTBEAT_MS = 30_000;

/** Logs screen_view on route change and heartbeat every 30s. */
export function EventTelemetry() {
  const location = useLocation();
  const pathRef = useRef<string>('');

  useEffect(() => {
    const path = `${location.pathname}${location.search || ''}`;
    if (pathRef.current === path) return;
    pathRef.current = path;
    const readableMessage = getScreenReadableMessage(location.pathname, location.search || '');
    logEvent(
      'screen_view',
      { path: location.pathname, search: location.search || undefined },
      { readableMessage }
    );
  }, [location.pathname, location.search]);

  useEffect(() => {
    const id = window.setInterval(() => {
      logEvent('heartbeat', {}, { readableMessage: 'Сессия активна (пульс)' });
    }, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
