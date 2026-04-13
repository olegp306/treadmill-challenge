import { randomUUID } from 'node:crypto';
import { getDb, participants, runs, runSessions } from '../db/index.js';
import type { TouchDesignerIntegration } from '../integrations/touchdesigner/types.js';
import type { RunStartDto, RunType } from '@treadmill-challenge/shared';
function fakeMetrics(runType: RunType): { resultTime: number; distance: number; speed: number } {
  switch (runType) {
    case 'max_5_min':
      return { resultTime: 300, distance: 1250, speed: 15 };
    case 'golden_km':
      return { resultTime: 268, distance: 1000, speed: 13.4 };
    case 'stayer_sprint_5km':
      return { resultTime: 1180, distance: 5000, speed: 15.25 };
    default:
      return { resultTime: 300, distance: 1000, speed: 12 };
  }
}

const RUN_DISPLAY_NAME: Record<RunType, string> = {
  max_5_min: 'Максимум за 5 минут',
  golden_km: 'Золотой километр',
  stayer_sprint_5km: 'Стайер-спринт на 5 километров',
};

export function runDisplayName(runType: RunType): string {
  return RUN_DISPLAY_NAME[runType] ?? runType;
}

export function startRunSession(
  dto: RunStartDto,
  touchDesigner: TouchDesignerIntegration
): RunSessionStartResponse {
  const db = getDb();
  const participant = participants.getParticipantById(db, dto.participantId.trim());
  if (!participant) {
    throw new Error('Participant not found');
  }

  const maxQ = runSessions.getMaxQueueNumberForRunType(db, dto.runType);
  const queueNumber = maxQ + 1;
  const sessionId = randomUUID();
  const session = runSessions.createRunSession(db, sessionId, dto.participantId.trim(), dto.runType, queueNumber);
  const position = runSessions.positionInQueue(db, dto.runType, queueNumber);

  touchDesigner.sendRunSessionStarted({
    runSessionId: session.id,
    participantId: participant.id,
    firstName: participant.firstName,
    lastName: participant.lastName,
    phone: participant.phone,
    runType: dto.runType,
    runName: runDisplayName(dto.runType),
  });

  return {
    runSessionId: session.id,
    participantId: session.participantId,
    runType: session.runType,
    status: session.status,
    queueNumber: session.queueNumber,
    position,
    createdAt: session.createdAt,
  };
}

export interface RunSessionStartResponse {
  runSessionId: string;
  participantId: string;
  runType: RunType;
  status: string;
  queueNumber: number;
  position: number;
  createdAt: string;
}

export function getQueue(runType?: RunType): {
  entries: Array<{
    runSessionId: string;
    queueNumber: number;
    participantId: string;
    participantName: string;
    runType: RunType;
    runName: string;
    status: string;
  }>;
} {
  const db = getDb();
  const rows = runSessions.listActiveQueue(db, runType);
  return {
    entries: rows.map((r) => ({
      runSessionId: r.runSession.id,
      queueNumber: r.runSession.queueNumber,
      participantId: r.runSession.participantId,
      participantName: r.participantName,
      runType: r.runSession.runType,
      runName: runDisplayName(r.runSession.runType),
      status: r.runSession.status,
    })),
  };
}

/**
 * Dev / simulation: finish running session or first in queue; write leaderboard row via runs.
 */
export function devFinishLatestQueuedRun(): {
  runSessionId: string;
  runId: string;
  participantId: string;
} {
  const db = getDb();
  const session = runSessions.getSessionForDevFinish(db);
  if (!session) {
    throw new Error('No run session to finish');
  }

  const { resultTime, distance, speed } = fakeMetrics(session.runType);
  const runId = randomUUID();
  runs.createRun(db, runId, session.participantId, resultTime, distance, speed);
  runSessions.updateSessionResults(db, session.id, resultTime, distance);

  return {
    runSessionId: session.id,
    runId,
    participantId: session.participantId,
  };
}
