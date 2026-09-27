# 20260927-0407-inline-diagram-select Remove selection controls from inline Markdown diagrams

- **status**: completed
- **priority**: P2
- **owner**: root/session-20260927-0407
- **createdAt**: 2026-09-27 04:07

## Description

Remove the redundant Select/Selected button above each diagram in the Markdown reader. The document should display inline diagrams and keep their file links usable without making the entire figure a hidden route to the source editor. Explicit diagram selection from the file explorer remains available.

## ActiveForm

Add a regression for a presentation-only inline figure, then remove its selection affordances and verify document links and explicit diagram editing.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

The owner clarified that the Select control is unnecessary in the Markdown reading view. The current code also selects on a click anywhere in the figure, opening the source pane. Keep individual safe file links functional.

## Verification

- RED: the focused reader test found the existing Select button.
- GREEN: all 36 document-view unit cases pass after removing the button and whole-figure selection. The focused production browser Markdown case passes with zero browser-audit errors; it confirms that clicking another inline figure leaves the current source unchanged, safe links remain usable, and explicit explorer selection still supports a byte-preserving source save.
- Frontend lint passes with two existing warnings, typecheck and production build pass, and `git diff --check` is clean. The complete local `check:ci` gate passed on Linux ARM64/overlayfs with 98 browser cases passed and 17 conditionally skipped. Native Linux x64/ext4 acceptance was not run.
- Review of the changed reader, workspace call sites, CSS and affected tests found no actionable issue.
