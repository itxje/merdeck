# 20260916-0227-table-header-borders Frame document table headers

- **status**: completed
- **priority**: P2
- **owner**: coordinator/20260916-0227
- **createdAt**: 2026-09-16 02:27

## Description

Give Markdown and safe-HTML document table header cells a complete visible frame. Acceptance: header cells have visible top, side and bottom borders in both colour themes, the table perimeter remains continuous, body-cell rendering is unchanged, and a production-browser regression verifies the computed border contract.

## ActiveForm

Framing document table headers.

## Dependencies

- **blocked by**: (none)
- **blocks**: 20260916-0228-release-html-ai-editor

## Notes

- Investigation (2026-09-16): the shared document table rule styles `th` and `td`, but the supplied production screenshot shows the header labels above the first visible table frame. A dedicated `thead` and table-perimeter rule plus a browser computed-style assertion will make the intended frame explicit for both document renderers.
- Authorization (2026-09-16): the owner explicitly requested framed table headers and immediate implementation.
- Implementation (2026-09-16): the shared document table now has an explicit perimeter, `thead` frame, four-sided `th`/`td` borders and a muted header-cell background. Markdown and safe HTML continue to share the same semantic table renderer and theme tokens.
- Verification (2026-09-16): a production-browser helper requires every computed header border to be solid and at least one CSS pixel. Markdown and hostile safe-HTML cases passed that assertion in light and dark themes; the complete production browser suite passed 72 cases with two opt-in performance cases skipped. Lint, strict types, the production build, source tests and whitespace validation passed with only the established sanitized-Mermaid-SVG lint warning.

- complete: Shared Markdown/HTML header frames and both-theme production-browser computed-border checks passed; complete browser regression passed 72 cases with 2 opt-in performance skips.
