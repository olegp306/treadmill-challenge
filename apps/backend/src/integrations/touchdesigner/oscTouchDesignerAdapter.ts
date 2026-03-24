import osc from 'osc';
import type { TouchDesignerIntegration } from './types.js';
import type { RunResultDto, TouchDesignerParticipantPayload } from '@treadmill-challenge/shared';

const remoteAddress = process.env.TD_OSC_HOST || '127.0.0.1';
const remotePort = Number(process.env.TD_OSC_PORT || 7000);
const startAddress = process.env.TD_OSC_START_ADDRESS || '/treadmill/start';

let isOpened = false;

const udpPort = new osc.UDPPort({
  localAddress: '0.0.0.0',
  localPort: 0,
  remoteAddress,
  remotePort,
  metadata: true,
});

function ensureOpened(): void {
  if (isOpened) return;
  udpPort.open();
  isOpened = true;
}

export const oscTouchDesignerAdapter: TouchDesignerIntegration = {
  sendParticipantRegistered(payload: TouchDesignerParticipantPayload): void {
    ensureOpened();

    udpPort.send({
      address: startAddress,
      args: [
        { type: 's', value: payload.login },
        { type: 's', value: payload.name },
        { type: 's', value: payload.phone },
        { type: 's', value: payload.sex ?? '' },
        { type: 's', value: payload.runMode },
        { type: 's', value: payload.runName },
      ],
    });

    console.log(
      `[TouchDesigner OSC] sent ${startAddress} -> ${remoteAddress}:${remotePort} ${JSON.stringify(payload)}`
    );
  },

  async getRunResultFromTouchDesigner(): Promise<RunResultDto | null> {
    // Pull flow is not implemented in this OSC adapter yet.
    // For now, TouchDesigner should push run result via POST /api/run-result.
    return null;
  },
};

