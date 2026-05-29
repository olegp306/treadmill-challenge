export const LEADERBOARD_SEARCH_FEEDBACK_MS = 220;

export function shouldRunLeaderboardSearchOnKey(key: string, query: string): boolean {
  return key === 'Enter' && query.trim().length >= 3;
}
