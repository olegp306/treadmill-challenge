import { randomUUID } from 'node:crypto';
import {
  generateDemoMetrics,
  getRunTypeById,
  getRunTypeName,
  type Gender,
  type RunTypeId,
} from '@treadmill-challenge/shared';
import { adminSettings, getDb, competitions, participants, runs, runSessions } from '../db/index.js';
import type { TouchDesignerIntegration, TreadmillStatus } from '../integrations/touchdesigner/types.js';
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

export type StartRunOutcome =
  | { ok: true; data: RunSessionStartResponse }
  | { ok: false; reason: 'queue_full' | 'queue_paused' | 'td_unavailable' };

export async function startRunSession(
  dto: RunStartDto,
  touchDesigner: TouchDesignerIntegration
): Promise<StartRunOutcome> {
  const db = getDb();
  const participant = participants.getParticipantById(db, dto.participantId.trim());
  if (!participant) {
    throw new Error('Participant not found');
  }

  const cfg = getRunTypeById(dto.runTypeId);
  if (!cfg) {
    throw new Error('Invalid runTypeId');
  }

  const comp = competitions.getActiveCompetition(db, dto.runTypeId, participant.sex);
  if (!comp) {
    throw new Error(
      'Нет активного соревнования для этого формата и пола участника. Оператор должен запустить соревнование в панели.'
    );
  }

  if (comp.queuePaused) {
    return { ok: false, reason: 'queue_paused' };
  }

  const maxQueue = adminSettings.getMaxQueueSizePerRun(db);
  const occupancy = runSessions.countQueueOccupancyForCompetition(db, comp.id);
  if (occupancy >= maxQueue) {
    return { ok: false, reason: 'queue_full' };
  }

  const maxQ = runSessions.getMaxQueueNumberForCompetition(db, comp.id);
  const queueNumber = maxQ + 1;
  const sessionId = randomUUID();
  const session = runSessions.createRunSession(
    db,
    sessionId,
    dto.participantId.trim(),
    comp.id,
    dto.runTypeId,
    queueNumber
  );
  const running = runSessions.getCurrentRunningSessionForCompetition(db, comp.id);
  let treadmillStatus: TreadmillStatus = 'unknown';

  const demoMode = adminSettings.getTdDemoMode(db);

  const tdPayload = {
    runSessionId: session.id,
    participantId: participant.id,
    firstName: participant.firstName,
    lastName: participant.lastName,
    phone: participant.phone,
    runTypeId: dto.runTypeId,
    runTypeName: getRunTypeName(dto.runTypeId),
    runTypeKey: cfg.key,
  } as const;

  if (!running) {
    if (demoMode) {
      runSessions.setSessionStatus(db, session.id, 'running', { startedAt: new Date().toISOString() });
      session.status = 'running';
      treadmillStatus = 'free';
    } else {
      try {
        // Register OSC ack waiter before send so a fast TouchDesigner reply is not missed.
        const ackPromise = touchDesigner.getTreadmillStatusAfterStart
          ? Promise.resolve(touchDesigner.getTreadmillStatusAfterStart(tdPayload))
          : Promise.resolve('free' as TreadmillStatus);
        await touchDesigner.sendRunSessionStarted(tdPayload);
        const ack = await ackPromise;
        treadmillStatus = ack;
        if (ack !== 'busy') {
          runSessions.setSessionStatus(db, session.id, 'running', { startedAt: new Date().toISOString() });
          session.status = 'running';
        }
      } catch {
        return { ok: false, reason: 'td_unavailable' };
      }
    }
  } else {
    treadmillStatus = 'busy';
  }

  const position = session.status === 'queued' ? runSessions.positionInQueue(db, comp.id, session.queueNumber) : 0;

  return {
    ok: true,
    data: {
      runSessionId: session.id,
      participantId: session.participantId,
      competitionId: session.competitionId,
      runTypeId: session.runTypeId,
      runType: session.runType,
      runName: getRunTypeName(session.runTypeId),
      status: session.status,
      queueNumber: session.queueNumber,
      position,
      queuePosition: position,
      createdAt: session.createdAt,
      demoMode,
      treadmillStatus,
    },
  };
}

export interface RunSessionStartResponse {
  runSessionId: string;
  participantId: string;
  competitionId: string;
  runTypeId: RunTypeId;
  runType: string;
  runName: string;
  status: string;
  queueNumber: number;
  position: number;
  /** Same as position (API alias). */
  queuePosition: number;
  createdAt: string;
  /** True when admin enabled TouchDesigner demo mode (no OSC send; client shows demo finish). */
  demoMode: boolean;
  /** Treadmill availability after TD start ack (real mode). */
  treadmillStatus: TreadmillStatus;
}

export function leaveRunSession(runSessionId: string, participantId: string): void {
  const db = getDb();
  const session = runSessions.getRunSessionById(db, runSessionId.trim());
  if (!session) {
    throw new Error('Run session not found');
  }
  if (session.participantId !== participantId.trim()) {
    throw new Error('Forbidden');
  }
  if (session.status !== 'queued') {
    throw new Error('Run session cannot be left');
  }
  runSessions.setSessionStatus(db, session.id, 'cancelled');
  runSessions.renumberQueuedSessions(db, session.competitionId);
}

export function getQueue(
  runTypeId?: RunTypeId,
  sex?: Gender
): {
  entries: Array<{
    runSessionId: string;
    queueNumber: number;
    participantId: string;
    participantName: string;
    sex: Gender;
    competitionId: string;
    runTypeId: RunTypeId;
    runType: string;
    runName: string;
    status: string;
  }>;
} {
  const db = getDb();
  const rows = runSessions.listActiveQueue(db, runTypeId, sex);
  return {
    entries: rows.map((r) => ({
      runSessionId: r.runSession.id,
      queueNumber: r.runSession.queueNumber,
      participantId: r.runSession.participantId,
      participantName: r.participantName,
      sex: r.sex,
      competitionId: r.runSession.competitionId,
      runTypeId: r.runSession.runTypeId,
      runType: r.runSession.runType,
      runName: getRunTypeName(r.runSession.runTypeId),
      status: r.runSession.status,
    })),
  };
}

export function getRunSessionState(runSessionId: string): {
  runSessionId: string;
  participantId: string;
  competitionId: string;
  runTypeId: RunTypeId;
  status: 'queued' | 'running' | 'finished' | 'cancelled';
  queueNumber: number;
  queuePosition: number | null;
  startedAt: string | null;
  finishedAt: string | null;
} {
  const db = getDb();
  const session = runSessions.getRunSessionById(db, runSessionId.trim());
  if (!session) {
    throw new Error('Run session not found');
  }
  const queuePosition =
    session.status === 'queued' ? runSessions.positionInQueue(db, session.competitionId, session.queueNumber) : null;
  return {
    runSessionId: session.id,
    participantId: session.participantId,
    competitionId: session.competitionId,
    runTypeId: session.runTypeId,
    status: session.status,
    queueNumber: session.queueNumber,
    queuePosition,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
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

  const { resultTime, distance } = generateDemoMetrics(session.runTypeId, session.id);
  const speed = (distance / 1000 / resultTime) * 3600;
  const runId = randomUUID();
  runs.createRun(db, runId, session.participantId, session.competitionId, session.id, resultTime, distance, speed);
  runSessions.updateSessionResults(db, session.id, resultTime, distance);

  return {
    runSessionId: session.id,
    runId,
    participantId: session.participantId,
  };
}
