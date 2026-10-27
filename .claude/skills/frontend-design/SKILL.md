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

CharAIcter is a privacy-conscious React/Vite text-analysis application:

- The web app lives in `apps/web/src/`.
- `App.tsx` owns layout and state: the text, the analysis result, and the
  hovered and pinned highlights.
- `components/` holds the UI: `TextEditor` (textarea with a highlight
  overlay), `Results` (summary, severity filters, tabs), `FindingCard`,
  `SymbolsTab`, `AllDetectionsTab`, and `EmptyResults`.
- `lib/` holds pure helpers: `format.ts` (labels, visible whitespace markers,
  position text), `selection.ts` (highlights and hover/click behavior), and
  `findingGroups.ts` (splitting findings by tab and grouping).
- `styles.css` is the only stylesheet; avoid adding dependencies for visual
  work.
- The UI does not analyze text. It sends the text to the project's API and
  renders the structured findings it returns. Do not send text anywhere else,
  persist it, trim it, or rewrite it as part of a frontend improvement.

The layout is two columns on wide screens: the editor on the left is sticky so
highlights stay visible, and the results on the right scroll. Below 960 px the
editor stacks above the results.

The visual identity is a warm, light autumn palette with:

- parchment and cream surfaces;
- muted sage green for primary actions, selected tabs, and focus;
- terracotta and amber for emphasis, highlights, and attention;
- dark olive text with soft borders and restrained shadows;
- compact cards, rounded controls and pills, readable monospace excerpts, and
  a deliberately uncluttered working area.

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
through the `feature-builder` workflow.

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
- position ("Line 3, position 5") and code point when available;
- the relevant value or word;
- a safe excerpt that shows why it was reported.

Visually distinguish informational whitespace and symbols from
security-relevant findings. Use restrained emphasis for ordinary spaces and
stronger emphasis for unusual or potentially deceptive characters. Never hide
the exact evidence behind ambiguous copy. Repeated items (such as every comma)
belong in one grouped row with a count, not many identical rows.

When highlighting text:

- render user input as text nodes or React children, never `innerHTML`;
- highlight the exact matched span by its recorded offset
  (`excerptStart`, `startOffset`), not by searching for the value;
- preserve surrounding context and Unicode characters;
- provide a readable non-color cue through labels, structure, or text;
- ensure contrast remains sufficient in light and focused states.

The editor overlay must mirror the textarea exactly (same font, line height,
padding, and wrapping). Marks in the overlay must never change layout: draw
extra visuals, such as the bar for an empty line, with absolutely positioned
pseudo-elements.

### 3. Use a small, coherent visual system

Reuse the existing palette, border radii, spacing rhythm, button shape, card
surfaces, tabs, chips, pills, focus ring, and monospace evidence treatment. Add
a new color or visual primitive only when it communicates a meaningful state
that the current system cannot express.

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
- finding metadata and table cells wrap naturally; tables scroll inside their
  own container, never the page;
- long words, excerpts, and Unicode values do not overflow;
- the editor and its **Analyze text** button fit within the viewport height;
- spacing tightens without making controls or text cramped.

Use the existing breakpoints (960 px for stacking, 600 px for phones) unless
the component has a clear need for a new one.

### 5. Design accessible interaction states

Every interactive element needs:

- a descriptive accessible name;
- visible keyboard focus;
- hover and pressed states that do not rely on color alone;
- disabled behavior only when it communicates a real constraint;
- stable layout when state text changes.

Use semantic HTML first. Use `aria-pressed` for toggles, `role="tablist"` with
arrow-key navigation for tabs, and visible status text for important state
changes. Respect `prefers-reduced-motion`; transitions should support
orientation, not become the feature.

### 6. Keep interaction fast

Hovering a finding updates only the editor highlight. Keep it that way:
selection handlers are created once in `App.tsx`, `Results` and `FindingCard`
are memoized, and cards receive `isSelected` and `handlers` rather than the
whole selection. Cache derived lists with `useMemo`, and cap very long tables
(the All tab renders at most 1,000 rows).

### 7. Preserve user trust

Never silently trim or modify the input. Clear stale results when the input
changes if they could be mistaken for current results. Do not log or persist
submitted text. Keep errors explicit and actionable rather than replacing them
with an empty or success-shaped state.

## Workflow

1. Read the relevant component, styles, finding types, tests, and README
   before editing.
2. Describe the smallest complete UI slice: user action, state change, visible
   result, accessibility behavior, and focused verification.
3. Identify the existing visual primitives to reuse and the one or two design
   problems being solved.
4. Implement the behavior and presentation together. Put UI in `components/`
   and pure logic in `lib/`, where it can be unit tested.
5. Test representative states:
   - empty input and the placeholder before analysis;
   - ordinary text;
   - long text, many findings (thousands), and narrow viewports;
   - findings with long values or excerpts;
   - mixed-script words, invisible/unusual whitespace, and empty lines;
   - keyboard focus, tabs, and toggled/disabled controls;
   - widths of about 1440, 960, and 400 px, and browser zoom of 150%.
6. Run the narrowest relevant checks, then the repository baseline for
   cross-layer UI changes (use `npm` instead of `npm.cmd` in Git Bash):
   - `npm.cmd test`
   - `npm.cmd run check`
   - `npm.cmd run build`
7. Inspect the diff for unrelated styling, generated files, accessibility
   regressions, and unsupported claims. Update README or the technical
   overview only when user-facing behavior or architecture changed.

Do not launch servers or browsers to check the result unless the user asked
for it or approved it.

## Completion checklist

- The intended hierarchy is clear without extra explanatory clutter.
- The UI still feels like CharAIcter rather than a generic template.
- Existing analyzer behavior and privacy guarantees are preserved.
- Text evidence is rendered safely and remains understandable without color.
- Responsive, keyboard, focus, disabled, empty, and long-content states are
  intentional.
- Hovering stays fast with many findings.
- Tests, type checks, lint, formatting, and build pass as appropriate.
- Any deferred visual polish or known limitation is reported explicitly.
