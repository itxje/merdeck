# PREVIEW-003 Keep styled node labels readable in both colour schemes

- **status**: completed
- **priority**: P1
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-10 18:12

## Description

The project owner reported on 2026-09-10, with a screenshot of the original 24-node diagram, that node labels are unreadable in the dark colour scheme. Acceptance: every flowchart node label keeps at least 4.5:1 contrast against its own fill in both light and dark schemes, including nodes coloured by bounded class definitions; author fills, strokes, widths and dashes, the source policy, the sanitizer and the trusted renderer settings are unchanged.

## ActiveForm

Keeping node label text readable against node fills.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation: `web/src/features/preview/renderer.ts` maps Mermaid's `primaryTextColor` to `--foreground`, which is near-white in the dark scheme. Class definitions may set only fill, stroke, width and dashes (`source-policy.ts`), so pastel author fills keep the theme's text colour. A live probe of the original diagram in the dark scheme found `rect.basic.label-container` filled `rgb(255, 248, 225)` while every label `text`/`tspan` was filled `rgb(250, 250, 250)`, a contrast of about 1.1:1. Edge labels and group titles sit on the page or group background and stay readable.
- Proposal: after computed presentation values are baked into the private measurement copy, compare each flowchart node's label text colour with the node's first solid shape fill outside its label. Where the contrast is below 4.5:1, give the label text whichever of the neutral `rgb(23, 23, 23)` and `rgb(250, 250, 250)` contrasts more with that fill; readable nodes keep the theme colour. No policy or dependency change.
- Implementation: `renderer.ts` calls `readableNodeLabels` on the private measurement copy after computed presentation values are baked and before the final sanitizer pass. For each `g.node` it takes the first solid `rect`, `polygon`, `path`, `circle` or `ellipse` fill outside the node's `.label` (ignoring `none`, translucent colours and fill opacity below 0.5), computes WCAG relative-luminance contrast against each `text` and `tspan` fill, and replaces fills below 4.5:1 with whichever of `rgb(23, 23, 23)` and `rgb(250, 250, 250)` contrasts more with the node fill. Edge labels, group titles and readable nodes are untouched, and only `fill` values the sanitizer already accepts are written. A new unit test covers pastel, dark, readable, unfilled and translucent nodes and an edge label; a new browser spec checks all 24 styled nodes of the original regression diagram in fresh light and dark pages.
- Verification (2026-09-10, main checkout, pinned Bun 1.4.2): `bun run --cwd web lint` and `typecheck` clean; `bun run --cwd web test:coverage` 173 passed in 12 files (statements 93.84%, branches 88.91%, functions 91.84%, lines 94.29%), including the new `label-contrast.test.ts`; root `bun run lint` clean; `bun run build` succeeded; `git diff --check` clean. The first version of `contrast.spec.ts` navigated away from an unsaved draft between the two schemes and tripped the browser audit's unexpected beforeunload dialog, so each scheme now runs as its own test; both passed, requiring at least 4.5:1 for every node. The full browser suite passed 34 of 34 on the combined build with LAYOUT-002, with services stopped and fixtures removed. The storage-dependent backend suite was not rerun for this frontend-only change.
- Deployment and live evidence (2026-09-10): after the same relaunch, real Chromium sessions in the light and dark schemes against https://merdeck.example.test/ rendered the original 24-node diagram as an unsaved draft of the demo `welcome.mmd`. All 24 node labels met 4.5:1: the lowest label contrast was 16.7:1 in the light scheme and 15.1:1 in the dark scheme, against about 1.1:1 before the change. Drafts were discarded at logout, no page or console errors occurred, and screenshots are kept under ignored `tmp/`.
