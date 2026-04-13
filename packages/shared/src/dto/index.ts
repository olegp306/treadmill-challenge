import type { RunTypeId, RunTypeKey } from '../constants/runTypes.js';

/**
 * Request body for participant registration.
 */
export interface RegisterParticipantDto {
  /** Full name — split server-side into first/last if firstName/lastName not sent. */
  name: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  sex?: string;
  runMode?: 'time' | '1km' | '5km';
  runName?: string;
}

/**
 * Legacy: registration ping to TouchDesigner (optional).
 */
export interface TouchDesignerParticipantPayload {
  login: string;
  name: string;
  phone: string;
  sex?: string;
  runMode: 'time' | '1km' | '5km';
  runName: string;
}

/**
 * Primary payload when a run session starts — use runSessionId as the main identifier.
 */
export interface TouchDesignerRunSessionPayload {
  runSessionId: string;
  participantId: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** Required stable id (0 | 1 | 2). */
  runTypeId: RunTypeId;
  /** Full display name from RUN_TYPES. */
  runTypeName: string;
  /** Key string, e.g. max_5_min — for OSC / debugging. */
  runTypeKey: RunTypeKey;
}

/** Start a queued run session after hero selection. */
export interface RunStartDto {
  participantId: string;
  runTypeId: RunTypeId;
}

/**
 * Run result from TouchDesigner or internal — keyed by runSessionId (not participantId).
 */
export interface RunSessionResultDto {
  runSessionId: string;
  resultTime: number;
  distance: number;
}
