import { randomUUID } from 'node:crypto';
import { getDb, participants, runs } from '../db/index.js';
import type { RunResultDto } from '@treadmill-challenge/shared';

export function submitRunResult(dto: RunResultDto): { runId: string; participantId: string } {
  const db = getDb();
  const participant = participants.getParticipantById(db, dto.participantId);
  if (!participant) {
    throw new Error('Participant not found');
  }

  const runId = randomUUID();
  runs.createRun(db, runId, dto.participantId, dto.resultTime, dto.distance, dto.speed);
  participants.updateParticipantStatus(db, dto.participantId, 'finished');

  return { runId, participantId: dto.participantId };
}
