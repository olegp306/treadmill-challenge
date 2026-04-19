import type { RunTypeId } from '@treadmill-challenge/shared';
import { sumEstimatedWaitMinutesForRunTypes } from '@treadmill-challenge/shared';

export type QueueEntryLite = {
  runSessionId: string;
  runTypeId: RunTypeId;
};

/**
 * Глобальная очередь API отсортирована по FIFO (`createdAt`). Все записи до текущей сессии —
 * участники «перед тобой»; суммируем оценку минут по их реальным run types.
 */
export function computeAheadFromGlobalQueueEntries(
  entries: QueueEntryLite[],
  myRunSessionId: string
): { peopleAhead: number; waitMinutes: number } {
  const idx = entries.findIndex((e) => e.runSessionId === myRunSessionId);
  if (idx <= 0) {
    return { peopleAhead: 0, waitMinutes: 0 };
  }
  const ahead = entries.slice(0, idx);
  const ids = ahead.map((e) => e.runTypeId);
  return {
    peopleAhead: ahead.length,
    waitMinutes: sumEstimatedWaitMinutesForRunTypes(ids),
  };
}
