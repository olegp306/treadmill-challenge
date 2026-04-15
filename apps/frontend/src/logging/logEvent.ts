const SESSION_KEY = 'appLogSessionId';
const PARTICIPANT_KEY = 'participantId';
const RUN_SESSION_KEY = 'runSessionId';

const SENSITIVE_KEYS = new Set([
  'phone',
  'password',
  'token',
  'pin',
  'authorization',
  'creditCard',
  'ssn',
]);

export type LogEventOptions = {
  participantId?: string | null;
  runSessionId?: string | null;
  /** Russian summary for operators (stored separately from payload). */
  readableMessage?: string;
};

export function getOrCreateLogSessionId(): string {
  if (typeof sessionStorage === 'undefined') return 'ssr-unknown';
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function setLoggedParticipantId(participantId: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(PARTICIPANT_KEY, participantId);
}

export function setLoggedRunSessionId(runSessionId: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(RUN_SESSION_KEY, runSessionId);
}

export function clearLoggedRunSessionId(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(RUN_SESSION_KEY);
}

function readStoredParticipantId(): string | undefined {
  if (typeof sessionStorage === 'undefined') return undefined;
  return sessionStorage.getItem(PARTICIPANT_KEY) ?? undefined;
}

function readStoredRunSessionId(): string | undefined {
  if (typeof sessionStorage === 'undefined') return undefined;
  return sessionStorage.getItem(RUN_SESSION_KEY) ?? undefined;
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'readableMessage') continue;
    const keyLower = k.toLowerCase();
    if (SENSITIVE_KEYS.has(keyLower) || keyLower.includes('phone')) {
      out[k] = '[redacted]';
      continue;
    }
    if (typeof v === 'string' && v.length > 200) {
      out[k] = `${v.slice(0, 200)}…`;
      continue;
    }
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = sanitizePayload(v as Record<string, unknown>);
      continue;
    }
    out[k] = v;
  }
  return out;
}

/**
 * Fire-and-forget client analytics / debug event. Does not throw.
 * Structured payload is sanitized; readableMessage is sent as-is for operator display.
 */
export function logEvent(
  type: string,
  payload: Record<string, unknown> = {},
  opts?: LogEventOptions
): void {
  const sessionId = getOrCreateLogSessionId();
  const participantId = opts?.participantId ?? readStoredParticipantId();
  const runSessionId = opts?.runSessionId ?? readStoredRunSessionId();
  const safe = sanitizePayload(payload);
  const readableMessage = opts?.readableMessage?.trim() ?? '';
  void fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      payload: safe,
      sessionId,
      ...(readableMessage ? { readableMessage } : {}),
      ...(participantId ? { participantId } : {}),
      ...(runSessionId ? { runSessionId } : {}),
    }),
  }).catch(() => {});
}
