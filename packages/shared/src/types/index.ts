/**
 * Participant entity stored in the database.
 */
export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: string; // ISO date string
}

/**
 * Run entity - a single treadmill run result (leaderboard).
 */
export interface Run {
  id: string;
  participantId: string;
  resultTime: number; // seconds
  distance: number; // meters
  speed: number; // e.g. km/h
  createdAt: string; // ISO date string
}

export type { RunSession, RunSessionStatus } from './run.js';
export type { RunType, RunTypeId, RunTypeKey } from '../constants/runTypes.js';
