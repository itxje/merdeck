# SAFETY-001 Investigate lossless saves and filesystem containment

- **status**: completed
- **priority**: P0
- **owner**: Filesystem safety reviewer
- **createdAt**: 2026-09-07 18:59

## Description

Complete a finite, evidence-backed investigation of independent external writes, atomic replacement, deletion and moved ancestors. Reproduce the pinned save protocol only in ignored scratch. Evaluate preservation protocols, define failing correction regressions, and recommend a concrete path without changing application code or weakening concurrent-version preservation.

## ActiveForm

Investigating publication races and root containment

## Dependencies

- **blocked by**: (none)
- **blocks**: safe file-operation acceptance

## Notes

- Original MVP implementation authorization dated 2026-09-07 includes necessary corrective investigation. The corrective decision requires preserving concurrent external versions; the confirmed lost-update window is not an accepted limitation. This records existing authorization, not a new user approval event.
- Claimed before substantive investigation. Report and research proposal belong in [PLAN-003](../plan/PLAN-003.md); PLAN-001 and application safety remain incomplete.
- Scope: this task, PLAN-003, their new index entries, and TypeScript research under `tests/investigation/safety/`. Baseline `b314a1268f88be3ace1ccbd64ca9ab028044a117` is read through Git objects only. Fixtures and extracted code remain in ignored `tmp/safety/`.
- No application, shared contract, configuration, dependency, or existing task changes. No native implementation or deployment policy changes.
- Investigation and proposal were persisted before executable research; proceeded using the original authorization. Completed on 2026-09-07 at 19:10 UTC with the finite report in PLAN-003 and the self-contained TypeScript driver.
- Verified 21 scenarios and 28 independent processes: final-window loss and moved-ancestor counterexamples, meaningful no-conflict/early-conflict/path controls, candidate cleanup/rollback failures and honest platform capability observations. Exact frozen installs, driver, lint, root/focused typechecks and whitespace checks passed; generated fixtures were removed. Staged research review passed.
- Recommendation: select an enforceable service-owned root with mediated edits, or explicitly select a staged-proposal workflow. Both require a concrete material-boundary decision; no unrestricted external-writer safety is claimed. This task completes investigation only, not corrective implementation or application acceptance. Preview is not applicable.
- Added supplied second-save reliability evidence and the single matched overlayfs control to PLAN-003, explicitly attributed as supplied rather than locally reproduced. Retained the intermittent conflict finding independently of confirmed silent external-write loss. No additional investigation, test rerun, source read, identity-check change or acceptance waiver; completed investigation status remains unchanged.
