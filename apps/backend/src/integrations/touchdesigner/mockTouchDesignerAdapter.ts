import type { TouchDesignerIntegration } from './types.js';
import type { TouchDesignerParticipantPayload } from '@treadmill-challenge/shared';

/**
 * Mock adapter that only logs outgoing payloads and returns null for run result.
 * Replace with a real OSC/WebSocket/TCP/OCR implementation when integrating with TouchDesigner.
 */
export const mockTouchDesignerAdapter: TouchDesignerIntegration = {
  sendParticipantRegistered(payload: TouchDesignerParticipantPayload): void {
    console.log('[TouchDesigner Mock] sendParticipantRegistered:', JSON.stringify(payload, null, 2));
  },

  async getRunResultFromTouchDesigner(): Promise<null> {
    // Real implementation would read from TouchDesigner (e.g. OCR, WebSocket, or poll).
    return null;
  },
};
