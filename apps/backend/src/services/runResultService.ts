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
  runSessions.renumberGlobalQueuedSessions(db);

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

  /** Do not await: promotion waits up to TD_OSC_ACK_TIMEOUT_MS for the next runner — clients should get HTTP 201 immediately after persist. */
  void promoteNextQueuedSessionAfterFinish(touchDesigner, log).catch((e: unknown) => {
    log?.error?.({
      msg: 'global_queue_promote_unexpected',
      error: e instanceof Error ? e.message : String(e),
    });
  });

  log?.info?.({
    msg: 'run_result_promotion_scheduled_async',
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
