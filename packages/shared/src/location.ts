import type { Finding } from './types.js'

const excerptContext = 12
const maxWordExtension = 40

function isWordUnit(unit: string | undefined) {
  return unit !== undefined && /[\p{L}\p{M}\p{N}_\uD800-\uDFFF]/u.test(unit)
}

// Widens the excerpt so it starts and ends on word boundaries.
function excerptAround(text: string, startOffset: number, endOffset: number) {
  let from = Math.max(0, startOffset - excerptContext)
  let to = Math.min(text.length, endOffset + excerptContext)
  const minFrom = Math.max(0, from - maxWordExtension)
  const maxTo = Math.min(text.length, to + maxWordExtension)

  while (from > minFrom && isWordUnit(text[from - 1]) && isWordUnit(text[from]))
    from--
  while (to < maxTo && isWordUnit(text[to - 1]) && isWordUnit(text[to])) to++
  if (/[\uDC00-\uDFFF]/.test(text[from] ?? '')) from--
  if (/[\uD800-\uDBFF]/.test(text[to - 1] ?? '')) to++

  return { excerpt: text.slice(from, to), excerptStart: startOffset - from }
}

interface TextIndex {
  // UTF-16 offsets of every astral (surrogate pair) character.
  astralOffsets: number[]
  lineStarts: number[]
  text: string
}

let cachedIndex: TextIndex | null = null

function indexText(text: string): TextIndex {
  if (cachedIndex?.text === text) return cachedIndex

  const lineStarts = [0]
  for (const match of text.matchAll(/\r\n|\r|\n/g)) {
    lineStarts.push((match.index ?? 0) + match[0].length)
  }
  const astralOffsets: number[] = []
  for (let offset = 0; offset < text.length; offset++) {
    if (/[\uD800-\uDBFF]/.test(text[offset])) astralOffsets.push(offset++)
  }

  cachedIndex = { astralOffsets, lineStarts, text }
  return cachedIndex
}

// Number of entries in a sorted array that are less than or equal to value.
function countAtMost(sorted: number[], value: number) {
  let low = 0
  let high = sorted.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (sorted[middle] <= value) low = middle + 1
    else high = middle
  }
  return low
}

function sourceLocation(text: string, startOffset: number, endOffset: number) {
  const { astralOffsets, lineStarts } = indexText(text)
  const codePointsBefore = (offset: number) =>
    offset - countAtMost(astralOffsets, offset - 1)
  const line = countAtMost(lineStarts, startOffset)
  const lastOffset = Math.max(startOffset, endOffset - 1)
  const endLine = countAtMost(lineStarts, lastOffset)
  const lineStart = lineStarts[line - 1]
  const endLineStart = lineStarts[endLine - 1]

  return {
    endLine,
    line,
    lineEndPosition:
      codePointsBefore(lastOffset) - codePointsBefore(endLineStart) + 1,
    linePosition:
      codePointsBefore(startOffset) - codePointsBefore(lineStart) + 1,
  }
}

export function withLocation(
  text: string,
  finding: Omit<
    Finding,
    | 'endLine'
    | 'endOffset'
    | 'excerpt'
    | 'excerptStart'
    | 'line'
    | 'lineEndPosition'
    | 'linePosition'
    | 'startOffset'
  >,
  startOffset: number,
  endOffset: number,
): Finding {
  return {
    ...finding,
    ...sourceLocation(text, startOffset, endOffset),
    ...excerptAround(text, startOffset, endOffset),
    endOffset,
    startOffset,
  }
}
