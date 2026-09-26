# 20260926-1926-document-width-and-markdown-toolbar Align document widths and remove Markdown view tabs

- **status**: in_progress
- **priority**: P1
- **owner**: reader/session-20260926-width
- **createdAt**: 2026-09-26 19:26

## Description

Remove the Markdown Document/Diagram toolbar as requested, keep the document reader and inline diagram editing, and give HTML and Markdown a shared wider content measure. Align tables with prose and contain wide-table scrolling on narrow screens.

## ActiveForm

Implementation and focused validation complete; running the clean-source aggregate gate.

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
