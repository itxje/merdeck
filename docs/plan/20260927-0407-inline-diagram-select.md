# 20260927-0407-inline-diagram-select Remove selection controls from inline Markdown diagrams

- **status**: completed
- **createdAt**: 2026-09-27 04:07
- **approvedAt**: 2026-09-27 04:07
- **relatedTask**: 20260927-0407-inline-diagram-select

## Context

The Markdown reader displays a Select/Selected button above each inline Mermaid diagram. Selecting also occurs on a click anywhere in the figure and routes to the source editor. The owner wants that reader control removed now that the Markdown document view opens without a Source pane.

## Proposal

Remove the inline selection button and whole-figure click selection. Keep safe links inside SVG diagrams working, and preserve the explicit diagram rows in the file explorer for source editing. Remove the unused button styling and update the affected focused/browser assertions.

## Risks

Removing figure selection could accidentally swallow file-link navigation or break focused keyboard activation. Test those interactions and confirm explicit diagram editing remains available.

## Verification

Establish a failing reader regression, then run focused document tests, the Markdown browser flow, frontend lint/typecheck/build and the repository gate as appropriate.

## Authorization

The owner explicitly requested removal of the Select control from Markdown reading.

## Outcome

The focused reader regression failed on the old button and passes after the correction. The Markdown browser flow passes, including the unchanged explicit editor path. The complete local `check:ci` gate passed on Linux ARM64/overlayfs; native Linux x64/ext4 acceptance was not run.
