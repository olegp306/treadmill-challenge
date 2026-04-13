import { randomUUID } from 'node:crypto';
import { getDb, participants } from '../db/index.js';
import type { TouchDesignerIntegration } from '../integrations/touchdesigner/types.js';
import type { RegisterParticipantDto, Participant } from '@treadmill-challenge/shared';

function splitName(dto: RegisterParticipantDto): { firstName: string; lastName: string } {
  if (dto.firstName?.trim() && dto.lastName?.trim()) {
    return { firstName: dto.firstName.trim(), lastName: dto.lastName.trim() };
  }
  const parts = dto.name.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

export function registerParticipant(
  dto: RegisterParticipantDto,
  touchDesigner: TouchDesignerIntegration
): Participant {
  const db = getDb();
  const id = randomUUID();
  const { firstName, lastName } = splitName(dto);
  const participant = participants.createParticipant(db, id, firstName, lastName, dto.phone.trim());

  touchDesigner.sendParticipantRegistered({
    login: participant.id,
    name: `${participant.firstName} ${participant.lastName}`.trim(),
    phone: participant.phone,
    sex: dto.sex,
    runMode: dto.runMode ?? 'time',
    runName: dto.runName ?? 'Run',
  });

  return participant;
}
