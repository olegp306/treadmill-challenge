/**
 * Request body for participant registration.
 */
export interface RegisterParticipantDto {
  name: string;
  phone: string;
}

/**
 * Payload sent to TouchDesigner integration when a participant registers.
 */
export interface TouchDesignerParticipantPayload {
  participantId: string;
  name: string;
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
