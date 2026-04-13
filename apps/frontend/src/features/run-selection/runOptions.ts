import type { RunType } from '@treadmill-challenge/shared';

export type { RunType };

export interface RunOptionDefinition {
  runType: RunType;
  title: string;
  description: string;
}

export const RUN_OPTIONS: RunOptionDefinition[] = [
  {
    runType: 'max_5_min',
    title: 'Максимум за 5 минут',
    description: 'Покажи максимум дистанции за отведённые пять минут.',
  },
  {
    runType: 'golden_km',
    title: 'Золотой километр',
    description: 'Пройди километр и сравни свой результат с другими участниками.',
  },
  {
    runType: 'stayer_sprint_5km',
    title: 'Стайер-спринт на 5 км',
    description: 'Продемонстрируй скоростную выносливость на длинной дистанции.',
  },
];

export function getRunOption(runType: RunType): RunOptionDefinition {
  return RUN_OPTIONS.find((o) => o.runType === runType) ?? RUN_OPTIONS[2];
}
