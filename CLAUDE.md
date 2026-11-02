# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

CharAIcter is a web app that inspects text for hidden, unusual, and lookalike characters
(invisible characters, odd whitespace, empty lines, mixed scripts, hidden tag
text, symbols) and detects the text's language. It reports findings with exact
positions and never modifies the user's text.

## Commands

On Windows PowerShell, use `npm.cmd` instead of `npm` (the execution policy
blocks `npm.ps1`). Git Bash can use `npm`.

| Command                      | Purpose                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm run dev`                | Web app on http://localhost:5173 and API on http://localhost:3000                                     |
| `npm test`                   | Builds `packages/shared`, then runs all Vitest tests                                                  |
| `npm run check`              | Type-checks every project, tests and scripts; ESLint; Prettier; hidden-character scan; lockfile check |
| `npm run build`              | Production build of all projects                                                                      |
| `npm run language:benchmark` | Language detection accuracy; must stay at 25/25                                                       |
| `npm run test:agent`         | Testing-agent cycle (`scripts/testing-agent.ts`)                                                      |
| `npm run format`             | Prettier rewrite; fixes `format:check` failures (files must use LF line endings)                      |

Use Node 22 or newer (`.nvmrc` pins 24). Run one area's tests with `npx vitest run packages/shared` (or a file path).
A change is done when `npm run check` and `npm test` pass; also run
`npm run build` for UI or cross-project changes.

## Architecture notes

- Three parts: `packages/shared` (the analyzer, used by the others as
  `@charaicter/shared`), `apps/api` (Fastify: fastText language detection plus
  the analyzer), and `apps/web` (React UI).
- Only `packages/*` is an npm workspace. `apps/api` and `apps/web` have no
  `package.json`, so every dependency goes in the root `package.json`.
- The shared package exposes only the subpaths in the `exports` of
  `packages/shared/package.json`: `./analyzer` (`analyzeText`, finding types),
  `./analysis` (`AnalysisResult`, the `/analyze` response contract), and
  `./alphabets`. A new module that the API or web app imports needs an
  `exports` entry.
- Analysis runs on the API, not in the browser: the web app posts `{ text }`
  to `/analyze` and renders the returned `{ language, findings }`. The route
  in `apps/api/src/server.ts` validates the body; `analyzeInput` in
  `apps/api/src/analyze.ts` combines `detectLanguage(text)` with
  `analyzeText(text, { symbols: true })`.
- In development, Vite proxies only `/analyze` to the API
  (`apps/web/vite.config.ts`); a new endpoint the web app calls needs its own
  proxy entry. `VITE_API_BASE_URL` points the client at another API.
- `analyzeText` (`packages/shared/src/analyzer.ts`) creates one locator per
  call, runs each check in `checks/`, and returns the findings sorted by
  `startOffset`. It lists symbols only when called with `{ symbols: true }`;
  analyzer tests that omit it see no symbol findings.
- `tsc --build` covers the three projects but excludes shared and API tests
  and API fixtures; `tsconfig.tests.json` type-checks those plus `scripts/`.

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
- Supply chain: `.npmrc` blocks install scripts, git dependencies, and
  versions published less than 7 days ago (`npm ci` still installs the
  lockfile as is). `check:lockfile` fails on a package from outside the npm
  registry or with unreviewed install scripts. In workflows, pin actions to a
  full commit SHA with a version comment and keep `permissions: contents: read`;
  `.github/workflows/security.yml` runs npm audit, gitleaks, Semgrep, and
  zizmor.
- Ask before launching servers or browsers. If the user's dev server is
  already running, it reloads changes on its own.
- Commit only when asked. Use the existing message style (`feat:`, `fix:`,
  `refactor:`, `chore:`).

## Documentation

@.github/instructions/technical-documentation.instructions.md
