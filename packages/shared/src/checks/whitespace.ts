import type { Locate } from '../location.js'
import type { Finding, WhitespaceType } from '../types.js'

export function findOrdinaryWhitespace(
  text: string,
  locate: Locate,
): Finding[] {
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
      locate(
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
