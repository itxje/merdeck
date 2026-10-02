# 20261002-1051-single-line-filenames Keep explorer filenames on one line

- **status**: completed
- **priority**: P2
- **owner**: filename-line/session-20261002-1051
- **createdAt**: 2026-10-02 10:51

## Description

Keep file names on one line in desktop navigation and the phone project-files drawer. Ellipsize overflowing stems, retain visible extensions and full accessible names/path titles, and preserve row actions and file selection. Deliver through the established release workflow.

## ActiveForm

Removing filename wrapping and verifying single-line navigation.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Full tier: shared row CSS, stale component comments/unit description and existing browser acceptance. The explicitly requested single-line behavior provides upfront approval; established release authorization covers delivery. Evidence belongs under /home/alan/warehouse/merdeck-filename-line/ and /home/alan/warehouse/merdeck-release-v0.19.33/. Taskist #51 concerns excessive wrapping at the 180px minimum; verify that width as part of this change. Canonical acceptance requires exact source verification and the normal complete Linux x64/ext4 check:ci --native with distinct refusal storage, same-run publication and public asset checks. No filename parsing, row markup, filtering, file operations, dependencies or verification-policy changes.

## Implementation and local acceptance

The stem now uses a single-line block with nowrap, hidden overflow and ellipsis. Non-growing flex sizing retains adjacent short-name extensions; existing labels/path titles, row actions and selection remain intact. Stale CSS/component comments and the existing unit-test description are updated. The three existing filename browser cases now require single-line geometry, equal row height, visible extensions, complete names/titles, no horizontal list overflow and actual selection at desktop 180/232/440px and phone 320/390px.

Focused red: two expected multiline failures and seven passing navigation cases. Green: all nine affected navigation/name/density/drawer cases pass with zero unexpected errors and confirmed cleanup. All five filename screenshots in tmp/e2e-5KwdYI/ have been inspected. Both frozen installs, frontend lint/types, all 622 frontend cases (38 files), build and whitespace checks pass; statement/branch/function/line coverage is 93.31/88.93/92.85/93.53%. Implementation review has zero actionable introduced findings. Evidence: /home/alan/warehouse/merdeck-filename-line/.

Taskist #51 remains open: the existing minimum 180px row allocation can leave only an ellipsis for long .mermaid stems, although wrapping is removed and complete labels/path titles remain available. Scope is the requested single-line rendering. Exact source/native and public v0.19.33 acceptance remain pending.

## Preserved v0.19.33 failure and correction

Implementation 15b610103c66ce5118021083d9ce51d8699b475e passed exact hosted source run 36998228003. The immutable annotated v0.19.33 tag remains at that commit. Normal tag-native run 36998658234, attempt 1, failed both artifact browser suites: each passed 107 cases with 17 configuration-dependent skips and failed the minimum-width filename extension/action containment check. The extension ended at 147.21875px while the action began at 142px under the hosted font. Publication was skipped and native acceptance remains pending. The failed tag, log and downloaded reports are retained under /home/alan/warehouse/merdeck-release-v0.19.33/; no checks, timeouts or audit policy are weakened.

The same supported 180px layout needs less fixed inter-item spacing to fit wider font metrics and the unsaved marker. Reduce row gaps while preserving icon sizes, complete names/titles, actions and selection. Extend the existing desktop browser case with an actual wider font and dirty .mermaid row; reproduce the overlap locally before changing CSS. This is a correction within the approved single-line/extension-containment scope. Recheck locally and deliver a new clean candidate through the normal v0.19.34 source/tag-native workflow.

## Corrected implementation and local acceptance

An explicit Liberation Mono font reproduces the exact hosted failure locally: extension endpoint 147.21875px, action start 142px. The shared filename-row gaps are now 2px, scoped to .tree-item rows so diagram-list spacing remains unchanged. Unsaved markers use non-shrinking 6px boxes. Stem ellipsis, visible extensions, full labels/path titles, icon size, row height, file actions and actual selection/editing remain intact.

The focused allocation reproducer fails once before CSS changes (eight other cases pass). Final frozen installs, lint/types, all 622 frontend cases with unchanged coverage, build and whitespace checks pass. All nine final browser cases pass with zero unexpected errors and confirmed cleanup, including actual wider-font selection/edit/reset and the preserved 6px dirty marker. Six final filename screenshots in tmp/e2e-m7qbEH/ have been inspected; implementation review has zero actionable introduced findings. Original and probe evidence remains under /home/alan/warehouse/merdeck-filename-line/. Corrected exact source/native and v0.19.34 public delivery remain pending.

## Complete preparation and delivery

Implementation f6fc6dece51d16762c6fa143c9d03d6de66e332a passed both frozen installs, frontend lint/types, all 622 frontend cases with coverage, build and whitespace checks. The initial multiline failure and a reproduced wider-font extension/action overlap preceded the CSS changes; all nine final affected browser cases pass. Desktop 180/232/440px and phone 320/390px checks confirm single-line geometry, ordinary ellipsis, visible extensions, action containment including a wider-font dirty .mermaid row with a preserved 6px marker, complete accessible names/path titles and actual file selection. Every case reports zero unexpected errors and confirmed service/fixture cleanup. All six filename screenshots have been inspected. Implementation review has zero actionable introduced findings. Local evidence is under /home/alan/warehouse/merdeck-filename-line/ and tmp/e2e-m7qbEH/.

[Exact source verification](https://github.com/itxje/merdeck/actions/runs/37000875455) passed on the clean candidate with Linux x64/ext4, separate tmpfs refusal storage and physical source/bundle/compiled adapters verified in downloaded reports.

The immutable annotated v0.19.34 tag resolves to f6fc6dece51d16762c6fa143c9d03d6de66e332a. [The tag workflow](https://github.com/itxje/merdeck/actions/runs/37001287855) passed the complete normal Linux x64/ext4 check:ci --native gate and same-run publication on attempt 1. Downloaded reports verify clean identity, matching held-descriptor ext4 provenance (0xef53), distinct tmpfs refusal storage (0x1021994), all twenty raw storage controls, file/HTTP checks and physical source/bundle/compiled adapters with cleanup. Both artifact browser suites passed 108 cases with 17 configuration-dependent skips each, in 4.4m and 4.5m. Native acceptance is explicitly passed.

The publisher downloaded checked artifact 11223933988 from the same run and commit, with verified artifact digest sha256:173b032061c955da3538ff9f0ca6ed90787ca1ef4ca6a1532522f93111925fb3.

[v0.19.34](https://github.com/itxje/merdeck/releases/tag/v0.19.34) is published. Both public attachments match GitHub digests and publisher provenance; SHA256SUMS validates the archive. The 97-file bundle reports version 0.19.34, tag v0.19.34, commit f6fc6dece51d16762c6fa143c9d03d6de66e332a, bundle target and Bun 1.4.2. Archive SHA-256: ef3cadaf5c47aaac023c0ebfd04d67fcc1d7b9fc81bcb5b6c7aedd56a215d98b.

Release notes describe single-line filenames and the documented runtime/platform requirements, retaining the publisher marker and both asset identities. Release evidence is under /home/alan/warehouse/merdeck-release-v0.19.34/. Existing taskist #51 remains open for minimum-width stem readability; wrapping and extension/action overlap are removed, while narrow stems can still be truncated. Existing #61 (generated support wording), #64 (local ARM64 compiled-browser budget) and #65 (narrow source heading) remain deferred outside this change.

- complete: Single-line filenames and minimum-width extension/action containment verified; v0.19.34 is published after complete source/native acceptance and public asset checks. The failed v0.19.33 tag and evidence remain unchanged.
