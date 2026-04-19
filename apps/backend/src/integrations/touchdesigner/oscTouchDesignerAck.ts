import osc from 'osc';
import type { RunSessionResultDto } from '@treadmill-challenge/shared';
import { getDb, runSessions } from '../../db/index.js';
import type { TreadmillStatus } from './types.js';
import {
  parseRunStateOscArgs,
  runStateToTreadmillStatus,
  type RunStateOscParsed,
} from './touchDesignerProtocolCompat.js';

/** `osc` has no reliable TS export for UDPPort; keep minimal surface for listener lifecycle. */
type OscUdpPortLite = {
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  open: () => void;
};

/** TouchDesigner sends this OSC address to acknowledge treadmill free/busy after /treadmill/runSession start. */
const ackAddress = (process.env.TD_OSC_ACK_ADDRESS || '/treadmill/ack').trim();
/** Optional unified channel: start | busy | stop (stop includes result metrics). */
const runStateAddress = (process.env.TD_OSC_RUN_STATE_ADDRESS || '/treadmill/runState').trim();
const runStateDisabled = ['1', 'true', 'yes'].includes((process.env.TD_OSC_RUN_STATE_DISABLED || '').toLowerCase());

const ackTimeoutMs = Math.max(500, Number(process.env.TD_OSC_ACK_TIMEOUT_MS || 30_000));
const ackLocalPort = Number(process.env.TD_OSC_ACK_LOCAL_PORT || 7001);
const ackDisabled = ['1', 'true', 'yes'].includes((process.env.TD_OSC_ACK_DISABLED || '').toLowerCase());

/**
 * After waiting for TD response: `busy` = session stays queued (забег недоступен).
 * `unknown` = legacy: same as before timeout resolved to unknown (may still promote if ack !== busy).
 */
const ackTimeoutResolvesTo = (process.env.TD_OSC_ACK_TIMEOUT_RESOLVES_TO || 'busy').trim().toLowerCase();

let ackPort: OscUdpPortLite | null = null;
let ackListenerReady = false;
let ackBindError: Error | null = null;

type Waiter = {
  timeout: ReturnType<typeof setTimeout>;
  resolve: (v: TreadmillStatus) => void;
};

const pending = new Map<string, Waiter>();

/** Async finish from OSC runState stop — registered at process startup. */
let submitRunResultFromOsc: ((dto: RunSessionResultDto) => Promise<void>) | null = null;

export function registerTouchDesignerOscRunResultHandler(fn: (dto: RunSessionResultDto) => Promise<void>): void {
  submitRunResultFromOsc = fn;
}

function parseTreadmillStatus(raw: string): TreadmillStatus | null {
  const s = raw.trim().toLowerCase();
  if (s === 'free' || s === '1' || s === 'true' || s === 'f') return 'free';
  if (s === 'busy' || s === '0' || s === 'false' || s === 'b') return 'busy';
  return null;
}

function argValue(arg: unknown): string {
  if (arg == null) return '';
  if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
  if (typeof arg === 'object' && arg !== null && 'value' in arg) {
    const v = (arg as { value: unknown }).value;
    return v == null ? '' : String(v);
  }
  return String(arg);
}

function normalizeOscAddress(addr: string): string {
  const a = addr.trim();
  return a.startsWith('/') ? a : `/${a}`;
}

function timeoutResolutionStatus(): TreadmillStatus {
  if (ackTimeoutResolvesTo === 'unknown') return 'unknown';
  if (ackTimeoutResolvesTo === 'free') return 'free';
  return 'busy';
}

function resolvePendingHandshake(runSessionId: string, status: TreadmillStatus, source: string): void {
  const w = pending.get(runSessionId);
  if (!w) return;
  clearTimeout(w.timeout);
  pending.delete(runSessionId);
  console.log(
    `[TouchDesigner OSC] handshake resolved runSessionId=${runSessionId} status=${status} source=${source}`
  );
  w.resolve(status);
}

function handleRunStateMessage(args: unknown[], normalizedAddr: string): void {
  if (runStateDisabled) return;

  const parsed: RunStateOscParsed = parseRunStateOscArgs(Array.isArray(args) ? args : []);
  if (parsed.kind === 'invalid') {
    console.warn(
      `[TouchDesigner OSC] runState <- ${normalizedAddr} ignored (${parsed.reason}) args=${JSON.stringify(args)}`
    );
    return;
  }

  if (parsed.kind === 'start') {
    console.log(
      `[TouchDesigner OSC] runState <- ${normalizedAddr} state=start runSessionId=${parsed.runSessionId} (accept runner)`
    );
    resolvePendingHandshake(parsed.runSessionId, runStateToTreadmillStatus('start'), 'runState_start');
    return;
  }

  if (parsed.kind === 'busy') {
    console.log(
      `[TouchDesigner OSC] runState <- ${normalizedAddr} state=busy runSessionId=${parsed.runSessionId} (treadmill unavailable)`
    );
    resolvePendingHandshake(parsed.runSessionId, runStateToTreadmillStatus('busy'), 'runState_busy');
    return;
  }

  console.log(
    `[TouchDesigner OSC] runState <- ${normalizedAddr} state=stop runSessionId=${parsed.dto.runSessionId} resultTime=${parsed.dto.resultTime} distance=${parsed.dto.distance}`
  );
  console.log(
    JSON.stringify({
      msg: 'td_runstate_stop_received',
      runSessionId: parsed.dto.runSessionId,
      resultTime: parsed.dto.resultTime,
      distance: parsed.dto.distance,
      ts: new Date().toISOString(),
    })
  );

  const handler = submitRunResultFromOsc;
  if (!handler) {
    console.error('[TouchDesigner OSC] runState stop: submit handler not registered (server bug)');
    return;
  }

  const db = getDb();
  const session = runSessions.getRunSessionById(db, parsed.dto.runSessionId.trim());
  if (!session) {
    console.warn(`[TouchDesigner OSC] runState stop: run session not found ${parsed.dto.runSessionId}`);
    return;
  }
  if (session.status !== 'running') {
    console.warn(
      `[TouchDesigner OSC] runState stop ignored: expected status running, got ${session.status} runSessionId=${parsed.dto.runSessionId}`
    );
    return;
  }

  void handler(parsed.dto).catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[TouchDesigner OSC] runState stop submit failed: ${msg}`, e);
  });
}

function handleLegacyAckMessage(args: unknown[], normalizedAddr: string): void {
  const runSessionId = argValue(args[0]).trim();
  const statusRaw = argValue(args[1]);
  if (!runSessionId) return;

  const st = parseTreadmillStatus(statusRaw);
  if (!st) {
    console.warn(
      `[TouchDesigner OSC] ack ignored (bad status): runSessionId=${runSessionId} raw=${JSON.stringify(statusRaw)}`
    );
    return;
  }

  if (!pending.has(runSessionId)) {
    console.warn(`[TouchDesigner OSC] ack received for unknown runSessionId (no waiter): ${runSessionId}`);
    return;
  }

  console.log(
    `[TouchDesigner OSC] ack <- ${normalizedAddr} runSessionId=${runSessionId} status=${st} (local :${ackLocalPort})`
  );
  resolvePendingHandshake(runSessionId, st, 'legacy_ack');
}

function ensureAckListener(): void {
  if (ackDisabled || ackListenerReady || ackBindError) return;
  if (!Number.isFinite(ackLocalPort) || ackLocalPort <= 0 || ackLocalPort > 65535) {
    ackBindError = new Error('Invalid TD_OSC_ACK_LOCAL_PORT');
    console.error('[TouchDesigner OSC] inbound listener:', ackBindError.message);
    return;
  }

  try {
    ackPort = new osc.UDPPort({
      localAddress: '0.0.0.0',
      localPort: ackLocalPort,
      metadata: true,
    }) as OscUdpPortLite;

    ackPort.on('message', (...oscArgs: unknown[]) => {
      const oscMsg = oscArgs[0] as { address?: string; args?: unknown[] };
      const addr = normalizeOscAddress(String(oscMsg.address ?? ''));
      const args = Array.isArray(oscMsg.args) ? oscMsg.args : [];

      if (addr === normalizeOscAddress(ackAddress)) {
        handleLegacyAckMessage(args, addr);
        return;
      }
      if (!runStateDisabled && addr === normalizeOscAddress(runStateAddress)) {
        handleRunStateMessage(args, addr);
        return;
      }
    });

    ackPort.on('error', (...errArgs: unknown[]) => {
      console.error('[TouchDesigner OSC] inbound UDP error:', errArgs[0]);
    });

    ackPort.open();
    ackListenerReady = true;
    const rs = runStateDisabled ? '(disabled)' : runStateAddress;
    console.log(
      `[TouchDesigner OSC] inbound listener on 0.0.0.0:${ackLocalPort} ack=${ackAddress} runState=${rs} timeout=${ackTimeoutMs}ms resolvesTo=${ackTimeoutResolvesTo}`
    );
  } catch (e) {
    ackBindError = e instanceof Error ? e : new Error(String(e));
    console.error('[TouchDesigner OSC] failed to open inbound listener:', ackBindError);
  }
}

/**
 * Register a waiter for this runSessionId before sending OSC start, then await the returned promise.
 */
export function waitForTreadmillAck(runSessionId: string): Promise<TreadmillStatus> {
  if (ackDisabled) {
    return Promise.resolve('unknown');
  }

  ensureAckListener();
  if (ackBindError || !ackListenerReady) {
    return Promise.resolve('unknown');
  }

  return new Promise<TreadmillStatus>((resolve) => {
    const existing = pending.get(runSessionId);
    if (existing) {
      clearTimeout(existing.timeout);
      pending.delete(runSessionId);
    }

    const statusOnTimeout = timeoutResolutionStatus();
    const timeout = setTimeout(() => {
      const w = pending.get(runSessionId);
      if (!w) return;
      pending.delete(runSessionId);
      console.warn(
        `[TouchDesigner OSC] TD handshake timeout runSessionId=${runSessionId} after ${ackTimeoutMs}ms — resolving as ${statusOnTimeout} (integration may be unavailable; use /treadmill/ack or /treadmill/runState start|busy)`
      );
      resolve(statusOnTimeout);
    }, ackTimeoutMs);

    pending.set(runSessionId, { timeout, resolve });
  });
}

export function getOscAckConfig(): {
  ackAddress: string;
  runStateAddress: string;
  runStateDisabled: boolean;
  localPort: number;
  timeoutMs: number;
  disabled: boolean;
  timeoutResolvesTo: string;
} {
  return {
    ackAddress,
    runStateAddress,
    runStateDisabled,
    localPort: ackLocalPort,
    timeoutMs: ackTimeoutMs,
    disabled: ackDisabled,
    timeoutResolvesTo: ackTimeoutResolvesTo,
  };
}
