import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

const DEFAULT_INACTIVITY_TIMEOUT_SEC = 120;

function normalizeTimeoutSec(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_INACTIVITY_TIMEOUT_SEC;
  return Math.min(3600, Math.max(15, Math.floor(n)));
}

type UseInactivityResetOptions = {
  enabled?: boolean;
  onTimeout: () => void;
};

/**
 * Shared inactivity timer for explicitly selected screens.
 * Reads timeout from public settings (in seconds), falls back to 120.
 */
export function useInactivityReset(options: UseInactivityResetOptions): { timeoutSec: number } {
  const { enabled = true, onTimeout } = options;
  const [timeoutSec, setTimeoutSec] = useState(DEFAULT_INACTIVITY_TIMEOUT_SEC);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void api
      .getPublicSettings()
      .then((settings) => {
        if (cancelled) return;
        setTimeoutSec(normalizeTimeoutSec(settings.inactivityTimeoutSec));
      })
      .catch(() => {
        if (cancelled) return;
        setTimeoutSec(DEFAULT_INACTIVITY_TIMEOUT_SEC);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const timeoutMs = timeoutSec * 1000;
    let timer: number | null = null;
    const clear = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };
    const reset = () => {
      clear();
      timer = window.setTimeout(() => {
        onTimeoutRef.current();
      }, timeoutMs);
    };

    const events: Array<keyof WindowEventMap> = [
      'touchstart',
      'pointerdown',
      'click',
      'keydown',
      'input',
      'change',
    ];
    events.forEach((eventName) => window.addEventListener(eventName, reset, { passive: true }));
    reset();
    return () => {
      clear();
      events.forEach((eventName) => window.removeEventListener(eventName, reset));
    };
  }, [enabled, timeoutSec]);

  return { timeoutSec };
}
