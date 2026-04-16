export function formatParticipantDisplayName(firstName: string, lastName: string): string {
  const f = firstName.trim();
  const l = lastName.trim();
  if (!f && !l) return 'УЧАСТНИК';
  const first = f ? f.charAt(0).toUpperCase() + f.slice(1).toLowerCase() : '';
  const last = l ? l.charAt(0).toUpperCase() + l.slice(1).toLowerCase() : '';
  return `${first} ${last}`.trim().toUpperCase();
}
