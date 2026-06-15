export const LEADERBOARD_SEARCH_FEEDBACK_MS = 220;
export const LEADERBOARD_SEARCH_MIN_QUERY_LENGTH = 2;

export function shouldRunLeaderboardSearchOnKey(key: string, query: string): boolean {
  return key === 'Enter' && query.trim().length >= LEADERBOARD_SEARCH_MIN_QUERY_LENGTH;
}
