/**
 * API route paths (for consistency between frontend and backend).
 */
export const API_ROUTES = {
  REGISTER: '/api/register',
  LEADERBOARD: '/api/leaderboard',
  PARTICIPANT: (id: string) => `/api/participants/${id}`,
  RUN_RESULT: '/api/run-result',
} as const;
