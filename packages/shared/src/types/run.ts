import type { RunTypeId, RunTypeKey } from '../constants/runTypes.js';

/** @deprecated Use RunTypeKey — kept as alias for existing imports. */
export type RunType = RunTypeKey;

/** Run session lifecycle — never delete rows; only update status. */
export type RunSessionStatus = 'queued' | 'running' | 'finished' | 'cancelled';

export interface RunSession {
  id: string;
  participantId: string;
  /** Competition this session belongs to (queue + results scope). */
  competitionId: string;
  /** Canonical numeric run format (0 | 1 | 2). */
  runTypeId: RunTypeId;
  /** Denormalized key string (same as RUN_TYPES[].key). */
  runType: RunTypeKey;
  status: RunSessionStatus;
  queueNumber: number;
  resultTime: number | null;
  resultDistance: number | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}
