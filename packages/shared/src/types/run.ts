/** Run format (API + DB). */
export type RunType = 'max_5_min' | 'golden_km' | 'stayer_sprint_5km';

/** Run session lifecycle — never delete rows; only update status. */
export type RunSessionStatus = 'queued' | 'running' | 'finished' | 'cancelled';

export interface RunSession {
  id: string;
  participantId: string;
  runType: RunType;
  status: RunSessionStatus;
  queueNumber: number;
  resultTime: number | null;
  resultDistance: number | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}
