---
paths:
  - 'packages/shared/src/**/*.ts'
---

# Analyzer rules (`packages/shared`)

- Keep the analyzer pure and deterministic: no DOM, React, network, logging,
  or state kept between calls. The same text must always give the same
  findings in the same order.
- Iterate text by code point (`codePointAt`, then advance by the character's
  length) so emoji and other astral characters are never split.
- Create every finding with the `locate` function that `analyzeText` gets from
  `createLocator(text)` in `location.ts` and passes to each check. Positions
  mean:
  - `startOffset`/`endOffset`: UTF-16 offsets, used to highlight the textarea;
  - `line`, `linePosition`, `lineEndPosition`: 1-based and counted in code
    points, shown to users as "Line 3, position 5".
- Report a run of related characters as one finding, not one per character.
- Keep every check linear in the text length: the API accepts 100,000
  characters from anyone and runs on a single thread. Never search the rest of
  the text again for each match; time worst-case input in a test, like the
  mixed-whitespace test in `analyzer.test.ts`.
- In `checks/specialCharacters.ts` the first matching branch wins, so put a
  new branch before any branch that would also match its characters.
- Descriptions explain why a character deserves review; call it unusual, not
  malicious.
- For new checks, characters, or finding categories, follow the
  `unicode-analysis` skill.
