/** TouchDesigner-style full-screen leaderboards (kiosk / external display). */

export const TD_LEADERBOARD_WAITING_PATH = '/td/leaderboard/waiting' as const;

export function tdLeaderboardResultPath(runSessionId: string): string {
  const q = new URLSearchParams({ runSessionId: runSessionId.trim() });
  return `/td/leaderboard/result?${q.toString()}`;
}
