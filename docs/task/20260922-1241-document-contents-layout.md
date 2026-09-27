# 20260922-1241-document-contents-layout Anchor the document contents list to the leading edge

- **status**: completed
- **priority**: P2
- **owner**: l1/session-20260918-1627
- **createdAt**: 2026-09-22 12:41

## Description

Both document previews laid a fixed contents column and a fixed reading measure out as one centred grid, so a
preview pane wider than their combined width stranded the contents list in the middle of an empty column: at a
2000px pane the list started roughly 340px from the leading edge with nothing before it.

Anchor the contents list to the leading edge and let the body take the space that is left, centring within its
own reading measure. Bring the list's own type into the ramp at the same time.

Acceptance: `bun run check` passes and the document browser cases still pass.

## ActiveForm

Anchoring the document contents list to the leading edge.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- The list carried `font-size: 14px`, a leftover that the type ramp never covered.
- Measured after the change at a 1068px preview pane: the list starts 48px from the pane's edge, the body
  follows across the 40px gap and fills the rest.
- Local `bun run check` passed with Bun 1.4.2 (289 backend tests, 572 web tests, lint, strict type checks,
  coverage and both production builds); the browser suite passed 105 of 105 with 2 skipped by design.
- The browser dependencies had been lost with the container's last restart, so the Chromium system libraries
  were reinstalled before any screenshot or browser case could run.

- complete: Delivered; check and the browser suite passed.
