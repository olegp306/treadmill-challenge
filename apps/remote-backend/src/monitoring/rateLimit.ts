import type { HealthPayload } from './healthSchema.js';
import { healthKey } from './severity.js';

type RateState = { lastAcceptedAtMs: number };

const byKey = new Map<string, RateState>();

export function checkRateLimit(payload: Pick<HealthPayload, 'projectId' | 'locationId' | 'deviceId'>, nowMs: number, minIntervalMs: number):
  | { ok: true }
  | { ok: false; retryAfterSec: number } {
  const key = healthKey(payload);
  const s = byKey.get(key);
  if (s && nowMs - s.lastAcceptedAtMs < minIntervalMs) {
    const retryAfterMs = minIntervalMs - (nowMs - s.lastAcceptedAtMs);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  byKey.set(key, { lastAcceptedAtMs: nowMs });
  return { ok: true };
}

