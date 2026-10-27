export type FindingCategory =
  | 'invisible'
  | 'whitespace'
  | 'mixed-script'
  | 'control'
  | 'replacement'
  | 'dash'
  | 'line'
  | 'lookalike'
  | 'private-use'
  | 'hidden-text'
  | 'symbol'

export type FindingSeverity = 'high' | 'medium' | 'low' | 'info'
export type WhitespaceType =
  | 'leading'
  | 'trailing'
  | 'repeated-internal'
  | 'unusual'
  | 'before-punctuation'

export type LineType = 'empty' | 'separator'

export interface Finding {
  category: FindingCategory
  codePoint?: string
  description: string
  excerpt: string
  /** UTF-16 index in `excerpt` where the finding's value begins. */
  excerptStart: number
  endColumn: number
  endLine: number
  endOffset: number
  line: number
  /** Code-point position of the finding's last character on `endLine`. */
  lineEndPosition: number
  /** Code-point position of the finding's first character on `line`. */
  linePosition: number
  lineType?: LineType
  column: number
  position: number
  startOffset: number
  severity: FindingSeverity
  value: string
  symbolKind?: SymbolKind
  symbolName?: string
  whitespaceType?: WhitespaceType
}

const invisibleCharacters = new Map<number, string>([
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

const lineSeparators = new Map<number, string>([
  [0x0085, 'next line (NEL)'],
  [0x2028, 'line separator'],
  [0x2029, 'paragraph separator'],
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

const unusualDashes = new Map<number, { description: string; name: string }>([
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

const formatCodePoints = new Set([
  ...invisibleCharacters.keys(),
  0x206a,
  0x206b,
  0x206c,
  0x206d,
  0x206e,
  0x206f,
])

function isTagCharacter(codePoint: number) {
  return codePoint >= 0xe0000 && codePoint <= 0xe007f
}

function isPrivateUse(codePoint: number) {
  return (
    (codePoint >= 0xe000 && codePoint <= 0xf8ff) ||
    (codePoint >= 0xf0000 && codePoint <= 0x10ffff)
  )
}

function isControl(codePoint: number) {
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
function lookalikeOf(codePoint: number) {
  const isStyled =
    (codePoint >= 0xff01 && codePoint <= 0xff5e) ||
    (codePoint >= 0x1d400 && codePoint <= 0x1d7ff)
  if (!isStyled) return null

  const plain = String.fromCodePoint(codePoint).normalize('NFKC')
  return /^[\x21-\x7e]$/.test(plain) ? plain : null
}

function codePointLabel(codePoint: number) {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
}

const excerptContext = 12
const maxWordExtension = 40

function isWordUnit(unit: string | undefined) {
  return unit !== undefined && /[\p{L}\p{M}\p{N}_\uD800-\uDFFF]/u.test(unit)
}

// Widens the excerpt so it starts and ends on word boundaries.
function excerptAround(text: string, startOffset: number, endOffset: number) {
  let from = Math.max(0, startOffset - excerptContext)
  let to = Math.min(text.length, endOffset + excerptContext)
  const minFrom = Math.max(0, from - maxWordExtension)
  const maxTo = Math.min(text.length, to + maxWordExtension)

  while (from > minFrom && isWordUnit(text[from - 1]) && isWordUnit(text[from]))
    from--
  while (to < maxTo && isWordUnit(text[to - 1]) && isWordUnit(text[to])) to++
  if (/[\uDC00-\uDFFF]/.test(text[from] ?? '')) from--
  if (/[\uD800-\uDBFF]/.test(text[to - 1] ?? '')) to++

  return { excerpt: text.slice(from, to), excerptStart: startOffset - from }
}

interface TextIndex {
  // UTF-16 offsets of every astral (surrogate pair) character.
  astralOffsets: number[]
  lineStarts: number[]
  text: string
}

let cachedIndex: TextIndex | null = null

function indexText(text: string): TextIndex {
  if (cachedIndex?.text === text) return cachedIndex

  const lineStarts = [0]
  for (const match of text.matchAll(/\r\n|\r|\n/g)) {
    lineStarts.push((match.index ?? 0) + match[0].length)
  }
  const astralOffsets: number[] = []
  for (let offset = 0; offset < text.length; offset++) {
    if (/[\uD800-\uDBFF]/.test(text[offset])) astralOffsets.push(offset++)
  }

  cachedIndex = { astralOffsets, lineStarts, text }
  return cachedIndex
}

// Number of entries in a sorted array that are less than or equal to value.
function countAtMost(sorted: number[], value: number) {
  let low = 0
  let high = sorted.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (sorted[middle] <= value) low = middle + 1
    else high = middle
  }
  return low
}

function sourceLocation(text: string, startOffset: number, endOffset: number) {
  const { astralOffsets, lineStarts } = indexText(text)
  const codePointsBefore = (offset: number) =>
    offset - countAtMost(astralOffsets, offset - 1)
  const line = countAtMost(lineStarts, startOffset)
  const lastOffset = Math.max(startOffset, endOffset - 1)
  const endLine = countAtMost(lineStarts, lastOffset)
  const lineStart = lineStarts[line - 1]
  const endLineStart = lineStarts[endLine - 1]

  return {
    column: startOffset - lineStart + 1,
    endColumn: endOffset - endLineStart + 1,
    endLine,
    line,
    lineEndPosition:
      codePointsBefore(lastOffset) - codePointsBefore(endLineStart) + 1,
    linePosition:
      codePointsBefore(startOffset) - codePointsBefore(lineStart) + 1,
    position: codePointsBefore(startOffset) + 1,
  }
}

function withLocation(
  text: string,
  finding: Omit<
    Finding,
    | 'column'
    | 'endColumn'
    | 'endLine'
    | 'endOffset'
    | 'excerpt'
    | 'excerptStart'
    | 'line'
    | 'lineEndPosition'
    | 'linePosition'
    | 'position'
    | 'startOffset'
  >,
  startOffset: number,
  endOffset: number,
): Finding {
  return {
    ...finding,
    ...sourceLocation(text, startOffset, endOffset),
    ...excerptAround(text, startOffset, endOffset),
    endOffset,
    startOffset,
  }
}

function scriptOf(character: string) {
  if (/\p{Script=Latin}/u.test(character)) return 'Latin'
  if (/\p{Script=Cyrillic}/u.test(character)) return 'Cyrillic'
  if (/\p{Script=Greek}/u.test(character)) return 'Greek'
  return null
}

function findMixedScriptWords(text: string): Finding[] {
  const findings: Finding[] = []
  const wordPattern = /[\p{L}\p{M}\p{N}_]+/gu

  for (const match of text.matchAll(wordPattern)) {
    const word = match[0]
    const start = match.index ?? 0
    const scripts = [
      ...new Set(
        Array.from(word)
          .map(scriptOf)
          .filter((script) => script !== null),
      ),
    ]

    if (scripts.length > 1) {
      findings.push(
        withLocation(
          text,
          {
            category: 'mixed-script',
            description: `This word mixes ${scripts.join(' and ')} letters that can look alike.`,
            severity: 'high',
            value: word,
          },
          start,
          start + word.length,
        ),
      )
    }
  }

  return findings
}

function findOrdinaryWhitespace(text: string): Finding[] {
  const findings: Finding[] = []
  const punctuationAhead = /\s*([,.;:!?])/uy

  for (const match of text.matchAll(/[ \t]+/g)) {
    const value = match[0]
    const start = match.index ?? 0
    const end = start + value.length
    const before = start === 0 ? '\n' : text[start - 1]
    const after = end === text.length ? '\n' : text[end]
    const isLineStart = before === '\n' || before === '\r'
    const isLineEnd = after === '\n' || after === '\r'
    punctuationAhead.lastIndex = end
    const nextNonWhitespace = punctuationAhead.exec(text)?.[1]
    const whitespaceType: WhitespaceType = isLineStart
      ? 'leading'
      : isLineEnd
        ? 'trailing'
        : nextNonWhitespace !== undefined
          ? 'before-punctuation'
          : 'repeated-internal'

    // Whitespace-only lines are reported as empty lines instead.
    if (isLineStart && isLineEnd) continue

    if (
      value.length === 1 &&
      whitespaceType === 'repeated-internal' &&
      value !== '\t'
    ) {
      continue
    }

    findings.push(
      withLocation(
        text,
        {
          category: 'whitespace',
          description:
            whitespaceType === 'leading'
              ? `Leading whitespace: ${value.length} whitespace character${value.length === 1 ? '' : 's'} at the beginning of the line.`
              : whitespaceType === 'trailing'
                ? `Trailing whitespace: ${value.length} whitespace character${value.length === 1 ? '' : 's'} at the end of the line.`
                : whitespaceType === 'before-punctuation'
                  ? 'Whitespace appears immediately before punctuation.'
                  : `Repeated internal whitespace: ${value.length} consecutive ordinary spaces between text.`,
          severity: 'info',
          value,
          whitespaceType,
        },
        start,
        end,
      ),
    )
  }

  return findings
}

function findEmptyLines(text: string): Finding[] {
  const lines: { breakEnd: number; contentEnd: number; start: number }[] = []
  for (let start = 0; ;) {
    const lineBreak = /\r\n|\r|\n/g
    lineBreak.lastIndex = start
    const match = lineBreak.exec(text)
    const contentEnd = match === null ? text.length : match.index
    const breakEnd = match === null ? text.length : contentEnd + match[0].length
    // A final line break does not start a new, empty line.
    if (match === null && start === text.length && lines.length > 0) break
    lines.push({ breakEnd, contentEnd, start })
    if (match === null) break
    start = breakEnd
  }

  const isBlank = (line: (typeof lines)[number]) =>
    /^[\p{Zs}\t]*$/u.test(text.slice(line.start, line.contentEnd))
  const findings: Finding[] = []

  for (let index = 0; index < lines.length; index++) {
    if (!isBlank(lines[index])) continue

    let last = index
    while (last + 1 < lines.length && isBlank(lines[last + 1])) last++

    const run = lines.slice(index, last + 1)
    const count = run.length
    const withWhitespace = run.filter(
      (line) => line.contentEnd > line.start,
    ).length
    const atStart = index === 0
    const atEnd = last === lines.length - 1
    const start = run[0].start
    const end = run[count - 1].breakEnd
    index = last

    if (start === end) continue

    const label =
      count === 1 ? 'Empty line' : `${count} consecutive empty lines`
    const where = atStart
      ? ' at the beginning of the text'
      : atEnd
        ? ' at the end of the text'
        : ''
    const whitespaceNote =
      withWhitespace === 0
        ? ''
        : count === 1
          ? ' It contains only whitespace.'
          : ` ${withWhitespace} of them ${withWhitespace === 1 ? 'contains' : 'contain'} only whitespace.`

    findings.push(
      withLocation(
        text,
        {
          category: 'line',
          description: `${label}${where}.${whitespaceNote}`,
          lineType: 'empty',
          severity:
            count === 1 && !atStart && !atEnd && withWhitespace === 0
              ? 'info'
              : 'low',
          value: text.slice(start, end),
        },
        start,
        end,
      ),
    )
  }

  return findings
}

export interface AnalyzeOptions {
  /** Also report every symbol: any character that is not a letter or digit. */
  symbols?: boolean
}

export type SymbolKind =
  | 'bracket'
  | 'currency'
  | 'dash'
  | 'emoji'
  | 'math'
  | 'number'
  | 'other'
  | 'punctuation'
  | 'quote'

const symbolNames: Record<string, string> = {
  '!': 'exclamation mark',
  '"': 'quotation mark',
  '#': 'number sign',
  $: 'dollar sign',
  '%': 'percent sign',
  '&': 'ampersand',
  "'": 'apostrophe',
  '(': 'left parenthesis',
  ')': 'right parenthesis',
  '*': 'asterisk',
  '+': 'plus sign',
  ',': 'comma',
  '-': 'hyphen-minus',
  '.': 'full stop',
  '/': 'slash',
  ':': 'colon',
  ';': 'semicolon',
  '<': 'less-than sign',
  '=': 'equals sign',
  '>': 'greater-than sign',
  '?': 'question mark',
  '@': 'at sign',
  '[': 'left square bracket',
  '\\': 'backslash',
  ']': 'right square bracket',
  '^': 'caret',
  _: 'underscore',
  '`': 'backtick',
  '{': 'left curly bracket',
  '|': 'vertical bar',
  '}': 'right curly bracket',
  '~': 'tilde',
  '¡': 'inverted exclamation mark',
  '§': 'section sign',
  '©': 'copyright sign',
  '«': 'left angle quotation mark',
  '®': 'registered sign',
  '°': 'degree sign',
  '±': 'plus-minus sign',
  '¶': 'pilcrow',
  '·': 'middle dot',
  '»': 'right angle quotation mark',
  '¿': 'inverted question mark',
  '×': 'multiplication sign',
  '÷': 'division sign',
  '‘': 'left single quotation mark',
  '’': 'right single quotation mark',
  '‚': 'single low quotation mark',
  '“': 'left double quotation mark',
  '”': 'right double quotation mark',
  '„': 'double low quotation mark',
  '•': 'bullet',
  '…': 'horizontal ellipsis',
  '–': 'en dash',
  '—': 'em dash',
  '−': 'minus sign',
  '€': 'euro sign',
  '£': 'pound sign',
  '№': 'numero sign',
  '™': 'trade mark sign',
  '→': 'rightwards arrow',
  '←': 'leftwards arrow',
}

function symbolKindOf(grapheme: string): SymbolKind {
  if (/\p{Emoji_Presentation}|️/u.test(grapheme)) return 'emoji'
  if (/^\p{Sc}/u.test(grapheme)) return 'currency'
  if (
    /^\p{Pd}/u.test(grapheme) ||
    unusualDashes.has(grapheme.codePointAt(0) ?? 0)
  )
    return 'dash'
  if (/^[\p{Pi}\p{Pf}"'‚„]/u.test(grapheme)) return 'quote'
  if (/^[\p{Ps}\p{Pe}]/u.test(grapheme)) return 'bracket'
  if (/^\p{Sm}/u.test(grapheme)) return 'math'
  if (/^\p{N}/u.test(grapheme)) return 'number'
  if (/^\p{P}/u.test(grapheme)) return 'punctuation'
  return 'other'
}

const symbolKindLabels: Record<SymbolKind, string> = {
  bracket: 'bracket',
  currency: 'currency sign',
  dash: 'dash or hyphen',
  emoji: 'emoji',
  math: 'mathematical symbol',
  number: 'numeric symbol',
  other: 'symbol',
  punctuation: 'punctuation mark',
  quote: 'quotation mark',
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

// Every visible character that is not a letter or an ordinary digit:
// punctuation, brackets, quotes, dashes, currency, math, emoji, and so on.
// Spaces, control, and invisible characters are left to the other checks.
function findSymbols(text: string): Finding[] {
  const findings: Finding[] = []
  let previousEnd = 0
  for (const match of text.matchAll(/[^\p{L}\p{M}\p{Nd}\p{Z}\p{C}]/gu)) {
    const index = match.index ?? 0
    // Skip characters inside the previous symbol, such as emoji modifiers.
    if (index < previousEnd) continue

    // Segment only a small window, so plain text stays fast.
    const [first] = graphemes.segment(text.slice(index, index + 64))
    const segment = first?.segment ?? match[0]
    previousEnd = index + segment.length
    const codePoint = segment.codePointAt(0) ?? 0
    const symbolKind = symbolKindOf(segment)
    const name = symbolNames[segment] ?? symbolKindLabels[symbolKind]

    findings.push(
      withLocation(
        text,
        {
          category: 'symbol',
          codePoint: codePointLabel(codePoint),
          description: `Symbol "${segment}": ${name}.`,
          severity: 'info',
          symbolKind,
          symbolName: name,
          value: segment,
        },
        index,
        index + segment.length,
      ),
    )
  }
  return findings
}

export function analyzeText(
  text: string,
  options: AnalyzeOptions = {},
): Finding[] {
  const findings: Finding[] = [
    ...findOrdinaryWhitespace(text),
    ...findEmptyLines(text),
    ...(options.symbols === true ? findSymbols(text) : []),
  ]
  for (let offset = 0; offset < text.length;) {
    const codePoint = text.codePointAt(offset)
    if (codePoint === undefined) break

    const value = String.fromCodePoint(codePoint)
    const label = codePointLabel(codePoint)

    if (isTagCharacter(codePoint)) {
      let end = offset
      let hidden = ''
      let lastTag = codePoint
      for (
        let next = codePoint;
        end < text.length && isTagCharacter(next);
        next = text.codePointAt(end) ?? 0
      ) {
        if (next >= 0xe0020 && next <= 0xe007e) {
          hidden += String.fromCodePoint(next - 0xe0000)
        }
        lastTag = next
        end += 2
      }

      // Subdivision flags such as England's are U+1F3F4 followed by tags.
      const isFlag =
        text.codePointAt(offset - 2) === 0x1f3f4 && lastTag === 0xe007f
      if (!isFlag) {
        findings.push(
          withLocation(
            text,
            {
              category: 'hidden-text',
              codePoint: label,
              description:
                hidden === ''
                  ? 'Invisible Unicode tag characters.'
                  : `Invisible Unicode tag characters hide this text: "${hidden}". Hidden text like this can carry instructions for AI tools.`,
              severity: 'high',
              value: text.slice(offset, end),
            },
            offset,
            end,
          ),
        )
      }
      offset = end
      continue
    }

    if (lookalikeOf(codePoint) !== null) {
      let end = offset
      let plain = ''
      for (
        let next = lookalikeOf(codePoint);
        next !== null;
        next = lookalikeOf(text.codePointAt(end) ?? 0)
      ) {
        plain += next
        end += String.fromCodePoint(text.codePointAt(end) ?? 0).length
      }

      findings.push(
        withLocation(
          text,
          {
            category: 'lookalike',
            codePoint: label,
            description: `Styled lookalike characters read as "${plain}" but are not ordinary letters or digits, so search and filters may miss them.`,
            severity: 'medium',
            value: text.slice(offset, end),
          },
          offset,
          end,
        ),
      )
      offset = end
      continue
    }

    if (invisibleCharacters.has(codePoint)) {
      findings.push(
        withLocation(
          text,
          {
            category: 'invisible',
            codePoint: label,
            description: `Invisible character: ${invisibleCharacters.get(codePoint)}.`,
            severity: formatCodePoints.has(codePoint) ? 'high' : 'medium',
            value,
          },
          offset,
          offset + value.length,
        ),
      )
    } else if (unusualWhitespace.has(codePoint)) {
      findings.push(
        withLocation(
          text,
          {
            category: 'whitespace',
            codePoint: label,
            description: `Unusual whitespace: ${unusualWhitespace.get(codePoint)}.`,
            severity: 'low',
            value,
            whitespaceType: 'unusual',
          },
          offset,
          offset + value.length,
        ),
      )
    } else if (unusualDashes.has(codePoint)) {
      const dash = unusualDashes.get(codePoint)
      if (dash === undefined) continue

      findings.push(
        withLocation(
          text,
          {
            category: 'dash',
            codePoint: label,
            description: `${dash.name}: ${dash.description}`,
            severity: 'info',
            value,
          },
          offset,
          offset + value.length,
        ),
      )
    } else if (codePoint === 0xfffd) {
      findings.push(
        withLocation(
          text,
          {
            category: 'replacement',
            codePoint: label,
            description:
              'Replacement character may indicate corrupted or undecodable text.',
            severity: 'medium',
            value,
          },
          offset,
          offset + value.length,
        ),
      )
    } else if (lineSeparators.has(codePoint)) {
      findings.push(
        withLocation(
          text,
          {
            category: 'line',
            codePoint: label,
            description: `Unusual line break: ${lineSeparators.get(codePoint)}. Some programs show it as a new line and others ignore it.`,
            lineType: 'separator',
            severity: 'medium',
            value,
          },
          offset,
          offset + value.length,
        ),
      )
    } else if (isPrivateUse(codePoint)) {
      findings.push(
        withLocation(
          text,
          {
            category: 'private-use',
            codePoint: label,
            description:
              'Private-use character has no standard meaning and may render differently or not at all.',
            severity: 'low',
            value,
          },
          offset,
          offset + value.length,
        ),
      )
    } else if (isControl(codePoint)) {
      findings.push(
        withLocation(
          text,
          {
            category: 'control',
            codePoint: label,
            description: 'Control character is not normally visible in text.',
            severity: 'medium',
            value,
          },
          offset,
          offset + value.length,
        ),
      )
    }

    offset += value.length
  }

  return [...findings, ...findMixedScriptWords(text)].sort(
    (left, right) => left.startOffset - right.startOffset,
  )
}
