# 20260926-1703-unified-document-reader Unify HTML and Markdown reading layouts

- **status**: implementing
- **createdAt**: 2026-09-26 17:03
- **approvedAt**: 2026-09-26 17:03
- **relatedTask**: 20260926-1703-unified-document-reader

## Context

Both readers currently render a bordered sticky navigation card inside the scrolling article. On phones the whole contents list precedes the body. HTML source styles can override the outer grid, including the two local firmware documents. Markdown derives its contents from headings; HTML extracts an authored top-level nav.

## Proposal

Share an application-owned reader frame across both formats: a compact contents-toggle/title toolbar, a full-height independently scrolling contents rail and a separately scrolling article. Centre a generous body measure with narrower prose and full-width diagrams. Collapse contents on desktop on demand and present them through the existing Dialog primitive in narrow reader panes, including keyboard dismissal and focus return. Use filename in the toolbar and the authored document heading in the body. Keep file explorer controls and source-editor behavior unchanged.

## Scope

DocumentReader composition, both document renderers, reader CSS and focused unit/browser coverage. Remove obsolete outer-layout rules from the two local HTML documents only as needed to retain their standalone layout. No new dependencies, persistence, backend changes, release or deployment.

## Risks

Moving navigation outside the article changes CSS selectors and scroll ownership. Verify anchor navigation, selected Markdown diagrams, source switching, narrow focus handling, long headings, image decoding and independently scrollable content. Embedded document CSS must not take over the application reader frame.

## Verification

RED-first control tests, relevant frontend suite/lint/types/build, actual SDCR200/KM2210 and representative Markdown browser previews on desktop and narrow screens. Run the repository aggregate gate; retain any existing unrelated directory HTTP 503 failures as failures.

## Alternatives

A CSS-only card adjustment cannot provide an accessible contents drawer or independent scrolling. Reuse the existing Button and Dialog primitives and add only a document-specific composition.

## Annotations

The user asked to apply the proposed screenshot-based layout and explicitly include Markdown. This supplies implementation approval for both readers. The earlier image-size fix is preserved.

## Outcome

The shared reader is implemented for HTML and Markdown, with full-height navigation, independent scrolling, centred prose, wider diagrams and a narrow-pane contents dialog. Existing document parsing and diagram editing remain intact. The real firmware HTML pages and their Markdown source versions pass visual/interactive verification.

All functional quality stages pass, including 582 frontend unit cases and two 96-case browser runs. The aggregate command stops only at evidence export because the source is uncommitted; clean-source acceptance remains pending. No deployment or publication was performed.
