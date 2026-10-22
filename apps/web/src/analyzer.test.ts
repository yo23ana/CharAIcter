import { describe, expect, it } from 'vitest'

import { analyzeText } from './analyzer'

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
          'Leading whitespace: 2 ordinary spaces at the beginning of the text.',
        position: 1,
        severity: 'info',
        value: '  ',
        whitespaceType: 'leading',
      },
      {
        category: 'whitespace',
        description:
          'Trailing whitespace: 2 ordinary spaces at the end of the text.',
        position: 8,
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
        position: 4,
        severity: 'info',
        value: '  ',
        whitespaceType: 'repeated-internal',
      },
    ])
  })

  it('identifies the type and position of unusual whitespace', () => {
    const findings = analyzeText('a\u2009b')

    expect(findings[0]).toMatchObject({
      codePoint: 'U+2009',
      description: 'Unusual whitespace: thin space.',
      position: 2,
      severity: 'low',
      whitespaceType: 'unusual',
    })
  })
})
