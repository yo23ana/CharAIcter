---
paths:
  - '**/*.test.ts'
---

# Test rules

- Tests are Vitest files next to the code they test. Analyzer tests in
  `packages/shared/src` import the source (`./analyzer.js`); web and API tests
  import `@charaicter/shared`, which `npm test` builds first.
- Write special characters in test strings as escapes, such as `'a\u200Bb'`
  or `'\u00A0'`, never as literal characters.
- Cover positive, negative (ordinary text gives no finding), and boundary
  cases: start and end of the text, line breaks (LF and CRLF), and text after
  an emoji.
- Assert positions with `line`/`linePosition`/`lineEndPosition` and offsets
  with `startOffset`/`endOffset`. Use `toMatchObject` for the fields that
  matter instead of full snapshots.
- When a test fails, fix the code or explain why the expectation was wrong.
  Never weaken or delete an assertion just to make the suite pass.
- Run one area with `npx vitest run packages/shared` (or a file path), then
  `npm test`.
