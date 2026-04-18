import type { Gender } from './gender.js';

export type { Gender } from './gender.js';
export { normalizeGender } from './gender.js';
export type { Competition, CompetitionStatus } from './competition.js';

/**
 * Participant entity stored in the database.
 */
export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** Biological sex for competition pairing (male | female). */
  sex: Gender;
  createdAt: string; // ISO date string
}

/**
 * Run entity - a single treadmill run result (leaderboard).
 */
export interface Run {
  id: string;
  participantId: string;
  competitionId: string;
  /** Present when result came from a run session. */
  runSessionId: string | null;
  resultTime: number; // seconds
  distance: number; // meters
  speed: number; // e.g. km/h
  createdAt: string; // ISO date string
  /** Relative path under server `data/` when a verification photo was saved (admin fraud checks). */
  verificationPhotoPath?: string | null;
}

export type { RunSession, RunSessionStatus } from './run.js';
export type { RunType, RunTypeId, RunTypeKey } from '../constants/runTypes.js';
