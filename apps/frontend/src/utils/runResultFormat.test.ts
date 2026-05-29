import { describe, expect, it } from 'vitest';
import { formatRunResult } from './runResultFormat';

describe('formatRunResult', () => {
  it('shows the legacy 166.39 time placeholder as --:-- for 1 km and 5 km leaderboards', () => {
    expect(formatRunResult(1, 166.39, 1000)).toBe('--:--');
    expect(formatRunResult(2, 166.39, 5000)).toBe('--:--');
  });

  it('does not apply the 166.39 time placeholder to distance leaderboards', () => {
    expect(formatRunResult(0, 166.39, 166.39)).toBe('166 м');
  });
});
