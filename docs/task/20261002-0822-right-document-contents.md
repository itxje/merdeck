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

## Native failure and phone assertion correction

The first implementation 976fe2ec488d6df7b5209944b691536d1bb5510d passed exact [source verification](https://github.com/itxje/merdeck/actions/runs/36983657326). Its annotated v0.19.30 tag failed [native acceptance](https://github.com/itxje/merdeck/actions/runs/36984097855): both bundle and compiled browser suites passed 107 cases with 17 skips but failed the same old markdown-view-switch phone case. That case waited for the removed document toolbar and timed out at 45 seconds. The failure is an unsynchronized layout assertion; all requested reader cases passed in both suites with zero unexpected errors. Artifact processes/fixtures cleaned up and publication was skipped. Reports and failure logs are preserved under /home/alan/warehouse/merdeck-release-v0.19.30/. The failed tag remains unchanged and unpublished.

Correct the existing phone assertion to require no document toolbar/filename and require the article to start directly beneath the application header. Capture the no-contents phone layout. Search all frontend tests for the removed toolbar/title and separator selectors; this is the only remaining obsolete geometry assertion. The production implementation and verification time limits/error auditing remain unchanged. Expand local affected-browser verification to 12 cases, run the final frontend gate and exact source/native delivery again for a new v0.19.31 candidate. Successful proof belongs under /home/alan/warehouse/merdeck-release-v0.19.31/.

## Corrected local preparation

All 12 expanded production browser cases pass with zero unexpected errors and confirmed cleanup. The inspected no-contents phone screenshot in tmp/e2e-8PESu1/ shows the article directly below the application header, with no repeated filename or contents toolbar. Both frozen installs, frontend lint/types, all 622 frontend cases with coverage, build and whitespace checks pass after the test correction. The production layout is unchanged, and correction review has zero actionable introduced findings. Exact new-candidate source/native and v0.19.31 public delivery checks remain pending.
