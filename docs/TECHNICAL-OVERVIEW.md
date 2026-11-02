# Technical overview

## Project overview

CharAIcter is a TypeScript application for inspecting text for invisible,
unusual, or visually confusing characters, and for showing the text's structure
(empty lines, whitespace, symbols) precisely. It never modifies the user's
text; it only reports findings with exact positions.

The repository is an npm workspace with three parts:

| Path              | Role                                                                         |
| ----------------- | ---------------------------------------------------------------------------- |
| `packages/shared` | Core: pure, dependency-free analyzer, language rules, data, and shared types |
| `apps/api`        | Fastify API: validates requests, loads fastText, and runs the core           |
| `apps/web`        | React/Vite UI: text editor, findings, inspectors, and highlighting           |

`packages/shared` is linked into `node_modules` as `@charaicter/shared` by npm
workspaces, so the API and the web app import it by package name (resolved to
its built `dist`). Tests are Vitest files next to the code they test. `npm run
dev` builds the shared package and starts the web app (port 5173) and the API
(port 3000) together.

## System architecture

```
Browser (apps/web)                      API (apps/api)              Core (packages/shared)
  textarea + overlay                     POST /analyze
  "Analyze text" ──── { text } ────────▶   fastText LID-176 ─ predict ─▶ detectLanguage(text, predict)
                                           ────────────────────────────▶ analyzeText(text, { symbols: true })
  results, inspectors ◀── AnalysisResult ─┘
```

Analysis runs on the API, not in the browser. The UI sends the original text,
untrimmed, through the typed client in `apps/web/src/api.ts`. In development,
Vite proxies `/analyze` to `http://localhost:3000`, so there is no cross-origin
request. `VITE_API_BASE_URL` selects a different API; when unset, the client
uses the current origin. No text is stored by the API.

`packages/shared` must be built (`npm run build:shared`) before the web app,
the API, or the tests use it; every relevant npm script does this first.

### Code organization

The code is split into three layers with one-way dependencies. ESLint
(`eslint.config.js`) and each project's TypeScript settings reject imports and
APIs that cross a boundary.

| Layer      | Path                  | Responsibility                                                                  | Boundary                                                                                                        |
| ---------- | --------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Core       | `packages/shared/src` | Pure, deterministic detection: findings, language rules, data, and shared types | Imports only its own modules; compiled without DOM or Node.js types; no `console`, `Math.random`, or `Date.now` |
| Backend    | `apps/api/src`        | HTTP, validation, model loading, and combining results                          | Uses the core by package name; compiled without DOM types; never imports frontend code                          |
| End-to-end | `e2e/`                | Playwright tests of the built app in a browser                                  | Browser and HTTP only; never imports app code                                                                   |
| Frontend   | `apps/web/src`        | Rendering and interaction                                                       | Imports only types from the core and reaches the backend over HTTP; `lib/` helpers import only types from React |

Anything that needs I/O is passed into the core as a function. The API gives
`detectLanguage` a `PredictLanguages` function backed by fastText, so the
language rules are tested with a stand-in model and need no network or model
files.

### `POST /analyze`

Request: `{ "text": string }`. HTTP 400 when `text` is missing, not a string, or
longer than 100,000 characters.

Response (`AnalysisResult` in `packages/shared/src/analysis.ts`):

```json
{
  "language": {
    "code": "bul",
    "name": "Bulgarian",
    "confidence": "low"
  },
  "findings": [
    {
      "category": "symbol",
      "codePoint": "U+002C",
      "description": "Symbol \",\": comma.",
      "severity": "info",
      "value": ",",
      "startOffset": 7,
      "endOffset": 8,
      "line": 1,
      "endLine": 1,
      "linePosition": 8,
      "lineEndPosition": 8,
      "excerpt": "Здравей, как си днес",
      "excerptStart": 7,
      "symbolKind": "punctuation",
      "symbolName": "comma"
    }
  ]
}
```

For mixed-script text the language is
`{ "code": "mul", "name": "Multiple languages detected", "languages": [...] }`,
with languages listed in reading order.

## Process per module

### Shared analyzer (`packages/shared/src`)

`analyzeText(text, options?)` in `analyzer.ts` runs every check and returns the
findings sorted by position. The code is split by responsibility:

| File                          | Contents                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `analyzer.ts`                 | `analyzeText` and the public types                                             |
| `types.ts`                    | `Finding` and the other finding types                                          |
| `characters.ts`               | Character tables (invisible, unusual spaces, dashes) and classifiers           |
| `location.ts`                 | Line/position indexing and whole-word excerpts (`createLocator`, one per call) |
| `checks/specialCharacters.ts` | One pass over code points: invisible, hidden text, lookalikes, and similar     |
| `checks/whitespace.ts`        | Leading, trailing, repeated, and before-punctuation spaces                     |
| `checks/lines.ts`             | Empty and whitespace-only lines                                                |
| `checks/mixedScripts.ts`      | Words mixing Latin, Cyrillic, and Greek                                        |
| `checks/symbols.ts`           | Every non-letter, non-digit character, with kind and name                      |

The categories are:

| Category       | What is reported                                                                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invisible`    | Zero-width characters, bidirectional controls, soft hyphen, Hangul fillers, Braille blank, and similar                                                                                                     |
| `whitespace`   | Leading, trailing, repeated internal, and before-punctuation spaces; unusual Unicode spaces such as NBSP                                                                                                   |
| `line`         | Runs of empty or whitespace-only lines (grouped, with start/end-of-text noted); U+2028, U+2029, and NEL line breaks                                                                                        |
| `hidden-text`  | Unicode tag characters (U+E0000–E007F), decoded so the hidden message is shown. Tags inside subdivision-flag emoji are ignored                                                                             |
| `lookalike`    | Runs of fullwidth or mathematical styled letters, with their plain reading                                                                                                                                 |
| `mixed-script` | Words mixing Latin, Cyrillic, and Greek letters                                                                                                                                                            |
| `dash`         | Every dash variant, including the ordinary hyphen-minus (informational)                                                                                                                                    |
| `control`      | C0 and C1 control characters (except tab and line breaks)                                                                                                                                                  |
| `replacement`  | U+FFFD, a sign of corrupted decoding                                                                                                                                                                       |
| `private-use`  | Private-use code points                                                                                                                                                                                    |
| `symbol`       | Only with `{ symbols: true }`: every character that is not a letter, mark, digit, space, or control/format character. Emoji with modifiers count as one symbol. Each has a `symbolKind` and a `symbolName` |

Location data on every finding:

- `startOffset`/`endOffset`: UTF-16 range, used to highlight the textarea.
- `line`/`endLine` and `linePosition`/`lineEndPosition`: 1-based line numbers
  and inclusive character positions within the line, counted in code points so
  an emoji counts once. The UI shows these as "Line 3, position 5".
- `excerpt`/`excerptStart`: surrounding context widened to whole words, and the
  exact index of the finding inside it. Highlighting uses this index rather
  than searching, so repeated characters (such as the second `-` in `A--`) are
  marked correctly.

Performance: line starts and astral-character offsets are indexed once per
text, and each finding's location is found by binary search. Symbol scanning
segments graphemes only around candidate characters. Every check is linear in
the text length. An ordinary 100,000-character text is analyzed in roughly
0.2–0.3 s; text that yields a finding for nearly every character (emoji,
dashes) takes up to about 2 s.

### Language rules (`packages/shared/src/language.ts`)

`detectLanguage(text, predict)` decides the language from a model's
predictions; the model itself is the `predict` function the API passes in.
`alphabets.ts` holds lowercase alphabets and scripts for about 30 languages,
keyed by ISO 639-3 code.

1. Split the text's words by script (Latin, Cyrillic, Greek, other). Fewer than
   12 letters in total returns `Undetermined` without asking the model.
2. If two scripts each have at least 20 letters, detect each script's words
   separately. If they produce different languages, return `mul`.
3. Otherwise rank the model's predictions for the whole text (the API passes
   fastText's top 10):
   - **Script check:** for Cyrillic and Greek text, only languages known to use
     that script are kept. For Latin text, only languages known to use another
     script are dropped.
   - **Alphabet penalty:** subtract up to 0.6 based on the share of letters the
     language's alphabet lacks (for example `ы` for Bulgarian). One stray
     letter costs little; many rule the language out.
   - **Distinctive words (Cyrillic only):** add 0.2 for each common word unique
     to one language (`ще`, `това` → Bulgarian; `это`, `сегодня` → Russian),
     up to 0.6. fastText is unreliable on short Cyrillic text, and this
     settles close calls.
4. Confidence: `high` needs a score of at least 0.8, a lead of 0.3 over the
   runner-up, and 40+ letters. Otherwise `low`, or `undetermined` when the
   score is too weak.

Language names come from `Intl.DisplayNames`, so any fastText language gets a
readable name. ISO 639-1 codes are mapped to ISO 639-3 for common languages.
`language.test.ts` covers these rules with a stand-in model.

### API (`apps/api`)

`server.ts` sets up Fastify with `GET /health` and the schema-validated
`POST /analyze`. Request logging is off during tests. CORS follows
`CORS_ORIGIN` (a comma-separated list); without it, development allows any
origin and production allows none. `analyze.ts` loads the fastText LID-176
WebAssembly model once at startup and wraps it as a `PredictLanguages`
function (text on one line, top 10 labels with the `__label__` prefix
removed). `analyzeInput` returns `detectLanguage` with those predictions and
`analyzeText(text, { symbols: true })`. The benchmark text lives in
`src/fixtures` and, like the tests, is excluded from the build output.
`franc` is used only as the baseline in the benchmark.

### Web UI (`apps/web/src`)

| Path                              | Contents                                                    |
| --------------------------------- | ----------------------------------------------------------- |
| `App.tsx`                         | Page layout and state (text, analysis, hover and selection) |
| `api.ts`                          | Typed client for `POST /analyze`                            |
| `components/TextEditor.tsx`       | Textarea with the highlight overlay                         |
| `components/Results.tsx`          | Summary, severity filters, and tabs                         |
| `components/FindingCard.tsx`      | Finding cards and lists                                     |
| `components/SymbolsTab.tsx`       | Symbols grouped by character                                |
| `components/AllDetectionsTab.tsx` | Table of every detection, grouped                           |
| `components/EmptyResults.tsx`     | Placeholder before the first analysis                       |
| `lib/format.ts`                   | Labels, visible whitespace markers, and position text       |
| `lib/selection.ts`                | Highlights and the hover/click (select) behavior            |
| `lib/findingGroups.ts`            | Splitting findings by tab, de-duplicating, and grouping     |

- **Rendering:** the hover and select handlers are created once, and
  `Results` and each finding card are memoized, so hovering redraws only the
  editor highlight and selecting redraws only the cards that changed. With
  3,000 findings a hover takes about 50 ms instead of about 500 ms.
- **Layout:** two columns on screens wider than 960 px. The editor is on the
  left and is sticky, so it stays in view while the results on the right
  scroll. Narrower screens stack the editor above the results.
- **Editor:** a textarea with a pointer-transparent overlay that mirrors the
  text and draws highlights. It can draw any number at once (for example every
  comma). Empty lines are highlighted with a bar, since they have no visible
  text. Results are cleared whenever the text changes, and analysis runs only on
  **Analyze text** or Ctrl + Enter.
- **Selection:** a highlight covers one finding or a group. Hovering previews
  it; clicking pins it, so it stays while the user scrolls, and scrolls the
  textarea to its first occurrence. Clicking again unpins it. Items are
  keyboard accessible (Tab, then Enter or Space).
- **Results:** a summary with the language and the number of findings per
  severity (each count filters the Findings tab), followed by tabs. Arrow keys
  move between tabs:
  - **Findings:** all findings except dashes and symbols, as cards, with a
    whitespace toggle.
  - **Dashes:** every dash occurrence as a card.
  - **Symbols:** each distinct symbol once, with name, code, and count, filtered
    by kind. Opening a symbol highlights all its occurrences and lists them.
  - **All:** one table row per distinct detection, with a count, filtered by
    category. Clicking a row highlights every occurrence. Symbols already
    covered by a more specific finding (such as a dash) are left out. At most
    1,000 rows are rendered.

### Testing agent (`scripts/testing-agent.ts`)

`npm run test:agent` takes a read-only inventory of the repository (source and
test files, exports, scripts, frameworks). It generates deterministic analyzer
edge-case tests if `packages/shared/src/analyzer.generated.test.ts` is missing, runs
Vitest, and prints a report. It never changes application code, installs
packages, or edits tests to hide failures.

## Testing

| Command                      | What it covers                                                                                                                                                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                   | Analyzer behavior and positions, and language rules with a stand-in model (`packages/shared/src`, run against the source), finding grouping and the API client (`apps/web/src`), and API routes, validation, CORS, and language detection (`apps/api/src`) |
| `npm run check`              | Typecheck, ESLint, Prettier, `check:chars`, which rejects literal invisible and control characters in tracked text files, and `check:lockfile` (see Security)                                                                                              |
| `npm run language:benchmark` | Accuracy on the corpus in `apps/api/src/fixtures/languageCorpus.ts` (currently 25/25), the `franc` baseline, edge cases, and confusions                                                                                                                    |
| `npm run test:coverage`      | The unit tests with V8 coverage of the core, the API, and `apps/web/src/lib` (configured in `vitest.config.ts`, report in `coverage/`)                                                                                                                     |
| `npm run test:e2e`           | Builds everything and runs the Playwright specs in `e2e/` in Chromium against the real API                                                                                                                                                                 |

End-to-end tests (`playwright.config.ts`) start the built API on port 3100
and `vite preview` on port 4173, with `API_PROXY_TARGET` pointing the
preview's `/analyze` proxy at that API, so they never touch the development
servers. The specs drive the UI by role and accessible name, stub the API
only for error states, and save full-page screenshots of key scenarios
(empty state, findings, selection, tabs, errors, 960 and 400 px widths) to
the git-ignored `e2e/screenshots/` for visual review. Failure traces and
screenshots go to `test-results/`, and the HTML report to
`playwright-report/`. The `test-writer` Claude Code agent
(`.claude/agents/test-writer.md`) writes and runs both kinds of tests,
repairs wrong tests, and reports real bugs as expected failures
(`it.fails`, `test.fail`) instead of changing application code.

`npm run typecheck` runs `tsc --build` over the shared package, the API, and the
web app, then `tsconfig.tests.json` over test files and scripts, which the
build configs exclude. API tests also pin known-hard language cases: Italian,
Portuguese, Dutch, and Polish, and short Bulgarian, Russian, and Ukrainian
phrases.

GitHub Actions (`.github/workflows/ci.yml`) runs `npm ci`, check, tests, and
build on every push to `main`/`master` and on pull requests, using the Node
version in `.nvmrc`. A second job installs Chromium, runs `npm run test:e2e`,
and keeps the screenshots, report, and failure traces as a downloadable
`e2e-results` artifact for 14 days. `.gitattributes` keeps LF line endings on every platform,
which the Prettier check expects.

## Security and supply chain

| Area                | Control                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Installs            | `.npmrc` sets `ignore-scripts`, `min-release-age=7` (new versions are chosen only after a week), and `allow-git=none`. `npm ci` installs the lockfile as it is                                                                  |
| Lockfile            | `check:lockfile` requires every package to come from `registry.npmjs.org` over HTTPS with a sha512 hash, and fails on install scripts except in reviewed packages (`esbuild`, `fsevents`, which work without them)              |
| Workflows           | Actions are pinned to commit SHAs, jobs get read-only `contents` permission, and checkouts do not keep the token                                                                                                                |
| `security.yml`      | On every push, pull request, weekly (Monday 06:00 UTC), and on demand: `npm audit`, `npm audit signatures`, gitleaks over the full git history, Semgrep (JavaScript, TypeScript, React, Node.js, and secrets rules), and zizmor |
| Dependabot          | `dependabot.yml` proposes weekly, grouped npm and GitHub Actions updates after a 7-day cooldown. Alerts and security updates are repository settings                                                                            |
| Secrets             | `.gitignore` excludes `.env` files (except `.env.example`), `*.pem`, and `*.key`; Claude Code settings deny reading them                                                                                                        |
| AI coding assistant | Claude Code runs `check:chars` after every edit, may run only read-only npm scripts without asking, and is denied force pushes and `npm publish`                                                                                |

`npm audit` fails the job on any advisory in production dependencies, and on
high or critical ones in development dependencies. Every advisory is listed in
the job summary. Moderate development-only advisories do not fail it because
some, such as a `minimatch` advisory reached through ESLint, have no compatible
fix yet.

The repository is private, so GitHub code scanning, secret push protection,
and dependency review are unavailable without GitHub Advanced Security.
Scanner findings fail the job instead of appearing in the Security tab, and a
committed secret is caught after the push, not blocked before it. The gitleaks
binary (checked against its SHA-256), the Semgrep image (pinned by digest), and
the zizmor version are updated by hand; Dependabot updates only the actions.

## Challenges, solutions, and design trade-offs

- **fastText on short Cyrillic text.** Close Bulgarian/Russian calls were often
  wrong, and `franc` was worse (it labelled Bulgarian as Serbian or Bosnian).
  Script filtering, alphabet penalties, and distinctive words fix the known
  cases without a second model. The word lists are small and hand-curated, so
  they are a tie-breaker, not the main signal.
- **Confidence over coverage.** Short text is reported with `low` confidence or
  as `Undetermined` rather than as a confident guess, because a wrong "high"
  answer misleads more than an honest "not sure".
- **Exact positions.** Findings carry UTF-16 offsets for the editor and
  code-point positions for people. Excerpts store the finding's index, so
  highlighting never depends on searching the excerpt.
- **Noise control.** Symbols and dashes are common in ordinary text, so they
  live in their own tabs instead of the main list. The symbol check is opt-in
  in the analyzer (`{ symbols: true }`), so other callers keep the
  original behavior.
- **Linear-time analysis.** The API accepts 100,000 characters from anyone and
  runs the analyzer on a single thread, so a slow check is a denial-of-service
  risk. The whitespace check used to search ahead again after every space run,
  which took about 10 s on alternating spaces and no-break spaces; it now
  reuses one forward search. Analyzer tests time such worst-case input, and
  Semgrep's generic regular-expression rule is turned off in favor of them.
- **Not yet covered:** no coverage threshold, no rate limiting on the API, and line-ending differences (CRLF vs LF) are
  not reported because browsers normalize textarea line endings.
