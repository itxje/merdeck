# 20260927-0430-document-media-zoom Zoom selected Markdown diagrams and HTML images

- **status**: completed
- **priority**: P2
- **owner**: root/session-20260927-0430
- **createdAt**: 2026-09-27 04:30

## Description

Click a Markdown diagram or HTML image to open a focused media view. The mouse wheel zooms that media while the view is open; closing it restores ordinary document scrolling. Preserve safe diagram file links and HTML image links.

## ActiveForm

Add focused regressions, implement one shared zoom view, and verify both document formats and link behavior.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

The owner explicitly approved local diagram zoom and requested the same interaction for HTML. The existing inline selection control removal is complete; file explorer selection still owns source editing. A modal media view keeps wheel ownership scoped to the active image and provides a clear close action.

## Verification

Focused document unit tests pass (43 cases), including linked-image navigation and diagram file links. Production browser Markdown and HTML flows pass with wheel zoom, close, inert embedded SVG, and restored document scrolling. The complete local `check:ci` gate passed on clean implementation commit `960dcd2` with Node 24.21.0, frontend coverage, build, release tests, and both browser suites (98 passed, 17 conditionally skipped per suite). Native Linux x64/ext4 acceptance was not run.
