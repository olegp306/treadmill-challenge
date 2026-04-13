import type { RunType } from '../types/run.js';

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
  runType: RunType;
  /** Human-readable run title for TD / OSC. */
  runName: string;
}

/** Start a queued run session after hero selection. */
export interface RunStartDto {
  participantId: string;
  runType: RunType;
}

/**
 * Run result from TouchDesigner or internal — keyed by runSessionId (not participantId).
 */
export interface RunSessionResultDto {
  runSessionId: string;
  resultTime: number;
  distance: number;
}
