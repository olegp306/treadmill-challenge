import { describe, expect, it } from 'vitest';
import { validateNamePart } from './nameValidation';

describe('validateNamePart', () => {
  it('rejects additional temporary profanity banlist words in first and last name fields', () => {
    const blockedWords = ['охереть', 'заебись', 'проститутка', 'тупоголовый', 'дегенерат'];

    for (const word of blockedWords) {
      expect(validateNamePart(word, 'first')).toEqual({
        ok: false,
        message: 'Недопустимое слово',
      });
      expect(validateNamePart(`Иван-${word}`, 'last')).toEqual({
        ok: false,
        message: 'Недопустимое слово',
      });
    }
  });

  it('keeps accepting regular Cyrillic names', () => {
    expect(validateNamePart('иван', 'first')).toEqual({ ok: true, normalized: 'Иван' });
    expect(validateNamePart('петров-сидоров', 'last')).toEqual({ ok: true, normalized: 'Петров-Сидоров' });
  });

  it('uses the profanity filter to catch Unicode-obfuscated English profanity without substring false positives', () => {
    expect(validateNamePart('fυck', 'first')).toEqual({
      ok: false,
      message: 'Недопустимое слово',
    });
    expect(validateNamePart('cassidy', 'first')).toEqual({ ok: true, normalized: 'Cassidy' });
    expect(validateNamePart('class', 'last')).toEqual({ ok: true, normalized: 'Class' });
  });
});
