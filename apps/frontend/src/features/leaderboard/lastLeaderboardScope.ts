import type { Gender, RunTypeId } from '@treadmill-challenge/shared';

const STORAGE_KEY = 'lastFinishedRunScope';

export type LastLeaderboardScope = {
  runTypeId: RunTypeId;
  sex: Gender;
  participantId?: string;
};

export function saveLastFinishedRunScope(scope: LastLeaderboardScope): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scope));
  } catch {
    // ignore storage errors in kiosk mode fallback
  }
}

export function readLastFinishedRunScope(): LastLeaderboardScope | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<LastLeaderboardScope>;
    if ((data.runTypeId !== 0 && data.runTypeId !== 1 && data.runTypeId !== 2) || (data.sex !== 'male' && data.sex !== 'female')) {
      return null;
    }
    return {
      runTypeId: data.runTypeId,
      sex: data.sex,
      participantId: typeof data.participantId === 'string' && data.participantId ? data.participantId : undefined,
    };
  } catch {
    return null;
  }
}
