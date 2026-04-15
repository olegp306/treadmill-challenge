/** Figma-style short name: «АЛЕКСЕЙ А.» */
export function formatParticipantDisplayName(firstName: string, lastName: string): string {
  const f = firstName.trim();
  const l = lastName.trim();
  if (!f && !l) return 'УЧАСТНИК';
  const first = f ? f.charAt(0).toUpperCase() + f.slice(1).toLowerCase() : '';
  const lastInitial = l ? `${l.charAt(0).toUpperCase()}.` : '';
  return `${first} ${lastInitial}`.trim().toUpperCase();
}
