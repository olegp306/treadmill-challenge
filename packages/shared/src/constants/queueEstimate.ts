import type { RunTypeId } from './runTypes.js';

/** Плановая длительность забега для оценки очереди (минуты), по продукту. */
const ESTIMATED_RUN_MINUTES_BY_RUN_TYPE_ID: Record<RunTypeId, number> = {
  /** Максимум за 5 минут */
  0: 5,
  /** Золотой километр */
  1: 5,
  /** Стайер-спринт 5 км */
  2: 30,
};

/**
 * Оценка длительности одного забега по формату (для суммирования ожидания «перед тобой»).
 */
export function estimatedRunDurationMinutes(runTypeId: RunTypeId): number {
  return ESTIMATED_RUN_MINUTES_BY_RUN_TYPE_ID[runTypeId] ?? 5;
}

/**
 * Сумма минут для списка форматов участников впереди; округление до целых минут.
 */
export function sumEstimatedWaitMinutesForRunTypes(runTypeIds: readonly RunTypeId[]): number {
  const raw = runTypeIds.reduce<number>((acc, id) => acc + estimatedRunDurationMinutes(id), 0);
  return Math.max(0, Math.round(raw));
}
