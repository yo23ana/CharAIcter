# CharAIcter

Web app that inspects text for hidden, unusual, and lookalike characters
(invisible characters, odd whitespace, empty lines, mixed scripts, hidden tag
text, symbols) and detects the text's language. It reports findings with exact
positions and never modifies the user's text.

## Commands

On Windows PowerShell, use `npm.cmd` instead of `npm` (the execution policy
blocks `npm.ps1`). Git Bash can use `npm`.

| Command                      | Purpose                                                           |
| ---------------------------- | ----------------------------------------------------------------- |
| `npm run dev`                | Web app on http://localhost:5173 and API on http://localhost:3000 |
| `npm test`                   | Builds `packages/shared`, then runs all Vitest tests              |
| `npm run check`              | Type-checks every project, tests and scripts; ESLint; Prettier    |
| `npm run build`              | Production build of all projects                                  |
| `npm run language:benchmark` | Language detection accuracy; must stay at 25/25                   |
| `npm run test:agent`         | Testing-agent cycle (`scripts/testing-agent.ts`)                  |

Run one area's tests with `npx vitest run packages/shared` (or a file path).
A change is done when `npm run check` and `npm test` pass; also run
`npm run build` for UI or cross-project changes.

## Architecture notes

- Three parts: `packages/shared` (the analyzer, used by the others as
  `@charaicter/shared`), `apps/api` (Fastify: fastText language detection plus
  the analyzer), and `apps/web` (React UI).
- Analysis runs on the API, not in the browser: the web app posts `{ text }`
  to `/analyze` and renders the returned `{ language, findings }`.
- `analyzeText` lists symbols only when called with `{ symbols: true }`. The
  API passes it; analyzer tests that omit it see no symbol findings.

## Rules

- Import the shared package by name (`@charaicter/shared/analyzer`), never by a
  relative path into `packages/`. The web app and API use its built `dist`, so
  run `npm run build:shared` after changing it (`npm test` and `npm run dev`
  already do).
- Keep the analyzer pure and deterministic: no DOM, network, logging, or
  hidden state. Iterate text by code point.
- Positions: `startOffset`/`endOffset` are UTF-16 offsets (for highlighting the
  textarea); `line`/`linePosition`/`lineEndPosition` count code points (shown
  to users as "Line 3, position 5"). Keep both correct with emoji.
- Never trim, rewrite, log, or store the user's text. Render it as React text,
  never with `innerHTML`.
- Write special characters in source as `\u` escapes (`'\u200B'`), never as
  literal invisible or look-alike characters. Check new test strings for this.
- Adding a finding category touches: `types.ts` (`FindingCategory`), a check in
  `checks/`, `analyzer.ts`, `categoryLabels` in `apps/web/src/lib/format.ts`,
  tests in `packages/shared/src/analyzer.test.ts`, and the category table in
  the technical overview.
- Language detection changes must keep the benchmark at 25/25 and the API
  tests passing; add corpus entries and API tests for new cases.
- Web performance: selection handlers are created once in `App.tsx`; pass
  `isSelected` and `handlers` to memoized cards rather than the whole
  selection, so hovering does not re-render the results.
- Keep the existing visual language (warm parchment, sage, amber) in
  `styles.css`; don't add UI libraries.
- Tests sit next to the code they test. Shared-package tests import the source
  (`./analyzer.js`).
- Ask before launching servers or browsers. If the user's dev server is
  already running, it reloads changes on its own.
- Commit only when asked. Use the existing message style (`feat:`, `fix:`,
  `refactor:`, `chore:`).

## Documentation

@.github/instructions/technical-documentation.instructions.md
