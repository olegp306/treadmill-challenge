import { randomUUID } from 'node:crypto';
import { getDb, participants, runs, runSessions } from '../db/index.js';
import type { RunSessionResultDto } from '@treadmill-challenge/shared';

function speedFromTimeDistance(resultTime: number, distance: number): number {
  if (resultTime <= 0) return 0;
  return (distance / 1000 / resultTime) * 3600;
}

export function submitRunSessionResult(dto: RunSessionResultDto): {
  runId: string;
  runSessionId: string;
  participantId: string;
} {
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
  runSessions.renumberQueuedSessions(db, session.competitionId);

  return { runId, runSessionId: session.id, participantId: session.participantId };
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
