# CharAIcter

CharAIcter is a web application for inspecting text for subtle character-level anomalies, including unusual Unicode characters, invisible characters, and visually similar scripts.

## Foundation phase

The current version includes:

- React and Vite frontend in `apps/web`
- Node.js and Fastify API in `apps/api`
- Strict TypeScript project references
- ESLint, Prettier, Vitest, and reproducible build scripts
- Client-side text analysis for invisible characters, unusual whitespace,
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

Use Node.js 22 or newer (`.nvmrc` pins 24) and npm, then run:

```bash
npm install
npm run check
npm test
npm run build
npm run dev
npm run test:agent
```

The frontend runs at `http://localhost:5173` and the API runs at `http://localhost:3000`.

The repository is an npm workspace: `packages/shared` is linked as
`@charaicter/shared`, so the web app and the API import it by package name.
`npm run check` type-checks every project (including tests and scripts), lints,
and checks formatting. GitHub Actions runs check, tests, and build on every
push and pull request.

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
