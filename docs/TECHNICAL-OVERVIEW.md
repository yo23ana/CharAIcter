# Technical overview

## Project overview

CharAIcter is a TypeScript application for inspecting text for invisible,
unusual, or visually confusing characters, and for showing the text's structure
(empty lines, whitespace, symbols) precisely. It never modifies the user's
text; it only reports findings with exact positions.

The repository is an npm workspace with three parts:

| Path              | Role                                                               |
| ----------------- | ------------------------------------------------------------------ |
| `packages/shared` | Pure, dependency-free analyzer, alphabet data, and shared types    |
| `apps/api`        | Fastify API: language detection plus the shared analyzer           |
| `apps/web`        | React/Vite UI: text editor, findings, inspectors, and highlighting |

Tests are colocated Vitest files. `npm run dev` builds the shared package and
starts the web app (port 5173) and the API (port 3000) together.

## System architecture

```
Browser (apps/web)                      API (apps/api)
  textarea + overlay                     POST /analyze
  "Analyze text" ──── { text } ────────▶   detectLanguage(text)   ── fastText LID-176
                                           analyzeText(text, { symbols: true })
  results, inspectors ◀── AnalysisResult ─┘          │
                                                     ▼
                                           packages/shared/analyzer
```

Analysis runs on the API, not in the browser. The UI sends the original text,
untrimmed, through the typed client in `apps/web/src/api.ts`. In development,
Vite proxies `/analyze` to `http://localhost:3000`, so there is no cross-origin
request. `VITE_API_BASE_URL` selects a different API; when unset, the client
uses the current origin. No text is stored by the API.

`packages/shared` must be built (`npm run build:shared`) before the web app,
the API, or the tests use it; every relevant npm script does this first.

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
      "position": 8,
      "column": 8,
      "endColumn": 9,
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

### Shared analyzer (`packages/shared/src/analyzer.ts`)

`analyzeText(text, options?)` returns findings sorted by position. Each
category is produced by a focused pass:

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
- `position`: 1-based code-point position in the whole text.
- `column`/`endColumn`: UTF-16 columns, kept for compatibility.
- `excerpt`/`excerptStart`: surrounding context widened to whole words, and the
  exact index of the finding inside it. Highlighting uses this index rather
  than searching, so repeated characters (such as the second `-` in `A--`) are
  marked correctly.

Performance: line starts and astral-character offsets are indexed once per
text, and each finding's location is found by binary search. Symbol scanning
segments graphemes only around candidate characters. A 100,000-character text
is analyzed in roughly 0.1–0.2 s.

### Alphabet data (`packages/shared/src/alphabets.ts`)

Lowercase alphabets and scripts for about 30 languages, keyed by ISO 639-3
code. The language detector uses them to penalize languages whose alphabet
lacks letters found in the text.

### API (`apps/api`)

`server.ts` sets up Fastify with permissive development CORS, `GET /health`,
and the schema-validated `POST /analyze`. `analyze.ts` holds language
detection and calls `analyzeText(text, { symbols: true })`.

Language detection (`detectLanguage`):

1. Split the text's words by script (Latin, Cyrillic, Greek, other). Fewer than
   12 letters in total returns `Undetermined`.
2. If two scripts each have at least 20 letters, detect each script's words
   separately. If they produce different languages, return `mul`.
3. Otherwise run the FastText LID-176 WebAssembly model (initialized once at
   startup) on the whole text and rank its top 10 predictions:
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
`franc` is used only as the baseline in the benchmark.

### Web UI (`apps/web/src/App.tsx`)

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
edge-case tests if `apps/web/src/analyzer.generated.test.ts` is missing, runs
Vitest, and prints a report. It never changes application code, installs
packages, or edits tests to hide failures.

## Testing

| Command                      | What it covers                                                                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                   | Analyzer behavior and positions, dash and symbol classification, the API client (with mocked `fetch`), and API routes, validation, and language detection cases |
| `npm run check`              | Typecheck, ESLint, and Prettier                                                                                                                                 |
| `npm run language:benchmark` | Accuracy on the corpus in `apps/api/src/languageCorpus.ts` (currently 25/25), the `franc` baseline, edge cases, and confusions                                  |

API tests also pin known-hard language cases: Italian, Portuguese, Dutch, and
Polish, and short Bulgarian, Russian, and Ukrainian phrases.

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
- **Not yet covered:** no browser (end-to-end) tests, no coverage reporting,
  and line-ending differences (CRLF vs LF) are not reported because browsers
  normalize textarea line endings.
