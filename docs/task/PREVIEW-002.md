# PREVIEW-002 Zoom and pan the preview with the mouse

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-10 16:43

## Description

The project owner reported on 2026-09-10 that the preview canvas does not support mouse zooming or moving. The canvas only offers zoom buttons, Fit and native scrollbars. Acceptance: the mouse wheel zooms the diagram around the pointer within the existing 25–300% bounds, dragging the canvas with the primary mouse button pans it, the zoom buttons, Fit, keyboard scrolling and touch scrolling keep working, and the footer hint describes the new gestures.

## ActiveForm

Adding pointer-anchored wheel zoom and drag panning to the preview canvas.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation: `web/src/features/preview/preview.tsx` scales `.diagram-graphic` with a CSS transform inside a sized `.diagram-space` in the scrollable `.preview-surface`; the scale is `zoom ?? fit` and changes only through the buttons (±0.2, clamped to 0.25–3). No wheel or pointer handlers exist and the footer reads "Scroll to pan". React registers wheel listeners as passive, so keeping the page from scrolling while zooming needs a native non-passive listener.
- Proposal: register a non-passive wheel listener on the surface that multiplies the scale by an exponential of the wheel delta (line and page deltas normalised), clamps it to the existing bounds and records the diagram point under the pointer; a layout effect puts that point back under the pointer once the new size is laid out. Primary-button mouse or pen drags capture the pointer and move the surface's scroll position, ignoring presses on the scrollbars; touch keeps native scrolling. The surface shows grab cursors while a diagram is present and diagram text is not selectable. The footer hint becomes "Drag to pan, scroll to zoom". No dependency change; the prototype keeps its earlier hint.
- Implementation: `preview.tsx` adds the native wheel listener (horizontal-only wheel input passes through so sideways trackpad scrolling keeps working; each step scales by `exp(-deltaY × 0.002)`), shares the 0.25 and 3 bounds with the buttons through constants, and keeps a fit below 25% from jumping when the wheel zooms out. A layout effect applies the recorded pointer anchor after the new size lays out. Pointer handlers pan through the surface scroll offsets with pointer capture and end on up, cancel or lost capture. `data-pan` drives the grab cursors and disables diagram text selection in `web/src/index.css`. A new component test covers wheel zoom and its anchor offsets, the horizontal wheel passthrough, drag panning, the touch passthrough and the footer hint.
- Verification (2026-09-10, main checkout, pinned Bun 1.4.2): `bun run --cwd web lint` and `typecheck` clean; `bun run --cwd web test:coverage` 137 passed (10 files), including the new test; root `bun run lint` clean; `bun run build` succeeded and the built bundle contains the new hint; `git diff --check` clean. The storage-dependent backend suite and the browser suite were not rerun for this frontend-only change.
- Anchoring limit: the pointer's diagram point can only be kept on an axis where the zoomed diagram overflows the canvas. On an axis where the whole diagram still fits, layout keeps it where it was before this change (pinned to the top vertically, centred horizontally).
- Deployment and live evidence (2026-09-10): after relaunching the hosted instance from `9be0477`, a real Chromium session against https://merdeck.example.test/ opened the demo `welcome.mmd`. One wheel step of −300 zoomed from 85% to 155% with a scale ratio of 1.82211 (expected e^0.6 ≈ 1.82212) and no document scroll. The canvas showed `grab`, then `grabbing` with `data-pan="active"` during a drag, and a 120 px drag moved `scrollLeft` from 81 to 201 as expected; the diagram had no vertical overflow. Fit returned to 85% and Zoom in reached 105%. Per-axis anchoring was measured on two diagrams: on `sequence.mermaid`, which overflows both axes once zoomed, the diagram point under the pointer stayed within 0.6 px on both axes over 135% → 246% → 300%; on the short left-to-right `welcome.mmd` the horizontal error stayed within 0.5 px while the vertical axis could not scroll (`maxTop` 0), matching the anchoring limit above. Sessions were logged out afterwards; screenshots are kept under ignored `tmp/`.
- Later change (EDIT-001, 2026-09-10): panning now captures the pointer only after 4 px of travel instead of on press, so clicks and double-clicks still reach flowchart nodes; a click that ends a drag is ignored. The component test was updated to cover the threshold.
