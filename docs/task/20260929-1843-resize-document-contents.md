# 20260929-1843-resize-document-contents Resize document contents rail

- **status**: completed
- **priority**: P2
- **owner**: root/session-20260929-1843
- **createdAt**: 2026-09-29 18:43

## Description

Let readers drag the separator between the contents rail and the article horizontally in both Markdown and HTML documents. Keep the narrow-screen contents drawer and independent scroll positions working. Provide keyboard access and sensible width bounds.

## ActiveForm

Adding and verifying a shared resizable document contents rail.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Both formats render through `DocumentReader`. Its desktop grid has a fixed 240px contents column and no separator. The owner reiterated the request for both Markdown and HTML after the initial investigation was interrupted.

The shared reader now has a pointer and keyboard separator with a 180px minimum, a 520px cap and at least 320px of article space. One local preference applies to both formats; a double click resets it to 240px. The narrow drawer is unchanged. The focused browser regression failed before implementation because the separator was absent, then passed for both formats after implementation, including width bounds, reload persistence and the phone drawer.

## Verification

Frontend lint, typecheck and build passed. The local `check:ci` ran both complete browser suites with 99 passed and 17 configured skips each, plus 590 frontend unit tests. The final evidence export refused the run because the source tree was uncommitted (`Directory evidence requires clean source provenance`). The initial rerun also lacked the required explicit filesystem identity variable; the corrected run reached evidence export. `git diff --check` passed. Native Linux x64/ext4 acceptance and release remained pending at implementation completion.

- complete: Focused tests and both browser suites passed; final aggregate evidence export requires a clean committed source tree.
