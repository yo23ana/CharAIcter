---
name: frontend-design
description: 'Design and implement polished, distinctive CharAIcter frontend experiences. Use for React UI improvements, visual hierarchy, typography, spacing, color, responsive layouts, accessibility, interaction states, micro-interactions, and presenting text-analysis results.'
argument-hint: '[describe the frontend improvement]'
user-invocable: true
disable-model-invocation: false
---

# CharAIcter Frontend Design

Create focused, modern frontend experiences that feel intentional rather than
generic. Improve the interface in the smallest coherent slice, preserve
existing behavior, and use the project's visual language before introducing
new patterns.

## Project context

CharAIcter is a privacy-first React/Vite text-analysis application:

- The web app lives in `apps/web/src/`.
- `App.tsx` owns the current input, analysis action, and results presentation.
- `analyzer.ts` is pure, deterministic Unicode analysis logic and defines
  structured findings.
- `styles.css` is the shared styling layer; avoid adding dependencies for
  visual work.
- Analysis is local and stateless. Do not transmit, persist, trim, or rewrite
  user text as part of a frontend improvement.

The current identity is a warm, light autumn palette with:

- parchment and cream surfaces;
- muted sage green for primary actions and focus;
- terracotta and amber for emphasis and attention;
- dark olive text with soft borders and restrained shadows;
- compact cards, rounded controls, readable monospace excerpts, and a
  deliberately uncluttered working area.

Treat this as a foundation, not a restriction. Refine the identity coherently
when the task calls for it; do not replace it with generic dashboard panels,
dark-mode boilerplate, excessive gradients, or decorative content without a
user-facing purpose.

## When to use

Use this skill for:

- improving a page or component's visual hierarchy;
- refining typography, spacing, color, layout, or responsive behavior;
- designing accessible controls, empty states, errors, and focus states;
- adding restrained hover, pressed, transition, or other micro-interactions;
- making analyzer findings easier to scan and understand;
- highlighting suspicious text, Unicode values, positions, or whitespace safely;
- making a small UI change without redesigning the entire application.

Do not use it to change analyzer semantics, API contracts, or privacy behavior
unless the frontend request genuinely requires that change. Route those parts
through the existing feature-building workflow.

## Design principles

### 1. Establish a clear reading order

Every screen should make the next useful action obvious:

1. page purpose;
2. input or primary task;
3. action and status;
4. result summary;
5. detailed findings and supporting context.

Use size, weight, spacing, and grouping before adding color or decoration.
Remove labels that repeat nearby information. Preserve useful accessible
headings even when a visual label is removed.

### 2. Make text-analysis results scannable

Findings are evidence, not generic notifications. Present each result with a
consistent visual structure:

- severity or attention level;
- category;
- concise explanation;
- position and code point when available;
- the relevant value or word;
- a safe excerpt that shows why it was reported.

Visually distinguish informational whitespace from security-relevant findings.
Use restrained emphasis for ordinary spaces and stronger emphasis for unusual
or potentially deceptive characters. Never hide the exact evidence behind
ambiguous copy.

When highlighting text:

- render user input as text nodes or React children, never `innerHTML`;
- highlight the exact matched span, not an approximate replacement;
- preserve surrounding context and Unicode characters;
- provide a readable non-color cue through labels, structure, or text;
- ensure contrast remains sufficient in light and focused states.

### 3. Use a small, coherent visual system

Reuse the existing palette, border radii, spacing rhythm, button shape, card
surfaces, focus ring, and monospace evidence treatment. Add a new color or
visual primitive only when it communicates a meaningful state that the current
system cannot express.

Avoid:

- dashboard-like collections of unrelated cards;
- gradients that compete with the content;
- oversized decorative illustrations;
- too many badge colors;
- animation that delays reading or changes text unexpectedly;
- visual polish that pushes the input and first results below the fold.

### 4. Treat responsive behavior as part of the design

Start with the narrow layout and ensure the primary task remains usable at
small widths. Check:

- headings wrap without collision;
- controls can be reached and understood without horizontal scrolling;
- finding metadata wraps naturally;
- long words, excerpts, and Unicode values do not overflow;
- spacing tightens without making controls or text cramped.

Use the existing breakpoint conventions unless the component has a clear need
for a new one.

### 5. Design accessible interaction states

Every interactive element needs:

- a descriptive accessible name;
- visible keyboard focus;
- hover and pressed states that do not rely on color alone;
- disabled behavior only when it communicates a real constraint;
- stable layout when state text changes.

Use semantic HTML first. Use `aria-pressed` for toggles and visible status text
for important state changes. Respect `prefers-reduced-motion`; transitions
should support orientation, not become the feature.

### 6. Preserve user trust

The interface must make local, non-destructive analysis clear. Never silently
trim or modify the input. Clear stale results when the input changes if they
could be mistaken for current results. Do not log or persist submitted text.
Keep errors explicit and actionable rather than replacing them with an empty
or success-shaped state.

## Workflow

1. Read the relevant component, styles, analyzer types, tests, and README
   before editing.
2. Describe the smallest complete UI slice: user action, state change, visible
   result, accessibility behavior, and focused verification.
3. Identify the existing visual primitives to reuse and the one or two design
   problems being solved.
4. Implement the behavior and presentation together. Keep components small
   unless extraction clearly improves reuse or testability.
5. Test representative states:
   - empty input;
   - ordinary text;
   - long text and narrow viewport;
   - findings with long values or excerpts;
   - mixed-script words and invisible/unusual whitespace;
   - keyboard focus and toggled/disabled controls.
6. Run the narrowest relevant checks, then use the repository baseline for
   cross-layer UI changes:
   - `npm.cmd test`
   - `npm.cmd run check`
   - `npm.cmd run build`
7. Inspect the diff for unrelated styling, generated files, accessibility
   regressions, and unsupported claims. Update README or the technical
   overview only when user-facing behavior or architecture changed.

## Completion checklist

- The intended hierarchy is clear without extra explanatory clutter.
- The UI still feels like CharAIcter rather than a generic template.
- Existing analyzer behavior and privacy guarantees are preserved.
- Text evidence is rendered safely and remains understandable without color.
- Responsive, keyboard, focus, disabled, empty, and long-content states are
  intentional.
- Tests, type checks, lint, formatting, and build pass as appropriate.
- Any deferred visual polish or known limitation is reported explicitly.
