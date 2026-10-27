---
paths:
  - 'apps/api/**/*.ts'
  - 'scripts/language-benchmark.ts'
---

# API rules (`apps/api`)

- Validate every request with a Fastify JSON schema; invalid input gets an
  explicit 400. Keep the 100,000-character limit (`MAX_INPUT_LENGTH`).
- Never log, store, or forward request bodies. Request logging is off when
  `NODE_ENV` is `test`.
- Cross-origin access follows `CORS_ORIGIN`; without it, production allows no
  other origins. Do not loosen this default.
- Language detection (`analyze.ts`) ranks fastText predictions, keeps only
  languages that use the text's script, subtracts a penalty for letters the
  alphabet lacks, and adds a bonus for distinctive Cyrillic words. After any
  change, `npm run language:benchmark` must stay at 25/25 and the API tests
  must pass.
- New language cases go in `src/fixtures/languageCorpus.ts` and in
  `server.test.ts`. Fixtures and tests are excluded from the build output;
  keep it that way.
- In tests, create the server with `buildApp()`, call it with `app.inject`,
  and push it into the `apps` array so `afterEach` closes it. Never call
  `listen` in tests.
