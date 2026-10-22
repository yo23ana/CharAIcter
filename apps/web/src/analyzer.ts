export type FindingCategory =
  'invisible' | 'whitespace' | 'mixed-script' | 'control' | 'replacement'

export type FindingSeverity = 'high' | 'medium' | 'low' | 'info'
export type WhitespaceType =
  'leading' | 'trailing' | 'repeated-internal' | 'unusual'

export interface Finding {
  category: FindingCategory
  codePoint?: string
  description: string
  excerpt: string
  position: number
  severity: FindingSeverity
  value: string
  whitespaceType?: WhitespaceType
}

const invisibleCharacters = new Map<number, string>([
  [0x00ad, 'soft hyphen'],
  [0x061c, 'Arabic letter mark'],
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
  [0xfeff, 'zero-width no-break space'],
])

const unusualWhitespace = new Map<number, string>([
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

const formatCodePoints = new Set([
  ...invisibleCharacters.keys(),
  0x206a,
  0x206b,
  0x206c,
  0x206d,
  0x206e,
  0x206f,
])

function codePointLabel(codePoint: number) {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
}

function excerptAt(text: string, start: number, length: number) {
  return text.slice(Math.max(0, start - 8), start + length + 8)
}

function scriptOf(character: string) {
  if (/\p{Script=Latin}/u.test(character)) return 'Latin'
  if (/\p{Script=Cyrillic}/u.test(character)) return 'Cyrillic'
  return null
}

function findMixedScriptWords(text: string): Finding[] {
  const findings: Finding[] = []
  const wordPattern = /[\p{L}\p{M}\p{N}_]+/gu

  for (const match of text.matchAll(wordPattern)) {
    const word = match[0]
    const start = match.index ?? 0
    const scripts = new Set(
      Array.from(word)
        .map(scriptOf)
        .filter((script): script is string => script !== null),
    )

    if (scripts.has('Latin') && scripts.has('Cyrillic')) {
      findings.push({
        category: 'mixed-script',
        description:
          'This word mixes Latin and Cyrillic letters that can look alike.',
        excerpt: excerptAt(text, start, word.length),
        position: Array.from(text.slice(0, start)).length + 1,
        severity: 'high',
        value: word,
      })
    }
  }

  return findings
}

function findOrdinaryWhitespace(text: string): Finding[] {
  const findings: Finding[] = []

  for (const match of text.matchAll(/ +/g)) {
    const value = match[0]
    const start = match.index ?? 0
    const end = start + value.length
    const isLeading = start === 0
    const isTrailing = end === text.length
    const whitespaceType: WhitespaceType = isLeading
      ? 'leading'
      : isTrailing
        ? 'trailing'
        : 'repeated-internal'

    if (value.length === 1 && whitespaceType === 'repeated-internal') {
      continue
    }

    findings.push({
      category: 'whitespace',
      description:
        whitespaceType === 'leading'
          ? `Leading whitespace: ${value.length} ordinary space${value.length === 1 ? '' : 's'} at the beginning of the text.`
          : whitespaceType === 'trailing'
            ? `Trailing whitespace: ${value.length} ordinary space${value.length === 1 ? '' : 's'} at the end of the text.`
            : `Repeated internal whitespace: ${value.length} consecutive ordinary spaces between text.`,
      excerpt: excerptAt(text, start, value.length),
      position: Array.from(text.slice(0, start)).length + 1,
      severity: 'info',
      value,
      whitespaceType,
    })
  }

  return findings
}

export function analyzeText(text: string): Finding[] {
  const findings: Finding[] = findOrdinaryWhitespace(text)
  let codePointPosition = 0

  for (let offset = 0; offset < text.length;) {
    const codePoint = text.codePointAt(offset)
    if (codePoint === undefined) break

    const value = String.fromCodePoint(codePoint)
    const position = codePointPosition + 1
    const label = codePointLabel(codePoint)
    const excerpt = excerptAt(text, offset, value.length)

    if (invisibleCharacters.has(codePoint)) {
      findings.push({
        category: 'invisible',
        codePoint: label,
        description: `Invisible character: ${invisibleCharacters.get(codePoint)}.`,
        excerpt,
        position,
        severity: formatCodePoints.has(codePoint) ? 'high' : 'medium',
        value,
      })
    } else if (unusualWhitespace.has(codePoint)) {
      findings.push({
        category: 'whitespace',
        codePoint: label,
        description: `Unusual whitespace: ${unusualWhitespace.get(codePoint)}.`,
        excerpt,
        position,
        severity: 'low',
        value,
        whitespaceType: 'unusual',
      })
    } else if (codePoint === 0xfffd) {
      findings.push({
        category: 'replacement',
        codePoint: label,
        description:
          'Replacement character may indicate corrupted or undecodable text.',
        excerpt,
        position,
        severity: 'medium',
        value,
      })
    } else if (
      codePoint < 0x20 &&
      codePoint !== 0x09 &&
      codePoint !== 0x0a &&
      codePoint !== 0x0d
    ) {
      findings.push({
        category: 'control',
        codePoint: label,
        description: 'Control character is not normally visible in text.',
        excerpt,
        position,
        severity: 'medium',
        value,
      })
    }

    offset += value.length
    codePointPosition += 1
  }

  return [...findings, ...findMixedScriptWords(text)].sort(
    (left, right) => left.position - right.position,
  )
}
