import { describe, expect, it } from 'vitest'

import { analyzeText } from '@charaicter/shared/analyzer'

import {
  groupDetections,
  isDashFinding,
  splitFindings,
  uniqueDetections,
} from './findingGroups'

describe('results tabs', () => {
  it('puts every dash in the dash tab and keeps it out of main findings', () => {
    const { dashes, main, symbols } = splitFindings(
      analyzeText('a-b–c—d\u00A0e', { symbols: true }),
    )

    expect(dashes.map((finding) => finding.codePoint)).toEqual([
      'U+002D',
      'U+2013',
      'U+2014',
    ])
    expect(main.map((finding) => finding.codePoint)).toEqual(['U+00A0'])
    expect(symbols.map((finding) => finding.value)).toEqual(['-', '–', '—'])
  })

  it('classifies only dash findings as dash findings', () => {
    const findings = analyzeText('a\u00A0–b')

    expect(findings.every((finding) => isDashFinding(finding))).toBe(false)
    expect(findings.some((finding) => isDashFinding(finding))).toBe(true)
  })
})

describe('all detections', () => {
  it('lists a dash once, as a dash, not again as a symbol', () => {
    const findings = analyzeText('A-- B – C', { symbols: true })

    expect(
      uniqueDetections(findings).map(({ category, value }) => [
        category,
        value,
      ]),
    ).toEqual([
      ['dash', '-'],
      ['dash', '-'],
      ['dash', '–'],
    ])
  })

  it('lists replacement characters and fullwidth punctuation once', () => {
    const findings = analyzeText('a\uFFFD b！', { symbols: true })

    expect(uniqueDetections(findings).map(({ category }) => category)).toEqual([
      'replacement',
      'lookalike',
    ])
  })

  it('keeps symbols that no other finding covers', () => {
    const findings = analyzeText('Cost: 5€', { symbols: true })

    expect(uniqueDetections(findings).map(({ value }) => value)).toEqual([
      ':',
      '€',
    ])
  })
})

describe('grouped detections', () => {
  it('puts every comma in one row, in order of first appearance', () => {
    const findings = analyzeText('a, b, c, d! e,', { symbols: true })
    const groups = groupDetections(uniqueDetections(findings))

    expect(
      groups.map(({ findings: group }) => [
        group[0].value,
        group.map((finding) => finding.startOffset),
      ]),
    ).toEqual([
      [',', [1, 4, 7, 13]],
      ['!', [10]],
    ])
  })

  it('keeps different words of the same type in separate rows', () => {
    const findings = analyzeText('раypal and раypal and gооgle')
    const groups = groupDetections(findings)

    expect(
      groups.map(({ findings: group }) => [group[0].value, group.length]),
    ).toEqual([
      ['раypal', 2],
      ['gооgle', 1],
    ])
  })
})
