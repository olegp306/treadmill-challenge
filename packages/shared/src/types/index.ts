/**
 * Participant status in the treadmill challenge flow.
 */
export type ParticipantStatus = 'registered' | 'queued' | 'running' | 'finished';

/**
 * Participant entity stored in the database.
 */
export interface Participant {
  id: string;
  name: string;
  phone: string;
  status: ParticipantStatus;
  createdAt: string; // ISO date string
}

/**
 * Run entity - a single treadmill run result.
 */
export interface Run {
  id: string;
  participantId: string;
  resultTime: number; // seconds
  distance: number;   // meters
  speed: number;      // e.g. km/h
  createdAt: string;  // ISO date string
}
