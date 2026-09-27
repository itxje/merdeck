# 20260926-1926-document-width-and-markdown-toolbar Align document widths and remove Markdown view tabs

- **status**: completed
- **createdAt**: 2026-09-26 19:26
- **approvedAt**: 2026-09-26 19:26
- **relatedTask**: 20260926-1926-document-width-and-markdown-toolbar

## Context

The user reports a redundant Markdown Document/Diagram toolbar and screenshots show tables and HTML diagrams starting left of their accompanying prose. Shared reader CSS limits prose to 48rem inside a 72rem body. Markdown renders a bare table while HTML frames its tables for horizontal scrolling. A separate committed mobile drawer correction remains intact.

## Proposal

Remove the Markdown view switch and its unused view state. Render Markdown consistently as a document, retaining inline Mermaid selection and the existing source editor. Standalone Mermaid files retain their diagram canvas. Give both document formats the same responsive 80rem maximum body width and remove the narrower prose measure. Frame Markdown tables for local horizontal scrolling, matching HTML; use full-width tables within the shared content measure while preserving cell alignment and semantics.

## Scope and risks

Workspace composition, document table markup, shared CSS and affected tests. No dependencies, file mutation semantics, authentication, release or deployment changes. Update tests that explicitly chose the removed view to exercise source editing and inline diagrams instead; preserve byte-level saves and geometry checks. Keep the independently owned mobile drawer task unchanged.

## Verification

Establish a failing workspace regression and browser layout checks. Verify desktop content alignment and increased width for both formats, narrow wide-table scrolling without article overflow, unchanged contents navigation and inline Mermaid source editing. Run relevant unit tests and repository quality gates, then review the diff.

## Alternatives

Hiding only a disabled switch does not satisfy the requested matching HTML/Markdown presentation. Keeping different prose and diagram widths retains the demonstrated alignment problem.

## Authorization

The user explicitly requested removing the Markdown toolbar, fixing the table layout and widening HTML and Markdown together. These concrete instructions authorize implementation without another confirmation.

## Final acceptance

Clean-source commit `856be92dc789787983b3c407918a72242d76cbb0` passes frozen installs, the complete local `check:ci` and `git diff --check`. All 582 frontend cases pass with coverage. The executable and extracted bundle each pass 98 browser cases, with 17 configured skips and zero failures; resource verification, cleanup and clean-source evidence export pass. The initial two test-adaptation failures are resolved without changing production logic or dropping their assertions. Evidence: `tmp/reader-width-check.log` (exit 0).

The actual project Markdown README and KM2210 HTML previews confirm aligned wider prose, tables and diagrams. Keyboard table scrolling is contained on narrow screens, and Markdown source/independent-block saves preserve unrelated bytes. Code review verdict: PASS, no actionable findings.

This is local ARM64/overlay acceptance. No remote native Linux x64/ext4 run, new release or running-service update was performed for this change. The separately tracked affected-iPhone contents confirmation remains outside this task.
