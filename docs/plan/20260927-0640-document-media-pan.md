# 20260927-0640-document-media-pan Pan zoomed document media

- **status**: completed
- **createdAt**: 2026-09-27 06:40
- **approvedAt**: 2026-09-27 06:40
- **relatedTask**: 20260927-0639-document-media-pan

## Context

`DocumentMediaZoom` is shared by Markdown diagrams and HTML images. It changes zoom and scroll position, but has no pointer drag handler. The viewport already permits native touch scrolling. The main diagram preview has a separate drag-to-pan interaction.
The fixed near-full-screen dialog is also much larger than the media. A measured 724×184 inline diagram opened inside a 1315×718 viewport, making the canvas look unbalanced despite the SVG retaining its aspect ratio.

## Proposal

Add mouse and pen drag panning to the shared zoom viewport using pointer capture and scroll offsets. Keep native touch panning, because the browser already handles inertial scrolling there. Prevent media text or image selection during a drag and show grab/grabbing feedback. Verify panning after zoom in both document formats and that closing the dialog restores document scrolling.
Pass the rendered width and height of the selected media into the shared dialog. Make its initial canvas fit those dimensions with modest padding, bounded by the screen, and scale both media dimensions together during zoom. Verify the opened media's aspect ratio and canvas size in both document formats.

## Risks

Pointer capture must end on release or cancellation. Dragging must not select SVG text or start browser image dragging. Scroll offsets must stay within the actual overflow bounds; browser-level verification is needed because DOM test environments do not lay out scroll boxes.
Very small media still need enough space for the toolbar; very large media must remain clipped within the viewport and pannable. The source image or SVG may have explicit display dimensions, so the popup uses its rendered box rather than assuming intrinsic dimensions.

## Scope

Shared zoom component, Markdown and HTML media measurements, CSS, focused tests, and task/plan records.

## Alternatives

Native scrollbars alone require precise pointer placement and provide no direct drag gesture for mouse users. CSS transforms would require separate pan bounds and duplicate the existing scroll model.

## Annotations

The owner reported that the released zoom view cannot be moved after zooming. The previously approved Markdown and HTML media interaction covers this correction.
The owner then reported that opening the dialog made the canvas wider and visually shorter. This addition remains within the same focused media interaction.

## Outcome

The shared dialog now pans by mouse or pen drag and keeps native touch scrolling. Its frame uses the selected media's rendered width and height, scales both dimensions during zoom, and remains bounded on a phone. Focused and full local checks passed on a clean implementation commit; native Linux x64/ext4 acceptance remains pending.
