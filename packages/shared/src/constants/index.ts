export {
  RUN_TYPES,
  getRunTypeById,
  getRunTypeByKey,
  getRunTypeName,
  getRunTypeShortName,
  isRunTypeId,
  runTypeKeyStringToId,
} from './runTypes.js';
export type { RunType, RunTypeConfig, RunTypeId, RunTypeKey } from './runTypes.js';

/**
 * API route paths (for consistency between frontend and backend).
 */
export const API_ROUTES = {
  REGISTER: '/api/register',
  LEADERBOARD: '/api/leaderboard',
  PARTICIPANT: (id: string) => `/api/participants/${id}`,
  RUN_RESULT: '/api/run-result',
  TOUCHDESIGNER_RUN_RESULT: '/api/touchdesigner/run-result',
} as const;
