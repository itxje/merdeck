# 20260927-0430-document-media-zoom Zoom selected Markdown diagrams and HTML images

- **status**: completed
- **createdAt**: 2026-09-27 04:30
- **approvedAt**: 2026-09-27 04:30
- **relatedTask**: 20260927-0430-document-media-zoom

## Context

Inline Markdown diagrams and HTML images are fitted to the document width. The owner wants to inspect a selected image with the wheel without zooming or scrolling the whole document.

## Proposal

Use one focused dialog for both media types. Clicking ordinary media opens it; wheel and visible controls adjust only that media, and closing returns to the document. Keep the already sanitized Mermaid SVG and projected HTML image source, without introducing an alternate parser or loading path. File links inside diagrams and links around HTML images retain navigation priority.

## Risks

The dialog must contain wheel events while open, preserve SVG vector quality, avoid hijacking links, and remain operable with keyboard and on narrow screens.

## Verification

Add focused component and browser regressions for opening, zooming, closing, scrolling, and link priority; run frontend checks and the repository gate.

## Authorization

The owner explicitly requested the interaction for Markdown diagrams and HTML images.

## Outcome

Both document formats use one zoom dialog with wheel and button controls. Focused component and production browser tests pass, including link priority and document scrolling after close. The complete local gate passed on clean implementation commit `960dcd2`; native Linux x64/ext4 acceptance was not run.
