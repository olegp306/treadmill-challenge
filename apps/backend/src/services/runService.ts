import { randomUUID } from 'node:crypto';
import { getDb, participants, runs, runSessions } from '../db/index.js';
import type { RunStartDto, RunType } from '@treadmill-challenge/shared';

function fakeResultForRunType(runType: RunType): { resultTime: number; distance: number; speed: number } {
  switch (runType) {
    case '5min':
      return { resultTime: 300, distance: 1250, speed: 15 };
    case 'golden_km':
      return { resultTime: 268, distance: 1000, speed: 13.4 };
    case 'sprint_5km':
      return { resultTime: 1180, distance: 5000, speed: 15.25 };
    default:
      return { resultTime: 300, distance: 1000, speed: 12 };
  }
}

export function startRunSession(dto: RunStartDto): RunSessionResponse {
  const db = getDb();
  const participant = participants.getParticipantById(db, dto.participantId.trim());
  if (!participant) {
    throw new Error('Participant not found');
  }

  const sessionId = randomUUID();
  const session = runSessions.createRunSession(db, sessionId, dto.participantId.trim(), dto.runType);
  participants.updateParticipantStatus(db, dto.participantId.trim(), 'queued');

  return {
    runSessionId: session.id,
    participantId: session.participantId,
    runType: session.runType,
    status: session.status,
    createdAt: session.createdAt,
  };
}

export interface RunSessionResponse {
  runSessionId: string;
  participantId: string;
  runType: RunType;
  status: string;
  createdAt: string;
}

/**
 * Dev-only: complete the latest queued session and write a fake result to `runs`.
 */
export function devFinishLatestQueuedRun(): {
  runSessionId: string;
  runId: string;
  participantId: string;
} {
  const db = getDb();
  const session = runSessions.getLatestQueuedSession(db);
  if (!session) {
    throw new Error('No queued run session');
  }

  const { resultTime, distance, speed } = fakeResultForRunType(session.runType);
  const runId = randomUUID();
  runs.createRun(db, runId, session.participantId, resultTime, distance, speed);
  runSessions.markSessionFinished(db, session.id, runId);
  participants.updateParticipantStatus(db, session.participantId, 'finished');

  return {
    runSessionId: session.id,
    runId,
    participantId: session.participantId,
  };
}
