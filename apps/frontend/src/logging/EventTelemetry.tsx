import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { logEvent } from './logEvent';
import { getScreenReadableMessage } from './screenPathLabels';

const DEFAULT_HEARTBEAT_INTERVAL_MIN = 5;

/** Logs screen_view on route change and heartbeat using server-configured interval. */
export function EventTelemetry() {
  const location = useLocation();
  const pathRef = useRef<string>('');
  const [heartbeatIntervalMin, setHeartbeatIntervalMin] = useState(DEFAULT_HEARTBEAT_INTERVAL_MIN);

  useEffect(() => {
    let cancelled = false;
    void api
      .getPublicSettings()
      .then((s) => {
        if (cancelled) return;
        setHeartbeatIntervalMin(s.heartbeatIntervalMin ?? DEFAULT_HEARTBEAT_INTERVAL_MIN);
      })
      .catch(() => {
        if (cancelled) return;
        setHeartbeatIntervalMin(DEFAULT_HEARTBEAT_INTERVAL_MIN);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    const heartbeatMs = heartbeatIntervalMin * 60_000;
    const id = window.setInterval(() => {
      logEvent('heartbeat', {}, { readableMessage: 'Сессия активна (пульс)' });
    }, heartbeatMs);
    return () => window.clearInterval(id);
  }, [heartbeatIntervalMin]);

  return null;
}
