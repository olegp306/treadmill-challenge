import type {
  RegisterParticipantDto,
  RunSessionResultDto,
  RunStartDto,
} from '@treadmill-challenge/shared';
import {
  getRunTypeByKey,
  isRunTypeId,
  normalizeGender,
  type Gender,
  type RunTypeId,
} from '@treadmill-challenge/shared';

export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  message: string;
}

export type Validation<T> = ValidationResult<T> | ValidationError;

export function validateRegisterBody(body: unknown): Validation<RegisterParticipantDto> {
  if (!body || typeof body !== 'object') {
    return { success: false, message: 'Request body must be an object' };
  }
  const o = body as Record<string, unknown>;
  const name = o.name;
  const phone = o.phone;
  if (typeof name !== 'string' || !name.trim()) {
    return { success: false, message: 'name is required and must be a non-empty string' };
  }
  if (typeof phone !== 'string' || !phone.trim()) {
    return { success: false, message: 'phone is required and must be a non-empty string' };
  }
  const sex = o.sex;
  const runMode = o.runMode;
  const runName = o.runName;
  const firstName = o.firstName;
  const lastName = o.lastName;
  if (
    typeof runMode !== 'undefined' &&
    runMode !== 'time' &&
    runMode !== '1km' &&
    runMode !== '5km'
  ) {
    return { success: false, message: 'runMode must be one of: time, 1km, 5km' };
  }
  return {
    success: true,
    data: {
      name: name.trim(),
      phone: phone.trim(),
      ...(typeof sex === 'string' && sex.trim() && { sex: sex.trim() }),
      ...(typeof runMode === 'string' && { runMode }),
      ...(typeof runName === 'string' && runName.trim() && { runName: runName.trim() }),
      ...(typeof firstName === 'string' && firstName.trim() && { firstName: firstName.trim() }),
      ...(typeof lastName === 'string' && lastName.trim() && { lastName: lastName.trim() }),
    },
  };
}

export function validateRunSessionResultBody(body: unknown): Validation<RunSessionResultDto> {
  if (!body || typeof body !== 'object') {
    return { success: false, message: 'Request body must be an object' };
  }
  const o = body as Record<string, unknown>;
  const resultObj =
    o.result && typeof o.result === 'object' ? (o.result as Record<string, unknown>) : ({} as Record<string, unknown>);
  const runSessionId = o.runSessionId;
  const resultTime = resultObj.resultTime ?? o.resultTime;
  const distance = resultObj.distance ?? o.distance;
  if (typeof runSessionId !== 'string' || !runSessionId.trim()) {
    return { success: false, message: 'runSessionId is required and must be a non-empty string' };
  }
  if (typeof resultTime !== 'number' || resultTime < 0 || !Number.isFinite(resultTime)) {
    return { success: false, message: 'resultTime is required and must be a non-negative number' };
  }
  if (typeof distance !== 'number' || distance < 0 || !Number.isFinite(distance)) {
    return { success: false, message: 'distance is required and must be a non-negative number' };
  }
  return {
    success: true,
    data: {
      runSessionId: runSessionId.trim(),
      resultTime,
      distance,
    },
  };
}

export function validateRunStartBody(body: unknown): Validation<RunStartDto> {
  if (!body || typeof body !== 'object') {
    return { success: false, message: 'Request body must be an object' };
  }
  const o = body as Record<string, unknown>;
  const participantId = o.participantId;
  const rawRunTypeId = o.runTypeId;
  if (typeof participantId !== 'string' || !participantId.trim()) {
    return { success: false, message: 'participantId is required and must be a non-empty string' };
  }
  const n = typeof rawRunTypeId === 'number' ? rawRunTypeId : Number(rawRunTypeId);
  if (!Number.isFinite(n) || !isRunTypeId(n)) {
    return { success: false, message: 'runTypeId must be 0, 1, or 2' };
  }
  return {
    success: true,
    data: {
      participantId: participantId.trim(),
      runTypeId: n as RunTypeId,
    },
  };
}

/** Optional `sex` query (also accepts legacy `gender`): male | female (public queue filter). */
export function parseSexQuery(query: Record<string, unknown>): Gender | undefined | 'INVALID' {
  const raw = query.gender ?? query.sex;
  if (raw === undefined || raw === '') return undefined;
  if (raw === 'male' || raw === 'female') return raw;
  return 'INVALID';
}

/** Both `runTypeId` and `sex` (legacy: `gender`) required for competition-scoped leaderboard. */
export function parseLeaderboardScopeQuery(
  query: Record<string, unknown>
): { runTypeId: RunTypeId; sex: Gender } | undefined | 'INVALID' {
  const hasRt = query.runTypeId !== undefined && query.runTypeId !== '';
  const rawG = query.gender ?? query.sex;
  const hasG = rawG !== undefined && rawG !== '';
  if (!hasRt && !hasG) {
    return undefined;
  }
  if (!hasRt || !hasG) {
    return 'INVALID';
  }
  const n = Number(query.runTypeId);
  if (!isRunTypeId(n)) {
    return 'INVALID';
  }
  const g = normalizeGender(String(rawG));
  return { runTypeId: n as RunTypeId, sex: g };
}

/** @deprecated Use parseSexQuery. */
export const parseGenderQuery = parseSexQuery;

/** Parse optional queue filter: `runTypeId` (number) or legacy `runType` (key string). */
export function parseRunQueueFilterQuery(query: Record<string, unknown>): RunTypeId | undefined | 'INVALID' {
  const hasId = query.runTypeId !== undefined && query.runTypeId !== '';
  const hasKey = typeof query.runType === 'string' && query.runType.length > 0;
  if (!hasId && !hasKey) {
    return undefined;
  }
  if (hasId) {
    const n = Number(query.runTypeId);
    if (!isRunTypeId(n)) {
      return 'INVALID';
    }
    return n as RunTypeId;
  }
  const rt = getRunTypeByKey(query.runType as string);
  if (!rt) {
    return 'INVALID';
  }
  return rt.id;
}
