# 20260916-1415-improve-html-document-rendering Improve HTML document rendering and layout

- **status**: completed
- **priority**: P1
- **owner**: html-rendering/20260916-1415
- **createdAt**: 2026-09-16 14:15

## Description

Fix HTML document preview layout, typography, navigation and spacing issues reported by the user:
1. Support semantic document structure (`nav`, `main`, `aside`, `section`, `article`, `header`, `footer`, `div`) so authored navigation (`<nav id="toc">`) renders as a side navigation sidebar rather than being dumped as unstyled links at the top of the content.
2. Correct internal anchor navigation: scroll target headers into view at the top (`block: 'start'`) with adequate scroll margin (`scroll-margin-top`) instead of landing at the bottom footer (`block: 'nearest'`).
3. Increase document font size from tiny 13px (inherited from `.workspace`) to readable 15px with proportional line-height.
4. Expand content max-width from restrictive 760px to 980px+ and eliminate excessive empty margins on desktop screens.

## ActiveForm

Completed HTML document rendering, layout, and anchor navigation improvements.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- User feedback (2026-09-16): "当前的html渲染有问题，目录在顶部了，点击跳转也标题是在页脚，字体太小，两边空白太多，没合理利用空间".
- Investigation:
  - `html-policy.ts` previously unwrapped `<nav>`, `<main>`, `<div>` because they were not in `allowed`, dumping TOC list elements right at the top of the body before the content.
  - `html-document-view.tsx` used `scrollIntoView({ block: 'nearest' })`, causing downward anchor scrolls to align target headings with the viewport bottom (footer).
  - `.workspace` set `font-size: 13px`, leaving `.document-view` with tiny 13px body text.
  - `.document-view` used `padding: 32px max(20px, calc((100% - 760px) / 2))`, creating huge whitespace margins on large displays.
- Proposal: [20260916-1415-improve-html-document-rendering](../plan/20260916-1415-improve-html-document-rendering.md).
- Verification:
  - Added unit test cases for semantic container tags in `html-policy.test.ts`.
  - Updated anchor scroll expectations in `html-document-view.test.tsx` and `document-view.test.tsx`.
  - All web tests (32 files, 551 tests) passed; backend tests in `src/` passed (22 files, 237 tests); frontend/backend lint and typecheck clean.
