# 20261002-0721-remove-redundant-pane-notes Remove redundant editor and preview notes

- **status**: completed
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

## Complete preparation and delivery

Implementation a26dee0f107278e079a9159bca684ea6ac7d8b36 passed both local frozen installs, frontend lint/types, all 622 frontend cases with coverage, production build and whitespace checks. The 21 focused unit cases and all six affected real-browser cases pass. The initial unit/frontend failure on an obsolete double-click-instruction assertion remains preserved; the corrected existing assertion now checks the requested absence. Inspected desktop and phone screenshots show no idle session subtitle or preview footer, with the canvas reaching the pane edge and contained controls. Implementation review has zero actionable introduced findings. Local evidence is under /home/alan/warehouse/merdeck-pane-notes/.

[Exact source verification](https://github.com/itxje/merdeck/actions/runs/36978593913) passed on the clean candidate with Linux x64/ext4, distinct tmpfs refusal storage and physical source/bundle/compiled adapters verified in downloaded reports.

The immutable annotated v0.19.29 tag resolves to a26dee0f107278e079a9159bca684ea6ac7d8b36. [The tag workflow](https://github.com/itxje/merdeck/actions/runs/36979040550) passed the complete normal Linux x64/ext4 check:ci --native gate and same-run publication on attempt 1. Downloaded reports verify clean source identity, matching held-descriptor ext4 provenance (0xef53), distinct tmpfs refusal storage (0x1021994), all twenty raw storage controls, file/HTTP checks and physical source/bundle/compiled adapters with cleanup. Both artifact browser suites passed 108 cases with 17 configuration-dependent skips each, in 4.9m and 5.1m. Native acceptance is explicitly passed.

The publisher downloaded checked artifact 11215117018 from the same run and commit, with verified artifact digest sha256:8ba4ccb527c10668b184890fc7ab8c950ee00fb6503c4855961bed8247b59722. No earlier artifact supplied publication.

[v0.19.29](https://github.com/itxje/merdeck/releases/tag/v0.19.29) is published. Both public attachments match GitHub digests and publisher provenance; SHA256SUMS validates the archive. The 97-file bundle reports version 0.19.29, tag v0.19.29, commit a26dee0f107278e079a9159bca684ea6ac7d8b36, bundle target and Bun 1.4.2. Archive SHA-256: 46155de715bd36ff07fe01e31783234d219fe3d8509944e1377d3164fd8e7e5a.

Release notes describe the removed idle subtitle and preview footer with the documented runtime/platform requirements, retaining the publisher marker and both asset identities. Release evidence is under /home/alan/warehouse/merdeck-release-v0.19.29/. The existing generator wording follow-up remains taskist #61, the earlier local ARM64 timeout remains #64 and the observed narrow source-heading overlap is #65. These deferred items were not changed by this presentation task.

- complete: Published v0.19.29 from a26dee0f107278e079a9159bca684ea6ac7d8b36 after focused red/green, full frontend checks, complete canonical source/native gates, same-run publication and public artifact verification.
