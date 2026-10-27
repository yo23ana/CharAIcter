import { findEmptyLines } from './checks/lines.js'
import { findMixedScriptWords } from './checks/mixedScripts.js'
import { findSpecialCharacters } from './checks/specialCharacters.js'
import { findSymbols } from './checks/symbols.js'
import { findOrdinaryWhitespace } from './checks/whitespace.js'
import { createLocator } from './location.js'
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
  const locate = createLocator(text)
  return [
    ...findOrdinaryWhitespace(text, locate),
    ...findEmptyLines(text, locate),
    ...(options.symbols === true ? findSymbols(text, locate) : []),
    ...findSpecialCharacters(text, locate),
    ...findMixedScriptWords(text, locate),
  ].sort((left, right) => left.startOffset - right.startOffset)
}
