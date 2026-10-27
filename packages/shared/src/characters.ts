// Character tables and classifiers shared by the checks.

export const invisibleCharacters = new Map<number, string>([
  [0x00ad, 'soft hyphen'],
  [0x034f, 'combining grapheme joiner'],
  [0x061c, 'Arabic letter mark'],
  [0x115f, 'Hangul choseong filler'],
  [0x1160, 'Hangul jungseong filler'],
  [0x17b4, 'Khmer vowel inherent AQ'],
  [0x17b5, 'Khmer vowel inherent AA'],
  [0x180e, 'Mongolian vowel separator'],
  [0x200b, 'zero-width space'],
  [0x200c, 'zero-width non-joiner'],
  [0x200d, 'zero-width joiner'],
  [0x200e, 'left-to-right mark'],
  [0x200f, 'right-to-left mark'],
  [0x202a, 'left-to-right embedding'],
  [0x202b, 'right-to-left embedding'],
  [0x202c, 'pop directional formatting'],
  [0x202d, 'left-to-right override'],
  [0x202e, 'right-to-left override'],
  [0x2060, 'word joiner'],
  [0x2061, 'function application'],
  [0x2062, 'invisible times'],
  [0x2063, 'invisible separator'],
  [0x2064, 'invisible plus'],
  [0x2066, 'left-to-right isolate'],
  [0x2067, 'right-to-left isolate'],
  [0x2068, 'first strong isolate'],
  [0x2069, 'pop directional isolate'],
  [0x2800, 'Braille pattern blank'],
  [0x3164, 'Hangul filler'],
  [0xfeff, 'zero-width no-break space'],
  [0xffa0, 'halfwidth Hangul filler'],
  [0xfff9, 'interlinear annotation anchor'],
  [0xfffa, 'interlinear annotation separator'],
  [0xfffb, 'interlinear annotation terminator'],
])

export const lineSeparators = new Map<number, string>([
  [0x0085, 'next line (NEL)'],
  [0x2028, 'line separator'],
  [0x2029, 'paragraph separator'],
])

export const unusualWhitespace = new Map<number, string>([
  [0x00a0, 'non-breaking space'],
  [0x1680, 'Ogham space mark'],
  [0x2000, 'en quad'],
  [0x2001, 'em quad'],
  [0x2002, 'en space'],
  [0x2003, 'em space'],
  [0x2004, 'three-per-em space'],
  [0x2005, 'four-per-em space'],
  [0x2006, 'six-per-em space'],
  [0x2007, 'figure space'],
  [0x2008, 'punctuation space'],
  [0x2009, 'thin space'],
  [0x200a, 'hair space'],
  [0x202f, 'narrow no-break space'],
  [0x205f, 'medium mathematical space'],
  [0x3000, 'ideographic space'],
])

export const unusualDashes = new Map<
  number,
  { description: string; name: string }
>([
  [
    0x002d,
    {
      description:
        'Hyphen-minus is the ordinary keyboard hyphen and is treated as normal punctuation.',
      name: 'HYPHEN-MINUS',
    },
  ],
  [
    0x2010,
    {
      description:
        'Unicode hyphen differs from the ordinary keyboard hyphen-minus.',
      name: 'HYPHEN',
    },
  ],
  [
    0x2011,
    {
      description:
        'Non-breaking hyphen is a hyphen that prevents a line break at its position.',
      name: 'NON-BREAKING HYPHEN',
    },
  ],
  [
    0x2012,
    {
      description:
        'Figure dash is a fixed-width dash commonly used with numbers.',
      name: 'FIGURE DASH',
    },
  ],
  [
    0x2013,
    {
      description:
        'En dash is longer than a hyphen and is commonly used for ranges or relationships.',
      name: 'EN DASH',
    },
  ],
  [
    0x2014,
    {
      description:
        'Em dash is a long punctuation dash commonly used to set off parts of a sentence.',
      name: 'EM DASH',
    },
  ],
  [
    0x2015,
    {
      description:
        'Horizontal bar is a dash-like punctuation character distinct from the hyphen-minus.',
      name: 'HORIZONTAL BAR',
    },
  ],
  [
    0x2212,
    {
      description:
        'Minus sign is a mathematical operator distinct from the hyphen-minus.',
      name: 'MINUS SIGN',
    },
  ],
])

export const formatCodePoints = new Set([
  ...invisibleCharacters.keys(),
  0x206a,
  0x206b,
  0x206c,
  0x206d,
  0x206e,
  0x206f,
])

export function isTagCharacter(codePoint: number) {
  return codePoint >= 0xe0000 && codePoint <= 0xe007f
}

export function isPrivateUse(codePoint: number) {
  return (
    (codePoint >= 0xe000 && codePoint <= 0xf8ff) ||
    (codePoint >= 0xf0000 && codePoint <= 0x10ffff)
  )
}

export function isControl(codePoint: number) {
  return (
    (codePoint < 0x20 &&
      codePoint !== 0x09 &&
      codePoint !== 0x0a &&
      codePoint !== 0x0d) ||
    (codePoint >= 0x7f && codePoint <= 0x9f && codePoint !== 0x85)
  )
}

// Fullwidth forms and mathematical alphanumerics render like ordinary
// letters and digits, so they are often used to dodge filters or search.
export function lookalikeOf(codePoint: number) {
  const isStyled =
    (codePoint >= 0xff01 && codePoint <= 0xff5e) ||
    (codePoint >= 0x1d400 && codePoint <= 0x1d7ff)
  if (!isStyled) return null

  const plain = String.fromCodePoint(codePoint).normalize('NFKC')
  return /^[\x21-\x7e]$/.test(plain) ? plain : null
}

export function codePointLabel(codePoint: number) {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
}
