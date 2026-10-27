# CharAIcter

Web app that inspects text for hidden, unusual, and lookalike characters
(invisible characters, odd whitespace, empty lines, mixed scripts, hidden tag
text, symbols) and detects the text's language. It reports findings with exact
positions and never modifies the user's text.

## Commands

On Windows PowerShell, use `npm.cmd` instead of `npm` (the execution policy
blocks `npm.ps1`). Git Bash can use `npm`.

| Command                      | Purpose                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`                | Web app on http://localhost:5173 and API on http://localhost:3000                     |
| `npm test`                   | Builds `packages/shared`, then runs all Vitest tests                                  |
| `npm run check`              | Type-checks every project, tests and scripts; ESLint; Prettier; hidden-character scan |
| `npm run build`              | Production build of all projects                                                      |
| `npm run language:benchmark` | Language detection accuracy; must stay at 25/25                                       |
| `npm run test:agent`         | Testing-agent cycle (`scripts/testing-agent.ts`)                                      |

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

- Area rules in `.claude/rules/` load automatically when you work on matching
  files: `analyzer.md` (packages/shared), `web.md` (apps/web), `api.md`
  (apps/api), and `testing.md` (test files).
- Import the shared package by name (`@charaicter/shared/analyzer`), never by a
  relative path into `packages/`. The web app and API use its built `dist`, so
  run `npm run build:shared` after changing it (`npm test` and `npm run dev`
  already do).
- Never trim, rewrite, log, or store the user's text. Render it as React text,
  never with `innerHTML`.
- Write special characters in source as `\u` escapes (`'\u200B'`), never as
  literal invisible or look-alike characters. `npm run check:chars` (part of
  `npm run check`) and a Claude Code hook on every edit flag literal ones.
- Ask before launching servers or browsers. If the user's dev server is
  already running, it reloads changes on its own.
- Commit only when asked. Use the existing message style (`feat:`, `fix:`,
  `refactor:`, `chore:`).

## Documentation

@.github/instructions/technical-documentation.instructions.md
