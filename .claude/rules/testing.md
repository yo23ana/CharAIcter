---
paths:
  - '**/*.test.ts'
  - 'e2e/**/*.ts'
---

# Test rules

- Unit tests are Vitest files next to the code they test. Core tests in
  `packages/shared/src` import the source (`./analyzer.js`,
  `./language.js`) and pass language rules a stand-in model; web and API
  tests import `@charaicter/shared`, which `npm test` builds first.
- End-to-end tests are Playwright specs in `e2e/*.e2e.ts`. They drive the
  built app in a browser, never import its code, and save screenshots of key
  scenarios with `capture(page, name)` to the git-ignored `e2e/screenshots/`.
  `npm run test:e2e` starts its own servers on ports 3100 and 4173.
- Write special characters in test strings as escapes, such as `'a\u200Bb'`
  or `'\u00A0'`, never as literal characters. Check the file afterwards: an
  edit can turn an escape into the character or double its backslash.
- Cover positive, negative (ordinary text gives no finding), and boundary
  cases: start and end of the text, line breaks (LF and CRLF), and text after
  an emoji.
- Assert positions with `line`/`linePosition`/`lineEndPosition` and offsets
  with `startOffset`/`endOffset`. Use `toMatchObject` for the fields that
  matter instead of full snapshots.
- When a test fails, fix the code or explain why the expectation was wrong.
  Never weaken or delete an assertion just to make the suite pass. A known
  bug that is not fixed yet stays as an expected failure (`it.fails`,
  `test.fail`) with a `BUG:` note.
- Run one area with `npx vitest run packages/shared` (or a file path), then
  `npm test`. `npm run test:coverage` shows untested code.
- The `test-writer` agent (`.claude/agents/test-writer.md`) writes and runs
  unit and end-to-end tests, repairs wrong tests, and reports real bugs.
