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
  characters, and mixed Latin/Cyrillic words
- API health endpoint at `http://localhost:3000/health`

Analysis currently runs locally in the browser; the API is not required for the
analyzer page yet.

Whitespace findings distinguish ordinary leading or trailing spaces, repeated
internal spaces, and unusual Unicode whitespace. Ordinary space findings are
informational only, and the original input is never trimmed or modified. The
results view includes a toggle for showing or hiding whitespace rows and uses
visible markers such as `·` and `⟦U+XXXX⟧` to make invisible whitespace clear.
Results are cleared as soon as the input changes, and analysis remains an
explicit button action so users can finish editing before reviewing findings.

## Development

Use Node.js LTS and npm, then run:

```bash
npm install
npm run check
npm run build
npm run dev
```

The frontend runs at `http://localhost:5173` and the API runs at `http://localhost:3000`.
