export const LEADERBOARD_SEARCH_FEEDBACK_MS = 220;
export const LEADERBOARD_SEARCH_MIN_QUERY_LENGTH = 2;

export function normalizeLeaderboardSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

export function leaderboardNameMatchesQuery(participantName: string, query: string): boolean {
  const normalizedQuery = normalizeLeaderboardSearchText(query);
  if (normalizedQuery.length < LEADERBOARD_SEARCH_MIN_QUERY_LENGTH) return false;

  const normalizedName = normalizeLeaderboardSearchText(participantName);
  if (!normalizedName) return false;

  const nameParts = normalizedName.split(' ').filter(Boolean);
  const reversedName = [...nameParts].reverse().join(' ');
  const searchableName = `${normalizedName} ${reversedName}`;
  const queryParts = normalizedQuery.split(' ').filter(Boolean);

  return queryParts.every((part) => searchableName.includes(part));
}

export function shouldRunLeaderboardSearchOnKey(key: string, query: string): boolean {
  return key === 'Enter' && query.trim().length >= LEADERBOARD_SEARCH_MIN_QUERY_LENGTH;
}
