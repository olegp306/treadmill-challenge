import { randomUUID } from 'node:crypto';
import { getDb, participants, runs, runSessions } from '../db/index.js';
import {
  movePendingToFinal,
  unlinkRelative,
  parseVerificationJpegFromBase64Input,
  writeFinalVerificationJpeg,
} from './runPhotoStorage.js';
import type { RunSessionResultDto } from '@treadmill-challenge/shared';
import { getRunTypeById, type RunTypeId } from '@treadmill-challenge/shared';
import { runs as runsDb } from '../db/index.js';
import type { TouchDesignerIntegration } from '../integrations/touchdesigner/types.js';
import { promoteNextQueuedSessionAfterFinish, type PromotionLog } from './runSessionPromotion.js';

function readRunResultPromoteGuardMs(): number {
  const raw = process.env.RUN_RESULT_PROMOTE_GUARD_MS;
  const n = raw != null && String(raw).trim() !== '' ? Number(raw) : 15_000;
  if (!Number.isFinite(n)) return 15_000;
  return Math.min(Math.max(Math.floor(n), 2_000), 120_000);
}

/** Serialize finish-time promotion so duplicate HTTP / OSC cannot overlap a slow first promote. */
let finishPromoteChain: Promise<void> = Promise.resolve();

function enqueueFinishPromote(work: () => Promise<void>): Promise<void> {
  const next = finishPromoteChain.then(work, work);
  finishPromoteChain = next.catch(() => {});
  return next;
}

function sleepReject(ms: number, err: Error): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(err), ms);
  });
}

async function awaitPromoteAfterFinishGuarded(
  touchDesigner: TouchDesignerIntegration,
  log: PromotionLog | undefined,
  ctx: { runSessionId: string; phase: 'after_finish' | 'duplicate_finish_repair' }
): Promise<void> {
  const guardMs = readRunResultPromoteGuardMs();
  log?.info?.({
    msg: 'global_queue_promote_started',
    runSessionId: ctx.runSessionId,
    phase: ctx.phase,
    guardMs,
  });

  try {
    await Promise.race([
      promoteNextQueuedSessionAfterFinish(touchDesigner, log),
      sleepReject(guardMs, new Error('PROMOTE_GUARD_TIMEOUT')),
    ]);
    log?.info?.({
      msg: 'global_queue_promote_guard_completed',
      runSessionId: ctx.runSessionId,
      phase: ctx.phase,
      guardMs,
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'PROMOTE_GUARD_TIMEOUT') {
      log?.warn?.({
        msg: 'global_queue_promote_guard_timeout',
        runSessionId: ctx.runSessionId,
        phase: ctx.phase,
        guardMs,
        note: 'awaiting_promote_repair_unbounded',
      });
      await promoteNextQueuedSessionAfterFinish(touchDesigner, log);
      log?.info?.({
        msg: 'global_queue_promote_repair_completed',
        runSessionId: ctx.runSessionId,
        phase: ctx.phase,
      });
    } else {
      log?.error?.({
        msg: 'global_queue_promote_unexpected_reject',
        runSessionId: ctx.runSessionId,
        phase: ctx.phase,
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  }

  const db = getDb();
  const running = runSessions.getCurrentRunningSessionGlobal(db);
  const head = runSessions.getFirstQueuedSessionGlobal(db);
  if (!running && head) {
    log?.warn?.({
      msg: 'global_queue_idle_with_queued_after_promote',
      runSessionId: ctx.runSessionId,
      phase: ctx.phase,
      nextQueuedRunSessionId: head.id,
      hint: 'check_td_busy_or_prior_global_queue_next_promote_td_failed_logs',
    });
  } else if (!running && !head) {
    log?.info?.({
      msg: 'global_queue_idle_empty_after_finish',
      runSessionId: ctx.runSessionId,
      phase: ctx.phase,
    });
  }
}

/**
 * When a duplicate finish is accepted (session already finished, run row exists), re-check the global
 * queue: if nobody is running but FIFO still has queued sessions, run the same guarded promote path.
 * Idempotent when a running session already exists.
 */
export async function ensurePromoteAfterDuplicateFinishIfIdle(
  runSessionId: string,
  touchDesigner: TouchDesignerIntegration,
  log?: PromotionLog
): Promise<void> {
  const db = getDb();
  const running = runSessions.getCurrentRunningSessionGlobal(db);
  if (running) {
    log?.info?.({
      msg: 'global_queue_duplicate_finish_ensure_skipped_has_running',
      runSessionId,
      runningRunSessionId: running.id,
    });
    return;
  }
  const next = runSessions.getFirstQueuedSessionGlobal(db);
  if (!next) {
    log?.info?.({
      msg: 'global_queue_duplicate_finish_ensure_skipped_no_queued',
      runSessionId,
    });
    return;
  }
  log?.warn?.({
    msg: 'global_queue_duplicate_finish_ensure_promote_invoked',
    runSessionId,
    nextQueuedRunSessionId: next.id,
  });
  await enqueueFinishPromote(() =>
    awaitPromoteAfterFinishGuarded(touchDesigner, log, {
      runSessionId,
      phase: 'duplicate_finish_repair',
    })
  );
}

function speedFromTimeDistance(resultTime: number, distance: number): number {
  if (resultTime <= 0) return 0;
  return (distance / 1000 / resultTime) * 3600;
}

function rankCompetitionEntries(
  entries: Array<{ resultTime: number; distance: number }>,
  runTypeId: RunTypeId
): number[] {
  const ranks: number[] = [];
  let prevKey: string | null = null;
  let prevRank = 0;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const key = runTypeId === 0 ? `${e.distance}|${e.resultTime}` : `${e.resultTime}|${e.distance}`;
    if (i === 0) {
      prevRank = 1;
      prevKey = key;
      ranks.push(1);
      continue;
    }
    if (key === prevKey) {
      ranks.push(prevRank);
    } else {
      prevRank = i + 1;
      prevKey = key;
      ranks.push(prevRank);
    }
  }
  return ranks;
}

export async function submitRunSessionResult(
  dto: RunSessionResultDto,
  touchDesigner: TouchDesignerIntegration,
  log?: PromotionLog
): Promise<{
  runId: string;
  runSessionId: string;
  participantId: string;
  competitionId: string;
  runTypeId: RunTypeId;
  rank: number | null;
}> {
  const db = getDb();
  log?.info?.({
    msg: 'run_result_received',
    runSessionId: dto.runSessionId.trim(),
    resultTime: dto.resultTime,
    distance: dto.distance,
  });
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
  const cfg = getRunTypeById(session.runTypeId);
  if (!cfg) {
    throw new Error('Invalid runTypeId');
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

  /** One verification JPEG per run row — keyed by `runSessionId` via this run only (not participant profile). */
  let verificationLinked = false;
  const inlinePhoto = dto.verificationPhotoBase64?.trim();

  if (inlinePhoto) {
    const parsed = parseVerificationJpegFromBase64Input(inlinePhoto);
    if (!parsed.ok) {
      log?.warn?.({
        msg: 'verification_photo_from_td_rejected',
        runSessionId: session.id,
        runId,
        reason: parsed.reason,
      });
    } else {
      try {
        const rel = writeFinalVerificationJpeg(runId, parsed.buffer);
        runs.setVerificationPhotoPath(db, runId, rel);
        verificationLinked = true;
        const stalePending = runSessions.getPendingPhotoPath(db, session.id);
        if (stalePending) {
          unlinkRelative(stalePending);
          runSessions.clearPendingPhotoPath(db, session.id);
        }
        log?.info?.({
          msg: 'verification_photo_saved_for_run',
          runSessionId: session.id,
          runId,
          participantId: session.participantId,
          path: rel,
          source: 'touchdesigner_result_payload',
          bytes: parsed.buffer.length,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log?.error?.({
          msg: 'verification_photo_write_failed',
          runSessionId: session.id,
          runId,
          error: msg,
        });
      }
    }
  }

  if (!verificationLinked) {
    const pendingPhoto = runSessions.getPendingPhotoPath(db, session.id);
    if (pendingPhoto) {
      try {
        const finalRel = movePendingToFinal(pendingPhoto, runId);
        runs.setVerificationPhotoPath(db, runId, finalRel);
        runSessions.clearPendingPhotoPath(db, session.id);
        verificationLinked = true;
        log?.info?.({
          msg: 'verification_photo_persisted_from_pending',
          runSessionId: session.id,
          runId,
          participantId: session.participantId,
          path: finalRel,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log?.warn?.({
          msg: 'verification_photo_finalize_failed',
          runSessionId: session.id,
          runId,
          participantId: session.participantId,
          pendingPhoto,
          error: msg,
        });
        unlinkRelative(pendingPhoto);
        runSessions.clearPendingPhotoPath(db, session.id);
      }
    }
  }

  if (!verificationLinked) {
    log?.info?.({
      msg: 'verification_photo_missing_for_run_session',
      runSessionId: session.id,
      runId,
      participantId: session.participantId,
    });
  }

  runSessions.updateSessionResults(db, session.id, dto.resultTime, dto.distance);
  log?.info?.({
    msg: 'run_session_marked_finished',
    runSessionId: session.id,
    participantId: session.participantId,
    competitionId: session.competitionId,
  });
  runSessions.renumberGlobalQueuedSessions(db);
  log?.info?.({
    msg: 'global_queue_queued_sessions_renumbered',
    runSessionId: session.id,
  });

  log?.info?.({
    msg: 'run_result_persisted',
    runSessionId: session.id,
    participantId: session.participantId,
    competitionId: session.competitionId,
  });

  const top = runsDb.getLeaderboardForCompetition(db, session.competitionId, session.runTypeId, 200);
  const ranks = rankCompetitionEntries(
    top.map((e) => ({ resultTime: e.run.resultTime, distance: e.run.distance })),
    session.runTypeId
  );
  const idx = top.findIndex((e) => e.run.participantId === session.participantId);
  const rank = idx >= 0 ? ranks[idx] : null;

  const result = {
    runId,
    runSessionId: session.id,
    participantId: session.participantId,
    competitionId: session.competitionId,
    runTypeId: session.runTypeId,
    rank,
  };

  await enqueueFinishPromote(() =>
    awaitPromoteAfterFinishGuarded(touchDesigner, log, {
      runSessionId: session.id,
      phase: 'after_finish',
    })
  );

  log?.info?.({
    msg: 'run_result_finish_promote_chain_completed',
    runSessionId: session.id,
    participantId: session.participantId,
  });

  return result;
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
