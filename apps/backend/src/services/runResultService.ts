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
  const participant = participants.getParticipantById(db, session.participantId);
  if (!participant) {
    throw new Error('Participant not found');
  }

  const speed = speedFromTimeDistance(dto.resultTime, dto.distance);
  const runId = randomUUID();
  runs.createRun(db, runId, session.participantId, dto.resultTime, dto.distance, speed);
  runSessions.updateSessionResults(db, session.id, dto.resultTime, dto.distance);

  return { runId, runSessionId: session.id, participantId: session.participantId };
}
