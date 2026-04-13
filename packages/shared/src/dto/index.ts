import type { RunType } from '../types/run.js';

/**
 * Request body for participant registration.
 */
export interface RegisterParticipantDto {
  name: string;
  phone: string;
  /** Optional: e.g. "male" | "female" | "other" — sent to TouchDesigner. */
  sex?: string;
  /** Challenge mode for the run start. */
  runMode?: 'time' | '1km' | '5km';
  /** Optional: name of the running (session/run label) — sent to TouchDesigner. */
  runName?: string;
}

/**
 * Payload sent to TouchDesigner when a participant registers (e.g. via OCR connection).
 * Contains everything TouchDesigner needs to display/identify the runner.
 */
export interface TouchDesignerParticipantPayload {
  /** Login / participant identifier (use participantId). */
  login: string;
  name: string;
  phone: string;
  /** Optional sex — e.g. "male" | "female" | "other". */
  sex?: string;
  /** Challenge mode selected by the participant. */
  runMode: 'time' | '1km' | '5km';
  /** Name of the running (session/run label). */
  runName: string;
}

/**
 * Request body for submitting a run result (from TouchDesigner or internal).
 */
export interface RunResultDto {
  participantId: string;
  resultTime: number; // seconds
  distance: number;   // meters
  speed: number;      // e.g. km/h
}

/** Start a queued run session after hero selection. */
export interface RunStartDto {
  participantId: string;
  runType: RunType;
}
