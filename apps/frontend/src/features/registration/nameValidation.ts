/** Letters (any script), marks, spaces, hyphen — no digits or punctuation. */
const ALLOWED_NAME_REGEX = /^[\p{L}\p{M}\s\-]+$/u;

/** Whole-word profanity (lowercase). Keep short stems out to avoid false positives. */
const PROFANITY_WORDS = new Set([
  'fuck',
  'fucking',
  'fucked',
  'shit',
  'bitch',
  'cunt',
  'dick',
  'whore',
  'slut',
  'bastard',
  'asshole',
  'motherfucker',
  'хуй',
  'хуйня',
  'хуя',
  'хуе',
  'пизда',
  'пиздец',
  'пизд',
  'блядь',
  'блять',
  'ебать',
  'ебан',
  'ебал',
  'сука',
  'мудак',
  'долбоеб',
  'долбоёб',
  'гондон',
  'дерьмо',
]);

export function normalizeNameWhitespace(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

function toTitleCaseWords(input: string): string {
  return normalizeNameWhitespace(input)
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      return word
        .split('-')
        .map((part) => {
          if (!part) return part;
          const first = part.charAt(0).toUpperCase();
          const rest = part.slice(1).toLowerCase();
          return first + rest;
        })
        .join('-');
    })
    .join(' ');
}

function nameTokensLower(s: string): string[] {
  return normalizeNameWhitespace(s)
    .toLowerCase()
    .split(/[\s\-]+/)
    .filter(Boolean);
}

function containsProfanity(normalized: string): boolean {
  for (const token of nameTokensLower(normalized)) {
    if (PROFANITY_WORDS.has(token)) return true;
  }
  return false;
}

export type NameFieldKind = 'first' | 'last';

export function validateNamePart(
  raw: string,
  field: NameFieldKind
): { ok: true; normalized: string } | { ok: false; message: string } {
  const t = normalizeNameWhitespace(raw);
  const labelShort = field === 'first' ? 'имя' : 'фамилию';

  if (t.length === 0) {
    return { ok: false, message: `Введите ${labelShort}` };
  }
  if (t.length < 2) {
    return { ok: false, message: `Не менее 2 символов (${labelShort})` };
  }
  if (!ALLOWED_NAME_REGEX.test(t)) {
    return {
      ok: false,
      message: 'Только буквы, пробел и дефис',
    };
  }
  if (containsProfanity(t)) {
    return { ok: false, message: 'Недопустимое слово' };
  }

  return { ok: true, normalized: toTitleCaseWords(t) };
}
