import { describe, expect, it } from 'vitest'

import { analyzeText } from '../../../packages/shared/dist/analyzer.js'

import { dashFindings, isDashFinding, nonDashFindings } from './dashInspector'

describe('dash inspector finding selection', () => {
  it('counts every dash occurrence and excludes them from main findings', () => {
    const findings = analyzeText('a-b–c—d\u00A0e')

    expect(dashFindings(findings).map((finding) => finding.codePoint)).toEqual([
      'U+002D',
      'U+2013',
      'U+2014',
    ])
    expect(dashFindings(findings)).toHaveLength(3)
    expect(
      nonDashFindings(findings).map((finding) => finding.codePoint),
    ).toEqual(['U+00A0'])
  })

  it('classifies only dash findings as dash findings', () => {
    const findings = analyzeText('a\u00A0–b')

    expect(findings.every((finding) => isDashFinding(finding))).toBe(false)
    expect(findings.some((finding) => isDashFinding(finding))).toBe(true)
  })
})
