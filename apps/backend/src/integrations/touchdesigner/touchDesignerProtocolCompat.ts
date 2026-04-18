import type { RunSessionResultDto } from '@treadmill-challenge/shared';
import type { TreadmillStatus } from './types.js';

/** Parsed TD unified runState OSC message (see TD_OSC_RUN_STATE_ADDRESS). */
export type RunStateOscParsed =
  | { kind: 'start'; runSessionId: string }
  | { kind: 'busy'; runSessionId: string }
  | { kind: 'stop'; dto: RunSessionResultDto }
  | { kind: 'invalid'; reason: string };

function argValue(arg: unknown): string {
  if (arg == null) return '';
  if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
  if (typeof arg === 'object' && arg !== null && 'value' in arg) {
    const v = (arg as { value: unknown }).value;
    return v == null ? '' : String(v);
  }
  return String(arg);
}

function argNumber(arg: unknown): number | null {
  if (arg == null) return null;
  if (typeof arg === 'number' && Number.isFinite(arg)) return arg;
  if (typeof arg === 'object' && arg !== null && 'value' in arg) {
    const v = (arg as { value: unknown }).value;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
  }
  if (typeof arg === 'string') {
    const n = Number(arg);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Map unified TouchDesigner `/treadmill/runState` OSC args to actions.
 * Expected: (runSessionId: s, state: s, resultTime?: f, distance?: f)
 */
export function parseRunStateOscArgs(args: unknown[]): RunStateOscParsed {
  const runSessionId = argValue(args[0]).trim();
  const stateRaw = argValue(args[1]).trim().toLowerCase();
  if (!runSessionId) {
    return { kind: 'invalid', reason: 'missing_runSessionId' };
  }
  if (stateRaw === 'start') {
    return { kind: 'start', runSessionId };
  }
  if (stateRaw === 'busy') {
    return { kind: 'busy', runSessionId };
  }
  if (stateRaw === 'stop') {
    const resultTime = argNumber(args[2]);
    const distance = argNumber(args[3]);
    if (resultTime == null || resultTime <= 0) {
      return { kind: 'invalid', reason: 'stop_requires_positive_resultTime' };
    }
    if (distance == null || distance < 0) {
      return { kind: 'invalid', reason: 'stop_requires_non_negative_distance' };
    }
    return {
      kind: 'stop',
      dto: { runSessionId, resultTime, distance },
    };
  }
  return { kind: 'invalid', reason: `unknown_state:${stateRaw}` };
}

/** Maps unified runState ack-style messages to treadmill status for existing promotion logic. */
export function runStateToTreadmillStatus(kind: 'start' | 'busy'): TreadmillStatus {
  return kind === 'start' ? 'free' : 'busy';
}
