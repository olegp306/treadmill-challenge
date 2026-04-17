import type {
  TouchDesignerParticipantPayload,
  TouchDesignerRunSessionPayload,
  RunSessionResultDto,
} from '@treadmill-challenge/shared';

export type TreadmillStatus = 'free' | 'busy' | 'unknown';

/**
 * Contract for the TouchDesigner integration (e.g. OSC).
 */
export interface TouchDesignerIntegration {
  sendParticipantRegistered(payload: TouchDesignerParticipantPayload): void | Promise<void>;

  /** Primary path: run session created — use runSessionId as main identifier. */
  sendRunSessionStarted(payload: TouchDesignerRunSessionPayload): void | Promise<void>;

  /**
   * Poll for run result from TouchDesigner (optional).
   * Prefer POST /api/run-result with runSessionId for pushes.
   */
  getRunResultFromTouchDesigner(): Promise<RunSessionResultDto | null>;

  /**
   * Optional ack/status channel for treadmill availability right after start payload.
   * If not implemented by adapter, backend assumes "free".
   */
  getTreadmillStatusAfterStart?(payload: TouchDesignerRunSessionPayload): Promise<TreadmillStatus> | TreadmillStatus;
}
