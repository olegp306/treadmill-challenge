import type { Gender, RunSession, RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeById, isRunTypeId, runTypeKeyStringToId } from '@treadmill-challenge/shared';
import { extractLocalSnapshot } from './remoteEnvelope.js';

const STATUSES = ['queued', 'running', 'finished', 'cancelled'] as const;
type RunSessionStatus = (typeof STATUSES)[number];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseStatus(v: string): RunSessionStatus {
  if ((STATUSES as readonly string[]).includes(v)) return v as RunSessionStatus;
  return 'queued';
}

function rowToSession(row: Record<string, unknown>): RunSession {
  let runTypeId = Number(row.runTypeId);
  const runTypeStr = String(row.runType ?? '');
  if (!isRunTypeId(runTypeId)) {
    const mapped = runTypeKeyStringToId(runTypeStr);
    runTypeId = mapped ?? 0;
  }
  const cfg = getRunTypeById(runTypeId);
  return {
    id: row.id as string,
    participantId: row.participantId as string,
    competitionId: String(row.competitionId ?? ''),
    runTypeId: runTypeId as RunTypeId,
    runType: (cfg?.key ?? 'max_5_min') as RunSession['runType'],
    status: parseStatus(row.status as string) as RunSession['status'],
    queueNumber: Number.isFinite(Number(row.queueNumber)) ? Number(row.queueNumber) : 0,
    resultTime: row.resultTime != null ? Number(row.resultTime) : null,
    resultDistance: row.resultDistance != null ? Number(row.resultDistance) : null,
    createdAt: row.createdAt as string,
    startedAt: (row.startedAt as string) || null,
    finishedAt: (row.finishedAt as string) || null,
  };
}

function displayTimeForHistoryRow(status: 'queued' | 'running' | 'finished', s: RunSession): string {
  if (status === 'finished') {
    const f = s.finishedAt?.trim();
    return f && f.length > 0 ? f : s.createdAt;
  }
  if (status === 'running') {
    const st = s.startedAt?.trim();
    return st && st.length > 0 ? st : s.createdAt;
  }
  return s.createdAt;
}

export type SnapshotQueueEntry = {
  runSessionId: string;
  queueNumber: number;
  participantId: string;
  participantName: string;
  participantFirstName: string;
  participantLastName: string;
  participantPhone: string;
  sex: string;
  runTypeId: number;
  runType: string;
  status: 'queued' | 'running' | 'finished';
  competitionId: string;
  displayTime: string;
  resultTime: number | null;
  resultDistance: number | null;
};

type ActiveQueueRow = {
  runSession: RunSession;
  participantName: string;
  participantFirstName: string;
  participantLastName: string;
  participantPhone: string;
  sex: Gender;
};

type ManagerQueueHistoryRow = {
  runSessionId: string;
  queueNumber: number;
  participantId: string;
  participantName: string;
  participantFirstName: string;
  participantLastName: string;
  participantPhone: string;
  sex: Gender;
  runTypeId: RunTypeId;
  runType: string;
  status: 'queued' | 'running' | 'finished';
  competitionId: string;
  displayTime: string;
};

/**
 * Same composition rules as `listManagerQueueHistory` in local backend, but in-memory from export snapshot.
 */
export function listManagerQueueHistoryFromEnvelope(root: unknown, maxTotal: number): ManagerQueueHistoryRow[] {
  const snap = extractLocalSnapshot(root);
  if (!snap) return [];
  const cap = Math.min(Math.max(1, maxTotal), 100);

  const participants = Array.isArray(snap.participants) ? snap.participants : [];
  const competitions = Array.isArray(snap.competitions) ? snap.competitions : [];
  const runSessions = Array.isArray(snap.runSessions) ? snap.runSessions : [];

  const participantById = new Map<string, { first: string; last: string; phone: string }>();
  for (const p of participants) {
    if (!isRecord(p)) continue;
    const id = String(p.id ?? '');
    if (!id) continue;
    participantById.set(id, {
      first: String(p.firstName ?? ''),
      last: String(p.lastName ?? ''),
      phone: String(p.phone ?? ''),
    });
  }

  const competitionById = new Map<string, Record<string, unknown>>();
  for (const c of competitions) {
    if (!isRecord(c)) continue;
    const id = String(c.id ?? '');
    if (!id) continue;
    competitionById.set(id, c);
  }

  function listActiveQueue(): ActiveQueueRow[] {
    const out: ActiveQueueRow[] = [];
    for (const raw of runSessions) {
      if (!isRecord(raw)) continue;
      const compId = String(raw.competitionId ?? '');
      const comp = compId ? competitionById.get(compId) : undefined;
      if (!comp || String(comp.status) !== 'active') continue;
      const st = String(raw.status ?? '');
      if (st !== 'queued' && st !== 'running') continue;
      const session = rowToSession(raw);
      const pid = session.participantId;
      const p = participantById.get(pid);
      if (!p) continue;
      const sexRaw = String(comp.gender ?? 'male');
      const sex: Gender = sexRaw === 'female' ? 'female' : 'male';
      out.push({
        runSession: session,
        participantName: `${p.first} ${p.last}`.trim(),
        participantFirstName: p.first,
        participantLastName: p.last,
        participantPhone: p.phone,
        sex,
      });
    }
    out.sort((a, b) => {
      const ta = `${a.runSession.createdAt}\t${a.runSession.id}`;
      const tb = `${b.runSession.createdAt}\t${b.runSession.id}`;
      return ta.localeCompare(tb);
    });
    return out;
  }

  const activeRows = listActiveQueue();
  const running = activeRows
    .filter((r) => r.runSession.status === 'running')
    .sort((a, b) => {
      const ta = `${a.runSession.startedAt ?? a.runSession.createdAt}\t${a.runSession.id}`;
      const tb = `${b.runSession.startedAt ?? b.runSession.createdAt}\t${b.runSession.id}`;
      return ta.localeCompare(tb);
    });
  const queued = activeRows
    .filter((r) => r.runSession.status === 'queued')
    .sort((a, b) => {
      const ta = `${a.runSession.createdAt}\t${a.runSession.id}`;
      const tb = `${b.runSession.createdAt}\t${b.runSession.id}`;
      return ta.localeCompare(tb);
    });
  const activeOrdered = [...running, ...queued].slice(0, 4);

  const toRow = (r: ActiveQueueRow): ManagerQueueHistoryRow => {
    const st = r.runSession.status as 'queued' | 'running';
    return {
      runSessionId: r.runSession.id,
      queueNumber: r.runSession.queueNumber,
      participantId: r.runSession.participantId,
      participantName: r.participantName,
      participantFirstName: r.participantFirstName,
      participantLastName: r.participantLastName,
      participantPhone: r.participantPhone,
      sex: r.sex,
      runTypeId: r.runSession.runTypeId,
      runType: r.runSession.runType,
      status: st,
      competitionId: r.runSession.competitionId,
      displayTime: displayTimeForHistoryRow(st, r.runSession),
    };
  };

  const needFinished = Math.max(0, cap - activeOrdered.length);
  const finished: ManagerQueueHistoryRow[] = [];
  if (needFinished > 0) {
    type Cand = { row: ManagerQueueHistoryRow; sortKey: string };
    const candidates: Cand[] = [];
    for (const raw of runSessions) {
      if (!isRecord(raw)) continue;
      if (String(raw.status) !== 'finished') continue;
      const compId = String(raw.competitionId ?? '');
      const comp = compId ? competitionById.get(compId) : undefined;
      if (!comp || String(comp.status) !== 'active') continue;
      const s = rowToSession(raw);
      const pid = s.participantId;
      const p = participantById.get(pid);
      if (!p) continue;
      const sexRaw = String(comp.gender ?? 'male');
      const sex: Gender = sexRaw === 'female' ? 'female' : 'male';
      const displayTime = displayTimeForHistoryRow('finished', s);
      const finishedAt = s.finishedAt?.trim();
      const sortKey = finishedAt && finishedAt.length > 0 ? `${finishedAt}\t${s.id}` : `${s.createdAt}\t${s.id}`;
      candidates.push({
        sortKey,
        row: {
          runSessionId: s.id,
          queueNumber: s.queueNumber,
          participantId: s.participantId,
          participantName: `${p.first} ${p.last}`.trim(),
          participantFirstName: p.first,
          participantLastName: p.last,
          participantPhone: p.phone,
          sex,
          runTypeId: s.runTypeId,
          runType: s.runType,
          status: 'finished',
          competitionId: s.competitionId,
          displayTime,
        },
      });
    }
    candidates.sort((a, b) => {
      if (a.sortKey < b.sortKey) return 1;
      if (a.sortKey > b.sortKey) return -1;
      return 0;
    });
    for (let i = 0; i < needFinished && i < candidates.length; i += 1) {
      finished.push(candidates[i]!.row);
    }
  }

  return [...activeOrdered.map(toRow), ...finished];
}

export function runSessionsResponseFromEnvelope(root: unknown): { entries: SnapshotQueueEntry[] } {
  const base = listManagerQueueHistoryFromEnvelope(root, 500);
  const entries: SnapshotQueueEntry[] = base.map((r) => {
    return {
      runSessionId: r.runSessionId,
      queueNumber: r.queueNumber,
      participantId: r.participantId,
      participantName: r.participantName,
      participantFirstName: r.participantFirstName,
      participantLastName: r.participantLastName,
      participantPhone: r.participantPhone,
      sex: r.sex,
      runTypeId: r.runTypeId,
      runType: r.runType,
      status: r.status,
      competitionId: r.competitionId,
      displayTime: r.displayTime,
      resultTime: null,
      resultDistance: null,
    };
  });
  const snap = extractLocalSnapshot(root);
  const sessions = snap && Array.isArray(snap.runSessions) ? snap.runSessions : [];
  const byId = new Map<string, Record<string, unknown>>();
  for (const s of sessions) {
    if (isRecord(s) && s.id) byId.set(String(s.id), s);
  }
  for (const e of entries) {
    const s = byId.get(e.runSessionId);
    if (!s) continue;
    e.resultTime = s.resultTime != null ? Number(s.resultTime) : null;
    e.resultDistance = s.resultDistance != null ? Number(s.resultDistance) : null;
  }
  return { entries };
}
