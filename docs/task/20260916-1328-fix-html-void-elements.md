# 20260916-1328-fix-html-void-elements Fix safe-HTML void element rendering

- **status**: completed
- **priority**: P1
- **owner**: html-document/20260916-1328
- **createdAt**: 2026-09-16 13:28

## Description

Prevent React error #137 when rendering safe HTML documents containing void elements such as `<hr>` and `<br>`. Void elements in HTML cannot receive children or dangerouslySetInnerHTML; passing empty or populated children to `React.createElement` for void tags causes React runtime errors.

## ActiveForm

Fixing safe-HTML void element rendering.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-16): When safe HTML containing `<hr>` or `<br>` is rendered in `HtmlDocumentView`, the parse5 Worker emits `{ type: 'element', tag: 'hr', children: [] }`. `render` unconditionally calls `node.children.map(...)`, producing an empty array `[]`. Calling `React.createElement(node.tag, { key, ref }, children)` passes `children: []` to React. Because React's void element validator checks `props.children != null`, an empty array evaluates as non-null and throws Minified React error #137 (`%s is a void element tag and must neither have children nor use dangerouslySetInnerHTML`).
- Proposal (2026-09-16): In `web/src/features/document/html-document-view.tsx`, render void elements (`hr` and `br`) without passing `children` to `React.createElement`. Add unit test coverage verifying that safe-HTML documents containing `<hr>` and `<br>` elements render successfully into the DOM without React error #137.
- Implementation (2026-09-16): In `web/src/features/document/html-document-view.tsx`, added a check for void elements (`node.tag === 'hr' || node.tag === 'br'`) to call `React.createElement(node.tag, { key, ref })` directly without `children`. In `web/src/features/document/html-document-view.test.tsx`, added regression coverage verifying that void tags `<hr>` and `<br>` are correctly rendered into the DOM.
- Verification (2026-09-16): Focused Vitest tests passed with 4/4 passing. Frontend `tsc --noEmit`, root `tsc --noEmit`, ESLint, root test suite and the complete `bun run check` gate passed end to end with 0 errors. `git diff --check` reported no whitespace issues.

- complete: Safe-HTML void element rendering fix verified with unit regression test, full lint, strict type checking, and passing check gate.
