# CharAIcter

CharAIcter is a web application for inspecting text for subtle character-level anomalies, including unusual Unicode characters, invisible characters, and visually similar scripts.

## Foundation phase

The current version includes:

- React and Vite frontend in `apps/web`
- Node.js and Fastify API in `apps/api`
- Strict TypeScript project references
- ESLint, Prettier, Vitest, and reproducible build scripts
- Text analysis on the API for invisible characters, unusual whitespace,
  leading/trailing and repeated internal spaces, control/replacement
  characters, and words mixing Latin, Cyrillic, and Greek letters
- Line structure checks for empty and whitespace-only lines (grouped into
  runs) and Unicode line/paragraph separators
- Hidden text written with invisible Unicode tag characters, decoded so the
  concealed message is shown
- Styled lookalike letters (fullwidth and mathematical bold/italic forms) and
  private-use characters
- Language detection with fastText across all scripts, checked against each
  language's alphabet and, for short Cyrillic text, distinctive common words
- Symbols inspector: every character that is not a letter or digit
  (punctuation, brackets, quotes, dashes, currency, math, emoji), grouped by
  symbol with counts and clickable positions
- "Show all detections" table listing every finding with filters by type
- API health endpoint at `http://localhost:3000/health`

The analyzer page sends text to the API (`POST /analyze`), which detects the
language and runs the shared analyzer, so `npm run dev` starts both.

Whitespace findings distinguish ordinary leading or trailing spaces, repeated
internal spaces, and unusual Unicode whitespace. Ordinary space findings are
informational only, and the original input is never trimmed or modified. The
results view includes a toggle for showing or hiding whitespace rows and uses
visible markers such as `·` and `⟦U+XXXX⟧` to make invisible whitespace clear.
Results are cleared as soon as the input changes, and analysis remains an
explicit button action so users can finish editing before reviewing findings.

## Development

Use Node.js 22 or newer (`.nvmrc` pins 24) and npm. After cloning, run
`npm install` once, and `npx playwright install chromium` once per computer
for the end-to-end tests. In Windows PowerShell, type `npm.cmd` instead of
`npm`.

### Commands

| Command                      | What it does                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                | Starts the app for development: the website at `http://localhost:5173` and the API at `http://localhost:3000`. Both reload when the code changes. |
| `npm test`                   | Runs all unit tests.                                                                                                                              |
| `npm run check`              | Checks types, lint rules, formatting, literal hidden characters in the code, and the dependency lockfile. Run it before committing.               |
| `npm run build`              | Builds the production version of every part.                                                                                                      |
| `npm run format`             | Fixes the formatting problems that `npm run check` reports.                                                                                       |
| `npm run test:e2e`           | Builds the app, starts test servers on ports 3100 and 4173, clicks through it in headless Chromium, and saves screenshots to `e2e/screenshots/`.  |
| `npm run test:coverage`      | Runs the unit tests and reports which code they do not cover (details in `coverage/index.html`).                                                  |
| `npm run language:benchmark` | Measures language detection accuracy on a fixed corpus (currently 25/25).                                                                         |
| `npm run test:agent`         | Runs a local testing cycle and prints a report (see below).                                                                                       |
| `npm run start:api`          | Starts the built API as a production server would (run `npm run build` first).                                                                    |

The other scripts are steps that these commands run for you: `build:shared`,
`build:api`, `build:web`, `dev:api`, `dev:web`, `typecheck`, `lint`,
`format:check`, `check:chars`, and `check:lockfile`.

The repository is an npm workspace: `packages/shared` is linked as
`@charaicter/shared`, so the web app and the API import it by package name.
GitHub Actions runs check, tests, and build on every push and pull request. A
security workflow (dependency audit, secret scan, and code scan) runs on every
push and pull request, and weekly.

### API configuration

| Variable      | Default | Purpose                                                                                                                                                          |
| ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`        | `3000`  | Port the API listens on.                                                                                                                                         |
| `CORS_ORIGIN` | (unset) | Comma-separated origins allowed to call the API from another site. When unset, development allows any origin and production (`NODE_ENV=production`) allows none. |

`npm run test:agent` runs a local testing cycle using the existing Vitest
setup. It inventories the repository, creates deterministic analyzer edge-case
tests if needed, executes the test suite, and reports failures and remaining
risks. It does not install dependencies, access production systems, or modify
production code.
