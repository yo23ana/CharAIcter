---
name: feature-builder
description: 'Plan, implement, and verify new CharAIcter application features consistently. Use when adding or changing analyzer rules, language detection, React UI behavior, API boundaries, shared contracts, accessibility, or user-facing workflows in this repository.'
argument-hint: '[describe the feature to build]'
user-invocable: true
disable-model-invocation: false
---

# CharAIcter Feature Builder

Build features incrementally while preserving CharAIcter's architecture,
privacy posture, visual language, and verification standards. Adapt the
workflow to the requested feature; do not execute every step mechanically when
it does not apply.

## Repository architecture

Treat these boundaries as the default design:

- `packages/shared/src/`: the analyzer, a pure and deterministic TypeScript
  package imported as `@charaicter/shared`.
  - `analyzer.ts`: `analyzeText(text, options)` and the public types.
  - `types.ts`: the `Finding` shape and related types.
  - `checks/`: one file per check; `characters.ts` holds character tables;
    `location.ts` computes lines, positions, and excerpts.
  - `analysis.ts`: the `AnalysisResult` contract shared with the API and web.
  - `alphabets.ts`: per-language alphabets used by language detection.
- `apps/api/src/`: Fastify. `server.ts` validates input and routes requests;
  `analyze.ts` runs fastText language detection and the analyzer;
  `fixtures/` holds the language benchmark corpus.
- `apps/web/src/`: React UI. `App.tsx` owns layout and state; `components/`
  holds the editor, results tabs, and cards; `lib/` holds pure helpers
  (labels and positions, selection, grouping); `styles.css` holds all styles.
- `package.json`: canonical scripts. Prefer `check`, `test`, `build`, and
  `language:benchmark` over introducing new tooling.

Analysis runs on the API using the shared analyzer; the web app sends the text
and renders the result. Keep detection logic in `packages/shared`, not in React
components or route handlers.

## Adaptive workflow

### 1. Understand the feature and choose its boundary

Read the relevant implementation and tests before editing. Identify:

- the user-visible behavior and success criteria;
- whether the feature is pure analysis, language detection, UI interaction,
  API behavior, or a cross-layer change;
- whether it changes existing findings, positions, severity, or response
  shapes;
- privacy, performance, accessibility, and untrusted-input implications.

Use the smallest suitable boundary:

- **Pure deterministic rule or transformation** → a check in
  `packages/shared/src/checks/` and tests in
  `packages/shared/src/analyzer.test.ts`.
- **Language detection** → `apps/api/src/analyze.ts`, corpus entries in
  `apps/api/src/fixtures/languageCorpus.ts`, and API tests; the benchmark must
  stay at 25/25.
- **Input, display, state, or interaction change** → `apps/web/src/components/`
  or `apps/web/src/lib/`, plus focused styles; test pure helpers in `lib/`.
- **Server-side requirement** → a typed, schema-validated route in
  `apps/api/src/server.ts`, explicit error behavior, and API tests.
- **Shared data shape** → `packages/shared/src/types.ts` or `analysis.ts`,
  only when both sides consume it; avoid speculative abstractions.
- **Expensive work** → measure first (for example, time `analyzeText` on a
  100,000-character text, the API's input limit) before optimizing.

Ask for clarification before implementing when the request leaves a meaningful
behavioral choice unresolved, such as automatic correction versus preview-only
suggestions, default persistence, sending text to another service, severity
semantics, or an unbounded input size.

### 2. Plan a thin vertical slice

Before changing code, state the smallest complete slice:

1. user action or input;
2. state/data transformation;
3. visible result or error;
4. focused tests;
5. relevant documentation update.

Prefer extending existing types and helpers. Keep the first implementation
explainable and deterministic. Defer optional polish, persistence, AI,
comparison, authentication, and deployment changes unless the feature
explicitly requires them.

### 3. Implement with repository conventions

- Keep TypeScript strict and preserve type-safe guards.
- Keep analyzer code pure: no DOM, React, network, logging, or mutable global
  state.
- Iterate text by Unicode code point. `startOffset`/`endOffset` are UTF-16
  offsets for highlighting; `line`, `linePosition`, and `lineEndPosition` count
  code points and are what users see.
- Keep findings structured and explainable: category, severity, position,
  value/code point where relevant, excerpt, and a concise description.
- Never silently rewrite user text. Suggestions must be explicit, previewable,
  and user-approved.
- Render pasted text as text, not HTML. Avoid `innerHTML`.
- Write special characters in source and tests as `\u` escapes, never as
  literal invisible or look-alike characters.
- Keep errors visible and actionable; do not use broad catches or silent
  success fallbacks.
- Reuse the existing palette, spacing, cards, pills, tabs, typography, focus
  states, and responsive patterns before adding new visual primitives.
- Do not add a dependency when a small existing helper or native platform
  feature is sufficient.

### 4. Verify according to the change

On Windows PowerShell use `npm.cmd`; in Git Bash use `npm`. Run the narrowest
relevant checks, then the baseline checks when the feature crosses layers:

- analyzer or utility change: `npm.cmd test`, `npm.cmd run check`;
- language detection change: the above plus `npm.cmd run language:benchmark`;
- React/state/style change: `npm.cmd test`, `npm.cmd run check`,
  `npm.cmd run build`;
- API change: `npm.cmd run check`, `npm.cmd run build`, focused endpoint
  tests, and an explicit request/error-path check;
- cross-layer or release change: all of the above, plus a browser smoke test
  when browser tooling is available and approved.

For every feature, verify the actual requirement rather than only compilation:

- ordinary input remains unchanged;
- edge cases and empty states are intentional;
- findings are deterministic and ordered;
- positions remain correct with emoji, astral symbols, and multiline text;
- buttons, labels, focus behavior, keyboard use, and contrast remain
  accessible;
- untrusted excerpts and values are safely rendered;
- no submitted text is logged or persisted;
- production build succeeds.

If browser testing is available, exercise the real path: enter or paste
representative input, trigger the feature, inspect the visible result, and
check the empty/error state. Do not launch servers or browsers unless the user
asked for it or explicitly approved it; provide commands when manual
verification is more appropriate.

### 5. Review scope and document the result

Before finishing:

- inspect the diff for unrelated changes and accidental generated files;
- update `README.md` when commands or user-facing behavior change, and the
  technical overview as described in
  `.github/instructions/technical-documentation.instructions.md`;
- report what changed, what was intentionally deferred, and the exact checks
  run;
- call out any known limitations or false-positive behavior rather than
  presenting heuristic detection as certainty.

## Feature-specific guidance

### Analyzer rules

Use table-driven rules for Unicode categories and names where practical. Add
fixtures for positive, negative, boundary, and position-mapping cases. Keep
"unusual" distinct from "malicious"; explanations should describe why a
character deserves review. A new finding category also needs a label in
`apps/web/src/lib/format.ts` and a row in the technical overview's category
table.

### UI features

Favor user-visible behavior tests over implementation details. Keep `App.tsx`
to layout and state; put new UI in `components/` and pure helpers in `lib/`.
Keep loading, no-results, error, and long-content states deliberate. Pass
`isSelected` and the stable selection `handlers` to memoized cards rather than
the whole selection.

### API features

Validate untrusted input at the boundary, cap request sizes, return explicit
status codes and error shapes, and never log request bodies. Keep routes
stateless unless persistence is an explicit requirement. Cross-origin access
follows `CORS_ORIGIN`.

### Privacy-sensitive or AI features

Text goes only to this project's own API, which neither logs nor stores it.
Sending text to any other service, such as an AI provider, must be explicit,
minimal, documented, and opt-in. Keep deterministic behavior available when a
remote provider is unavailable.

## Completion standard

A feature is complete only when its requested behavior works at the correct
layer, focused tests cover meaningful behavior, repository checks pass,
documentation is current where needed, and no future feature has been
implemented speculatively.
