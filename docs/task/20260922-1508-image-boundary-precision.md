# 20260922-1508-image-boundary-precision Refuse only real Markdown image syntax

- **status**: completed
- **priority**: P2
- **owner**: l1/session-20260918-1627
- **createdAt**: 2026-09-22 15:08

## Description

The preview's security boundary refused any `![` in a source, which refuses the whole diagram. A Rust inner
attribute in a label — `#![forbid(unsafe_code)]` in a subgraph title, say — therefore made an otherwise
ordinary flowchart show nothing at all, and the reason was not visible from the source.

A Markdown image needs a destination or a reference to name one. `![...]` with neither is label text: Mermaid
renders no image from it, and nothing is fetched. Narrow the rule to `![...]` followed by `(` or `[`, which
keeps both real forms refused, including inside a Markdown string label.

Acceptance: `bun run check` passes, the boundary policy suite covers both refused forms and the attribute
spelling, and the browser suite renders an attribute as text.

## ActiveForm

Narrowing the image rule to real image syntax.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- The destination form stays refused twice over: the narrowed rule matches it, and the existing `](` rule does
  too, so a nested `![a[b]](c)` that slips past the first is still caught by the second.
- `boundary-policy.test.ts` gained three refusals — a space before the destination, the reference form, and a
  Markdown string label — and two admissions: the attribute spelling and `![alt]` with no destination.
- `renderer-boundary.spec.ts` gained a diagram whose subgraph title and node label are attributes; the suite
  fails on any outbound request, so it also shows nothing is fetched for them.
- The first browser run failed on the new file: it was appended after the styled diagram the later font-weight
  assertion reads, which left the wrong file on screen. The assertion now reopens that diagram first.
- Local `bun run check` passed with Bun 1.4.2 (289 backend tests, 577 web tests, lint, strict type checks,
  coverage and both production builds); the browser suite passed 105 of 105 with 2 skipped by design.

- complete: Delivered; check and the browser suite passed.
