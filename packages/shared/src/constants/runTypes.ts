/**
 * Single source of truth for treadmill run formats (API, DB id, UI labels, TouchDesigner).
 * IDs are stable across the stack: 0, 1, 2.
 */
export const RUN_TYPES = [
  {
    id: 0 as const,
    key: 'max_5_min' as const,
    name: 'Максимум за 5 минут',
    shortName: 'Максимум за 5 минут',
    description: 'Покажи максимум дистанции за отведённые пять минут.',
  },
  {
    id: 1 as const,
    key: 'golden_km' as const,
    name: 'Золотой километр',
    shortName: 'Золотой километр',
    description: 'Пройди километр и сравни свой результат с другими участниками.',
  },
  {
    id: 2 as const,
    key: 'stayer_sprint_5km' as const,
    name: 'Стайер-спринт на 5 км',
    shortName: 'Стайер-спринт на 5 км',
    description: 'Продемонстрируй скоростную выносливость на длинной дистанции.',
  },
] as const;

export type RunTypeConfig = (typeof RUN_TYPES)[number];
export type RunTypeId = RunTypeConfig['id'];
export type RunTypeKey = RunTypeConfig['key'];

/** Backward-compatible alias: run type key string used in URLs and types. */
export type RunType = RunTypeKey;

const BY_ID = new Map<number, RunTypeConfig>(RUN_TYPES.map((t) => [t.id, t]));
const BY_KEY = new Map<string, RunTypeConfig>(RUN_TYPES.map((t) => [t.key, t]));

export function isRunTypeId(n: unknown): n is RunTypeId {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 2;
}

export function getRunTypeById(id: number): RunTypeConfig | undefined {
  return BY_ID.get(id);
}

export function getRunTypeByKey(key: string): RunTypeConfig | undefined {
  return BY_KEY.get(key);
}

export function getRunTypeName(id: number): string {
  return getRunTypeById(id)?.name ?? '';
}

export function getRunTypeShortName(id: number): string {
  return getRunTypeById(id)?.shortName ?? '';
}

/** Map legacy DB string keys to id (including historical values). */
export function runTypeKeyStringToId(runType: string): RunTypeId | undefined {
  const direct = getRunTypeByKey(runType);
  if (direct) return direct.id;
  if (runType === '5min') return 0;
  if (runType === 'sprint_5km') return 2;
  return undefined;
}
