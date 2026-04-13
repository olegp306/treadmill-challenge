import type { RegisterParticipantDto, RunResultDto, RunStartDto } from '@treadmill-challenge/shared';

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
    },
  };
}

export function validateRunResultBody(body: unknown): Validation<RunResultDto> {
  if (!body || typeof body !== 'object') {
    return { success: false, message: 'Request body must be an object' };
  }
  const o = body as Record<string, unknown>;
  const participantId = o.participantId;
  const resultTime = o.resultTime;
  const distance = o.distance;
  const speed = o.speed;
  if (typeof participantId !== 'string' || !participantId.trim()) {
    return { success: false, message: 'participantId is required and must be a non-empty string' };
  }
  if (typeof resultTime !== 'number' || resultTime < 0 || !Number.isFinite(resultTime)) {
    return { success: false, message: 'resultTime is required and must be a non-negative number' };
  }
  if (typeof distance !== 'number' || distance < 0 || !Number.isFinite(distance)) {
    return { success: false, message: 'distance is required and must be a non-negative number' };
  }
  if (typeof speed !== 'number' || speed < 0 || !Number.isFinite(speed)) {
    return { success: false, message: 'speed is required and must be a non-negative number' };
  }
  return {
    success: true,
    data: {
      participantId: participantId.trim(),
      resultTime,
      distance,
      speed,
    },
  };
}

const RUN_TYPE_VALUES = ['5min', 'golden_km', 'sprint_5km'] as const;

export function validateRunStartBody(body: unknown): Validation<RunStartDto> {
  if (!body || typeof body !== 'object') {
    return { success: false, message: 'Request body must be an object' };
  }
  const o = body as Record<string, unknown>;
  const participantId = o.participantId;
  const runType = o.runType;
  if (typeof participantId !== 'string' || !participantId.trim()) {
    return { success: false, message: 'participantId is required and must be a non-empty string' };
  }
  if (typeof runType !== 'string' || !RUN_TYPE_VALUES.includes(runType as (typeof RUN_TYPE_VALUES)[number])) {
    return {
      success: false,
      message: 'runType must be one of: 5min, golden_km, sprint_5km',
    };
  }
  return {
    success: true,
    data: {
      participantId: participantId.trim(),
      runType: runType as RunStartDto['runType'],
    },
  };
}
