---
paths:
  - 'apps/web/**/*.{ts,tsx,css,html}'
---

# Web app rules (`apps/web`)

- `App.tsx` holds page layout and state only. Put UI in `components/` and pure
  logic in `lib/`, where it can be unit tested.
- Keep hovering fast: selection handlers are created once in `App.tsx`;
  `Results` and `FindingCard` are memoized; pass cards `isSelected` and the
  stable `handlers`, never the whole selection. Cache derived lists with
  `useMemo`.
- Highlight text by its recorded offsets (`startOffset`, `excerptStart`),
  never by searching for the value; repeated characters would be marked in the
  wrong place.
- The editor overlay must match the textarea exactly (font, line height,
  padding, wrapping). Marks must not change layout; draw extra visuals with
  absolutely positioned pseudo-elements.
- Render the user's text as React text, never with `innerHTML`.
- All styles live in `styles.css`. Keep the palette (parchment, sage, amber,
  terracotta), the breakpoints (960 px stacks the columns, 600 px is phones),
  and add no UI libraries.
- Accessibility: visible focus on everything interactive, `aria-pressed` on
  toggles, arrow keys in the tab list, and respect `prefers-reduced-motion`.
- Check layout changes at about 1440, 960, and 400 px wide and at 150% browser
  zoom. Ask before launching a browser to do so.
- For design work, follow the `frontend-design` skill.
