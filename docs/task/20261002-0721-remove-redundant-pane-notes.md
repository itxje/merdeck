# 20261002-0721-remove-redundant-pane-notes Remove redundant editor and preview notes

- **status**: in_progress
- **priority**: P2
- **owner**: pane-notes/session-20261002-0721
- **createdAt**: 2026-10-02 07:21

## Description

Remove the idle Direct local CLI session subtitle and the complete preview footer showing Diagram and drag/zoom instructions. Reclaim its height for the canvas, preserve functional controls and actionable status, and deliver v0.19.29 through the established release workflow.

## ActiveForm

Removing redundant pane notes and verifying the compact layout.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Full tier: cross-module presentation removal plus existing tests and related toolbar positioning. The fully specified removal request provides upfront approval; prior release authorization covers delivery. Evidence belongs under /home/alan/warehouse/merdeck-pane-notes/ and /home/alan/warehouse/merdeck-release-v0.19.29/. Canonical final delivery requires the normal complete Linux x64/ext4 check:ci --native with distinct refusal storage and same-run publication. The earlier ARM64 full-run timeout remains taskist #64; do not relax time limits, assertions or error auditing to address it.

## Implementation and focused acceptance

Removed the idle file-editor subtitle while retaining active editing/reconnecting feedback. Removed the whole preview footer, including its title, drag/zoom instructions and conditional double-click hint. The diagram keeps its accessible title and the canvas fills the freed 31px. The floating toolbar retains its prior distance from the canvas edge with 18px desktop and 11px phone offsets. Shared source metadata footer styling remains required.

Two existing unit assertions and four existing browser cases first failed on the requested text/row removal. After implementation an additional obsolete double-click-hint assertion failed; it is now updated to expect absence. All 21 affected unit cases pass, exercising actual pan/zoom, node label editing, stale renders and reconnection transitions. All six affected production browser cases pass with zero unexpected errors and confirmed fixture/service cleanup, including actual provider edits, readable phone conversations, pane resize/collapse and a canvas that reaches the pane edge with contained controls. Desktop and phone screenshots have been inspected. Implementation review has zero actionable introduced findings. The screenshot also records a pre-existing narrow source-heading overlap, deferred as taskist #65; no horizontal pane behavior was changed.

Evidence is under /home/alan/warehouse/merdeck-pane-notes/ (red-unit/browser, green-unit/browser, confirm-unit, initial-quality and review.md) and tmp/e2e-XzAvKy/browser-results/. The intermediate full frontend run failed only on the obsolete double-click hint; complete final frontend and canonical source/native delivery gates remain pending.

## Final frontend preparation

Both frozen installs, frontend lint and types, all 622 frontend tests with coverage, production build and git diff --check pass. Four pre-existing unrelated lint warnings remain. Final focused/browser evidence and screenshot inspection pass, and source/native/public delivery acceptance remains pending.
