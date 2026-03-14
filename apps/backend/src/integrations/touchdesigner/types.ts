import type {
  TouchDesignerParticipantPayload,
  RunResultDto,
} from '@treadmill-challenge/shared';

/**
 * Contract for the TouchDesigner integration (e.g. connection by OCR).
 * Implementations can use OSC, WebSocket, TCP, or a mock that logs.
 */
export interface TouchDesignerIntegration {
  /**
   * Send registration data to TouchDesigner: login, phone, sex, name, name of running.
   * Called after participant is stored in the database.
   */
  sendParticipantRegistered(payload: TouchDesignerParticipantPayload): void | Promise<void>;

  /**
   * Get run result data from TouchDesigner (e.g. when TouchDesigner pushes via OCR or poll).
   * Returns the latest run result if available; null if none.
   */
  getRunResultFromTouchDesigner(): Promise<RunResultDto | null>;
}
