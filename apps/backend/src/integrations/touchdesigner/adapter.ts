import type { TouchDesignerIntegration } from './types.js';
import { mockTouchDesignerAdapter } from './mockTouchDesignerAdapter.js';
import { oscTouchDesignerAdapter } from './oscTouchDesignerAdapter.js';

const adapterName = (process.env.TD_ADAPTER || 'mock').toLowerCase();

export const touchDesignerAdapter: TouchDesignerIntegration =
  adapterName === 'osc' ? oscTouchDesignerAdapter : mockTouchDesignerAdapter;

