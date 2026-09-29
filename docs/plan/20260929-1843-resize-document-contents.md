# 20260929-1843-resize-document-contents Resize document contents rail

- **status**: completed
- **createdAt**: 2026-09-29 18:43
- **approvedAt**: 2026-09-29 18:43 (owner reiterated the implementation request, specifying both formats)
- **relatedTask**: 20260929-1843-resize-document-contents

## Context

Markdown `DocumentView` and HTML `HtmlDocumentView` both use `DocumentReader`. Its desktop grid gives the contents rail a fixed 240px column; the rail and article scroll independently. Below a 760px reader width the rail becomes a drawer. The workspace already has an accessible pointer and keyboard separator for its file explorer.

## Proposal

Add a separator between the rail and page in `DocumentReader`. Store one browser-local preferred width for both formats, bound it to a useful minimum and to the remaining reader space, and update it from pointer drag or arrow keys. A double click restores the default. Use the shared reader CSS grid to lay out rail, handle and page. The narrow drawer keeps its current behavior.

Extend the shared production browser test to prove drag, keyboard, reset, persistence and narrow drawer behavior in both formats. Establish the new assertion failing before implementation.

## Risks

The editor pane can resize independently of the viewport. The rail must stay bounded when the reader becomes narrower, without losing the stored preference when it widens again. Pointer capture must not block article scrolling.

## Scope

Shared document reader, reader CSS, focused browser acceptance, task and plan records, changelog. No new dependency, API, or document format changes.

## Alternatives

Use `react-resizable-panels` inside the reader: rejected because it would add a second layout system to a small grid and complicate preserving the drawer at narrow widths.

## Annotations

The owner asked for the Markdown and HTML contents/article divider to move horizontally.

Implemented as proposed. Focused tests and both full browser suites pass; the final aggregate evidence export requires a clean committed source tree.
