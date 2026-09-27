# 20260927-0924-document-media-full-viewport Fill the document media zoom viewport

- **status**: completed
- **createdAt**: 2026-09-27 09:24
- **approvedAt**: 2026-09-27 09:24
- **relatedTask**: 20260927-0924-document-media-full-viewport

## Context

The shared `DocumentMediaZoom` component is used by Markdown diagrams and HTML images. Its dialog dimensions are currently derived from the media size. At 100%, the media also keeps its source dimensions, so small images open in a small frame.

## Proposal

Size the shared dialog to the viewport with a small outer margin. Measure its inner viewport and fit the media proportionally at 100%; retain the existing zoom range and pan interaction. Update browser regressions for both media types.

## Risks

Resizing the browser can change the fit scale. Recalculate it on window resize. Preserve the media ratio and scrollable overflow at higher zoom levels.

## Scope

Shared zoom component and CSS, two browser regressions, and tracking documents.

## Alternatives

CSS transforms would scale the picture without expanding its scrollable box, breaking existing panning. Explicit dimensions keep the viewport scrollable.

## Annotations

The owner explicitly requested the same enlarged behavior for Markdown and HTML.
The focused production browser cases pass for both media kinds, including proportional fit, image bounds on a phone, zoom and drag panning. The local full gate remains red because unrelated directory requests intermittently return HTTP 503 in existing browser cases on overlayfs.
