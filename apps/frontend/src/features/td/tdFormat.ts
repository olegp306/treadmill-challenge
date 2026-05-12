import type { RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeShortName } from '@treadmill-challenge/shared';
import type { LeaderboardEntry } from '../../hooks/useLeaderboard';
import { formatRunResult } from '../../utils/runResultFormat';

export function formatTdMetric(entry: LeaderboardEntry, runTypeId: RunTypeId): string {
  if (runTypeId === 0) return `${Math.round(entry.distance)}\u00A0м`;
  return formatRunResult(runTypeId, entry.resultTime, entry.distance);
}

export function runTypeHeaderUpper(runTypeId: RunTypeId): string {
  return getRunTypeShortName(runTypeId).toUpperCase();
}

export function genderHeaderLabel(sex: 'male' | 'female'): string {
  return sex === 'male' ? 'мужской зачет' : 'женский зачет';
}
