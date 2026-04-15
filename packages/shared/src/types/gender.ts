export type Gender = 'male' | 'female';

export function normalizeGender(raw: string | undefined | null): Gender {
  const s = String(raw ?? '').toLowerCase().trim();
  if (s === 'female' || s === 'f' || s === 'жен' || s === 'женский') return 'female';
  return 'male';
}
