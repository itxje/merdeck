# 20261002-0822-right-document-contents Remove the document filename row and move contents right

- **status**: in_progress
- **priority**: P2
- **owner**: reader-right/session-20261002-0822
- **createdAt**: 2026-10-02 08:19

## Description

Remove the repeated document filename row, lift the reading body, and place the contents on the right for both Markdown and HTML. Keep resize, collapse, independent scrolling, current-section tracking and narrow-screen navigation usable. Deliver through the established release workflow.

## ActiveForm

Moving document contents right and verifying the reclaimed reading space.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Full tier: shared reader markup, layout, resize interaction and related tests. The explicit requested changes provide upfront approval; established release authorization covers delivery. Evidence belongs under /home/alan/warehouse/merdeck-reader-right/ and /home/alan/warehouse/merdeck-release-v0.19.30/. Canonical acceptance requires the normal complete Linux x64/ext4 check:ci --native with distinct refusal storage and same-run publication. Deferred taskist #64 remains outside this presentation change; preserve verification limits and error auditing.

## Implementation and local acceptance

Removed the repeated filename and its full-width row. The article now starts at the reader top, reclaiming 48px on desktop with visible contents. The contents header/list occupy a right column and its separator spans the frame. Moving the separator left grows the rail, including ArrowLeft; ArrowRight shrinks it. Width persistence, bounds and double-click reset remain unchanged. Collapsed/narrow views offer an icon-only top-right contents button with prose clearance; the narrow drawer opens on the right. Documents without contents reserve no toolbar space.

Two existing unit assertions and two real-browser cases first failed on filename absence. After implementation all 43 affected unit cases and 11 affected production browser cases pass, including actual geometry, directional drag/keys, restored widths, independent scrolling, collapse state, current-section highlights, drawer focus return and table scrolling. Browser auditing reports zero unexpected errors and cleanup. The initial full frontend attempt failed on JSX indentation; the corrected final run passes both frozen installs, lint/types, all 622 frontend cases with coverage, production build and git diff --check. Four existing unrelated lint warnings remain. Inspected desktop, collapsed and phone screenshots pass; implementation review has zero actionable introduced findings. Evidence is under /home/alan/warehouse/merdeck-reader-right/ and tmp/e2e-Tddrf9/. Exact source/native and public delivery checks remain pending.
