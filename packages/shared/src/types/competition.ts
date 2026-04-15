import type { Gender } from './gender.js';
import type { RunTypeId, RunTypeKey } from '../constants/runTypes.js';

export type CompetitionStatus = 'active' | 'stopped' | 'archived';

export interface Competition {
  id: string;
  runTypeId: RunTypeId;
  runTypeKey: RunTypeKey;
  gender: Gender;
  title: string;
  status: CompetitionStatus;
  startedAt: string;
  stoppedAt: string | null;
  winnerParticipantId: string | null;
  winnerRunSessionId: string | null;
}
