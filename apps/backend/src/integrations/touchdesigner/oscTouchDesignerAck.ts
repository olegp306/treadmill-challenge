import osc from 'osc';
import type { TreadmillStatus } from './types.js';

/** `osc` has no reliable TS export for UDPPort; keep minimal surface for listener lifecycle. */
type OscUdpPortLite = {
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  open: () => void;
};

/** TouchDesigner sends this OSC address to acknowledge treadmill free/busy after /treadmill/runSession start. */
const ackAddress = (process.env.TD_OSC_ACK_ADDRESS || '/treadmill/ack').trim();
const ackTimeoutMs = Math.max(500, Number(process.env.TD_OSC_ACK_TIMEOUT_MS || 8000));
const ackLocalPort = Number(process.env.TD_OSC_ACK_LOCAL_PORT || 7001);
const ackDisabled = ['1', 'true', 'yes'].includes((process.env.TD_OSC_ACK_DISABLED || '').toLowerCase());

let ackPort: OscUdpPortLite | null = null;
let ackListenerReady = false;
let ackBindError: Error | null = null;

type Waiter = {
  timeout: ReturnType<typeof setTimeout>;
  resolve: (v: TreadmillStatus) => void;
};

const pending = new Map<string, Waiter>();

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

function finishAck(runSessionId: string, status: TreadmillStatus): void {
  const w = pending.get(runSessionId);
  if (!w) return;
  clearTimeout(w.timeout);
  pending.delete(runSessionId);
  w.resolve(status);
}

function ensureAckListener(): void {
  if (ackDisabled || ackListenerReady || ackBindError) return;
  if (!Number.isFinite(ackLocalPort) || ackLocalPort <= 0 || ackLocalPort > 65535) {
    ackBindError = new Error('Invalid TD_OSC_ACK_LOCAL_PORT');
    console.error('[TouchDesigner OSC] ack listener:', ackBindError.message);
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
      if (addr !== normalizeOscAddress(ackAddress)) return;

      const args = Array.isArray(oscMsg.args) ? oscMsg.args : [];
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
        `[TouchDesigner OSC] ack <- ${addr} runSessionId=${runSessionId} status=${st} (local :${ackLocalPort})`
      );
      finishAck(runSessionId, st);
    });

    ackPort.on('error', (...errArgs: unknown[]) => {
      console.error('[TouchDesigner OSC] ack UDP error:', errArgs[0]);
    });

    ackPort.open();
    ackListenerReady = true;
    console.log(
      `[TouchDesigner OSC] ack listener on 0.0.0.0:${ackLocalPort} for ${ackAddress} args: (runSessionId:string, status:string) timeout=${ackTimeoutMs}ms`
    );
  } catch (e) {
    ackBindError = e instanceof Error ? e : new Error(String(e));
    console.error('[TouchDesigner OSC] failed to open ack listener:', ackBindError);
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

    const timeout = setTimeout(() => {
      const w = pending.get(runSessionId);
      if (!w) return;
      pending.delete(runSessionId);
      console.warn(
        `[TouchDesigner OSC] ack timeout for runSessionId=${runSessionId} after ${ackTimeoutMs}ms (expected ${ackAddress})`
      );
      resolve('unknown');
    }, ackTimeoutMs);

    pending.set(runSessionId, { timeout, resolve });
  });
}

export function getOscAckConfig(): { ackAddress: string; localPort: number; timeoutMs: number; disabled: boolean } {
  return {
    ackAddress,
    localPort: ackLocalPort,
    timeoutMs: ackTimeoutMs,
    disabled: ackDisabled,
  };
}
