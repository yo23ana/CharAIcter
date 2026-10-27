import { findEmptyLines } from './checks/lines.js'
import { findMixedScriptWords } from './checks/mixedScripts.js'
import { findSpecialCharacters } from './checks/specialCharacters.js'
import { findSymbols } from './checks/symbols.js'
import { findOrdinaryWhitespace } from './checks/whitespace.js'
import type { AnalyzeOptions, Finding } from './types.js'

export type {
  AnalyzeOptions,
  Finding,
  FindingCategory,
  FindingSeverity,
  LineType,
  SymbolKind,
  WhitespaceType,
} from './types.js'

/** Runs every check and returns the findings in text order. */
export function analyzeText(
  text: string,
  options: AnalyzeOptions = {},
): Finding[] {
  return [
    ...findOrdinaryWhitespace(text),
    ...findEmptyLines(text),
    ...(options.symbols === true ? findSymbols(text) : []),
    ...findSpecialCharacters(text),
    ...findMixedScriptWords(text),
  ].sort((left, right) => left.startOffset - right.startOffset)
}
