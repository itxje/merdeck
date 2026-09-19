# 20260919-1727-markdown-contents-mobile-layout Collapse the Markdown contents list on narrow viewports

- **status**: completed
- **priority**: P2
- **owner**: l1/session-20260919-1727
- **createdAt**: 2026-09-19 17:27

## Description

The owner reported that the Markdown preview's contents list was not adapted for mobile browsers. Root cause:
`b4783e6` gave `.markdown-document-view` the same sticky two-column layout (`16rem` contents column beside a
`64rem` reading measure) as `.html-document-view`, but only `.html-document-view` carries the
`@media (max-width: 900px)` rule that collapses that grid to a single column and turns the sticky sidebar
static; `.markdown-document-view` had no equivalent, so on a phone-width viewport the contents list kept trying
to sit in a fixed sidebar column beside the body.

Added the same `@media (max-width: 900px)` block to `.markdown-document-view` that `.html-document-view` already
carries: single-column grid, static non-sticky nav, and the narrower page padding.

Acceptance: confirmed the layout is real Grid-track behavior, not a `visibility` toggle, by rendering the
production markup and CSS in a browser and reading computed styles at two viewport widths (1440px: sidebar
column, sticky nav; 500px: single column, static nav, contents list stacked above the body).

## ActiveForm

Collapsing the Markdown contents list layout on narrow viewports.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Fast path: a one-line CSS media-query addition mirroring an existing pattern in the same file, no
  contract/interface change.
- `web/src/index.css` only.
- Local verification (2026-09-19, system Bun 1.3.12 against pre-installed `node_modules`; the pinned Bun 1.4.2
  lockfile could not be reinstalled from this checkout's cached binary, which is a stale zsh completion script
  rather than the actual executable): web `eslint .` (pre-existing unrelated warning only), `tsc --noEmit`
  clean, and `vitest run src/features/document/document-view.test.tsx` (35/35 passed). Verified the fix directly
  with a Playwright-driven computed-style check against the real markup/CSS at 1440px and 500px viewports.
- Committed directly to `main` (small, low-risk change; no campaign).

- complete: Pushed to `main`.
