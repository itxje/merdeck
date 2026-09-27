# 20260917-0148-fix-html-topbar-and-ids Hide standalone template topbar and bind HTML element IDs

- **status**: completed
- **priority**: P1
- **owner**: html-preview/20260917-0148
- **createdAt**: 2026-09-17 01:48

## Description

Hide standalone template mobile topbars and unwrap controls, and bind safe element `id` attributes to DOM elements in the HTML document preview.
Resolves user report: "mos System Architecture ☰ 目录 左上角怎么多了这个".

## ActiveForm

Hide `#topbar`, `#overlay`, and `#resizer` in HTML preview CSS, and attach safe element `id` in `html-document-view.tsx`.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation:
  - Document templates (e.g. `template.html`) contain mobile drawer headers `#topbar` with title and `<button id="tocBtn">☰ 目录</button>`.
  - In `v0.14.1`, `.html-document-view #topbar, .html-document-view #overlay, .html-document-view #resizer { display: none; }` was accidentally omitted when adding media rules to `web/src/index.css`.
  - Furthermore, `html-document-view.tsx` parsed `sourceId` for anchors but did not pass `id: sourceId` to React DOM elements, preventing in-document CSS rules (such as `#topbar { display: none; }`) from matching.
- Proposal:
  - Re-add `.html-document-view #topbar, .html-document-view #overlay, .html-document-view #resizer { display: none !important; }` in `web/src/index.css`.
  - Pass `id: sourceId` to created DOM elements in `html-document-view.tsx`.
