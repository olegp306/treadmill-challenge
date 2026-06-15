import { describe, expect, it } from 'vitest';
import type { LeaderboardEntry } from '../../hooks/useLeaderboard';
import { formatTdMetric } from './tdFormat';

function entry(resultTime: number | string, distance = 1000): LeaderboardEntry {
  return {
    participantId: 'p-1',
    participantName: 'Test Runner',
    resultTime,
    distance,
    speed: 0,
    runId: 'r-1',
    createdAt: '2026-06-15T00:00:00.000Z',
  } as LeaderboardEntry;
}

describe('formatTdMetric', () => {
  it('renders legacy invalid time sentinels as --:-- for TD 1 km and 5 km leaderboards', () => {
    for (const legacyValue of [9999, 166.39, '166:39']) {
      expect(formatTdMetric(entry(legacyValue), 1)).toBe('--:--');
      expect(formatTdMetric(entry(legacyValue, 5000), 2)).toBe('--:--');
    }
  });

  it('keeps the distance metric for the 5 minute TD leaderboard', () => {
    expect(formatTdMetric(entry(166.39, 166.39), 0)).toBe('166\u00A0м');
  });
});
