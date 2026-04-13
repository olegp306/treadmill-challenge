import osc from 'osc';
import type { TouchDesignerIntegration } from './types.js';
import type {
  RunSessionResultDto,
  TouchDesignerParticipantPayload,
  TouchDesignerRunSessionPayload,
} from '@treadmill-challenge/shared';

const remoteAddress = process.env.TD_OSC_HOST || '127.0.0.1';
const remotePort = Number(process.env.TD_OSC_PORT || 7000);
const startAddress = process.env.TD_OSC_START_ADDRESS || '/treadmill/start';
const runSessionAddress = process.env.TD_OSC_RUN_SESSION_ADDRESS || '/treadmill/runSession';

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

  sendRunSessionStarted(payload: TouchDesignerRunSessionPayload): void {
    ensureOpened();

    udpPort.send({
      address: runSessionAddress,
      args: [
        { type: 's', value: payload.runSessionId },
        { type: 's', value: payload.participantId },
        { type: 's', value: payload.firstName },
        { type: 's', value: payload.lastName },
        { type: 's', value: payload.phone },
        { type: 'i', value: payload.runTypeId },
        { type: 's', value: payload.runTypeName },
        { type: 's', value: payload.runTypeKey },
      ],
    });

    console.log(
      `[TouchDesigner OSC] sent ${runSessionAddress} -> ${remoteAddress}:${remotePort} ${JSON.stringify(payload)}`
    );
  },

  async getRunResultFromTouchDesigner(): Promise<RunSessionResultDto | null> {
    return null;
  },
};
