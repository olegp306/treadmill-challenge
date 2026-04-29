import { collectHealthStatusPayload } from './healthAggregator.js';

type Log = {
  info: (obj: Record<string, unknown>) => void;
  warn: (obj: Record<string, unknown>) => void;
  error: (obj: Record<string, unknown>) => void;
};

export type HealthPushSchedulerHandle = {
  enabled: boolean;
  stop: () => void;
};

const DEFAULT_INTERVAL_MS = 15_000;
const DEFAULT_TIMEOUT_MS = 5_000;

function parseIntervalMs(): number {
  const raw = Number(process.env.HEALTH_PUSH_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
  if (!Number.isFinite(raw)) return DEFAULT_INTERVAL_MS;
  return Math.max(1_000, Math.floor(raw));
}

function parseTimeoutMs(): number {
  const raw = Number(process.env.HEALTH_PUSH_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(raw)) return DEFAULT_TIMEOUT_MS;
  return Math.max(500, Math.floor(raw));
}

export function startHealthPushScheduler(log: Log): HealthPushSchedulerHandle {
  const url = process.env.HEALTH_PUSH_URL?.trim();
  if (!url) {
    log.info({ msg: 'health_push_disabled', reason: 'HEALTH_PUSH_URL is not set' });
    return {
      enabled: false,
      stop: () => {},
    };
  }

  const intervalMs = parseIntervalMs();
  const timeoutMs = parseTimeoutMs();
  const authToken = process.env.HEALTH_PUSH_AUTH_TOKEN?.trim();
  let timer: ReturnType<typeof setInterval> | null = null;
  let pushing = false;

  const pushOnce = async () => {
    if (pushing) return;
    pushing = true;
    const startedAt = Date.now();
    try {
      const payload = await collectHealthStatusPayload();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        log.info({
          msg: 'health_push_ok',
          url,
          statusCode: response.status,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - startedAt,
        });
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      log.warn({
        msg: 'health_push_failed',
        url,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      pushing = false;
    }
  };

  void pushOnce();
  timer = setInterval(() => {
    void pushOnce();
  }, intervalMs);

  log.info({
    msg: 'health_push_started',
    url,
    intervalMs,
    timeoutMs,
    authEnabled: Boolean(authToken),
  });

  return {
    enabled: true,
    stop: () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}
