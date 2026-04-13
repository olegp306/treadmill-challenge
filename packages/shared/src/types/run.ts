/** Run format selected on the hero screen (API + DB). */
export type RunType = '5min' | 'golden_km' | 'sprint_5km';

/** Run session lifecycle in the queue. */
export type RunSessionStatus = 'queued' | 'running' | 'finished';

export interface RunSession {
  id: string;
  participantId: string;
  runType: RunType;
  status: RunSessionStatus;
  createdAt: string;
  finishedAt: string | null;
  resultRunId: string | null;
}
