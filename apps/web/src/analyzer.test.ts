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
})
