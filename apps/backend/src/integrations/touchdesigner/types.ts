import type { TouchDesignerParticipantPayload } from '@treadmill-challenge/shared';

/**
 * Contract for the TouchDesigner integration.
 * Implementations can use OSC, WebSocket, TCP, or a mock that logs.
 */
export interface TouchDesignerIntegration {
  /**
   * Notify TouchDesigner that a new participant has registered.
   * Called after participant is stored in the database.
   */
  sendParticipantRegistered(payload: TouchDesignerParticipantPayload): void | Promise<void>;
}
