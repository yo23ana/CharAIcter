export type FindingCategory =
  | 'invisible'
  | 'whitespace'
  | 'mixed-script'
  | 'control'
  | 'replacement'
  | 'dash'
  | 'line'
  | 'lookalike'
  | 'private-use'
  | 'hidden-text'
  | 'symbol'

export type FindingSeverity = 'high' | 'medium' | 'low' | 'info'
export type WhitespaceType =
  | 'leading'
  | 'trailing'
  | 'repeated-internal'
  | 'unusual'
  | 'before-punctuation'

export type LineType = 'empty' | 'separator'

export interface Finding {
  category: FindingCategory
  codePoint?: string
  description: string
  excerpt: string
  /** UTF-16 index in `excerpt` where the finding's value begins. */
  excerptStart: number
  endLine: number
  /** UTF-16 offset just past the finding's last character. */
  endOffset: number
  line: number
  /** Code-point position of the finding's last character on `endLine`. */
  lineEndPosition: number
  /** Code-point position of the finding's first character on `line`. */
  linePosition: number
  lineType?: LineType
  /** UTF-16 offset of the finding's first character. */
  startOffset: number
  severity: FindingSeverity
  value: string
  symbolKind?: SymbolKind
  symbolName?: string
  whitespaceType?: WhitespaceType
}

export interface AnalyzeOptions {
  /** Also report every symbol: any character that is not a letter or digit. */
  symbols?: boolean
}

export type SymbolKind =
  | 'bracket'
  | 'currency'
  | 'dash'
  | 'emoji'
  | 'math'
  | 'number'
  | 'other'
  | 'punctuation'
  | 'quote'
