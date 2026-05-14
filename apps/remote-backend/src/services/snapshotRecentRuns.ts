import { extractLocalSnapshot } from './remoteEnvelope.js';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

/** Same shape as `GET /api/admin/recent-runs` but derived from export snapshot. */
export function recentRunsFromEnvelope(root: unknown): {
  lastRegistration: { firstName: string; lastName: string; createdAt: string } | null;
  recentRuns: Array<{
    participant: string;
    raceType: string;
    result: { resultTime: number; distance: number; speed: number };
    createdAt: string;
  }>;
} {
  const snap = extractLocalSnapshot(root);
  if (!snap) return { lastRegistration: null, recentRuns: [] };

  const participants = Array.isArray(snap.participants) ? snap.participants : [];
  let lastReg: { firstName: string; lastName: string; createdAt: string } | null = null;
  for (const p of participants) {
    if (!isRecord(p)) continue;
    const createdAt = str(p.createdAt);
    if (!lastReg || createdAt > lastReg.createdAt) {
      lastReg = { firstName: str(p.firstName), lastName: str(p.lastName), createdAt };
    }
  }

  const competitions = Array.isArray(snap.competitions) ? snap.competitions : [];
  const compById = new Map<string, Record<string, unknown>>();
  for (const c of competitions) {
    if (!isRecord(c)) continue;
    const id = str(c.id);
    if (id) compById.set(id, c);
  }

  const partById = new Map<string, Record<string, unknown>>();
  for (const p of participants) {
    if (!isRecord(p)) continue;
    const id = str(p.id);
    if (id) partById.set(id, p);
  }

  const runs = Array.isArray(snap.runs) ? snap.runs : [];
  type Row = {
    createdAt: string;
    resultTime: number;
    distance: number;
    speed: number;
    runTypeKey: string;
    competitionTitle: string;
    participantName: string;
  };
  const rows: Row[] = [];
  for (const r of runs) {
    if (!isRecord(r)) continue;
    const pid = str(r.participantId);
    const p = partById.get(pid);
    const participantName = p ? `${str(p.firstName)} ${str(p.lastName)}`.trim() : '';
    const compId = str(r.competitionId);
    const c = compId ? compById.get(compId) : undefined;
    const runTypeKey = c ? str(c.runTypeKey) : '';
    const competitionTitle = c ? str(c.title) : '';
    rows.push({
      createdAt: str(r.createdAt),
      resultTime: Number(r.resultTime),
      distance: Number(r.distance),
      speed: Number(r.speed),
      runTypeKey,
      competitionTitle,
      participantName,
    });
  }
  rows.sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return 0;
  });
  const recentRuns = rows.slice(0, 5).map((r) => ({
    participant: r.participantName,
    raceType: r.runTypeKey || r.competitionTitle || 'unknown',
    result: { resultTime: r.resultTime, distance: r.distance, speed: r.speed },
    createdAt: r.createdAt,
  }));

  return { lastRegistration: lastReg, recentRuns };
}
