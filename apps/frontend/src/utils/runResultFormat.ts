import type { RunTypeId } from '@treadmill-challenge/shared';

const KNOWN_INVALID_TIME_VALUES = [166.39, 9999];
/** DB/JSON float noise around the legacy sentinel time (seconds). */
const SENTINEL_TIME_EPS = 1e-3;
const INVALID_TIME_PLACEHOLDER = '--:--';

function isMmSsString(value: string): boolean {
  return /^\d{1,3}:[0-5]\d$/.test(value.trim());
}

/** True for known legacy invalid time placeholders and close floats / numeric strings. */
export function isInvalidSentinelResultTime(value: unknown): boolean {
  const n = typeof value === 'string' ? Number.parseFloat(value.trim()) : Number(value);
  if (!Number.isFinite(n)) return false;
  return KNOWN_INVALID_TIME_VALUES.some((sentinel) => Math.abs(n - sentinel) <= SENTINEL_TIME_EPS);
}

export function formatTimeResult(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '--';
  if (value < 0) return '--';
  if (value === 0) return '0:00';
  if (isInvalidSentinelResultTime(value)) return INVALID_TIME_PLACEHOLDER;
  const t = Math.round(value);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatTimeResultMmSs(sec: number | string | null | undefined): string {
  if (sec == null) return '--';
  if (typeof sec === 'string') {
    const raw = sec.trim();
    if (!raw) return '--';
    if (isMmSsString(raw)) return raw;
    const n = Number(raw);
    if (!Number.isFinite(n)) return '--';
    return formatTimeResult(n);
  }
  return formatTimeResult(sec);
}

export function formatRunResult(
  runTypeId: RunTypeId,
  resultTime: number | string | null | undefined,
  resultDistance: number | null | undefined
): string {
  if (runTypeId === 0) {
    if (resultDistance == null || !Number.isFinite(resultDistance)) return '—';
    return `${Math.round(resultDistance)} м`;
  }
  return formatTimeResultMmSs(resultTime);
}
