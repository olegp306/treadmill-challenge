import { describe, expect, it } from 'vitest';
import { shouldRunLeaderboardSearchOnKey } from './leaderboardSearchInteraction';

describe('shouldRunLeaderboardSearchOnKey', () => {
  it('runs search on Enter when query is long enough', () => {
    expect(shouldRunLeaderboardSearchOnKey('Enter', 'Иван')).toBe(true);
    expect(shouldRunLeaderboardSearchOnKey('Enter', '  Bob  ')).toBe(true);
  });

  it('does not run search on short queries or other keys', () => {
    expect(shouldRunLeaderboardSearchOnKey('Enter', 'Ив')).toBe(false);
    expect(shouldRunLeaderboardSearchOnKey('Tab', 'Иван')).toBe(false);
  });
});
