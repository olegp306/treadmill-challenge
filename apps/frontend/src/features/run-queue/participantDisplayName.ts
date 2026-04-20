const MAX_HEADER_NAME_LENGTH = 35;

function normalize(v: string): string {
  return v.trim().replace(/\s+/g, ' ');
}

function capWord(v: string): string {
  if (!v) return '';
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

export function formatParticipantDisplayName(firstName: string, lastName: string): string {
  const first = capWord(normalize(firstName));
  const last = capWord(normalize(lastName));
  const lastInitial = last ? `${last.charAt(0)}.` : '';
  const base = [first, lastInitial].filter(Boolean).join(' ').trim();
  const value = base || 'Участник';
  if (value.length <= MAX_HEADER_NAME_LENGTH) return value;
  return `${value.slice(0, MAX_HEADER_NAME_LENGTH)}…`;
}
