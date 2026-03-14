import { randomUUID } from 'node:crypto';
import { getDb, participants } from '../db/index.js';
import type { TouchDesignerIntegration } from '../integrations/touchdesigner/types.js';
import type { RegisterParticipantDto } from '@treadmill-challenge/shared';

export interface RegistrationResult {
  id: string;
  name: string;
  phone: string;
  status: string;
  createdAt: string;
}

export function registerParticipant(
  dto: RegisterParticipantDto,
  touchDesigner: TouchDesignerIntegration
): RegistrationResult {
  const db = getDb();
  const id = randomUUID();
  const participant = participants.createParticipant(db, id, dto.name.trim(), dto.phone.trim());

  touchDesigner.sendParticipantRegistered({
    login: participant.id,
    name: participant.name,
    phone: participant.phone,
    sex: dto.sex,
    runName: dto.runName ?? 'Run',
  });

  return participant;
}
