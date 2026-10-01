# 20261001-0238-workspace-usability Workspace usability improvements

- **status**: completed
- **createdAt**: 2026-10-01 02:38
- **approvedAt**: 2026-10-01 02:38
- **relatedTask**: 20261001-0238-workspace-usability

## Context

The approved interface review reproduced a 35px search input and 57px breadcrumb at the default explorer width; hidden phone save states; an unavailable 300px editing panel on first visit; a second document diagram that opens zoom while Source still edits the first; and streamed replies whose unseen tail grows because scrolling observes item count only. Pure Markdown keeps an unexplained disabled Save button, contents do not track the current heading, and primary file/source text renders at 12px.

## Proposal

- Give breadcrumbs and search usable independent rows, use a compact file-type selector, group creation/restart tools, and simplify the completed listing footer.
- Present unavailable provider configuration as a compact dismissible notice without disabled conversation controls.
- Keep phone unsaved/saving/saved status visible and name the editable document diagram in source and save context.
- Add an explicit Edit diagram action that selects the block and opens its source; retain diagram zoom as a separate action.
- Derive the current contents target from article heading positions within the actual article scroller, expose aria-current, and keep the drawer on that target for both document formats.
- Follow streamed reply growth while the reader is at the bottom; expose a latest-content action while reading earlier messages. Render Markdown with the existing parser and inert HTML/validated links, with code-copy controls.
- Show a reading state for documents without editable diagram blocks, without presenting an unexplained Save action.
- Increase primary file/source text to 14px desktop and 16px phone source while keeping metadata compact.

## Risks

Changed control semantics and density need browser verification and updated tests. Following output must preserve a reader's manual scroll position. Formatted provider text must not create executable HTML or unsafe links. Diagram selection must preserve independent drafts and route identity. Heading tracking must use actual scroll geometry and clean up listeners.

## Scope

Frontend workspace, file explorer, document components, conversation presentation, relevant CSS and focused tests. No backend contract or dependency changes are planned.

## Alternatives

Keeping all filters and actions inline would continue to squeeze the search field. Reusing the document parser avoids a new Markdown dependency; conversation output will use a purpose-specific inert renderer because document links and media have different navigation contracts.

## Annotations

The owner approved the eight review recommendations before this implementation. Runtime geometry tests and unit tests establish regression evidence before behavior changes.

## Delivery

All eight recommendations are implemented. Clean source commit `d4a374f` passed the full local ARM64/overlayfs aggregate gate, including executable and architecture-independent bundle browser acceptance. A separate configured-provider suite passed the cases skipped by the default release fixtures. See the related task for counts, reproduction evidence and the native acceptance boundary.
