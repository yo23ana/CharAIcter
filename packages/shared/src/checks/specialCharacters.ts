import {
  codePointLabel,
  formatCodePoints,
  invisibleCharacters,
  isControl,
  isPrivateUse,
  isTagCharacter,
  lineSeparators,
  lookalikeOf,
  unusualDashes,
  unusualWhitespace,
} from '../characters.js'
import { withLocation } from '../location.js'
import type { Finding } from '../types.js'

// One pass over the text's code points for every check that looks at single
// characters: hidden tag text, styled lookalikes, invisible characters,
// unusual spaces, dashes, line separators, and other special characters.
export function findSpecialCharacters(text: string): Finding[] {
  const findings: Finding[] = []
  for (let offset = 0; offset < text.length;) {
    const codePoint = text.codePointAt(offset)
    if (codePoint === undefined) break

    const value = String.fromCodePoint(codePoint)
    const label = codePointLabel(codePoint)

    if (isTagCharacter(codePoint)) {
      let end = offset
      let hidden = ''
      let lastTag = codePoint
      for (
        let next = codePoint;
        end < text.length && isTagCharacter(next);
        next = text.codePointAt(end) ?? 0
      ) {
        if (next >= 0xe0020 && next <= 0xe007e) {
          hidden += String.fromCodePoint(next - 0xe0000)
        }
        lastTag = next
        end += 2
      }

      // Subdivision flags such as England's are U+1F3F4 followed by tags.
      const isFlag =
        text.codePointAt(offset - 2) === 0x1f3f4 && lastTag === 0xe007f
      if (!isFlag) {
        findings.push(
          withLocation(
            text,
            {
              category: 'hidden-text',
              codePoint: label,
              description:
                hidden === ''
                  ? 'Invisible Unicode tag characters.'
                  : `Invisible Unicode tag characters hide this text: "${hidden}". Hidden text like this can carry instructions for AI tools.`,
              severity: 'high',
              value: text.slice(offset, end),
            },
            offset,
            end,
          ),
        )
      }
      offset = end
      continue
    }

    if (lookalikeOf(codePoint) !== null) {
      let end = offset
      let plain = ''
      for (
        let next = lookalikeOf(codePoint);
        next !== null;
        next = lookalikeOf(text.codePointAt(end) ?? 0)
      ) {
        plain += next
        end += String.fromCodePoint(text.codePointAt(end) ?? 0).length
      }

      findings.push(
        withLocation(
          text,
          {
            category: 'lookalike',
            codePoint: label,
            description: `Styled lookalike characters read as "${plain}" but are not ordinary letters or digits, so search and filters may miss them.`,
            severity: 'medium',
            value: text.slice(offset, end),
          },
          offset,
          end,
        ),
      )
      offset = end
      continue
    }

    if (invisibleCharacters.has(codePoint)) {
      findings.push(
        withLocation(
          text,
          {
            category: 'invisible',
            codePoint: label,
            description: `Invisible character: ${invisibleCharacters.get(codePoint)}.`,
            severity: formatCodePoints.has(codePoint) ? 'high' : 'medium',
            value,
          },
          offset,
          offset + value.length,
        ),
      )
    } else if (unusualWhitespace.has(codePoint)) {
      findings.push(
        withLocation(
          text,
          {
            category: 'whitespace',
            codePoint: label,
            description: `Unusual whitespace: ${unusualWhitespace.get(codePoint)}.`,
            severity: 'low',
            value,
            whitespaceType: 'unusual',
          },
          offset,
          offset + value.length,
        ),
      )
    } else if (unusualDashes.has(codePoint)) {
      const dash = unusualDashes.get(codePoint)
      if (dash === undefined) continue

      findings.push(
        withLocation(
          text,
          {
            category: 'dash',
            codePoint: label,
            description: `${dash.name}: ${dash.description}`,
            severity: 'info',
            value,
          },
          offset,
          offset + value.length,
        ),
      )
    } else if (codePoint === 0xfffd) {
      findings.push(
        withLocation(
          text,
          {
            category: 'replacement',
            codePoint: label,
            description:
              'Replacement character may indicate corrupted or undecodable text.',
            severity: 'medium',
            value,
          },
          offset,
          offset + value.length,
        ),
      )
    } else if (lineSeparators.has(codePoint)) {
      findings.push(
        withLocation(
          text,
          {
            category: 'line',
            codePoint: label,
            description: `Unusual line break: ${lineSeparators.get(codePoint)}. Some programs show it as a new line and others ignore it.`,
            lineType: 'separator',
            severity: 'medium',
            value,
          },
          offset,
          offset + value.length,
        ),
      )
    } else if (isPrivateUse(codePoint)) {
      findings.push(
        withLocation(
          text,
          {
            category: 'private-use',
            codePoint: label,
            description:
              'Private-use character has no standard meaning and may render differently or not at all.',
            severity: 'low',
            value,
          },
          offset,
          offset + value.length,
        ),
      )
    } else if (isControl(codePoint)) {
      findings.push(
        withLocation(
          text,
          {
            category: 'control',
            codePoint: label,
            description: 'Control character is not normally visible in text.',
            severity: 'medium',
            value,
          },
          offset,
          offset + value.length,
        ),
      )
    }

    offset += value.length
  }

  return findings
}
