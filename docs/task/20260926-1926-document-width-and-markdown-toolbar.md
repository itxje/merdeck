# 20260926-1926-document-width-and-markdown-toolbar Align document widths and remove Markdown view tabs

- **status**: completed
- **priority**: P1
- **owner**: reader/session-20260926-width
- **createdAt**: 2026-09-26 19:26

## Description

Remove the Markdown Document/Diagram toolbar as requested, keep the document reader and inline diagram editing, and give HTML and Markdown a shared wider content measure. Align tables with prose and contain wide-table scrolling on narrow screens.

## ActiveForm

Implementation, visual review and clean-source local aggregate acceptance complete.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Full-tier work across workspace composition, document rendering, shared styles and browser coverage. The user explicitly requested these changes in consecutive screenshot-based instructions, supplying implementation authorization. Preserve the existing mobile contents correction and its independent acceptance task.

## Verification and review

- RED: the revised workspace regression failed on the unwanted Markdown tablist; both browser layout regressions failed on the old narrow prose width.
- GREEN: 54 workspace/document unit cases passed. Ten focused browser cases passed, including both reader formats, table alignment, directory contents, image decoding and Markdown source/byte preservation.
- A separate four-case actual-document and keyboard-scroll run passed: the actual project README table and KM2210 HTML now align to the wider prose measure; all embedded images decode. Both formats allow keyboard horizontal scrolling inside wide tables without article/page overflow. Screenshots: `tmp/reader-width-projects.md.png` and `tmp/reader-width-km2210.html.png`. The temporary local-path preview test was removed after execution.
- Frontend lint and typecheck passed (two existing lint warnings). Production build passed. Source editor and save semantics remain unchanged; Markdown now uses inline diagrams while standalone Mermaid retains its canvas.
- Review: checked workspace view-state removal, table semantics and keyboard focus, constrained HTML rendering, contents state and source-save tests. No actionable findings. Full clean-source aggregate acceptance remains pending; no release or deployment is included.

- The first clean-source aggregate passed 582 frontend cases and 96 browser cases but failed two adapted browser assertions: role lookup excluded the deliberately hidden preview while Source was active, and SVG width was measured during resize before the inline layout settled. The tests now explicitly include the hidden article and await visible nonzero geometry before retaining their original assertions. Both affected cases pass with the browser audit (`tmp/reader-width-adapted.log`). No production behavior changed in this correction. The full aggregate is repeated on the corrected test commit.

## Final acceptance

Clean-source commit `856be92dc789787983b3c407918a72242d76cbb0` passes frozen installs, the complete local `check:ci` and `git diff --check`. All 582 frontend cases pass with coverage. The executable and extracted bundle each pass 98 browser cases, with 17 configured skips and zero failures; resource verification, cleanup and clean-source evidence export pass. The initial two test-adaptation failures are resolved without changing production logic or dropping their assertions. Evidence: `tmp/reader-width-check.log` (exit 0).

The actual project Markdown README and KM2210 HTML previews confirm aligned wider prose, tables and diagrams. Keyboard table scrolling is contained on narrow screens, and Markdown source/independent-block saves preserve unrelated bytes. Code review verdict: PASS, no actionable findings.

This is local ARM64/overlay acceptance. No remote native Linux x64/ext4 run, new release or running-service update was performed for this change. The separately tracked affected-iPhone contents confirmation remains outside this task.

- complete: Shared wider readers, aligned scrollable tables and removed Markdown mode toolbar verified by actual previews and complete clean-source local check:ci.
