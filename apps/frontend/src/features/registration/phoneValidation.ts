import { isPossiblePhoneNumber, parsePhoneNumber } from 'libphonenumber-js/min';

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Submit validation: Russian numbers are the main case; any plausible E.164 length is allowed.
 */
export function validatePhoneForSubmit(
  input: string
): { ok: true; normalized: string } | { ok: false; message: string } {
  const d = digitsOnly(input);
  if (d.length === 0) {
    return { ok: false, message: 'Введите номер телефона' };
  }

  const e164 = `+${d}`;
  if (!isPossiblePhoneNumber(e164)) {
    return { ok: false, message: 'Введите корректный номер телефона' };
  }

  try {
    const parsed = parsePhoneNumber(e164);
    return { ok: true, normalized: parsed.format('E.164') };
  } catch {
    return { ok: false, message: 'Введите корректный номер телефона' };
  }
}
