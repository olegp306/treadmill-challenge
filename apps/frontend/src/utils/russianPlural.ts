const PEOPLE_FORMS = ['человек', 'человека', 'человек'] as const;
const MINUTE_FORMS = ['минута', 'минуты', 'минут'] as const;

export function pluralRu(count: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(Math.trunc(count));
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

export function pluralizePeople(count: number): string {
  const n = Math.max(0, Math.trunc(count));
  if (n === 0) return 'Очереди нет';
  return `${n} ${pluralRu(n, PEOPLE_FORMS)}`;
}

/**
 * «Перед тобой N человек/человека/человек» (1–5 и далее по правилам русского языка).
 */
export function formatAheadPeopleLine(peopleAhead: number): string {
  const n = Math.max(0, Math.trunc(peopleAhead));
  if (n === 0) {
    return 'Перед тобой никого';
  }
  return `Перед тобой ${n} ${pluralRu(n, PEOPLE_FORMS)}`;
}

/**
 * Часть строки с акцентным цветом (белым): «2 человека.» / «никого.» — точка на белой части (Figma).
 */
export function formatAheadPeopleAccentSlice(peopleAhead: number): string {
  const n = Math.max(0, Math.trunc(peopleAhead));
  if (n === 0) return 'никого.';
  return `${n} ${pluralRu(n, PEOPLE_FORMS)}.`;
}

/** «35 минут» для второй строки оценки ожидания (склонение минут). */
export function formatEstimatedWaitAccentSlice(waitMinutes: number): string {
  const n = Math.max(0, Math.round(waitMinutes));
  return `${n} ${pluralRu(n, MINUTE_FORMS)}`;
}
