# 20260914-1517-mobile-file-drawer Fix the mobile project-files drawer

- **status**: completed
- **priority**: P1
- **owner**: direct/mobile-drawer-20260914-1517
- **createdAt**: 2026-09-14 15:17

## Description

Repair the Project files drawer at narrow mobile widths. The supplied mobile screenshot shows a vertically centred drawer that reserves a large fixed-height empty listing. Make the drawer a compact, safe-area-aware bottom sheet on mobile while preserving the existing desktop explorer, file operations, focus behavior, and server boundaries.

## ActiveForm

Repairing the mobile project-files drawer and its browser regression coverage.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- 2026-09-14 15:17 — Investigation found that `web/src/index.css` gives `.file-drawer .file-tree` a fixed `64dvh` height, while the shared dialog remains vertically centred. `web/src/features/workspace/workspace.tsx` mounts the drawer and `web/src/features/workspace/file-tree.tsx` supplies its empty and populated listing states. The current browser check verifies containment but does not assert compact empty-state geometry or bottom-sheet placement.
- 2026-09-14 15:17 — The owner authorized direct repair after rejecting an unrelated orchestration interpretation. This task is a new focused repair; the completed MVP records remain unchanged.
- 2026-09-14 15:17 — The approved scope is a mobile-only drawer layout adjustment, a self-contained needs-review design prototype, and narrow browser regression coverage. No backend, API, dependency, authentication, or generic-dialog change is authorized.
- 2026-09-14 15:22 — RED: the new empty-folder geometry assertion measured a 540.15625 px file tree at a 844 px viewport, exceeding its 489.52 px limit. The original vertically centred popup retained the fixed empty-list reservation.
- 2026-09-14 15:36 — Implemented a narrow-only `.file-drawer` bottom sheet with dynamic viewport and safe-area padding. A settled empty tree receives a scoped semantic marker and sizes to its controls; loading, errors, searches, depth-limited pages, retained drafts, and populated listings keep their existing bounded scrolling behavior. Desktop explorer and generic dialogs are unchanged.
- 2026-09-14 15:38 — Added and registered `designs/merdeck/Mobile-file-drawer.html`. It remains `needs-review`; its neutral palette, full-width sheet, and 44 px controls are documented implementation assumptions. The fixed-route design server and browser check verified the served byte identity, empty/populated states, filtering, focus restoration, no external resources, and no narrow overflow.
- 2026-09-14 15:41 — Focused GREEN: `bun run build && bun run test:e2e drawer.spec.ts` passed 2 browser cases with no unexpected browser errors. The empty-state case covers 390 px and 360 px viewports, bottom alignment, compact tree geometry, containment, Escape, and focus restoration; the populated case proves the list remains scrollable.
- 2026-09-14 15:42 — Frontend lint, typecheck, and coverage passed (473 tests; 93.05% statements, 89.05% branches, 92.65% functions, 93.24% lines). The design TypeScript check, design lint, mobile design browser check, original design compatibility check, and whitespace check also passed.
- 2026-09-14 15:58 — The exact normal frozen-install/check command in the dirty authoring tree completed all application, release, and two 64-pass/1-skip browser sequences but correctly stopped in `scripts/ci/evidence.ts`, which rejects dirty source provenance. Clean-candidate aggregate attempts reached the same existing desktop source-pane visibility failure from `web/src/test/e2e/support.ts:96`; affected individual cases each passed three consecutive repetitions. The aggregate is not claimed passed. The distinct pending follow-up is [20260914-1559-source-pane-e2e-ordering](20260914-1559-source-pane-e2e-ordering.md). Local ARM64/overlay results do not establish native x64/ext4 acceptance.
- 2026-09-14 16:00 — Implementation review under the core and TypeScript frontend review policy found no high-confidence introduced issue. The compact state excludes transient/error/retained-draft conditions, CSS stays within the mobile file drawer, no dependency or generic-dialog surface changed, and the added browser coverage exercises both compact and scrolling states.

- complete: Focused mobile drawer and design checks passed; aggregate limitation and follow-up are recorded.
