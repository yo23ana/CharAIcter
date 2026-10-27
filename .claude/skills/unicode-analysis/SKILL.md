---
name: unicode-analysis
description: 'Add or change CharAIcter analyzer checks: new characters to flag, new finding categories, severities, descriptions, or character tables in packages/shared. Also use to investigate why a character is or is not reported, or where a finding position comes from.'
argument-hint: '[character, pattern, or check to add or change]'
user-invocable: true
disable-model-invocation: false
---

# CharAIcter Unicode Analysis

Extend the analyzer in `packages/shared/src` so that every finding is correct,
explainable, positioned exactly, and visible in the UI. For work that also
changes the API or UI beyond labels, combine this with the `feature-builder`
skill.

## How the analyzer works

- `analyzer.ts`: `analyzeText(text, options)` runs every check, concatenates
  the findings, and sorts them by `startOffset`. The sort is stable, so the
  order of checks in `analyzeText` decides the order of findings that start
  at the same offset.
- `checks/specialCharacters.ts`: one pass over code points. It handles hidden
  tag text, styled lookalikes, invisible characters, unusual spaces, dashes,
  the replacement character, line separators, private-use, and control
  characters, in that `if`/`else` order. The first matching branch wins.
- `checks/whitespace.ts`, `checks/lines.ts`, `checks/mixedScripts.ts`,
  `checks/symbols.ts`: checks for patterns longer than one character.
  Symbols run only with `{ symbols: true }`.
- `characters.ts`: the character tables (`invisibleCharacters`,
  `unusualWhitespace`, `unusualDashes`, `lineSeparators`) and classifiers.
- `location.ts`: `withLocation(text, partialFinding, startOffset, endOffset)`
  fills in lines, positions, and the whole-word excerpt. Every finding must be
  created through it.
- `types.ts`: `FindingCategory`, `Finding`, and the other types.

## 1. Choose the smallest change

| You want to flag                                   | Change                                                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Another invisible or zero-width character          | Add it to `invisibleCharacters`; also to `formatCodePoints` if it should be high severity |
| Another unusual space                              | Add it to `unusualWhitespace`                                                             |
| Another dash or hyphen                             | Add it to `unusualDashes` with a name and description                                     |
| A new single-character category                    | A new branch in `checks/specialCharacters.ts`, before any branch that would catch it      |
| A pattern across characters, words, or lines       | A new file in `checks/`, called from `analyzeText`                                        |
| Different wording or severity for an existing case | Edit the finding where it is created                                                      |

Prefer a table entry over new code. Check first that no existing branch
already reports the character, so it is not reported twice under different
categories. The one deliberate overlap is symbols: the web app's
`uniqueDetections` hides a symbol finding when another finding covers the same
characters.

## 2. A new category touches six places

1. `types.ts`: add it to `FindingCategory` (and a subtype field if needed,
   like `lineType` or `whitespaceType`).
2. The check that creates it.
3. `analyzer.ts`: call the check, if it is a new file.
4. `apps/web/src/lib/format.ts`: a label in `categoryLabels` (the type-check
   fails without one). Review `findingCode`, `findingValue`,
   `showsWhitespaceMarkers`, and `tableValue` for how the value should
   display; invisible values should show as hidden, not as an empty string.
5. `apps/web/src/lib/findingGroups.ts`: findings appear in the Findings tab
   unless `splitFindings` sends them elsewhere. Decide deliberately.
6. Tests in `packages/shared/src/analyzer.test.ts`, the category table in
   `docs/TECHNICAL-OVERVIEW.md`, and the feature list in `README.md`.

## 3. Write the finding

- **Positions:** pass UTF-16 offsets to `withLocation`. Iterate with
  `codePointAt` and advance by the character's length, so emoji and other
  astral characters are never split.
- **Runs:** report consecutive related characters as one finding (as lookalike
  letters, hidden tag text, and empty lines do), not one finding per character.
- **Code point:** set `codePoint: codePointLabel(codePoint)` for single
  characters.
- **Description:** one or two plain sentences that say what the character is
  and why it deserves review, such as
  `Invisible character: zero-width space.` Describe it as unusual, not
  malicious. Include decoded or plain readings when they help (hidden tag
  text, styled letters).
- **Severity**, following the existing scale:

  | Severity | Meaning                       | Examples                                                                                           |
  | -------- | ----------------------------- | -------------------------------------------------------------------------------------------------- |
  | `high`   | Hides or disguises content    | Bidirectional and format controls, hidden tag text, mixed-script words                             |
  | `medium` | Probably a problem; review it | Replacement and control characters, lookalike letters, line separators, other invisible characters |
  | `low`    | Unusual but often harmless    | Unusual spaces, private-use characters, runs of empty lines                                        |
  | `info`   | Ordinary or structural        | Leading/trailing spaces, a single empty line, dashes, symbols                                      |

- Keep checks pure and deterministic: no DOM, network, logging, or state kept
  between calls.

## 4. Test it

Add focused tests to `packages/shared/src/analyzer.test.ts`. They import the
source, so they need no build. Cover:

- **positive:** the character or pattern is reported with the right category,
  severity, description, and `codePoint`;
- **negative:** ordinary text, including emoji and normal punctuation, is not
  reported;
- **boundaries:** at the start and end of the text, next to other findings,
  and after a line break (LF and CRLF);
- **positions:** `startOffset`/`endOffset` and `line`/`linePosition`/
  `lineEndPosition`, including after an emoji (`'\uD83D\uDE00'` before it);
- **runs:** consecutive characters become one finding with the right range.

Write every special character in tests as a `\u` escape, such as
`'a\u200Bb'` or `'\u00A0'`, never as the literal character.

Run `npx vitest run packages/shared`, then `npm test` and `npm run check`
(`npm.cmd` in PowerShell).

## 5. Inspect and measure

To see what the analyzer reports for a string, build it and print the
findings (Git Bash):

```bash
npm run build:shared
node -e "import('@charaicter/shared/analyzer').then(({ analyzeText }) => console.log(analyzeText('a\u200Bb', { symbols: true })))"
```

For a new check that loops over the text, confirm that a 100,000-character
input (the API's limit) still analyzes in well under a second:

```bash
node -e "import('@charaicter/shared/analyzer').then(({ analyzeText }) => { const text = 'Some text, with punctuation. '.repeat(3500); const start = performance.now(); analyzeText(text, { symbols: true }); console.log(Math.round(performance.now() - start), 'ms') })"
```

## Done when

- the new behavior is covered by tests, and existing tests still pass;
- ordinary text produces no new findings;
- positions are right with emoji and multiple lines;
- the web app shows the category with a label and a sensible value;
- `npm run check` and `npm test` pass;
- the technical overview and README describe the new check.
