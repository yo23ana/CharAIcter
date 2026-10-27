import type {
  Finding,
  FindingCategory,
  FindingSeverity,
} from '@charaicter/shared/analyzer'

export const categoryLabels = {
  control: 'Control character',
  dash: 'Dash character',
  'hidden-text': 'Hidden text',
  invisible: 'Invisible character',
  line: 'Line structure',
  lookalike: 'Lookalike characters',
  'mixed-script': 'Mixed-script word',
  'private-use': 'Private-use character',
  replacement: 'Replacement character',
  symbol: 'Symbol',
  whitespace: 'Whitespace',
} as const satisfies Record<FindingCategory, string>

export const severityLabels = {
  info: 'Information',
  high: 'High attention',
  low: 'Low attention',
  medium: 'Review',
} as const satisfies Record<FindingSeverity, string>

export function visibleWhitespace(value: string) {
  return Array.from(value)
    .map((character) => {
      if (character === ' ') return '·'
      if (character === '\t') return '⇥'
      if (character === '\n') return '↵'
      if (character === '\r') return '␍'
      if (/\s/u.test(character)) {
        const codePoint = character.codePointAt(0)
        return codePoint === undefined
          ? '□'
          : `⟦U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}⟧`
      }
      return character
    })
    .join('')
}

export function showsWhitespaceMarkers(finding: Finding) {
  return finding.category === 'whitespace' || finding.category === 'line'
}

export function findingValue(finding: Finding) {
  if (finding.category === 'hidden-text') {
    return `${Array.from(finding.value).length} hidden characters`
  }
  return showsWhitespaceMarkers(finding)
    ? visibleWhitespace(finding.value)
    : JSON.stringify(finding.value)
}

export function findingCode(finding: Finding) {
  if (finding.codePoint !== undefined) return finding.codePoint
  if (finding.category === 'line') return 'Line'
  return finding.category === 'whitespace' ? 'Space' : 'Word'
}

export function findingLocation(finding: Finding) {
  if (finding.endLine > finding.line) {
    return `Lines ${finding.line}–${finding.endLine}`
  }
  if (finding.lineType === 'empty') return `Line ${finding.line}`

  const positions =
    finding.lineEndPosition > finding.linePosition
      ? `positions ${finding.linePosition}–${finding.lineEndPosition}`
      : `position ${finding.linePosition}`
  return `Line ${finding.line}, ${positions}`
}

export function tableValue(finding: Finding) {
  if (showsWhitespaceMarkers(finding)) return visibleWhitespace(finding.value)
  if (
    finding.category === 'hidden-text' ||
    finding.category === 'invisible' ||
    finding.category === 'control'
  ) {
    return '⟦hidden⟧'
  }
  return finding.value
}
