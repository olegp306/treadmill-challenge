import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeName } from '@treadmill-challenge/shared';
import { backupDir } from './backupMirrorScheduler.js';

export type RemoteLeaderboardEntry = {
  rank?: number;
  participantId: string;
  participantName: string;
  resultTime: number;
  distance: number;
  speed: number;
  runId: string;
  createdAt: string;
};

export type RemoteLeaderboardScopePayload = {
  scoped: true;
  runTypeId: RunTypeId;
  sex: Gender;
  runTypeName: string;
  competitionTitle: string | null;
  leaderboard: RemoteLeaderboardEntry[];
};

function speedFromTimeDistance(resultTime: number, distance: number): number {
  if (!Number.isFinite(resultTime) || resultTime <= 0 || !Number.isFinite(distance) || distance <= 0) return 0;
  return distance / resultTime;
}

/** Same ordering as `apps/backend/src/services/rankingService.ts` `compareRunResults`. */
function compareRunResults(
  a: Pick<FinishedRunRow, 'runTypeId' | 'resultTime' | 'resultDistance'>,
  b: Pick<FinishedRunRow, 'runTypeId' | 'resultTime' | 'resultDistance'>
): number {
  if (a.runTypeId !== b.runTypeId) return a.runTypeId - b.runTypeId;
  if (a.runTypeId === 0) {
    if (b.resultDistance !== a.resultDistance) return b.resultDistance - a.resultDistance;
    return a.resultTime - b.resultTime;
  }
  if (a.resultTime !== b.resultTime) return a.resultTime - b.resultTime;
  return b.resultDistance - a.resultDistance;
}

type FinishedRunRow = {
  runSessionId: string;
  participantId: string;
  participantFirstName: string;
  participantLastName: string;
  runTypeId: RunTypeId;
  resultTime: number;
  resultDistance: number;
  displayTime: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** `buildDataSnapshot` uses camelCase keys; older files may use snake_case. */
function snapshotArray(snapshot: Record<string, unknown>, camelKey: string, snakeKey: string): unknown[] {
  const camel = snapshot[camelKey];
  if (Array.isArray(camel)) return camel;
  const snake = snapshot[snakeKey];
  if (Array.isArray(snake)) return snake;
  return [];
}

function extractLocalSnapshot(root: unknown): Record<string, unknown> | null {
  if (!isRecord(root)) return null;
  const loc = root.local;
  if (isRecord(loc) && loc.snapshot != null && isRecord(loc.snapshot)) {
    return loc.snapshot as Record<string, unknown>;
  }
  if (Array.isArray(root.participants) && Array.isArray(root.runSessions)) {
    return root as Record<string, unknown>;
  }
  return null;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const CAROUSEL_ORDER: Array<{ runTypeId: RunTypeId; sex: Gender }> = [
  { runTypeId: 0, sex: 'male' },
  { runTypeId: 1, sex: 'male' },
  { runTypeId: 2, sex: 'male' },
  { runTypeId: 0, sex: 'female' },
  { runTypeId: 1, sex: 'female' },
  { runTypeId: 2, sex: 'female' },
];

function rankForScope(
  snapshot: Record<string, unknown>,
  runTypeId: RunTypeId,
  sex: Gender
): RemoteLeaderboardScopePayload {
  const participants = Array.isArray(snapshot.participants) ? snapshot.participants : [];
  const competitions = Array.isArray(snapshot.competitions) ? snapshot.competitions : [];
  const runSessions = snapshotArray(snapshot, 'runSessions', 'run_sessions');

  const participantById = new Map<string, { first: string; last: string }>();
  for (const p of participants) {
    if (!isRecord(p)) continue;
    const id = str(p.id);
    if (!id) continue;
    participantById.set(id, { first: str(p.firstName), last: str(p.lastName) });
  }

  const activeCompetitionIds = new Set<string>();
  let competitionTitle: string | null = null;
  for (const c of competitions) {
    if (!isRecord(c)) continue;
    if (str(c.status) !== 'active') continue;
    if (str(c.gender) !== sex) continue;
    if (num(c.runTypeId) !== runTypeId) continue;
    const id = str(c.id);
    if (!id) continue;
    activeCompetitionIds.add(id);
    if (!competitionTitle && str(c.title)) competitionTitle = str(c.title);
  }

  const rows: FinishedRunRow[] = [];
  for (const s of runSessions) {
    if (!isRecord(s)) continue;
    if (str(s.status) !== 'finished') continue;
    const compId = str(s.competitionId);
    if (!compId || !activeCompetitionIds.has(compId)) continue;
    if (num(s.runTypeId) !== runTypeId) continue;
    const sid = str(s.id);
    const pid = str(s.participantId);
    if (!sid || !pid) continue;
    const p = participantById.get(pid);
    if (!p) continue;
    const finishedAt = str(s.finishedAt);
    const createdAt = str(s.createdAt);
    const displayTime = finishedAt.trim() !== '' ? finishedAt : createdAt;
    rows.push({
      runSessionId: sid,
      participantId: pid,
      participantFirstName: p.first,
      participantLastName: p.last,
      runTypeId,
      resultTime: num(s.resultTime),
      resultDistance: num(s.resultDistance),
      displayTime,
    });
  }

  const rankedBestOrder = [...rows].sort(compareRunResults);
  const rankByRunSessionId = new Map<string, number>(rankedBestOrder.map((r, i) => [r.runSessionId, i + 1]));

  const leaderboard: RemoteLeaderboardEntry[] = rankedBestOrder.map((row) => {
    const participantName = `${row.participantFirstName} ${row.participantLastName}`.trim();
    const rt = row.runTypeId;
    const resultTime = row.resultTime;
    const resultDistance = row.resultDistance;
    return {
      rank: rankByRunSessionId.get(row.runSessionId) ?? 0,
      participantId: row.participantId,
      participantName,
      resultTime,
      distance: resultDistance,
      speed: speedFromTimeDistance(resultTime, resultDistance),
      runId: row.runSessionId,
      createdAt: row.displayTime,
    };
  });

  return {
    scoped: true,
    runTypeId,
    sex,
    runTypeName: getRunTypeName(runTypeId),
    competitionTitle,
    leaderboard,
  };
}

export type LeaderboardDataResult =
  | { ok: true; empty: false; lastBackupAt: string | null; scopes: RemoteLeaderboardScopePayload[] }
  | { ok: true; empty: true; lastBackupAt: string | null; message: string }
  | { ok: false; error: string };

export async function buildLeaderboardDataFromLatestBackup(): Promise<LeaderboardDataResult> {
  const fp = path.join(backupDir(), 'latest.json');
  let rawText: string;
  try {
    rawText = await readFile(fp, 'utf8');
  } catch {
    return { ok: true, empty: true, lastBackupAt: null, message: 'Данные пока недоступны' };
  }

  let root: unknown;
  try {
    root = JSON.parse(rawText) as unknown;
  } catch {
    return { ok: false, error: 'Некорректный JSON backup' };
  }

  const snap = extractLocalSnapshot(root);
  if (!snap) {
    return { ok: true, empty: true, lastBackupAt: null, message: 'Данные пока недоступны' };
  }

  let lastBackupAt: string | null = null;
  if (isRecord(root)) {
    const m = root.meta;
    if (isRecord(m) && typeof m.createdAt === 'string') lastBackupAt = m.createdAt;
  }

  const scopes = CAROUSEL_ORDER.map(({ runTypeId, sex }) => rankForScope(snap, runTypeId, sex));

  return { ok: true, empty: false, lastBackupAt, scopes };
}
