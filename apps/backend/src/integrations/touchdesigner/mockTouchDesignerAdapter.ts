import type { TouchDesignerIntegration } from './types.js';
import type {
  TouchDesignerParticipantPayload,
  TouchDesignerRunSessionPayload,
  RunSessionResultDto,
} from '@treadmill-challenge/shared';

export const mockTouchDesignerAdapter: TouchDesignerIntegration = {
  sendParticipantRegistered(payload: TouchDesignerParticipantPayload): void {
    console.log('[TouchDesigner Mock] sendParticipantRegistered:', JSON.stringify(payload, null, 2));
  },

  sendRunSessionStarted(payload: TouchDesignerRunSessionPayload): void {
    console.log('[TouchDesigner Mock] sendRunSessionStarted:', JSON.stringify(payload, null, 2));
  },

  async getRunResultFromTouchDesigner(): Promise<null> {
    return null;
  },
};
