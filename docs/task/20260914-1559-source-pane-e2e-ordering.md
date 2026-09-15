# 20260914-1559-source-pane-e2e-ordering Investigate source-pane end-to-end ordering instability

- **status**: completed
- **priority**: P2
- **owner**: source-pane-ordering-20260915
- **createdAt**: 2026-09-14 15:59

## Description

Investigate the ordering-dependent browser failure in which the existing `choose()` helper clicks **Show source** but the Mermaid source textarea remains hidden. Stabilize the source-pane behavior or its valid synchronization boundary, then rerun the aggregate browser gate without weakening source visibility coverage.

## ActiveForm

Investigating source-pane end-to-end ordering instability.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Observed during the separate mobile drawer repair validation. Clean-candidate aggregate runs failed in existing desktop source-pane assertions from `acceptance.spec.ts`, `directory.spec.ts`, and `renderer-resource-notes.spec.ts`; the mobile drawer files do not change the source-pane component or desktop source styles.
- The focused directory-history and empty-Markdown cases each passed three consecutive source-browser repetitions. The aggregate sequence still reproduced the shared failure at `web/src/test/e2e/support.ts:96`, after the visible **Show source** control was clicked.
- The task was claimed as `source-pane-ordering-20260915` on 2026-09-15. The repair escalated from Standard to Full because the expected regression and implementation span the workspace, shared E2E support, and a focused browser specification; the user supplied implementation approval in the request.
- Repaired the startup mismatch by initializing the UI to the default collapsed layout, deriving future collapse state from the actual 40px panel size rather than a timing-sensitive ref read, and explicitly marking the UI expanded when `Show source` is activated. Shared `choose()` now waits for that control to leave the visible tree before using the textarea. A new browser regression selects a second file through `choose()` from a collapsed source pane.
- Evidence: original-order affected set passed 63/63 across three repetitions; post-repair focused set (including panes) passed 46/46 across two repetitions; `bun run --cwd web lint`, `typecheck`, and coverage passed (473 tests, 93.05% statements); `bun run check` passed (255 backend tests and 473 frontend tests); `git diff --check` passed. Full browser aggregate ran 68 cases: all source-pane cases passed, with one unrelated dirty-rename directory 503 failure tracked by 20260914-1150-directory-poll-save-race. PMA code review (shared and TypeScript frontend packs) found no P0/P1 findings.

- complete: Source-pane synchronization boundary, regression coverage, focused checks, and review completed; aggregate has one unrelated directory 503.
