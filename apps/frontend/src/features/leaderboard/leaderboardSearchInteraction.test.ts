import { describe, expect, it } from 'vitest';
import { shouldRunLeaderboardSearchOnKey } from './leaderboardSearchInteraction';

describe('shouldRunLeaderboardSearchOnKey', () => {
  it('runs search on Enter when query has at least two characters', () => {
    expect(shouldRunLeaderboardSearchOnKey('Enter', 'Iv')).toBe(true);
    expect(shouldRunLeaderboardSearchOnKey('Enter', '  Bob  ')).toBe(true);
  });

  it('does not run search on one-character queries or other keys', () => {
    expect(shouldRunLeaderboardSearchOnKey('Enter', 'I')).toBe(false);
    expect(shouldRunLeaderboardSearchOnKey('Tab', 'Ivan')).toBe(false);
  });
});
