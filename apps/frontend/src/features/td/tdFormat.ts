import type { RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeShortName } from '@treadmill-challenge/shared';
import type { LeaderboardEntry } from '../../hooks/useLeaderboard';

export function formatTimeMmSs(sec: number): string {
  const t = Math.round(sec);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatTdMetric(entry: LeaderboardEntry, runTypeId: RunTypeId): string {
  if (runTypeId === 0) return `${Math.round(entry.distance)} м`;
  return formatTimeMmSs(entry.resultTime);
}

export function runTypeHeaderUpper(runTypeId: RunTypeId): string {
  return getRunTypeShortName(runTypeId).toUpperCase();
}

export function genderHeaderLabel(sex: 'male' | 'female'): string {
  return sex === 'male' ? 'мужской зачет' : 'женский зачет';
}
