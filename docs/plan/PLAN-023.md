# PLAN-023 Preserve linked flowchart layout and titled file navigation

- **status**: completed
- **createdAt**: 2026-09-12
- **approvedAt**: 2026-09-12 (the owner explicitly authorized this source repair)
- **relatedTask**: NAV-002

## Context

Linked flowchart nodes lose their positions because Mermaid puts the positioning transform on an anchor wrapper. Both the private measurement-host sanitizer and the final SVG sanitizer forbid anchors, so stripping the wrapper also drops its positioning information. The supplied reproduction has eighteen nodes, four groups, seven group-level edges and seventeen relative file targets; the same topology without click statements has no overlapping node bounds. Existing browser coverage checks navigation and labels but does not check geometry.

The source policy already validates title-only front matter, but `fileLinks` tests the flowchart header without removing that supported prefix, returning an empty map for titled flowcharts. Its statement splitting also differs from validation's quote/comment-aware scan. The preview adds inert application-owned link metadata after sanitization; the workspace resolves against the current directory and requires an exact entry in its bounded file tree before using existing navigation and draft state.

## Proposal

1. Share statement boundary handling between validation, file-target extraction and a private render projection. Validate the original source first and blank only accepted click statements for Mermaid rendering. Preserve every source byte in the editor, drafts and saves, title front matter, normal node/group definitions and bounded styles. Keep click targets as application-owned navigation metadata.
2. Recognize the same supported title prefix during file-link extraction. Invalid source must never add navigation targets, including while a last-valid preview remains visible. Retain exact safe identifier and relative-path restrictions and application containment checks.
3. Add a generic browser regression derived from the reproduction: eighteen nodes, four groups and seven group-level edges, including a linked ungrouped boundary. Assert positive visible geometry, distinct positions, containment in intended groups, zero node overlaps and equivalence to the unlinked layout. Exercise pointer, Enter and Space, sibling/nested files and Markdown selection, source-byte retention, draft protections and safe refusals with and without title front matter.
4. Keep the supplied original input and diagnostic artifacts only in ignored local evidence. Verify that unchanged input through an isolated built application as additional browser evidence.
5. Run RED before the source fix and GREEN afterward, affected security/UI tests, the required frozen installs and standard `check:ci` gate with pinned tools, and incremental self-review. Record concrete failures and any unavailable prerequisite without weakening a gate.

## Risks

- A projection with different statement boundaries could remove label text or miss a directive. Reuse the existing quote/comment-aware scan and test adjacent separators, comments, titles and unsafe forms.
- Stale rendered markup must not receive links from a rejected or pending draft. Review metadata lifetime together with the navigation handler.
- Geometry depends on browser fonts and SVG measurement. Use the repository's browser harness and compare the same topology in the same browser, with direct containment and overlap assertions.

## Scope and alternatives

The preview policy, renderer, navigation metadata lifetime, related regression tests and task documentation form one repair. The two sanitizer boundaries retain their existing restrictions. Converting arbitrary SVG anchors or transferring arbitrary attributes is unnecessary because a validated inert render projection avoids the wrapper entirely. File APIs, security settings, protocol limits, deployment and release publication are unchanged. Native release/deployment acceptance is not selected.

## Validation record

Implementation and focused browser RED/GREEN are recorded in [NAV-002](../task/NAV-002.md). The supplied original also passes through the isolated built application without source modification. Both sanitizer policies and navigation containment are unchanged. The standard aggregate was attempted and stopped on an unchanged backend read-consistency failure, whose timestamp evidence and overlay comparison are retained. Remaining component checks are recorded separately; they do not establish a passing aggregate or native delivery acceptance. Evidence belongs in ignored `tmp/nav-002/`.

The owner subsequently authorized committing and merging the repair into local `main` on 2026-09-12 after the aggregate failure was explained. This does not change the recorded gate result or select publication, native delivery or deployment.
