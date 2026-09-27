# 20260916-1415-improve-html-document-rendering Improve HTML document rendering and layout

- **status**: completed
- **createdAt**: 2026-09-16 14:15
- **approvedAt**: 2026-09-16 14:15 UTC
- **relatedTask**: 20260916-1415-improve-html-document-rendering

## Context

The user reported four distinct issues when viewing HTML documents:
1. "目录在顶部了": The table of contents (`<nav id="toc">`) in HTML documents appeared as an unstyled list dumped at the very top of the article.
2. "点击跳转也标题是在页脚": Clicking TOC jump links scrolled the heading to the bottom/footer of the screen because `scrollIntoView({ block: 'nearest' })` was used.
3. "字体太小": Body text rendered at 13px (inherited from `.workspace`), which is too small for reading documents.
4. "两边空白太多，没合理利用空间": Content was restricted to 760px via `calc((100% - 760px) / 2)`, leaving massive empty margins on wide screens.

## Proposal

1. **Policy allowlist (`web/src/features/document/html-policy.ts`)**:
   - Add semantic layout tags (`nav`, `main`, `aside`, `section`, `article`, `header`, `footer`, `div`) to `allowed` and `HtmlElementTag`.
   - Add `button` to `childlessControls` so template buttons like `<button id="tocBtn">` do not output stray button labels.
   - Retain existing security boundaries: scripts, styles, forms, iframes, objects, foreign tags and event handlers remain strictly dropped.
2. **Anchor scrolling (`web/src/features/document/html-document-view.tsx` & `document-view.tsx`)**:
   - Update `scrollIntoView` call to `{ block: 'start', behavior: 'smooth' }`.
   - Add `scroll-margin-top: 5rem` to headings and target elements in `web/src/index.css` to provide clean clearance beneath sticky headers/notices.
3. **Typography & Layout styling (`web/src/index.css`)**:
   - Set `.document-view` font size to `15px` with `line-height: 1.7`.
   - Expand `.document-view` padding to `max(24px, calc((100% - 1000px) / 2))`.
   - When `.html-document-view` contains `nav` and `main`, layout in a responsive two-column flex container on desktop (`@media (min-width: 900px)`):
     - `nav`: sticky sidebar on the left (`flex: 0 0 280px`, sticky top, scrollable, themed background/card border, clean hierarchical list styling).
     - `main`: main content container filling available width (`flex: 1 1 0%`, max-width 960px).
     - Hide `#topbar`, `#overlay`, `#resizer` helper elements that are only intended for dynamic browser execution.
4. **Tests & Verification**:
   - Update `html-policy.test.ts` to test semantic container tags.
   - Update `html-document-view.test.tsx` to verify `scrollIntoView` called with `block: 'start'`.
   - Run vitest tests and all quality gates.

## Risks

- Preserving semantic containers must never bypass the strict element allowlist, script drop rules, or URL validation.
