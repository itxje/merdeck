# 20260917-0148-fix-html-topbar-and-ids Hide standalone template topbar and bind HTML element IDs

- **status**: completed
- **author**: html-preview/20260917-0148
- **created**: 2026-09-17 01:48

## Purpose

Prevent standalone mobile header controls (such as `#topbar` with unwrapped "☰ 目录" text) from rendering at the top of HTML document previews, and properly bind safe element `id` attributes to DOM elements.

## Background & Analysis

In `v0.14.1`:
1. `web/src/index.css` lost the selector `.html-document-view #topbar, .html-document-view #overlay, .html-document-view #resizer { display: none; }` during media rule additions.
2. `web/src/features/document/html-document-view.tsx` collected `node.sourceId` into `anchorsRef` but did not pass `id={sourceId}` to rendered DOM elements. Consequently, in-document CSS rules using ID selectors like `#topbar { display: none; }` could not match.
3. Templates like `template.html` include `<div id="topbar"><div>Title</div><button id="tocBtn">☰ 目录</button></div>`. When unhidden, button unwraps to text and the topbar sits at the very top left of the document.

## Changes

1. In `web/src/index.css`:
   - Restore and enforce:
     ```css
     .html-document-view #topbar, .html-document-view #overlay, .html-document-view #resizer { display: none !important; }
     ```
2. In `web/src/features/document/html-document-view.tsx`:
   - Pass `id: sourceId` to rendered elements (`img`, `video`, `audio`, `source`, standard elements) so in-document ID styling and standard DOM attributes function correctly.
3. Add unit test coverage in `web/src/features/document/html-document-view.test.tsx` ensuring DOM elements carry their safe `id` attribute.

## Verification

- Run `bun run --cwd web test`.
- Verify lint and diff.
