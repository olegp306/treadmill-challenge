import { existsSync, readFileSync } from 'node:fs';
import type { Db } from '../db/sqlite.js';
import { runs, runSessions } from '../db/index.js';
import { absoluteFromRelative } from './runPhotoStorage.js';

/**
 * Verification photo is always scoped to a **run session** (runSessionId):
 * - pending file while session is running (kiosk uploaded to pending path);
 * - final file on the `runs` row after finish (`runs.runSessionId` + `verification_photo_path`).
 */
export function getVerificationPhotoAbsolutePathForRunSession(db: Db, runSessionId: string): string | null {
  const pending = runSessions.getPendingPhotoPath(db, runSessionId);
  if (pending) {
    const abs = absoluteFromRelative(pending);
    if (existsSync(abs)) return abs;
  }
  const run = runs.getLatestRunBySessionId(db, runSessionId);
  if (run?.verificationPhotoPath) {
    const abs = absoluteFromRelative(run.verificationPhotoPath);
    if (existsSync(abs)) return abs;
  }
  return null;
}

export function isVerificationPhotoAvailableForRunSession(db: Db, runSessionId: string): boolean {
  return getVerificationPhotoAbsolutePathForRunSession(db, runSessionId) !== null;
}

export function readVerificationPhotoBufferForRunSession(db: Db, runSessionId: string): Buffer | null {
  const abs = getVerificationPhotoAbsolutePathForRunSession(db, runSessionId);
  if (!abs) return null;
  try {
    return readFileSync(abs);
  } catch {
    return null;
  }
}
