# 20261002-1051-single-line-filenames Keep explorer filenames on one line

- **status**: in_progress
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
