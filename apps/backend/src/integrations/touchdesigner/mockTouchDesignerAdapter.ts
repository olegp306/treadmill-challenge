import type { TouchDesignerIntegration } from './types.js';
import type {
  TouchDesignerParticipantPayload,
  TouchDesignerRunSessionPayload,
  RunSessionResultDto,
} from '@treadmill-challenge/shared';
import type { TreadmillStatus } from './types.js';

export const mockTouchDesignerAdapter: TouchDesignerIntegration = {
  sendParticipantRegistered(payload: TouchDesignerParticipantPayload): void {
    console.log('[TouchDesigner Mock] sendParticipantRegistered:', JSON.stringify(payload, null, 2));
  },

  sendRunSessionStarted(payload: TouchDesignerRunSessionPayload): void {
    console.log('[TouchDesigner Mock] sendRunSessionStarted:', JSON.stringify(payload, null, 2));
  },

  getTreadmillStatusAfterStart(): TreadmillStatus {
    const raw = (process.env.TD_TREADMILL_STATUS || 'free').toLowerCase();
    if (raw === 'busy') return 'busy';
    if (raw === 'unknown') return 'unknown';
    return 'free';
  },

  async getRunResultFromTouchDesigner(): Promise<null> {
    return null;
  },
};
