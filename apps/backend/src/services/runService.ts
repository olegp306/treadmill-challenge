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
import {
  TD_UNAVAILABLE,
  tryActivateQueuedSessionForStart,
  type PromotionLog,
} from './runSessionPromotion.js';

export type StartRunOutcome =
  | { ok: true; data: RunSessionStartResponse }
  | { ok: false; reason: 'queue_full' | 'queue_paused' | 'td_unavailable' };

export async function startRunSession(
  dto: RunStartDto,
  touchDesigner: TouchDesignerIntegration,
  log?: PromotionLog
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

  const maxQueue = adminSettings.getMaxGlobalQueueSize(db);
  if (runSessions.countGlobalQueueOccupancy(db) >= maxQueue) {
    return { ok: false, reason: 'queue_full' };
  }

  const sessionId = randomUUID();
  runSessions.createRunSession(db, sessionId, dto.participantId.trim(), comp.id, dto.runTypeId, 0);
  runSessions.renumberGlobalQueuedSessions(db);

  const demoMode = adminSettings.getTdDemoMode(db);

  let session = runSessions.getRunSessionById(db, sessionId)!;
  let treadmillStatus: TreadmillStatus = 'unknown';

  try {
    const activated = await tryActivateQueuedSessionForStart(sessionId, touchDesigner, demoMode, log);
    session = activated.session;
    treadmillStatus = activated.treadmillStatus;
  } catch (e) {
    if (e instanceof Error && e.message === TD_UNAVAILABLE) {
      return { ok: false, reason: 'td_unavailable' };
    }
    throw e;
  }

  const position =
    session.status === 'queued' ? runSessions.positionInGlobalQueue(db, session.id) : 0;

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
  runSessions.renumberGlobalQueuedSessions(db);
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
  maxGlobalQueueSize: number;
  /** Same pool as entries when unfiltered (global active queued + running). */
  activeSessionCount: number;
} {
  const db = getDb();
  const rows = runSessions.listActiveQueue(db, runTypeId, sex);
  return {
    maxGlobalQueueSize: adminSettings.getMaxGlobalQueueSize(db),
    activeSessionCount: runSessions.countGlobalQueueOccupancy(db),
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
  /** True when this session is queued and another session is currently on the treadmill. */
  otherSessionRunning: boolean;
} {
  const db = getDb();
  const session = runSessions.getRunSessionById(db, runSessionId.trim());
  if (!session) {
    throw new Error('Run session not found');
  }
  const queuePosition =
    session.status === 'queued' ? runSessions.positionInGlobalQueue(db, session.id) : null;
  const currentRunning = runSessions.getCurrentRunningSessionGlobal(db);
  const otherSessionRunning =
    session.status === 'queued' &&
    currentRunning != null &&
    currentRunning.id !== session.id;
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
    otherSessionRunning,
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
  runSessions.renumberGlobalQueuedSessions(db);

  return {
    runSessionId: session.id,
    runId,
    participantId: session.participantId,
  };
}
