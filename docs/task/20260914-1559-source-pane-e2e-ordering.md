# 20260914-1559-source-pane-e2e-ordering Investigate source-pane end-to-end ordering instability

- **status**: pending
- **priority**: P2
- **owner**: (unassigned)
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
- This record is intentionally pending. The mobile drawer repair remains a separate completed scope, and no source-pane implementation or test behavior was changed here.
