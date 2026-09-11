# PLAN-008 Constrain the narrow file drawer grid

- **status**: completed
- **createdAt**: 2026-09-08 03:26
- **approvedAt**: 2026-09-08 (existing authorization; day precision)
- **relatedTask**: LAYOUT-001

## Context

The sourced Base UI dialog popup uses CSS Grid without an explicit column definition. The feature's .file-drawer sets a 300 px width, but its implicit auto track retains the tree's min-content contribution. Long file labels therefore widen the track and the percentage-width tree beyond the popup. The existing settledDialog helper checks opacity and outer width only.

The explicitly supplied read-only diagnostic showed popup bounds 45..345 at 390 px, scrollWidth 413, grid width 397.406 px, and description/tree/navigation extending to 458.406 px. Its temporary grid-track candidate measured a 268 px column with content ending at 329 px. The supplied layout acceptance exited 1; diagnostic completion exited 0 and is not implementation acceptance. The screenshots corroborate the displaced search and navigation. No live deployment was accessed or changed.

## Proposal

Add only grid-template-columns: minmax(0, 1fr) to the existing .file-drawer rule. The zero minimum allows the track to fit the popup's available content width while preserving the existing sourced dialog, natural description wrapping and established file-label truncation.

Add one focused browser regression using a disposable long nested path/file label. Measure the settled actual popup, its content/description/tree/navigation/search and flow controls, both dimensions for the main containers and horizontal bounds for vertically scrollable rows. The corner close control must remain inside the popup. Check clientWidth versus scrollWidth with at most one CSS pixel for integer rounding; inspect actual wrapped description line rectangles. Exercise filtering, keyboard focus/Escape restoration, selection, retained drafts, narrow pane switching at 390 and 360 px, and desktop source/preview interaction. Save no test-only production styles.

First run the regression against the unchanged built service and retain its failing measurement/screenshot. After the CSS edit, run frontend lint, types, all unit tests/coverage, build and the focused browser test. Then run the full frozen-install/check:ci/whitespace chain once, discovering the new case in the real executable suite and rechecking all embedded resources and process/file audit.

## Risks

A popup-only width assertion misses child overflow. Hidden overflow could conceal controls and descriptions without fixing sizing. Acceptance must measure actual descendant bounds after animations settle.

## Scope

File drawer CSS in web/src/index.css, a focused browser regression, this plan/task and their own new index rows, plus a concise changelog entry if warranted. Existing renderer, data/auth/save, deployment and historical acceptance records are outside this correction.

## Alternatives

Assess the supplied minmax(0, 1fr) grid track against the actual cascade. Avoid fixed child widths, global overflow hiding and runtime style injection.

## Annotations

The user's ongoing 2026-09-08 MVP/domain correction authorization covers this demonstrated defect and routine correction. No new approval time is asserted. Prototype status remains needs-review. Later combined-build HTTPS acceptance remains a separate deployment check.

Completed with the proposed single grid-track change and regression. The own baseline failed on actual horizontal overflow; corrected source and executable checks passed at 390/360 px and desktop sizes. [LAYOUT-001](../task/LAYOUT-001.md) records exact commands, measurements, counts and cleanup. Full local acceptance does not replace later combined-build HTTPS or checked-candidate verification.


### Finite combined verification

The original 2026-09-08 authorization also covers mechanical integration of the reviewed drawer and renderer corrections. Their completed independent results above remain historical. The sole reviewed upstream is `8196c3958e3002e610d61efd29c88516e4ee3998`; retain the original drawer delivery `17f22a7be389f0bc047caa0ab5a97e9890fb062d` and both histories.

Investigation identifies three expected document conflicts: changelog, plan index and task index. Preserve all entries verbatim and both correction rows while retaining the upstream domain status. Stop on any unexpected conflict. Keep application/test bytes unchanged from their respective reviewed sources; verify this before a clean combined commit. Run the complete frozen-install/check:ci chain once on that commit, with 83 frontend tests and 27 real executable browser cases plus embedded-asset and process/filesystem audits. Inspect rendering, 390/360 px drawer screenshots, provenance and owned cleanup before restoring completion markers. This is finite combination and verification, without a new product decision, design approval or new defect retry. Live HTTPS deployment remains a later acceptance step.


### Combined verification outcome

Completed the authorized finite combination without application/test edits. Only the three expected document conflicts required resolution; all entries, accepted domain status and both correction histories were retained. Drawer CSS/test bytes match the original delivery; every other upstream tracked path matches the reviewed upstream. The clean combined implementation `7ecb47d4f91b0b1a157379ac0bcc88fde53c18cb` passed the prescribed full frozen-install/check:ci chain once with immediate exit 0, all 83 frontend tests and all 27 real executable browser cases, plus 93 embedded resources and process/filesystem audits. Exact-source rows and source/draft/request/saved-byte identity passed alongside 390/360 px descendant bounds and usable drawer controls. Independent cleanup and scoped preservation review passed.

[LAYOUT-001](../task/LAYOUT-001.md) records the combined checks, measurements and binary provenance separately from the original independent layout results. Only documentation and own completion markers follow the tested commit. New hosted/x64/ext4 and live HTTPS acceptance remain downstream; no deployment or fresh remote result is implied. Original day-level authorization and prototype needs-review are unchanged.
