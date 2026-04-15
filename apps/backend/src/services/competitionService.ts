import { randomUUID } from 'node:crypto';
import type { Competition, Gender, RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeById } from '@treadmill-challenge/shared';
import { getDb, competitions, runs, runSessions } from '../db/index.js';

function archiveCompetition(db: ReturnType<typeof getDb>, id: string): void {
  const cur = competitions.getCompetitionById(db, id);
  if (!cur) return;
  const now = new Date().toISOString();
  competitions.updateCompetitionStatus(
    db,
    id,
    'archived',
    cur.stoppedAt ?? now,
    cur.winnerParticipantId,
    cur.winnerRunSessionId
  );
}

export function startCompetition(runTypeId: RunTypeId, gender: Gender): Competition {
  const db = getDb();
  if (competitions.getActiveCompetition(db, runTypeId, gender)) {
    throw new Error('Для этого формата уже есть активное соревнование');
  }
  const cfg = getRunTypeById(runTypeId);
  if (!cfg) throw new Error('Invalid runTypeId');
  const id = randomUUID();
  const startedAt = new Date().toISOString();
  const c: Competition = {
    id,
    runTypeId,
    runTypeKey: cfg.key,
    gender,
    title: competitions.defaultCompetitionTitle(runTypeId, gender),
    status: 'active',
    startedAt,
    stoppedAt: null,
    winnerParticipantId: null,
    winnerRunSessionId: null,
  };
  competitions.insertCompetition(db, c);
  return competitions.getCompetitionById(db, id)!;
}

export function stopCompetition(competitionId: string): Competition {
  const db = getDb();
  const comp = competitions.getCompetitionById(db, competitionId);
  if (!comp || comp.status !== 'active') {
    throw new Error('Соревнование не активно');
  }
  const top = runs.getTopLeaderboardEntryForCompetition(db, competitionId, comp.runTypeId);
  const now = new Date().toISOString();
  const winnerPid = top?.run.participantId ?? null;
  const winnerSid = top?.run.runSessionId ?? null;
  competitions.updateCompetitionStatus(db, competitionId, 'stopped', now, winnerPid, winnerSid);
  return competitions.getCompetitionById(db, competitionId)!;
}

export function restartCompetitionSlot(runTypeId: RunTypeId, gender: Gender): Competition {
  const db = getDb();
  const toArchive = competitions.getCompetitionForRestart(db, runTypeId, gender);
  if (toArchive) {
    archiveCompetition(db, toArchive.id);
  }
  return startCompetition(runTypeId, gender);
}

export function adminArchiveCompetition(competitionId: string): void {
  const db = getDb();
  const comp = competitions.getCompetitionById(db, competitionId);
  if (!comp) throw new Error('Соревнование не найдено');
  if (comp.status === 'active') {
    throw new Error('Сначала остановите соревнование');
  }
  archiveCompetition(db, competitionId);
}

export function assignWinnerManually(
  competitionId: string,
  participantId: string,
  runSessionId: string | null
): void {
  const db = getDb();
  const comp = competitions.getCompetitionById(db, competitionId);
  if (!comp) throw new Error('Соревнование не найдено');
  competitions.updateCompetitionWinners(db, competitionId, participantId, runSessionId);
}
