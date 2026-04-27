import type { RunTypeId } from '@treadmill-challenge/shared';

const KNOWN_INVALID_TIME_VALUE = 166.39;

function isMmSsString(value: string): boolean {
  return /^\d{1,3}:[0-5]\d$/.test(value.trim());
}

function isKnownInvalidTimeValue(value: number): boolean {
  return Math.abs(value - KNOWN_INVALID_TIME_VALUE) < 1e-9;
}

export function formatTimeResult(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '--';
  if (value < 0) return '--';
  if (value === 0) return '0:00';
  if (isKnownInvalidTimeValue(value)) return '--:--';
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
  return formatTimeResult(resultTime);
}
