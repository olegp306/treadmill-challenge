import type { Gender } from '@treadmill-challenge/shared';
import type { Db } from '../db/sqlite.js';
import * as events from '../db/events.js';

type ActorRole = 'admin' | 'manager';

type ParticipantAuditShape = {
  firstName: string;
  lastName: string;
  phone: string;
  sex: Gender;
};

const roleLabel: Record<ActorRole, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
};

const panelLabel: Record<ActorRole, string> = {
  admin: 'админскую панель',
  manager: 'менеджерскую панель',
};

const fieldLabel: Record<keyof ParticipantAuditShape, string> = {
  firstName: 'имя',
  lastName: 'фамилия',
  phone: 'телефон',
  sex: 'пол',
};

function stringifyValue(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : 'пусто';
}

function sessionIdForAudit(role: ActorRole, ip: string): string {
  return `audit:${role}:${ip || 'unknown'}`;
}

export function recordPanelLoginAuditEvent(
  db: Db,
  params: {
    role: ActorRole;
    ip: string;
    userAgent?: string | null;
  }
): void {
  const userAgent = params.userAgent?.trim() || '';
  events.insertEvent(db, {
    sessionId: sessionIdForAudit(params.role, params.ip),
    participantId: null,
    runSessionId: null,
    type: params.role === 'admin' ? 'admin_panel_login' : 'manager_panel_login',
    readableMessage: `Вход в ${panelLabel[params.role]}: ${roleLabel[params.role]}, IP ${params.ip || 'unknown'}`,
    payloadJson: JSON.stringify({
      actorRole: params.role,
      actorIp: params.ip || 'unknown',
      ...(userAgent ? { userAgent } : {}),
    }),
  });
}

export function recordParticipantUpdateAuditEvent(
  db: Db,
  params: {
    actorRole: ActorRole;
    actorIp: string;
    userAgent?: string | null;
    participantId: string;
    before: ParticipantAuditShape;
    after: ParticipantAuditShape;
  }
): boolean {
  const changes: Partial<Record<keyof ParticipantAuditShape, { before: string; after: string }>> = {};
  for (const key of Object.keys(fieldLabel) as Array<keyof ParticipantAuditShape>) {
    const before = params.before[key].trim();
    const after = params.after[key].trim();
    if (before !== after) {
      changes[key] = { before, after };
    }
  }

  const changedKeys = Object.keys(changes) as Array<keyof ParticipantAuditShape>;
  if (changedKeys.length === 0) return false;

  const readableChanges = changedKeys
    .map((key) => {
      const change = changes[key];
      return change
        ? `${fieldLabel[key]}: ${stringifyValue(change.before)} → ${stringifyValue(change.after)}`
        : '';
    })
    .filter(Boolean)
    .join('; ');

  const userAgent = params.userAgent?.trim() || '';
  events.insertEvent(db, {
    sessionId: sessionIdForAudit(params.actorRole, params.actorIp),
    participantId: params.participantId,
    runSessionId: null,
    type: 'participant_profile_updated',
    readableMessage: `${roleLabel[params.actorRole]} изменил данные участника ${params.participantId}: ${readableChanges}`,
    payloadJson: JSON.stringify({
      actorRole: params.actorRole,
      actorIp: params.actorIp || 'unknown',
      participantId: params.participantId,
      changes,
      before: params.before,
      after: params.after,
      ...(userAgent ? { userAgent } : {}),
    }),
  });
  return true;
}
