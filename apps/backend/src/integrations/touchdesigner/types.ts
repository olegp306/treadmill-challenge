import type {
  TouchDesignerParticipantPayload,
  TouchDesignerRunSessionPayload,
  RunSessionResultDto,
} from '@treadmill-challenge/shared';

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
}
