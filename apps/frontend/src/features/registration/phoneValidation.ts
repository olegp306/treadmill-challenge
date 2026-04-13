/**
 * Russian mobile: +7 9XX XXX XX XX (11 digits, leading 7, second 9).
 * Accepts input with 8, 7, spaces, brackets; normalizes to +7XXXXXXXXXX.
 */
export function normalizeRussianPhone(
  input: string
): { ok: true; normalized: string } | { ok: false; message: string } {
  const digits = input.replace(/\D/g, '');
  let n = digits;

  if (n.length === 11 && n[0] === '8') {
    n = '7' + n.slice(1);
  }
  if (n.length === 10 && n[0] === '9') {
    n = '7' + n;
  }

  if (n.length === 11 && n[0] === '7' && n[1] === '9') {
    return { ok: true, normalized: `+${n}` };
  }

  return {
    ok: false,
    message: 'Введите корректный номер мобильного телефона РФ (+7 9XX XXX XX XX)',
  };
}

/** Keep only digits for controlled tel input (iPad numeric keyboard) */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}
