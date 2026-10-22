---
name: feature-builder
description: 'Plan, implement, and verify new CharAIcter application features consistently. Use when adding or changing analyzer rules, React UI behavior, API boundaries, shared contracts, accessibility, or user-facing workflows in this repository.'
argument-hint: '[describe the feature to build]'
user-invocable: true
disable-model-invocation: false
---

# CharAIcter Feature Builder

Build features incrementally while preserving CharAIcter's current architecture, privacy posture, visual language, and verification standards. Adapt the workflow to the requested feature; do not execute every step mechanically when it does not apply.

## Repository architecture

Treat these boundaries as the default design:

- `apps/web/src/`: React UI and browser-only interaction.
- `apps/web/src/analyzer.ts`: pure, deterministic Unicode analysis logic and finding types.
- `apps/web/src/*.test.ts`: Vitest tests for analyzer behavior and utilities.
- `apps/api/src/`: Fastify API boundary. Use it when a feature genuinely needs server-side work, persistence, provider credentials, or a stable remote contract.
- `apps/web/src/styles.css`: shared visual language and responsive layout. Preserve the warm, light autumn palette, compact above-the-fold layout, and accessible contrast.
- `package.json`: canonical scripts. Prefer existing `check`, `test`, and `build` commands over introducing new tooling.

The current analyzer is client-side and stateless. Do not move work to the API merely because an API exists.

## Adaptive workflow

### 1. Understand the feature and choose its boundary

Read the relevant implementation and tests before editing. Identify:

- the user-visible behavior and success criteria;
- whether the feature is pure analysis, UI interaction, API behavior, or a cross-layer change;
- whether it changes existing findings, positions, severity, or response shapes;
- privacy, performance, accessibility, and untrusted-input implications.

Use the smallest suitable boundary:

- **Pure deterministic rule or transformation** → extend `analyzer.ts` and its unit tests.
- **Input, display, state, or interaction change** → update `App.tsx` and focused styles; add a component test if the behavior is substantial.
- **Server-side requirement** → add a typed API route and validation in `apps/api`, with explicit error behavior and API tests.
- **Shared data shape** → define a small shared contract only when both sides consume it; avoid speculative packages or abstractions.
- **Large or expensive browser work** → consider a Web Worker only after measuring or establishing a concrete responsiveness need.

Ask for clarification before implementing when the request leaves a meaningful behavioral choice unresolved, such as automatic correction versus preview-only suggestions, default persistence, sensitive-text transmission, severity semantics, or an unbounded input size.

### 2. Plan a thin vertical slice

Before changing code, state the smallest complete slice:

1. user action or input;
2. state/data transformation;
3. visible result or error;
4. focused tests;
5. relevant documentation update.

Prefer extending existing types and helpers. Keep the first implementation explainable and deterministic. Defer optional polish, persistence, AI, comparison, authentication, and deployment changes unless the feature explicitly requires them.

### 3. Implement with repository conventions

- Keep TypeScript strict and preserve type-safe guards.
- Keep analyzer code pure: no DOM, React, network, logging, or mutable global state.
- Iterate text by Unicode code point when analyzing characters; distinguish code-point positions from UTF-16 offsets and document any user-visible position convention.
- Keep findings structured and explainable: category, severity, position, value/code point where relevant, context, and a concise description.
- Never silently rewrite user text. Suggestions must be explicit, previewable, and user-approved.
- Render pasted text as text, not HTML. Avoid `innerHTML`.
- Keep errors visible and actionable; do not use broad catches or silent success fallbacks.
- Reuse the existing palette, spacing, cards, pills, typography, focus states, and responsive patterns before adding new visual primitives.
- Preserve the compact initial viewport: do not add decorative content that pushes the working area below the fold.
- Do not add a dependency when a small existing helper or native platform feature is sufficient.

### 4. Verify according to the change

Always run the narrowest relevant checks, then the baseline checks when the feature crosses layers:

- analyzer or utility change: `npm.cmd test`, `npm.cmd run check`;
- React/state/style change: `npm.cmd test`, `npm.cmd run check`, `npm.cmd run build`;
- API change: `npm.cmd run check`, `npm.cmd run build`, focused endpoint tests, and an explicit request/error-path check;
- cross-layer or release change: all of the above, plus a browser smoke test when browser tooling is available.

For every feature, verify the actual requirement rather than only compilation:

- ordinary input remains unchanged;
- edge cases and empty states are intentional;
- findings are deterministic and ordered;
- positions remain correct with emoji, astral symbols, and multiline text;
- buttons, labels, focus behavior, keyboard use, and contrast remain accessible;
- untrusted excerpts and values are safely rendered;
- no submitted text is logged or persisted unexpectedly;
- production build succeeds.

If browser testing is available, exercise the real path: enter or paste representative input, trigger the feature, inspect the visible result, and check the empty/error state. Do not launch servers or browsers unless the user asked for it or explicitly approved it; provide commands when manual verification is more appropriate.

### 5. Review scope and document the result

Before finishing:

- inspect the diff for unrelated changes and accidental generated files;
- update `README.md` or relevant documentation when behavior or commands change;
- report what changed, what was intentionally deferred, and the exact checks run;
- call out any known limitations or false-positive behavior rather than presenting heuristic detection as certainty.

## Feature-specific guidance

### Analyzer rules

Use table-driven rules for Unicode categories and names where practical. Add fixtures for positive, negative, boundary, and position-mapping cases. Keep “unusual” distinct from “malicious”; explanations should describe why a character deserves review.

### UI features

Favor user-visible behavior tests over implementation details. Preserve the existing `App` flow unless a feature clearly warrants extracting a component. Keep loading, no-results, error, and long-content states deliberate.

### API features

Validate untrusted input at the boundary, cap request sizes, return explicit status codes and error shapes, and never log request bodies. Keep routes stateless unless persistence is an explicit requirement.

### Privacy-sensitive or AI features

Default to local processing. Any transmission of user text must be explicit, minimal, documented, and opt-in. Keep deterministic local behavior available when a remote provider is unavailable.

## Completion standard

A feature is complete only when its requested behavior works at the correct layer, focused tests cover meaningful behavior, repository checks pass, documentation is current where needed, and no future feature has been implemented speculatively.
