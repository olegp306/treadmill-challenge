import { randomUUID } from 'node:crypto';
import { getDb, participants, runs, runSessions } from '../db/index.js';
import type { RunSessionResultDto } from '@treadmill-challenge/shared';
import { getRunTypeById, type RunTypeId } from '@treadmill-challenge/shared';
import { runs as runsDb } from '../db/index.js';
import type { TouchDesignerIntegration } from '../integrations/touchdesigner/types.js';
import { promoteNextQueuedSessionAfterFinish, type PromotionLog } from './runSessionPromotion.js';

function speedFromTimeDistance(resultTime: number, distance: number): number {
  if (resultTime <= 0) return 0;
  return (distance / 1000 / resultTime) * 3600;
}

function rankCompetitionEntries(
  entries: Array<{ resultTime: number; distance: number }>,
  runTypeId: RunTypeId
): number[] {
  const ranks: number[] = [];
  let prevKey: string | null = null;
  let prevRank = 0;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const key = runTypeId === 0 ? `${e.distance}|${e.resultTime}` : `${e.resultTime}|${e.distance}`;
    if (i === 0) {
      prevRank = 1;
      prevKey = key;
      ranks.push(1);
      continue;
    }
    if (key === prevKey) {
      ranks.push(prevRank);
    } else {
      prevRank = i + 1;
      prevKey = key;
      ranks.push(prevRank);
    }
  }
  return ranks;
}

export async function submitRunSessionResult(
  dto: RunSessionResultDto,
  touchDesigner: TouchDesignerIntegration,
  log?: PromotionLog
): Promise<{
  runId: string;
  runSessionId: string;
  participantId: string;
  competitionId: string;
  runTypeId: RunTypeId;
  rank: number | null;
}> {
  const db = getDb();
  const session = runSessions.getRunSessionById(db, dto.runSessionId.trim());
  if (!session) {
    throw new Error('Run session not found');
  }
  if (session.status === 'finished') {
    throw new Error('Run session already finished');
  }
  if (session.status === 'cancelled') {
    throw new Error('Run session cancelled');
  }
  const participant = participants.getParticipantById(db, session.participantId);
  if (!participant) {
    throw new Error('Participant not found');
  }
  const cfg = getRunTypeById(session.runTypeId);
  if (!cfg) {
    throw new Error('Invalid runTypeId');
  }

  const speed = speedFromTimeDistance(dto.resultTime, dto.distance);
  const runId = randomUUID();
  runs.createRun(
    db,
    runId,
    session.participantId,
    session.competitionId,
    session.id,
    dto.resultTime,
    dto.distance,
    speed
  );
  runSessions.updateSessionResults(db, session.id, dto.resultTime, dto.distance);
  runSessions.renumberGlobalQueuedSessions(db);

  const top = runsDb.getLeaderboardForCompetition(db, session.competitionId, session.runTypeId, 200);
  const ranks = rankCompetitionEntries(
    top.map((e) => ({ resultTime: e.run.resultTime, distance: e.run.distance })),
    session.runTypeId
  );
  const idx = top.findIndex((e) => e.run.participantId === session.participantId);
  const rank = idx >= 0 ? ranks[idx] : null;

  const result = {
    runId,
    runSessionId: session.id,
    participantId: session.participantId,
    competitionId: session.competitionId,
    runTypeId: session.runTypeId,
    rank,
  };

  try {
    await promoteNextQueuedSessionAfterFinish(touchDesigner, log);
  } catch (e) {
    log?.error?.({
      msg: 'global_queue_promote_unexpected',
      error: e instanceof Error ? e.message : String(e),
    });
  }
  return result;
}

export function getExistingResultByRunSessionId(runSessionId: string): {
  runId: string;
  runSessionId: string;
  participantId: string;
} | null {
  const db = getDb();
  const run = runs.getLatestRunBySessionId(db, runSessionId.trim());
  if (!run) return null;
  return {
    runId: run.id,
    runSessionId: run.runSessionId ?? runSessionId.trim(),
    participantId: run.participantId,
  };
}
