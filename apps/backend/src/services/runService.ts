import { randomUUID } from 'node:crypto';
import {
  getRunTypeById,
  getRunTypeName,
  type RunTypeId,
} from '@treadmill-challenge/shared';
import { getDb, participants, runs, runSessions } from '../db/index.js';
import type { TouchDesignerIntegration } from '../integrations/touchdesigner/types.js';
import type { RunStartDto } from '@treadmill-challenge/shared';

function fakeMetrics(runTypeId: RunTypeId): { resultTime: number; distance: number; speed: number } {
  switch (runTypeId) {
    case 0:
      return { resultTime: 300, distance: 1250, speed: 15 };
    case 1:
      return { resultTime: 268, distance: 1000, speed: 13.4 };
    case 2:
      return { resultTime: 1180, distance: 5000, speed: 15.25 };
    default:
      return { resultTime: 300, distance: 1000, speed: 12 };
  }
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

  const cfg = getRunTypeById(dto.runTypeId);
  if (!cfg) {
    throw new Error('Invalid runTypeId');
  }

  const maxQ = runSessions.getMaxQueueNumberForRunTypeId(db, dto.runTypeId);
  const queueNumber = maxQ + 1;
  const sessionId = randomUUID();
  const session = runSessions.createRunSession(db, sessionId, dto.participantId.trim(), dto.runTypeId, queueNumber);
  const position = runSessions.positionInQueue(db, dto.runTypeId, queueNumber);

  touchDesigner.sendRunSessionStarted({
    runSessionId: session.id,
    participantId: participant.id,
    firstName: participant.firstName,
    lastName: participant.lastName,
    phone: participant.phone,
    runTypeId: dto.runTypeId,
    runTypeName: getRunTypeName(dto.runTypeId),
    runTypeKey: cfg.key,
  });

  return {
    runSessionId: session.id,
    participantId: session.participantId,
    runTypeId: session.runTypeId,
    runType: session.runType,
    runName: getRunTypeName(session.runTypeId),
    status: session.status,
    queueNumber: session.queueNumber,
    position,
    createdAt: session.createdAt,
  };
}

export interface RunSessionStartResponse {
  runSessionId: string;
  participantId: string;
  runTypeId: RunTypeId;
  runType: string;
  runName: string;
  status: string;
  queueNumber: number;
  position: number;
  createdAt: string;
}

export function getQueue(runTypeId?: RunTypeId): {
  entries: Array<{
    runSessionId: string;
    queueNumber: number;
    participantId: string;
    participantName: string;
    runTypeId: RunTypeId;
    runType: string;
    runName: string;
    status: string;
  }>;
} {
  const db = getDb();
  const rows = runSessions.listActiveQueue(db, runTypeId);
  return {
    entries: rows.map((r) => ({
      runSessionId: r.runSession.id,
      queueNumber: r.runSession.queueNumber,
      participantId: r.runSession.participantId,
      participantName: r.participantName,
      runTypeId: r.runSession.runTypeId,
      runType: r.runSession.runType,
      runName: getRunTypeName(r.runSession.runTypeId),
      status: r.runSession.status,
    })),
  };
}

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

  const { resultTime, distance, speed } = fakeMetrics(session.runTypeId);
  const runId = randomUUID();
  runs.createRun(db, runId, session.participantId, resultTime, distance, speed);
  runSessions.updateSessionResults(db, session.id, resultTime, distance);

  return {
    runSessionId: session.id,
    runId,
    participantId: session.participantId,
  };
}
