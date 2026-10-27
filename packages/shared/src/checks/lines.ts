import type { Locate } from '../location.js'
import type { Finding } from '../types.js'

export function findEmptyLines(text: string, locate: Locate): Finding[] {
  const lines: { breakEnd: number; contentEnd: number; start: number }[] = []
  for (let start = 0; ;) {
    const lineBreak = /\r\n|\r|\n/g
    lineBreak.lastIndex = start
    const match = lineBreak.exec(text)
    const contentEnd = match === null ? text.length : match.index
    const breakEnd = match === null ? text.length : contentEnd + match[0].length
    // A final line break does not start a new, empty line.
    if (match === null && start === text.length && lines.length > 0) break
    lines.push({ breakEnd, contentEnd, start })
    if (match === null) break
    start = breakEnd
  }

  const isBlank = (line: (typeof lines)[number]) =>
    /^[\p{Zs}\t]*$/u.test(text.slice(line.start, line.contentEnd))
  const findings: Finding[] = []

  for (let index = 0; index < lines.length; index++) {
    if (!isBlank(lines[index])) continue

    let last = index
    while (last + 1 < lines.length && isBlank(lines[last + 1])) last++

    const run = lines.slice(index, last + 1)
    const count = run.length
    const withWhitespace = run.filter(
      (line) => line.contentEnd > line.start,
    ).length
    const atStart = index === 0
    const atEnd = last === lines.length - 1
    const start = run[0].start
    const end = run[count - 1].breakEnd
    index = last

    if (start === end) continue

    const label =
      count === 1 ? 'Empty line' : `${count} consecutive empty lines`
    const where = atStart
      ? ' at the beginning of the text'
      : atEnd
        ? ' at the end of the text'
        : ''
    const whitespaceNote =
      withWhitespace === 0
        ? ''
        : count === 1
          ? ' It contains only whitespace.'
          : ` ${withWhitespace} of them ${withWhitespace === 1 ? 'contains' : 'contain'} only whitespace.`

    findings.push(
      locate(
        {
          category: 'line',
          description: `${label}${where}.${whitespaceNote}`,
          lineType: 'empty',
          severity:
            count === 1 && !atStart && !atEnd && withWhitespace === 0
              ? 'info'
              : 'low',
          value: text.slice(start, end),
        },
        start,
        end,
      ),
    )
  }

  return findings
}
