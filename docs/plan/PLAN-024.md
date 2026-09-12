# PLAN-024 Preserve inert addresses and note text in diagram previews

- **status**: completed
- **createdAt**: 2026-09-12
- **approvedAt**: 2026-09-12 (explicit implementation authorization)
- **relatedTask**: PREVIEW-010

## Context

The source policy performs a global resource scan before recognizing flowchart text. Its unbounded `url(` pattern matches `base64url(`, and protocol checks refuse an address displayed as ordinary node text. The supplied source independently reproduces both false matches.

## Proposal

Require a word boundary for the CSS `url` function check. Exempt HTTP(S) address tokens only in bounded plain double-quoted flowchart node/group labels, single-line sequence notes and ordinary whole-line comments during source validation. Admit escaped newlines only inside quoted class notes and project those breaks to canonical bare breaks for rendering. Preserve every other structural, HTML, entity, script and CSS check. Keep Markdown labels, click targets, declarations, configuration and directive-shaped comments outside the exemptions. Original addresses, editor/draft/save bytes and both existing SVG sanitizer boundaries remain intact.

Add generic policy and browser regressions, including exact text, positive geometry, source retention and zero resource requests. Exercise unsafe neighbors and the affected navigation and editing paths. Verify the supplied unchanged source only as ignored local evidence. Run the repository's pinned standard gate and record its actual result, then perform incremental self-review.

## Risks

An exemption that consumes arbitrary quoted strings could admit resource-bearing statements or hide unsafe markup. Bound it to label delimiters, keep the existing global refusals visible, reject Markdown labels from the exemption and test adversarial combinations before and during real browser rendering.

## Scope and alternatives

The preview source policy, related regression support and documentation form one repair. Existing front matter support, internal navigation, security settings, sanitizers, size limits and backend behavior remain unchanged. Broadly permitting URLs, anchors, HTML or arbitrary CSS is unnecessary. Editing the user's diagram text would leave the source defect unresolved.

Publication, deployment and native delivery acceptance are outside this repair.

## Authorized scope extension

The owner requested checking the remaining diagrams in the supplied directory. Extend address-text handling to ordinary whole-line comments and single-line sequence notes, and admit only escaped newlines in quoted class notes. Keep other escapes, resource statements, directives, HTML and Markdown resources refused. These are explicit bounded text contexts, not a global exemption. Add generic regressions and browser checks for all eight supplied sources without changing their files.

## Outcome

Implemented and self-reviewed. All eight unchanged supplied files pass real built-source browser verification, all 342 frontend tests pass, and both final local artifact variants pass 53 browser cases plus their asset/cleanup checks. The existing backend read-churn failure continues to prevent a passing standard aggregate. Detailed RED/GREEN, correction, source preservation and review evidence is recorded in [PREVIEW-010](../task/PREVIEW-010.md). No publication or deployment is included.
