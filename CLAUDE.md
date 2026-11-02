# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

CharAIcter is a web app that inspects text for hidden, unusual, and lookalike characters
(invisible characters, odd whitespace, empty lines, mixed scripts, hidden tag
text, symbols) and detects the text's language. It reports findings with exact
positions and never modifies the user's text.

## Commands

On Windows PowerShell, use `npm.cmd` instead of `npm` (the execution policy
blocks `npm.ps1`). Git Bash can use `npm`.

| Command                      | Purpose                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run dev`                | Web app on http://localhost:5173 and API on http://localhost:3000                                        |
| `npm test`                   | Builds `packages/shared`, then runs all Vitest tests                                                     |
| `npm run check`              | Type-checks every project, tests and scripts; ESLint; Prettier; hidden-character scan; lockfile check    |
| `npm run build`              | Production build of all projects                                                                         |
| `npm run language:benchmark` | Language detection accuracy; must stay at 25/25                                                          |
| `npm run test:coverage`      | Unit tests with coverage of the core, the API, and `apps/web/src/lib` (report in `coverage/`)            |
| `npm run test:e2e`           | Builds, starts its own API (3100) and web app (4173), runs Playwright; screenshots in `e2e/screenshots/` |
| `npm run test:agent`         | Testing-agent cycle (`scripts/testing-agent.ts`)                                                         |
| `npm run format`             | Prettier rewrite; fixes `format:check` failures (files must use LF line endings)                         |

Use Node 22 or newer (`.nvmrc` pins 24). Run one area's tests with `npx vitest run packages/shared` (or a file path).
A change is done when `npm run check` and `npm test` pass; also run
`npm run build` for UI or cross-project changes.

## Code organization

Every file belongs to exactly one layer; put new files where this table says.
ESLint (`eslint.config.js`) and each project's `tsconfig.json` reject imports
and APIs that cross a boundary.

| Layer      | Path                  | Holds                                                                                                                                                                                                                                         | May use                                                                                                     |
| ---------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Core       | `packages/shared/src` | Pure, deterministic detection: `analyzer.ts` with one check per file in `checks/`, `language.ts` (language rules; the model is passed in as `PredictLanguages`), data tables, and the types the API and web share (`types.ts`, `analysis.ts`) | Only its own modules. No packages, Node.js, DOM, I/O, `console`, `Math.random`, or `Date.now`               |
| Backend    | `apps/api/src`        | HTTP routes and validation (`server.ts`), model loading and combining results (`analyze.ts`), benchmark data (`fixtures/`)                                                                                                                    | The core by package name, Node.js, and server packages; never frontend code                                 |
| Frontend   | `apps/web/src`        | Page state (`App.tsx`), React components (`components/`), pure UI helpers with no JSX or requests (`lib/`), and the API client (`api.ts`)                                                                                                     | Only types from the core; reaches the backend over HTTP through `api.ts`; `lib/` uses only types from React |
| End-to-end | `e2e/`                | Playwright specs (`*.e2e.ts`) that drive the built app in a browser, and their helpers                                                                                                                                                        | The browser and Playwright only; never app code                                                             |
| Tooling    | `scripts/`            | Repository checks and benchmarks, never imported by the apps                                                                                                                                                                                  | Anything                                                                                                    |

- Place code by what it does, not by who calls it. A rule that decides what is
  a finding or which language a text is in belongs in the core, even if only
  the API uses it. Code that does I/O (HTTP, models, files) belongs in the
  backend; rendering and user interaction belong in the frontend.
- A core module that the apps import needs an `exports` entry in
  `packages/shared/package.json` (now `./analyzer`, `./analysis`, and
  `./language`).
- Tests sit next to the file they test, in the same layer.

## Architecture notes

- Only `packages/*` is an npm workspace. `apps/api` and `apps/web` have no
  `package.json`, so every dependency goes in the root `package.json`.
- Analysis runs on the API, not in the browser: the web app posts `{ text }`
  to `/analyze` and renders the returned `{ language, findings }`. The route
  in `apps/api/src/server.ts` validates the body; `analyzeInput` in
  `apps/api/src/analyze.ts` combines `detectLanguageWithFastText(text)` (the
  core's `detectLanguage` fed with fastText predictions) with
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
  The core compiles without DOM or Node.js types, and the API without DOM
  types.

## Rules

- Area rules in `.claude/rules/` load automatically when you work on matching
  files: `analyzer.md` (packages/shared), `web.md` (apps/web), `api.md`
  (apps/api), and `testing.md` (test files).
- The web app and API use the core's built `dist`, so run
  `npm run build:shared` after changing it (`npm test` and `npm run dev`
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
  already running, it reloads changes on its own. `npm run test:e2e` is the
  exception: it starts its own servers on ports 3100 and 4173 and a headless
  browser, and may run without asking.
- For writing or repairing tests, use the `test-writer` agent
  (`.claude/agents/test-writer.md`): Vitest unit tests, Playwright
  end-to-end tests with screenshots, and a report of real bugs it finds.
- Commit only when asked. Use the existing message style (`feat:`, `fix:`,
  `refactor:`, `chore:`).

## Documentation

@.github/instructions/technical-documentation.instructions.md
