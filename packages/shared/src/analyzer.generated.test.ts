import { describe, expect, it } from 'vitest'

import { analyzeText } from './analyzer.js'

describe('generated analyzer edge cases', () => {
  it('keeps positions in code points when text contains an emoji', () => {
    const findings = analyzeText('🙂a\u200Bb')

    expect(findings[0]).toMatchObject({
      category: 'invisible',
      linePosition: 3,
      codePoint: 'U+200B',
    })
  })

  it('detects control and replacement characters together', () => {
    const findings = analyzeText('a\u0001b\uFFFDb')

    expect(findings.map((finding) => finding.category)).toEqual([
      'control',
      'replacement',
    ])
  })

  it('returns no findings for empty input', () => {
    expect(analyzeText('')).toEqual([])
  })
})
