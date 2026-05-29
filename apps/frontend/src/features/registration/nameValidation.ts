import { Filter } from 'glin-profanity';

/** Letters (any script), marks, spaces, hyphen — no digits or punctuation. */
const ALLOWED_NAME_REGEX = /^[\p{L}\p{M}\s\-]+$/u;

const TEMPORARY_RU_PROFANITY_WORDS = [
  'хуй',
  'хуи',
  'хуя',
  'хуем',
  'хуями',
  'хуёвый',
  'хуевый',
  'хуёво',
  'хуево',
  'хуёвина',
  'хуина',
  'хер',
  'хера',
  'херы',
  'хером',
  'херовый',
  'охереть',
  'охуеть',
  'охуенно',
  'охуенный',
  'ахуеть',
  'ахуенный',
  'пизда',
  'пизды',
  'пизде',
  'пизду',
  'пиздой',
  'пиздец',
  'пиздеца',
  'пиздецом',
  'пиздато',
  'пиздатый',
  'пиздатая',
  'пиздатые',
  'пиздануть',
  'пизданул',
  'пиздит',
  'пиздят',
  'пиздеж',
  'пиздёж',
  'пиздюк',
  'пиздюки',
  'пиздюлина',
  'ебать',
  'ебет',
  'ебёт',
  'ебаться',
  'ебался',
  'ебалась',
  'ебутся',
  'ебучий',
  'ебучая',
  'ебучее',
  'еблан',
  'ебланы',
  'ебланить',
  'ебало',
  'ебальник',
  'ебашить',
  'ебашу',
  'ебашил',
  'ебаный',
  'ёбаный',
  'ебанутая',
  'ёбанутая',
  'ебанутый',
  'ёбанутый',
  'блять',
  'блядь',
  'бля',
  'блядина',
  'бляди',
  'блядство',
  'блядовать',
  'сука',
  'суки',
  'сучка',
  'сучки',
  'сучара',
  'сучий',
  'сучонок',
  'нахуй',
  'нахуя',
  'нахера',
  'похуй',
  'похера',
  'заебал',
  'заебала',
  'заебали',
  'заебать',
  'заебись',
  'заебок',
  'выебал',
  'выебать',
  'выебнулся',
  'въебал',
  'въебать',
  'долбоёб',
  'долбоеб',
  'долбоебы',
  'долбоебина',
  'долбоебский',
  'гандон',
  'гандоны',
  'гандончик',
  'мудак',
  'мудаки',
  'мудачье',
  'мудачок',
  'говно',
  'говна',
  'говне',
  'говном',
  'говнюк',
  'говнюки',
  'говняный',
  'говнище',
  'дерьмо',
  'дерьма',
  'дерьмом',
  'дерьмовый',
  'дерьмище',
  'жопа',
  'жопы',
  'жопе',
  'жопой',
  'жопастый',
  'задница',
  'задницы',
  'срать',
  'насрать',
  'обосраться',
  'обосрался',
  'обосралась',
  'пердеть',
  'пердеж',
  'пердёж',
  'блевать',
  'блевота',
  'моча',
  'ссанина',
  'ссать',
  'нассать',
  'залупа',
  'залупы',
  'залупой',
  'член',
  'члены',
  'сперма',
  'дрочить',
  'дрочит',
  'дрочил',
  'дрочила',
  'дрочер',
  'онанист',
  'онанизм',
  'трахать',
  'трахаться',
  'трахнул',
  'трахает',
  'шлюха',
  'шлюхи',
  'шлюшка',
  'проститутка',
  'проститутки',
  'идиот',
  'идиоты',
  'дебил',
  'дебилы',
  'придурок',
  'придурки',
  'урод',
  'уроды',
  'мразь',
  'мрази',
  'тварь',
  'твари',
  'сволочь',
  'сволочи',
  'скотина',
  'скот',
  'козел',
  'козлы',
  'овца',
  'овцы',
  'свинья',
  'свиньи',
  'падла',
  'падлы',
  'гнида',
  'гниды',
  'чмо',
  'чмошник',
  'лох',
  'лохи',
  'лохотрон',
  'тупица',
  'кретин',
  'кретины',
  'даун',
  'имбецил',
  'недоносок',
  'выродок',
  'ублюдок',
  'ублюдки',
  'подонок',
  'подонки',
  'шваль',
  'дрянь',
  'мерзавец',
  'гад',
  'гады',
  'гадина',
  'паразит',
  'тупой',
  'тупая',
  'тупые',
  'жирный',
  'жируха',
  'страшный',
  'страшила',
  'вонючий',
  'убогий',
  'нищий',
  'жалкий',
  'отстой',
  'отстойный',
  'днище',
  'помойка',
  'мусор',
  'шлак',
  'хлам',
  'конченый',
  'конченный',
  'отбитый',
  'больной',
  'псих',
  'психопат',
  'шизик',
  'лохотронщик',
  'кидала',
  'разводила',
  'мошенник',
  'тролль',
  'задрот',
  'задроты',
  'бот',
  'школьник',
  'нуб',
  'нубас',
  'нубик',
  'рак',
  'чушка',
  'чурбан',
  'деревенщина',
  'быдло',
  'быдляк',
  'быдлятина',
  'тварюга',
  'жлоб',
  'жлобина',
  'жлобский',
  'хам',
  'хамло',
  'хамство',
  'наглец',
  'наглая',
  'наглый',
  'придурочный',
  'убожество',
  'мерзкий',
  'мерзость',
  'дрянной',
  'паршивый',
  'гнилой',
  'гниль',
  'помойный',
  'вонь',
  'вонючка',
  'тупоголовый',
  'твердолобый',
  'дегенерат',
  'дегенераты',
];

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
  ...TEMPORARY_RU_PROFANITY_WORDS,
]);

const ENGLISH_PROFANITY_FILTER = new Filter({
  languages: ['english'],
  wordBoundaries: true,
  detectLeetspeak: true,
  leetspeakLevel: 'moderate',
  normalizeUnicode: true,
  cacheResults: true,
  maxCacheSize: 500,
});

const RUSSIAN_PROFANITY_FILTER = new Filter({
  languages: ['russian'],
  customWords: Array.from(PROFANITY_WORDS),
  wordBoundaries: false,
  detectLeetspeak: false,
  normalizeUnicode: true,
  cacheResults: true,
  maxCacheSize: 500,
});

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
  if (ENGLISH_PROFANITY_FILTER.checkProfanity(normalized).containsProfanity) return true;

  for (const token of nameTokensLower(normalized)) {
    if (PROFANITY_WORDS.has(token)) return true;
    const glinResult = RUSSIAN_PROFANITY_FILTER.checkProfanity(token);
    if (glinResult.profaneWords.some((word) => word.toLowerCase() === token)) return true;
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
