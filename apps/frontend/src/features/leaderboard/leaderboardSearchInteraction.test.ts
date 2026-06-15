import { describe, expect, it } from 'vitest';
import {
  leaderboardNameMatchesQuery,
  shouldRunLeaderboardSearchOnKey,
} from './leaderboardSearchInteraction';

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

describe('leaderboardNameMatchesQuery', () => {
  it('matches by partial name or surname from two characters', () => {
    expect(leaderboardNameMatchesQuery('Иван Петров', 'ив')).toBe(true);
    expect(leaderboardNameMatchesQuery('Иван Петров', 'пет')).toBe(true);
  });

  it('matches split partial queries in either name order', () => {
    expect(leaderboardNameMatchesQuery('Иван Петров', 'ив пет')).toBe(true);
    expect(leaderboardNameMatchesQuery('Иван Петров', 'пет ив')).toBe(true);
  });

  it('normalizes case and extra spaces', () => {
    expect(leaderboardNameMatchesQuery('  Иван   Петров  ', '  ПЕТ  ')).toBe(true);
  });

  it('does not match one-character queries or absent fragments', () => {
    expect(leaderboardNameMatchesQuery('Иван Петров', 'и')).toBe(false);
    expect(leaderboardNameMatchesQuery('Иван Петров', 'сид')).toBe(false);
  });
});
