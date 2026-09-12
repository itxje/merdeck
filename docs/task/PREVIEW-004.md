# PREVIEW-004 Allow a text colour in class definitions

- **status**: completed
- **priority**: P3
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-12

## Description

The project owner brought a flowchart whose preview stayed empty. Its `classDef` lines set `color` beside `fill` and `stroke`, and the preview policy admitted only `fill`, `stroke`, `stroke-width` and `stroke-dasharray`, so the whole source was refused. The owner asked to allow the property directly, as a small change. Acceptance: a class definition may set `color` with the same three or six digit hex validation as `fill` and `stroke`; every other property, value form, selector and escape stays refused; the documentation matches.

## ActiveForm

Allowing a text colour in class definitions.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-12): `validateDefinition` in `web/src/features/preview/source-policy.ts` admits `fill` and `stroke` as three or six digit hex colours, bounded `stroke-width` and `stroke-dasharray`, and refuses every other property, which refuses the whole source rather than one declaration. The renderer already lists `color` among the safe properties it copies from computed styles onto the sanitized SVG, and `readableNodeLabels` still replaces a label colour whose contrast against its node fill is below 4.5, so an author colour cannot make a label unreadable. Reproduced against the real renderer with the owner's diagram: the original showed "Preview unavailable" while the same source without its four `color` declarations rendered 89 labels with no browser errors.
- Implementation (2026-09-12): `color` joins `fill` and `stroke` in the validated branch of `validateDefinition`, so it takes the same three or six digit hex form, and every other property still ends in the refusal. Nothing else changed: the renderer already copied the resulting computed colour onto the sanitized SVG, and the readable-label rule still replaces a colour whose contrast against its node fill is below 4.5.
- Verification (2026-09-12, main checkout, pinned Bun 1.4.2): `bun run check` passed inside the project tmux session with the supported overlay fixture parent under `/tmp` and the checkout `tmp/` as the refused parent, running 190 backend tests across 9 files and 195 frontend tests across 18 files, including three new policy cases: an accepted `color`, a named colour and a five-digit hex. Lint, strict type checks and the production build passed, and the full browser suite passed 42 of 42 in 2.0 minutes. Against the real renderer on a local build of these sources, the owner's diagram renders 89 labels and its `color:#111` reaches them as `rgb(17, 17, 17)`; a probe with `color:#c00000` on a white fill renders `rgb(192, 0, 0)`; a deliberately unreadable `fill:#111111,color:#222222` is still corrected to `rgb(250, 250, 250)`; and `color:red` stays refused. No page or console errors appeared.
