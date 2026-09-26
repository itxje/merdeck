# 20260926-1926-document-width-and-markdown-toolbar Align document widths and remove Markdown view tabs

- **status**: implementing
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
