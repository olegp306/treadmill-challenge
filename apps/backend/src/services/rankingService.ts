import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import type { Db } from '../db/sqlite.js';

export type RankedRun = {
  runSessionId: string;
  participantId: string;
  participantFirstName: string;
  participantLastName: string;
  participantPhone: string;
  participantName: string;
  runTypeId: RunTypeId;
  runType: string;
  sex: Gender;
  resultTime: number;
  resultDistance: number;
  displayTime: string;
  rank: number;
};

type SortMode = 'best' | 'worst' | 'new' | 'old';

type FinishedRunRow = {
  runSessionId: string;
  participantId: string;
  participantFirstName: string;
  participantLastName: string;
  participantPhone: string;
  runTypeId: RunTypeId;
  runType: string;
  sex: Gender;
  resultTime: number;
  resultDistance: number;
  displayTime: string;
};

export function compareRunResults(a: Pick<FinishedRunRow, 'runTypeId' | 'resultTime' | 'resultDistance'>, b: Pick<FinishedRunRow, 'runTypeId' | 'resultTime' | 'resultDistance'>): number {
  if (a.runTypeId !== b.runTypeId) return a.runTypeId - b.runTypeId;
  if (a.runTypeId === 0) {
    if (b.resultDistance !== a.resultDistance) return b.resultDistance - a.resultDistance;
    return a.resultTime - b.resultTime;
  }
  if (a.resultTime !== b.resultTime) return a.resultTime - b.resultTime;
  return b.resultDistance - a.resultDistance;
}

function compareByDisplayTimeDesc(a: FinishedRunRow, b: FinishedRunRow): number {
  const ta = Date.parse(a.displayTime);
  const tb = Date.parse(b.displayTime);
  if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return tb - ta;
  return b.displayTime.localeCompare(a.displayTime);
}

function compareByDisplayTimeAsc(a: FinishedRunRow, b: FinishedRunRow): number {
  return compareByDisplayTimeDesc(b, a);
}

export function getRankedRuns(
  db: Db,
  input: { runTypeId: RunTypeId; sex: Gender; sortMode?: SortMode }
): RankedRun[] {
  const rows = db
    .prepare(
      `
      SELECT
        s.id AS runSessionId,
        s.participantId AS participantId,
        p.firstName AS participantFirstName,
        p.lastName AS participantLastName,
        p.phone AS participantPhone,
        s.runTypeId AS runTypeId,
        s.runType AS runType,
        c.gender AS sex,
        s.resultTime AS resultTime,
        s.resultDistance AS resultDistance,
        CASE
          WHEN s.finishedAt IS NOT NULL AND TRIM(s.finishedAt) != '' THEN s.finishedAt
          ELSE s.createdAt
        END AS displayTime
      FROM run_sessions s
      JOIN participants p ON p.id = s.participantId
      JOIN competitions c ON c.id = s.competitionId
      WHERE s.status = 'finished' AND c.status = 'active' AND s.runTypeId = ? AND c.gender = ?
    `
    )
    .all(input.runTypeId, input.sex) as FinishedRunRow[];

  const rankedBestOrder = [...rows].sort(compareRunResults);
  const rankByRunSessionId = new Map<string, number>(rankedBestOrder.map((r, i) => [r.runSessionId, i + 1]));
  const sortMode = input.sortMode ?? 'best';
  const sorted =
    sortMode === 'worst'
      ? [...rankedBestOrder].reverse()
      : sortMode === 'new'
        ? [...rankedBestOrder].sort(compareByDisplayTimeDesc)
        : sortMode === 'old'
          ? [...rankedBestOrder].sort(compareByDisplayTimeAsc)
          : rankedBestOrder;

  return sorted.map((row) => ({
    ...row,
    participantName: `${row.participantFirstName} ${row.participantLastName}`.trim(),
    rank: rankByRunSessionId.get(row.runSessionId) ?? 0,
  }));
}

export function getParticipantRank(
  db: Db,
  input: {
    runTypeId: RunTypeId;
    sex: Gender;
    runSessionId: string;
  }
): number | null {
  const ranked = getRankedRuns(db, { runTypeId: input.runTypeId, sex: input.sex, sortMode: 'best' });
  const row = ranked.find((r) => r.runSessionId === input.runSessionId);
  return row?.rank ?? null;
}
