# 20260926-1703-unified-document-reader Unify HTML and Markdown reading layouts

- **status**: in_progress
- **priority**: P1
- **owner**: release/session-20260926-v0.19.5
- **createdAt**: 2026-09-26 17:03

## Description

Apply the supplied book-reader layout to both HTML and Markdown. Use a full-height contents rail, a compact toolbar, centred content with wider diagrams and an accessible narrow-screen contents drawer. Preserve document navigation, exact source bytes and diagram editing.

## ActiveForm

Implementation and runtime validation complete; clean-source evidence export remains pending.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Full-tier change across the shared reader, both renderers, styles and regression coverage. The user requested implementation and explicitly included Markdown after the proposed layout direction. Existing embedded-image changes remain intact; their aggregate acceptance limitation is tracked separately.

## Verification

- RED: the new Markdown contents-toggle regression failed against the old in-article navigation; all 35 existing cases passed.
- GREEN: 42 document renderer tests pass. Loading and loaded views retain article identity, and changing documents resets Markdown scroll as before.
- Focused browser suite: 7/7 passed, covering both independent rails, collapse preserving scroll, narrow drawer Escape/focus return and chapter navigation, both HTML cases, complete Markdown, phone view switching and diagram saves with unchanged surrounding bytes (`tmp/reader-browser.log`).
- Actual HTML and Markdown previews of SDCR200 and KM2210 pass desktop/narrow checks; all nine HTML images decode, and Markdown diagrams render. On a 1000-pixel review viewport, the toolbar is 48 pixels and both scrolling columns are 952 pixels. No horizontal overflow or page errors were observed. Evidence: `tmp/document-reader-preview.json` and `tmp/*-reader-*.png`.
- Standalone HTML files are unchanged in this task. Their authored contents are extracted into the reader rail, and application CSS owns the reading frame. Previous embedded-image policy changes remain intact.

## Review Summary

Reviewed renderer lifecycle and article identity, observer cleanup, selection and navigation paths, content-style containment and narrow keyboard behavior. Uses existing Button and Dialog primitives with no dependency change. HTML remains projected through the existing worker policy and Mermaid rendering retains its existing boundary.

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | info |
| LOW | 0 | note |

Verdict: PASS.

## Final validation status

Frozen installs, lint, types, 582 frontend tests with coverage, backend checks, builds, physical-directory verification and release-script tests pass. The executable and extracted bundle each pass 96 browser cases with 17 configured skips. Both formats retain their contents behavior, diagrams and exact source bytes. Resource checks and cleanup pass.

`check:ci` exits unsuccessfully only at its final evidence export: `Directory evidence requires clean source provenance`. The working tree contains uncommitted image and reader changes, so this does not establish clean-commit delivery acceptance. No tests failed in this run; the earlier directory HTTP 503 did not recur. The task's final aggregate acceptance remains pending a clean source verification. Native Linux x64/ext4 acceptance, commit, release and deployment were not performed. Evidence: `tmp/reader-check.log`; final `git diff --check` passes.

- unclaim: Implementation and all functional checks pass; final aggregate evidence export remains pending because source is uncommitted.
