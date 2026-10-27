import type { Finding } from '@charAIcter/shared/analyzer'

export function isDashFinding(finding: Finding) {
  return finding.category === 'dash'
}

export function dashFindings(findings: Finding[]) {
  return findings.filter(isDashFinding)
}

export function nonDashFindings(findings: Finding[]) {
  return findings.filter((finding) => !isDashFinding(finding))
}
