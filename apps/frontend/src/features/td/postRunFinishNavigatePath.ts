import { isIpadClient } from '../device/isIpadClient';
import { tdLeaderboardResultPath } from './tdLeaderboardRoutes';

/**
 * After a run is finished on the server: TD-style result leaderboard.
 * iPad kiosk skips that full-screen leaderboard and returns to the main flow (`/`).
 */
export function postRunFinishNavigatePath(runSessionId: string): string {
  if (isIpadClient()) return '/';
  return tdLeaderboardResultPath(runSessionId);
}
