import type { Locate } from '../location.js'
import type { Finding } from '../types.js'

function scriptOf(character: string) {
  if (/\p{Script=Latin}/u.test(character)) return 'Latin'
  if (/\p{Script=Cyrillic}/u.test(character)) return 'Cyrillic'
  if (/\p{Script=Greek}/u.test(character)) return 'Greek'
  return null
}

export function findMixedScriptWords(text: string, locate: Locate): Finding[] {
  const findings: Finding[] = []
  const wordPattern = /[\p{L}\p{M}\p{N}_]+/gu

  for (const match of text.matchAll(wordPattern)) {
    const word = match[0]
    const start = match.index ?? 0
    const scripts = [
      ...new Set(
        Array.from(word)
          .map(scriptOf)
          .filter((script) => script !== null),
      ),
    ]

    if (scripts.length > 1) {
      findings.push(
        locate(
          {
            category: 'mixed-script',
            description: `This word mixes ${scripts.join(' and ')} letters that can look alike.`,
            severity: 'high',
            value: word,
          },
          start,
          start + word.length,
        ),
      )
    }
  }

  return findings
}
