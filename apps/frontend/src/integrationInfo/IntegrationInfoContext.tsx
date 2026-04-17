import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';
import { defaultAutoHideMs, type IntegrationPhase } from './integrationPhases';

export type ReportOptions = {
  /** Override default auto-hide duration for this phase (ms). `0` = no auto-hide. */
  autoHideMs?: number | null;
};

type IntegrationInfoContextValue = {
  /** Admin toggle + loaded successfully */
  bannersEnabled: boolean;
  tdDemoMode: boolean;
  loaded: boolean;
  phase: IntegrationPhase;
  report: (phase: IntegrationPhase, opts?: ReportOptions) => void;
  clearPhase: () => void;
};

const IntegrationInfoContext = createContext<IntegrationInfoContextValue | null>(null);

export function IntegrationInfoProvider({ children }: { children: ReactNode }) {
  const [bannersEnabled, setBannersEnabled] = useState(false);
  const [tdDemoMode, setTdDemoMode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<IntegrationPhase>('idle');
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .getPublicSettings()
      .then((s) => {
        if (cancelled) return;
        setBannersEnabled(Boolean(s.showIntegrationInfoMessages));
        setTdDemoMode(Boolean(s.tdDemoMode));
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setBannersEnabled(false);
        setTdDemoMode(false);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const clearPhase = useCallback(() => {
    clearHideTimer();
    setPhase('idle');
  }, [clearHideTimer]);

  const report = useCallback(
    (next: IntegrationPhase, opts?: ReportOptions) => {
      if (!bannersEnabled && next !== 'idle') return;
      clearHideTimer();
      if (next === 'idle') {
        setPhase('idle');
        return;
      }
      setPhase(next);
      let ms: number | null;
      if (opts?.autoHideMs !== undefined && opts.autoHideMs !== null) {
        ms = opts.autoHideMs > 0 ? opts.autoHideMs : null;
      } else {
        ms = defaultAutoHideMs(next);
      }
      if (ms != null && ms > 0) {
        const id = window.setTimeout(() => {
          setPhase('idle');
          hideTimerRef.current = null;
        }, ms);
        hideTimerRef.current = id;
      }
    },
    [bannersEnabled, clearHideTimer]
  );

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  useEffect(() => {
    if (!bannersEnabled) {
      clearHideTimer();
      setPhase('idle');
    }
  }, [bannersEnabled, clearHideTimer]);

  const value = useMemo(
    () => ({
      bannersEnabled,
      tdDemoMode,
      loaded,
      phase,
      report,
      clearPhase,
    }),
    [bannersEnabled, tdDemoMode, loaded, phase, report, clearPhase]
  );

  return <IntegrationInfoContext.Provider value={value}>{children}</IntegrationInfoContext.Provider>;
}

export function useIntegrationInfo(): IntegrationInfoContextValue {
  const ctx = useContext(IntegrationInfoContext);
  if (!ctx) {
    throw new Error('useIntegrationInfo must be used within IntegrationInfoProvider');
  }
  return ctx;
}

/** Safe for optional use outside provider (returns no-op). */
export function useIntegrationInfoOptional(): IntegrationInfoContextValue | null {
  return useContext(IntegrationInfoContext);
}
