import {
  getRunTypeById,
  getRunTypeName,
  type Participant,
  type RunSession,
} from '@treadmill-challenge/shared';
import { adminSettings, getDb, participants, runSessions } from '../db/index.js';
import type { TouchDesignerIntegration, TreadmillStatus } from '../integrations/touchdesigner/types.js';

/** Thrown when TouchDesigner send fails during start promotion. */
export const TD_UNAVAILABLE = 'TD_UNAVAILABLE';

export type PromotionLog = {
  info?: (o: Record<string, unknown>) => void;
  warn?: (o: Record<string, unknown>) => void;
  error?: (o: Record<string, unknown>) => void;
};

function payloadForSession(session: RunSession, participant: Participant) {
  const cfg = getRunTypeById(session.runTypeId);
  return {
    runSessionId: session.id,
    participantId: participant.id,
    firstName: participant.firstName,
    lastName: participant.lastName,
    phone: participant.phone,
    runTypeId: session.runTypeId,
    runTypeName: getRunTypeName(session.runTypeId),
    runTypeKey: cfg?.key ?? 'max_5_min',
  } as const;
}

/**
 * After a new session is inserted as queued: if the global treadmill is free and this session
 * is first in FIFO, send to TouchDesigner and mark running.
 */
export async function tryActivateQueuedSessionForStart(
  sessionId: string,
  touchDesigner: TouchDesignerIntegration,
  demoMode: boolean,
  log?: PromotionLog
): Promise<{ session: RunSession; treadmillStatus: TreadmillStatus }> {
  const db = getDb();
  const session = runSessions.getRunSessionById(db, sessionId);
  if (!session) {
    throw new Error('Run session not found');
  }
  if (runSessions.getCurrentRunningSessionGlobal(db)) {
    return { session, treadmillStatus: 'busy' };
  }
  const first = runSessions.getFirstQueuedSessionGlobal(db);
  if (!first || first.id !== sessionId) {
    return { session, treadmillStatus: 'busy' };
  }
  const participant = participants.getParticipantById(db, session.participantId);
  if (!participant) {
    throw new Error('Participant not found');
  }
  const tdPayload = payloadForSession(session, participant);

  if (demoMode) {
    runSessions.setSessionStatus(db, session.id, 'running', { startedAt: new Date().toISOString() });
    runSessions.renumberGlobalQueuedSessions(db);
    const updated = runSessions.getRunSessionById(db, session.id)!;
    log?.info?.({
      msg: 'global_queue_session_running',
      runSessionId: session.id,
      source: 'demo_start',
    });
    return { session: updated, treadmillStatus: 'free' };
  }

  try {
    const ackPromise = touchDesigner.getTreadmillStatusAfterStart
      ? Promise.resolve(touchDesigner.getTreadmillStatusAfterStart(tdPayload))
      : Promise.resolve('free' as TreadmillStatus);
    await touchDesigner.sendRunSessionStarted(tdPayload);
    const ack = await ackPromise;
    if (ack !== 'busy') {
      runSessions.setSessionStatus(db, session.id, 'running', { startedAt: new Date().toISOString() });
      runSessions.renumberGlobalQueuedSessions(db);
      const updated = runSessions.getRunSessionById(db, session.id)!;
      log?.info?.({
        msg: 'global_queue_session_running',
        runSessionId: session.id,
        source: 'start',
        treadmillAck: ack,
      });
      return { session: updated, treadmillStatus: ack };
    }
    return { session, treadmillStatus: 'busy' };
  } catch {
    throw new Error(TD_UNAVAILABLE);
  }
}

/** After a run finishes: start the next global queued session on TouchDesigner (if any). */
export async function promoteNextQueuedSessionAfterFinish(
  touchDesigner: TouchDesignerIntegration,
  log?: PromotionLog
): Promise<void> {
  const db = getDb();
  if (runSessions.getCurrentRunningSessionGlobal(db)) {
    log?.warn?.({ msg: 'global_queue_promote_skipped_still_running' });
    return;
  }
  const next = runSessions.getFirstQueuedSessionGlobal(db);
  if (!next) {
    return;
  }
  const participant = participants.getParticipantById(db, next.participantId);
  if (!participant) {
    log?.warn?.({ msg: 'global_queue_promote_missing_participant', runSessionId: next.id });
    return;
  }
  const demoMode = adminSettings.getTdDemoMode(db);
  const tdPayload = payloadForSession(next, participant);

  if (demoMode) {
    runSessions.setSessionStatus(db, next.id, 'running', { startedAt: new Date().toISOString() });
    runSessions.renumberGlobalQueuedSessions(db);
    log?.info?.({
      msg: 'global_queue_next_promoted',
      runSessionId: next.id,
      source: 'after_finish_demo',
    });
    return;
  }

  try {
    const ackPromise = touchDesigner.getTreadmillStatusAfterStart
      ? Promise.resolve(touchDesigner.getTreadmillStatusAfterStart(tdPayload))
      : Promise.resolve('free' as TreadmillStatus);
    await touchDesigner.sendRunSessionStarted(tdPayload);
    const ack = await ackPromise;
    if (ack !== 'busy') {
      runSessions.setSessionStatus(db, next.id, 'running', { startedAt: new Date().toISOString() });
      runSessions.renumberGlobalQueuedSessions(db);
      log?.info?.({
        msg: 'global_queue_next_promoted',
        runSessionId: next.id,
        source: 'after_finish',
        treadmillAck: ack,
      });
    } else {
      log?.warn?.({ msg: 'global_queue_next_promote_td_busy', runSessionId: next.id });
    }
  } catch (e) {
    log?.error?.({
      msg: 'global_queue_next_promote_td_failed',
      runSessionId: next.id,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
