import { codePointLabel, unusualDashes } from '../characters.js'
import type { Locate } from '../location.js'
import type { Finding, SymbolKind } from '../types.js'

const symbolNames: Record<string, string> = {
  '!': 'exclamation mark',
  '"': 'quotation mark',
  '#': 'number sign',
  $: 'dollar sign',
  '%': 'percent sign',
  '&': 'ampersand',
  "'": 'apostrophe',
  '(': 'left parenthesis',
  ')': 'right parenthesis',
  '*': 'asterisk',
  '+': 'plus sign',
  ',': 'comma',
  '-': 'hyphen-minus',
  '.': 'full stop',
  '/': 'slash',
  ':': 'colon',
  ';': 'semicolon',
  '<': 'less-than sign',
  '=': 'equals sign',
  '>': 'greater-than sign',
  '?': 'question mark',
  '@': 'at sign',
  '[': 'left square bracket',
  '\\': 'backslash',
  ']': 'right square bracket',
  '^': 'caret',
  _: 'underscore',
  '`': 'backtick',
  '{': 'left curly bracket',
  '|': 'vertical bar',
  '}': 'right curly bracket',
  '~': 'tilde',
  '¡': 'inverted exclamation mark',
  '§': 'section sign',
  '©': 'copyright sign',
  '«': 'left angle quotation mark',
  '®': 'registered sign',
  '°': 'degree sign',
  '±': 'plus-minus sign',
  '¶': 'pilcrow',
  '·': 'middle dot',
  '»': 'right angle quotation mark',
  '¿': 'inverted question mark',
  '×': 'multiplication sign',
  '÷': 'division sign',
  '‘': 'left single quotation mark',
  '’': 'right single quotation mark',
  '‚': 'single low quotation mark',
  '“': 'left double quotation mark',
  '”': 'right double quotation mark',
  '„': 'double low quotation mark',
  '•': 'bullet',
  '…': 'horizontal ellipsis',
  '–': 'en dash',
  '—': 'em dash',
  '−': 'minus sign',
  '€': 'euro sign',
  '£': 'pound sign',
  '№': 'numero sign',
  '™': 'trade mark sign',
  '→': 'rightwards arrow',
  '←': 'leftwards arrow',
}

function symbolKindOf(grapheme: string): SymbolKind {
  if (/\p{Emoji_Presentation}|️/u.test(grapheme)) return 'emoji'
  if (/^\p{Sc}/u.test(grapheme)) return 'currency'
  if (
    /^\p{Pd}/u.test(grapheme) ||
    unusualDashes.has(grapheme.codePointAt(0) ?? 0)
  )
    return 'dash'
  if (/^[\p{Pi}\p{Pf}"'‚„]/u.test(grapheme)) return 'quote'
  if (/^[\p{Ps}\p{Pe}]/u.test(grapheme)) return 'bracket'
  if (/^\p{Sm}/u.test(grapheme)) return 'math'
  if (/^\p{N}/u.test(grapheme)) return 'number'
  if (/^\p{P}/u.test(grapheme)) return 'punctuation'
  return 'other'
}

const symbolKindLabels: Record<SymbolKind, string> = {
  bracket: 'bracket',
  currency: 'currency sign',
  dash: 'dash or hyphen',
  emoji: 'emoji',
  math: 'mathematical symbol',
  number: 'numeric symbol',
  other: 'symbol',
  punctuation: 'punctuation mark',
  quote: 'quotation mark',
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

// Every visible character that is not a letter or an ordinary digit:
// punctuation, brackets, quotes, dashes, currency, math, emoji, and so on.
// Spaces, control, and invisible characters are left to the other checks.
export function findSymbols(text: string, locate: Locate): Finding[] {
  const findings: Finding[] = []
  let previousEnd = 0
  for (const match of text.matchAll(/[^\p{L}\p{M}\p{Nd}\p{Z}\p{C}]/gu)) {
    const index = match.index ?? 0
    // Skip characters inside the previous symbol, such as emoji modifiers.
    if (index < previousEnd) continue

    // Segment only a small window, so plain text stays fast.
    const [first] = graphemes.segment(text.slice(index, index + 64))
    const segment = first?.segment ?? match[0]
    previousEnd = index + segment.length
    const codePoint = segment.codePointAt(0) ?? 0
    const symbolKind = symbolKindOf(segment)
    const name = symbolNames[segment] ?? symbolKindLabels[symbolKind]

    findings.push(
      locate(
        {
          category: 'symbol',
          codePoint: codePointLabel(codePoint),
          description: `Symbol "${segment}": ${name}.`,
          severity: 'info',
          symbolKind,
          symbolName: name,
          value: segment,
        },
        index,
        index + segment.length,
      ),
    )
  }
  return findings
}
