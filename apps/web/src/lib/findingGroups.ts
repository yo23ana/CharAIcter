import type { Finding } from '@charaicter/shared/analyzer'

export function isDashFinding(finding: Finding) {
  return finding.category === 'dash'
}

export function isSymbolFinding(finding: Finding) {
  return finding.category === 'symbol'
}

/**
 * Splits findings by results tab: dashes and symbols have their own tabs, and
 * everything else is a main finding.
 */
export function splitFindings(findings: Finding[]) {
  return {
    dashes: findings.filter(isDashFinding),
    main: findings.filter(
      (finding) => !isDashFinding(finding) && !isSymbolFinding(finding),
    ),
    symbols: findings.filter(isSymbolFinding),
  }
}

/**
 * Findings for the "all detections" table. A symbol finding is dropped when
 * another finding already covers exactly the same characters (for example a
 * dash, a replacement character, or fullwidth punctuation), so each character
 * is listed once.
 */
export function uniqueDetections(findings: Finding[]) {
  const covered = new Set(
    findings
      .filter((finding) => !isSymbolFinding(finding))
      .map((finding) => `${finding.startOffset}:${finding.endOffset}`),
  )
  return findings.filter(
    (finding) =>
      !isSymbolFinding(finding) ||
      !covered.has(`${finding.startOffset}:${finding.endOffset}`),
  )
}

export interface DetectionGroup {
  findings: Finding[]
  key: string
}

/**
 * Groups identical detections (same type, characters, and description), such
 * as every comma or every trailing space of the same length, in order of
 * first appearance.
 */
export function groupDetections(findings: Finding[]): DetectionGroup[] {
  const groups = new Map<string, DetectionGroup>()
  for (const finding of findings) {
    const key = [finding.category, finding.value, finding.description].join(
      '\u0000',
    )
    const group = groups.get(key) ?? { findings: [], key }
    group.findings.push(finding)
    groups.set(key, group)
  }
  return [...groups.values()]
}
