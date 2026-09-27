# 20260927-0639-document-media-pan Pan zoomed document media

- **status**: completed
- **priority**: P1
- **owner**: root/session-20260927-0639
- **createdAt**: 2026-09-27 06:39

## Description

Allow users to move a zoomed Markdown diagram or HTML image within the focused media dialog. Mouse dragging and touch panning must expose off-screen content without moving the document behind the dialog. Size the dialog around the rendered media so opening it preserves the media proportions and avoids an oversized, mostly empty canvas.

## ActiveForm

Verify shared panning and media-sized framing in both document formats.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

The owner reported that zoom without movement makes the focused view ineffective. The prior approved zoom request covered both Markdown and HTML media, so this completes that interaction.
The new focused component test failed before the implementation for both media kinds, then passed after mouse drag panning was added. Frontend typecheck, lint, and 45 focused document tests passed. Production Chromium browser tests passed for Markdown and HTML with horizontal drag after zoom; the HTML test also retained inert SVG rendering and the Markdown test retained document scroll isolation.
The owner also reported a wide, short-looking popup. Browser measurement found a 724×184 inline diagram in a 1315×718 fixed viewport; the graphic kept its aspect ratio but the empty canvas was disproportionate. Added failing browser assertions for a media-sized frame before changing the shared dialog and passing each media's rendered width and height.

## Verification

The focused component tests and 45 document tests pass. Production Chromium confirms mouse drag panning, unchanged media aspect ratio, media-sized framing, narrow-screen bounds, and restored document scrolling for Markdown and HTML. The first full local gate failed when two unrelated file-directory browser cases received HTTP 503; a clean-source rerun on commit `79387c2` passed `bun run check:ci` and `git diff --check`, including both executable and bundle browser suites (98 passed, 17 configured skips each). This host is ARM64/overlayfs; Linux x64/ext4 native acceptance is pending.

- complete: Focused and full local checks passed; native x64/ext4 acceptance remains pending.
