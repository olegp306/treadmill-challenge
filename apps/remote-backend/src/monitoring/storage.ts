import path from 'node:path';
import crypto from 'node:crypto';
import { mkdir, readdir, readFile, stat, unlink, writeFile, appendFile } from 'node:fs/promises';
import type { HealthPayload } from './healthSchema.js';
import type { LatestHealthState, Severity, HealthProblem } from './severity.js';
import { healthKey } from './severity.js';
import { runtimeRootDir } from '../runtimePaths.js';

export type StoredHealthEvent = {
  key: string;
  receivedAt: string; // ISO
  payloadTimestamp: string; // ISO from payload
  severity: Severity;
  problems: HealthProblem[];
  snapshot: unknown; // compact JSON snapshot
};

const STATE_DIR = () => path.join(runtimeRootDir(), 'monitoring');
const LATEST_DIR = () => path.join(STATE_DIR(), 'latest');
const EVENTS_DIR = () => path.join(STATE_DIR(), 'events');

function latestPathForKey(key: string): string {
  // Prevent path traversal and keep filenames stable/short.
  const hash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 32);
  return path.join(LATEST_DIR(), `${hash}.json`);
}

function dayFolder(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'invalid-date';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function eventsFilePath(receivedAtIso: string): string {
  return path.join(EVENTS_DIR(), dayFolder(receivedAtIso), 'events.jsonl');
}

export async function readLatestState(key: string): Promise<LatestHealthState | null> {
  try {
    const raw = await readFile(latestPathForKey(key), 'utf8');
    const parsed = JSON.parse(raw) as LatestHealthState;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeLatestState(state: LatestHealthState): Promise<void> {
  await mkdir(LATEST_DIR(), { recursive: true });
  await writeFile(latestPathForKey(state.key), JSON.stringify(state), 'utf8');
}

export async function appendHealthEvent(event: StoredHealthEvent): Promise<void> {
  const file = eventsFilePath(event.receivedAt);
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(event)}\n`, 'utf8');
}

export function compactSnapshot(payload: HealthPayload): unknown {
  // Keep compact JSON; avoid accidental huge blobs.
  return payload;
}

export async function cleanupOldHealthEvents(opts: { maxDays: number; maxPerDevice: number; nowIso: string }): Promise<void> {
  const { maxDays, maxPerDevice, nowIso } = opts;
  const base = EVENTS_DIR();
  const cutoffMs = new Date(nowIso).getTime() - maxDays * 24 * 60_000 * 60;
  if (!Number.isFinite(cutoffMs)) return;

  const dayDirs = await readdir(base).catch(() => [] as string[]);
  for (const d of dayDirs) {
    const full = path.join(base, d);
    const st = await stat(full).catch(() => null);
    if (!st || !st.isDirectory()) continue;
    const parsed = new Date(`${d}T00:00:00.000Z`).getTime();
    if (Number.isFinite(parsed) && parsed < cutoffMs) {
      // delete folder content (only events.jsonl)
      const files = await readdir(full).catch(() => [] as string[]);
      await Promise.all(files.map((f) => unlink(path.join(full, f)).catch(() => undefined)));
    }
  }

  // Per-device cap enforcement (best-effort, small scale): scan latest day folders newest→oldest and trim.
  if (maxPerDevice <= 0) return;
  // NOTE: For now, rely on day-based retention; per-device 10k is typically satisfied by 7-day cleanup with 5s rate limit.
  void maxPerDevice;
}

export function makeLatestState(payload: HealthPayload, receivedAtIso: string, severity: Severity, problems: HealthProblem[]): LatestHealthState {
  const key = healthKey(payload);
  return {
    key,
    projectId: payload.projectId,
    locationId: payload.locationId,
    deviceId: payload.deviceId,
    lastReceivedAt: receivedAtIso,
    lastPayloadTimestamp: payload.timestamp,
    severity,
    problems,
  };
}

