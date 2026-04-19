import { generateDemoMetrics, getRunTypeName } from '@treadmill-challenge/shared';
import { adminSettings, getDb, runSessions } from '../db/index.js';
import type { TouchDesignerIntegration, TreadmillStatus } from '../integrations/touchdesigner/types.js';
import {
  promoteNextQueuedSessionAfterFinish,
  resendCurrentRunningSessionToTouchDesigner,
  tryActivateQueuedSessionForStart,
  type PromotionLog,
} from './runSessionPromotion.js';
import { submitRunSessionResult } from './runResultService.js';

export async function moveCurrentRunnerToEndOfQueue(
  touchDesigner: TouchDesignerIntegration,
  log?: PromotionLog
): Promise<{ demotedRunSessionId: string; promotedRunSessionId: string | null }> {
  const db = getDb();
  const current = runSessions.getCurrentRunningSessionGlobal(db);
  if (!current) {
    throw new Error('No running session');
  }
  const demotedRunSessionId = current.id;
  runSessions.setSessionStatus(db, demotedRunSessionId, 'queued');
  runSessions.bumpRunSessionCreatedAtToGlobalQueueTail(db, demotedRunSessionId);
  runSessions.renumberGlobalQueuedSessions(db);
  await promoteNextQueuedSessionAfterFinish(touchDesigner, log);
  const nowRunning = runSessions.getCurrentRunningSessionGlobal(db);
  return {
    demotedRunSessionId,
    promotedRunSessionId: nowRunning?.id ?? null,
  };
}

export function removeGlobalQueuedSessionByRunSessionId(runSessionId: string): { ok: true } {
  const db = getDb();
  const id = runSessionId.trim();
  if (!id) {
    throw new Error('runSessionId required');
  }
  const r = runSessions.cancelGlobalQueuedSessionById(db, id);
  if (r === 'not_found') {
    throw new Error('Run session not found');
  }
  if (r === 'not_queued') {
    throw new Error('Not a queued session');
  }
  return { ok: true };
}

export function getQueueControlState(): {
  /** Max concurrent sessions (queued + running). */
  maxGlobalQueueSize: number;
  /** Current count in that pool. */
  activeSessionCount: number;
  running: {
    runSessionId: string;
    participantId: string;
    firstName: string;
    lastName: string;
    phone: string;
    runTypeId: number;
    runTypeName: string;
    runTypeKey: string;
    gender: string;
    status: string;
    queueNumber: number;
    startedAt: string | null;
  } | null;
  queued: Array<{
    position: number;
    runSessionId: string;
    participantId: string;
    participantName: string;
    phone: string;
    runTypeId: number;
    runTypeName: string;
    runTypeKey: string;
    gender: string;
    queueNumber: number;
  }>;
} {
  const db = getDb();
  const maxGlobalQueueSize = adminSettings.getMaxGlobalQueueSize(db);
  const activeSessionCount = runSessions.countGlobalQueueOccupancy(db);
  const running = runSessions.getRunningSessionDetailGlobal(db);
  const queuedRows = runSessions.listGlobalQueuedSessionsOrdered(db);
  return {
    maxGlobalQueueSize,
    activeSessionCount,
    running: running
      ? {
          runSessionId: running.runSession.id,
          participantId: running.runSession.participantId,
          firstName: running.firstName,
          lastName: running.lastName,
          phone: running.phone,
          runTypeId: running.runSession.runTypeId,
          runTypeName: getRunTypeName(running.runSession.runTypeId),
          runTypeKey: running.runSession.runType,
          gender: running.gender,
          status: running.runSession.status,
          queueNumber: running.runSession.queueNumber,
          startedAt: running.runSession.startedAt,
        }
      : null,
    queued: queuedRows.map((q, i) => ({
      position: i + 1,
      runSessionId: q.runSession.id,
      participantId: q.runSession.participantId,
      participantName: q.participantName,
      phone: q.phone,
      runTypeId: q.runSession.runTypeId,
      runTypeName: getRunTypeName(q.runSession.runTypeId),
      runTypeKey: q.runSession.runType,
      gender: q.gender,
      queueNumber: q.runSession.queueNumber,
    })),
  };
}

export async function finishCurrentWithFakeResults(
  touchDesigner: TouchDesignerIntegration,
  log?: PromotionLog
): Promise<{
  runId: string;
  runSessionId: string;
  participantId: string;
  competitionId: string;
  runTypeId: number;
  rank: number | null;
  resultTime: number;
  distance: number;
}> {
  const db = getDb();
  const current = runSessions.getCurrentRunningSessionGlobal(db);
  if (!current) {
    throw new Error('No running session');
  }
  const { resultTime, distance } = generateDemoMetrics(current.runTypeId, current.id);
  const result = await submitRunSessionResult(
    { runSessionId: current.id, resultTime, distance },
    touchDesigner,
    log
  );
  return { ...result, resultTime, distance };
}

/**
 * When treadmill is free but the next person stayed queued (e.g. TD never ack'd), move global FIFO head to running
 * using the same path as a normal queue start.
 */
export async function promoteNextQueuedToRunning(
  touchDesigner: TouchDesignerIntegration,
  log?: PromotionLog
): Promise<{
  runSessionId: string;
  treadmillStatus: TreadmillStatus;
}> {
  const db = getDb();
  if (runSessions.getCurrentRunningSessionGlobal(db)) {
    throw new Error('Already running');
  }
  const first = runSessions.getFirstQueuedSessionGlobal(db);
  if (!first) {
    throw new Error('Queue is empty');
  }
  const demoMode = adminSettings.getTdDemoMode(db);
  const { session, treadmillStatus } = await tryActivateQueuedSessionForStart(
    first.id,
    touchDesigner,
    demoMode,
    log
  );
  if (session.status !== 'running') {
    const err =
      treadmillStatus === 'busy' ? 'Treadmill busy (TouchDesigner ack)' : 'Could not place next session on treadmill';
    throw new Error(err);
  }
  return { runSessionId: session.id, treadmillStatus };
}

/** Reserved for future UI; same as dev “resend” to TouchDesigner. */
export async function restartCurrentRunning(
  touchDesigner: TouchDesignerIntegration,
  log?: PromotionLog
): Promise<{ runSessionId: string }> {
  return resendCurrentRunningSessionToTouchDesigner(touchDesigner, log);
}
