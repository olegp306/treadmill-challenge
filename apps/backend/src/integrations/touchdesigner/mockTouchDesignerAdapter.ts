import type { TouchDesignerIntegration } from './types.js';
import type { TouchDesignerParticipantPayload } from '@treadmill-challenge/shared';

/**
 * Mock adapter that only logs outgoing payloads.
 * Replace with a real OSC/WebSocket/TCP implementation when integrating with TouchDesigner.
 */
export const mockTouchDesignerAdapter: TouchDesignerIntegration = {
  sendParticipantRegistered(payload: TouchDesignerParticipantPayload): void {
    console.log('[TouchDesigner Mock] sendParticipantRegistered:', JSON.stringify(payload, null, 2));
  },
};
