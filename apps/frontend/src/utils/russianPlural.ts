const PEOPLE_FORMS = ['человек', 'человека', 'человек'] as const;

function pluralRu(count: number, forms: readonly [string, string, string]): string {
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
