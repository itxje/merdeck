# PREVIEW-010 Preserve inert addresses and note text in diagram previews

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-12

## Description

Render the supplied architecture diagram and the eight related files without editing their source. Ordinary `base64url(...)`, displayed addresses and escaped newlines in class notes must not prevent previews. Preserve source bytes, existing navigation, strict rendering, sanitization and resource refusals.

## ActiveForm

Preserving inert addresses and note text in diagram previews.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Claimed after the owner explicitly authorized the diagnosed repair and requested direct implementation. The repair starts from current main source and preserves its subsequently added sequence and configuration support.
- Investigation: the global `url` function check also matches the suffix of `base64url(...)`. A quoted node label containing an HTTPS address separately matches the protocol and double-slash rules. Either match alone refuses the complete diagram; adjusting both texts makes the supplied source pass. Title front matter and flowchart arrows already pass.
- Proposal: [PLAN-024](../plan/PLAN-024.md). Keep private supplied-source evidence in ignored `tmp/preview-010/`; commit only generic regressions.
- Acceptance: original text renders visibly with source bytes intact and no external requests or actionable SVG links; actual CSS resources, external navigation, HTML, scripts, callbacks and unsafe neighboring syntax remain refused. Run focused RED/GREEN, affected browser checks, the standard quality gate and incremental self-review.
- Scope extension: the owner requested checking the other diagrams in the supplied directory. Five of eight sources pass after the initial label repair. Three additional refusals are ordinary citation addresses in whole-line comments, an HTTP address in a sequence note and escaped newlines in quoted class notes. Extend the same inert-text repair to these bounded contexts, preserve unsafe neighboring syntax, and verify all eight unchanged inputs through the built application. Source copies and hashes remain in ignored local evidence.
- Initial RED/GREEN: nine new policy cases and the generic flowchart browser case fail before the repair (`red-unit.log`, `red-browser.log`). The repaired source passes 316 frontend tests and nine affected browser cases, including geometry, navigation, drafts, label editing and exact saves. The supplied architecture input also passes with 16 nodes, six groups, 18 edges, no overlaps, correct group containment, exact API/editor/file bytes and zero external requests or implicit writes (`original-result.json`).
- Construction correction: the new browser test initially requested on-diagram editing for titled source, while the unchanged preview only enables that feature for sources without front matter. The test now checks titled rendering, edits the same label in the supported untitled context, then restores the title for exact save verification. No production editing behavior or existing assertion was weakened. Initial lint and browser failure evidence remain in `green-lint.log` and `green-browser.log`.
- Extended RED: six additional note/comment policy cases fail before extending the projection (`notes-red.log`); browser failures against the prior built source are retained separately. Whole-line reference comments are now explicitly supported; the former newly added comment-URL refusal is replaced by an HTML-in-comment refusal, alongside positive reference-comment coverage.
- Standard gate: frozen root/web installs and workflow lint pass. Normal `check:ci` stops at the unchanged backend read-churn test expecting a conflict after three attempts (154 pass, one fail). This is the previously recorded baseline failure; backend files are unchanged. Independent storage checks and release tests pass. Component results do not convert the failed aggregate into a pass; native delivery and deployment remain unselected.
- Class-note rendering: admitting escaped newlines alone exposed literal backslash-n text in Mermaid's strict SVG renderer. A validated private render projection now converts only those note breaks to canonical bare breaks. The browser regression requires three visible rows at distinct vertical positions and exact saved source bytes. Its geometry collector measures Mermaid's outer row spans, after an initial collector incorrectly expected each word span to contain an entire row. Both failures remain in `extended-browser-results/` and `verified-browser-results/`; the corrected checks pass in `notes-green-browser.log`.
- Final source verification: frontend lint/types, production build and all 342 unit tests pass (94.67% lines, 89.90% branches). The full source browser run passed 53 cases and exposed the class-note defect above; focused verification after the fix passed that case with visible separate rows and preserved bytes. All eight supplied files pass policy and real built-source browser checks (`directory/results.json`): exact API/editor/file bytes, zero external requests, zero implicit writes, no browser errors and positive text geometry. All three supplied flowcharts have zero node overlaps. Hashes confirm the original directory is unchanged. Screenshot/SVG/geometry evidence and service cleanup are retained locally.
- Final artifact verification: the exact final code passes both local executable and architecture-independent bundle smoke checks. Each passes 53 browser cases with the normal existing-service skip of the open-access case, which has passing source-browser evidence. All 94 frontend assets and four lazy diagram families pass. Actual tracing confirms empty runtime PATH, no checkout access or frontend extraction, and complete cleanup. The final standard aggregate still stops at the unchanged read-churn failure (`final-ci.log`); the independent full backend run has 203 passes and the same one failure. These results establish source and local artifact regression evidence, not native delivery or deployment approval.
- Incremental self-review: reviewed the complete production diff and regression fixtures, source validation before DOM operations, the two unchanged sanitizer stages, strict settings, active-resource refusals, class-note projection, navigation/drafts and source retention. No actionable introduced finding remains. `tmp/preview-010/self-review.md` and `verified-code-files.json` retain the review and the exact tested code hashes. Implementation and verification are complete and ready for review; the original diagrams and installed service remain unchanged.
