/** Max digits: 1 (after +) + 3 + 3 + 4 → international display +X XXX XXX XXXX */
export const PHONE_MAX_DIGITS = 11;

/**
 * Build display string from digits only: +X XXX XXX XXXX (spaces; partial groups while typing).
 * No regex chains — parse digits, rebuild from scratch each time.
 */
export function formatPhoneFromDigits(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
  if (!d) return '';

  let out = `+${d[0]}`;
  const rest = d.slice(1);
  const g1 = rest.slice(0, 3);
  const g2 = rest.slice(3, 6);
  const g3 = rest.slice(6, 10);
  if (g1.length > 0) out += ` ${g1}`;
  if (g2.length > 0) out += ` ${g2}`;
  if (g3.length > 0) out += ` ${g3}`;
  return out;
}

/**
 * input-format parse: digits only, max length.
 */
export function parsePhoneChar(character: string, value: string): string | undefined {
  if (/\d/.test(character)) {
    if (value.length >= PHONE_MAX_DIGITS) return undefined;
    return character;
  }
  return undefined;
}

/**
 * input-format format: deterministic +X XXX XXX XXXX display (caret-safe with useInput).
 */
export function formatPhoneParsed(value?: string): { text: string; template: string } {
  const d = (value ?? '').replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
  if (!d) {
    return { text: '', template: '' };
  }
  const text = formatPhoneFromDigits(d);
  const template = text.replace(/\d/g, 'x');
  return { text, template };
}
