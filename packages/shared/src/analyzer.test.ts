import { describe, expect, it } from 'vitest'

import { analyzeText } from './analyzer.js'

describe('analyzeText', () => {
  it('detects invisible characters and unusual whitespace', () => {
    const findings = analyzeText('hello\u200Bworld\u00A0!')

    expect(findings.map((finding) => finding.category)).toEqual([
      'invisible',
      'whitespace',
    ])
    expect(findings[0]?.codePoint).toBe('U+200B')
    expect(findings[1]?.codePoint).toBe('U+00A0')
  })

  it('detects words that mix Latin and Cyrillic scripts', () => {
    const findings = analyzeText('раypal')

    expect(findings).toHaveLength(1)
    expect(findings[0]?.category).toBe('mixed-script')
    expect(findings[0]?.value).toBe('раypal')
  })

  it('does not flag ordinary text, emoji, or normal whitespace', () => {
    expect(analyzeText('Hello, world!\n🙂')).toEqual([])
  })

  it('reports leading and trailing ordinary spaces as informational findings', () => {
    const findings = analyzeText('  hello  ')

    expect(findings).toMatchObject([
      {
        category: 'whitespace',
        description:
          'Leading whitespace: 2 whitespace characters at the beginning of the line.',
        linePosition: 1,
        severity: 'info',
        value: '  ',
        whitespaceType: 'leading',
      },
      {
        category: 'whitespace',
        description:
          'Trailing whitespace: 2 whitespace characters at the end of the line.',
        linePosition: 8,
        severity: 'info',
        value: '  ',
        whitespaceType: 'trailing',
      },
    ])
  })

  it('reports repeated internal spaces but not single internal spaces', () => {
    const findings = analyzeText('one  two three')

    expect(findings).toMatchObject([
      {
        description:
          'Repeated internal whitespace: 2 consecutive ordinary spaces between text.',
        linePosition: 4,
        severity: 'info',
        value: '  ',
        whitespaceType: 'repeated-internal',
      },
    ])
  })

  it('reports a single trailing space on every line without including newlines', () => {
    const findings = analyzeText('Hello world \nSecond line')

    expect(findings).toMatchObject([
      {
        value: ' ',
        whitespaceType: 'trailing',
        startOffset: 11,
        endOffset: 12,
        line: 1,
        linePosition: 12,
        lineEndPosition: 12,
      },
    ])
  })

  it('handles CRLF trailing whitespace and spaces before punctuation', () => {
    const findings = analyzeText('First line \r\nHello , world')

    expect(findings).toMatchObject([
      {
        value: ' ',
        whitespaceType: 'trailing',
        startOffset: 10,
        endOffset: 11,
        line: 1,
      },
      {
        value: ' ',
        whitespaceType: 'before-punctuation',
        startOffset: 18,
        endOffset: 19,
        line: 2,
        linePosition: 6,
      },
    ])
  })

  it('preserves UTF-16 offsets and character positions after emoji', () => {
    const findings = analyzeText('🙂 hello  world')
    const finding = findings.find(
      (candidate) => candidate.whitespaceType === 'repeated-internal',
    )

    expect(finding).toMatchObject({
      startOffset: 8,
      endOffset: 10,
      line: 1,
      linePosition: 8,
      lineEndPosition: 9,
    })
  })

  it('returns findings from the beginning and end of long input', () => {
    const text = `top \n${'normal text\n'.repeat(200)}bottom  `
    const findings = analyzeText(text)

    expect(findings).toHaveLength(2)
    expect(findings[0]).toMatchObject({ line: 1, whitespaceType: 'trailing' })
    expect(findings[1]).toMatchObject({
      line: 202,
      whitespaceType: 'trailing',
      value: '  ',
    })
  })

  it('identifies the type and position of unusual whitespace', () => {
    const findings = analyzeText('a\u2009b')

    expect(findings[0]).toMatchObject({
      codePoint: 'U+2009',
      description: 'Unusual whitespace: thin space.',
      linePosition: 2,
      severity: 'low',
      whitespaceType: 'unusual',
    })
  })

  it('identifies dash characters including the ordinary hyphen-minus', () => {
    const dashes = [
      ['\u2010', 'U+2010', 'HYPHEN'],
      ['\u2011', 'U+2011', 'NON-BREAKING HYPHEN'],
      ['\u2012', 'U+2012', 'FIGURE DASH'],
      ['\u2013', 'U+2013', 'EN DASH'],
      ['\u2014', 'U+2014', 'EM DASH'],
      ['\u2015', 'U+2015', 'HORIZONTAL BAR'],
      ['\u2212', 'U+2212', 'MINUS SIGN'],
    ] as const
    const findings = analyzeText(
      `a-b ${dashes.map(([value]) => value).join(' ')}`,
    )

    expect(findings).toHaveLength(dashes.length + 1)
    expect(
      findings.map(({ codePoint, description, severity, value }) => ({
        codePoint,
        description,
        severity,
        value,
      })),
    ).toEqual(
      [['-', 'U+002D', 'HYPHEN-MINUS'] as const, ...dashes].map(
        ([value, codePoint, name]) => ({
          codePoint,
          description: expect.stringContaining(name),
          severity: 'info',
          value,
        }),
      ),
    )
  })

  it('records the exact excerpt offset for each of several identical dashes', () => {
    const findings = analyzeText('A-- B A- B')

    expect(
      findings.map(
        ({ excerpt, excerptStart, linePosition, lineEndPosition }) => ({
          excerpt,
          excerptStart,
          lineEndPosition,
          linePosition,
        }),
      ),
    ).toEqual([
      {
        excerpt: 'A-- B A- B',
        excerptStart: 1,
        lineEndPosition: 2,
        linePosition: 2,
      },
      {
        excerpt: 'A-- B A- B',
        excerptStart: 2,
        lineEndPosition: 3,
        linePosition: 3,
      },
      {
        excerpt: 'A-- B A- B',
        excerptStart: 7,
        lineEndPosition: 8,
        linePosition: 8,
      },
    ])
  })

  it('extends excerpts to whole words instead of cutting them', () => {
    const text = 'SELECT name FROM customers WHERE  id = 1'
    const [finding] = analyzeText(text)

    expect(finding.excerpt).toBe('customers WHERE  id = 1')
    expect(
      finding.excerpt.slice(
        finding.excerptStart,
        finding.excerptStart + finding.value.length,
      ),
    ).toBe('  ')
  })

  it('reports line positions in characters, counting emoji once', () => {
    const [finding] = analyzeText('first\n🙂🙂 a\u200Bb')

    expect(finding).toMatchObject({
      line: 2,
      lineEndPosition: 5,
      linePosition: 5,
    })
  })

  it('reports the line range of a run of empty lines', () => {
    const [finding] = analyzeText('one\n\n\n\ntwo')

    expect(finding).toMatchObject({ endLine: 4, line: 2 })
  })

  it('reports a single empty line between paragraphs as information', () => {
    const findings = analyzeText('First paragraph\n\nSecond paragraph\n')

    expect(findings).toMatchObject([
      {
        category: 'line',
        description: 'Empty line.',
        line: 2,
        lineType: 'empty',
        severity: 'info',
        value: '\n',
      },
    ])
  })

  it('groups consecutive empty lines and whitespace-only lines', () => {
    const findings = analyzeText('one\n\n   \n\ntwo')

    expect(findings).toMatchObject([
      {
        category: 'line',
        description:
          '3 consecutive empty lines. 1 of them contains only whitespace.',
        line: 2,
        severity: 'low',
        value: '\n   \n\n',
      },
    ])
  })

  it('reports empty lines at the beginning and end of the text', () => {
    const findings = analyzeText('\n\ntext\n\n')

    expect(findings).toMatchObject([
      {
        description: '2 consecutive empty lines at the beginning of the text.',
        line: 1,
      },
      {
        description: 'Empty line at the end of the text.',
        line: 4,
      },
    ])
  })

  it('does not treat a single final line break as an empty line', () => {
    expect(analyzeText('text\r\n')).toEqual([])
  })

  it('detects Unicode line and paragraph separators', () => {
    const findings = analyzeText('one\u2028two\u2029three')

    expect(findings).toMatchObject([
      { category: 'line', codePoint: 'U+2028', lineType: 'separator' },
      { category: 'line', codePoint: 'U+2029', lineType: 'separator' },
    ])
  })

  it('decodes hidden text written with Unicode tag characters', () => {
    const hidden = Array.from('hi AI', (character) =>
      String.fromCodePoint(0xe0000 + character.codePointAt(0)!),
    ).join('')
    const findings = analyzeText(`Hello${hidden}!`)

    expect(findings).toMatchObject([
      {
        category: 'hidden-text',
        description: expect.stringContaining('"hi AI"'),
        severity: 'high',
        startOffset: 5,
        endOffset: 15,
      },
    ])
  })

  it('does not flag tag characters inside subdivision flag emoji', () => {
    expect(
      analyzeText(
        '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
      ),
    ).toEqual([])
  })

  it('groups styled lookalike letters and shows their plain reading', () => {
    const findings = analyzeText('Buy 𝐜𝐡𝐞𝐚𝐩 ｐｉｌｌｓ')

    expect(findings).toMatchObject([
      {
        category: 'lookalike',
        description: expect.stringContaining('"cheap"'),
      },
      {
        category: 'lookalike',
        description: expect.stringContaining('"pills"'),
      },
    ])
  })

  it('detects Greek letters mixed into Latin words', () => {
    const findings = analyzeText('Αpple')

    expect(findings).toMatchObject([
      {
        category: 'mixed-script',
        description:
          'This word mixes Greek and Latin letters that can look alike.',
      },
    ])
  })

  it('detects C1 control, private-use, and filler characters', () => {
    const findings = analyzeText('a\u0080b\uE000c\u3164d')

    expect(findings.map((finding) => finding.category)).toEqual([
      'control',
      'private-use',
      'invisible',
    ])
  })

  describe('symbols', () => {
    const symbols = (text: string) =>
      analyzeText(text, { symbols: true }).filter(
        (finding) => finding.category === 'symbol',
      )

    it('is off unless requested', () => {
      expect(analyzeText('Hi, there!')).toEqual([])
    })

    it('lists every non-letter, non-digit character with its kind and name', () => {
      expect(
        symbols('Hi, “Ана”! 5€ (½) — #1 ©').map(
          ({ symbolKind, symbolName, value }) => ({
            symbolKind,
            symbolName,
            value,
          }),
        ),
      ).toEqual([
        { symbolKind: 'punctuation', symbolName: 'comma', value: ',' },
        {
          symbolKind: 'quote',
          symbolName: 'left double quotation mark',
          value: '“',
        },
        {
          symbolKind: 'quote',
          symbolName: 'right double quotation mark',
          value: '”',
        },
        {
          symbolKind: 'punctuation',
          symbolName: 'exclamation mark',
          value: '!',
        },
        { symbolKind: 'currency', symbolName: 'euro sign', value: '€' },
        { symbolKind: 'bracket', symbolName: 'left parenthesis', value: '(' },
        { symbolKind: 'number', symbolName: 'numeric symbol', value: '½' },
        { symbolKind: 'bracket', symbolName: 'right parenthesis', value: ')' },
        { symbolKind: 'dash', symbolName: 'em dash', value: '—' },
        { symbolKind: 'punctuation', symbolName: 'number sign', value: '#' },
        { symbolKind: 'other', symbolName: 'copyright sign', value: '©' },
      ])
    })

    it('does not list letters, digits, spaces, or invisible characters', () => {
      expect(symbols('abc АБВ 123\t\n\u200B')).toEqual([])
    })

    it('keeps an emoji with a skin tone as one symbol', () => {
      expect(symbols('ok 👍🏽')).toMatchObject([
        { symbolKind: 'emoji', value: '👍🏽', startOffset: 3, endOffset: 7 },
      ])
    })
  })

  it('preserves dash positions after astral characters and NBSP findings', () => {
    const findings = analyzeText('🙂a\u00A0\u2013b')

    expect(findings).toMatchObject([
      {
        category: 'whitespace',
        codePoint: 'U+00A0',
        linePosition: 3,
      },
      {
        category: 'dash',
        codePoint: 'U+2013',
        linePosition: 4,
      },
    ])
  })

  it('gives the same findings no matter what was analyzed before', () => {
    const text = 'first line\nsecond\u200Bline'
    const alone = analyzeText(text, { symbols: true })

    analyzeText('other\n\n\ntext \u00A0', { symbols: true })

    expect(analyzeText(text, { symbols: true })).toEqual(alone)
  })
})
