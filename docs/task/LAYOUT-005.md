# LAYOUT-005 Remove duplicated labels from the explorer footer and status bar

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-11 03:30

## Description

The project owner pointed out on 2026-09-11 that the bottom of the workspace repeats information. The explorer footer shows "Project files", the explorer's own name. The status bar repeats "Project files" together with the open file's path, which the file bar above the editor already shows.

Acceptance:

- The explorer footer shows only useful facts: the file count, the supported extensions and, when applicable, the partial-list notice.
- The status bar shows the connection state and the draft or refresh note, without repeating the file path or "Project files".
- Narrow layouts are otherwise unchanged.

## ActiveForm

Removing duplicated labels from the explorer footer and status bar.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation:
  - The footer in `web/src/features/workspace/file-tree.tsx` shows "Project files" above ".mmd · .mermaid · .md".
  - The status bar in `web/src/features/workspace/workspace.tsx` shows, on the left, a shield icon with "Project files" (or "Disconnected") and a desktop-only "/<path>". On the right it shows "Drafts kept in this tab" or "Connected", followed by a desktop-only "· External edits refresh automatically".
  - No browser spec or unit test asserts these texts; only the separate prototype check has its own status bar.
- Proposal (owner request, routine visual change):
  - The footer keeps one muted line, "<n> files · .mmd · .mermaid · .md", plus the partial-list notice. The file count moves there from the explorer heading as part of FILE-002.
  - The status bar shows "Connected" or "Disconnected" with the shield icon on the left. On the right it shows "Drafts kept in this tab" when drafts exist, and otherwise the desktop-only note "External edits refresh automatically".
- Implementation:
  - `workspace.tsx` now renders the status bar as the shield icon with "Connected" or "Disconnected" on the left, and "Drafts kept in this tab" or the desktop-only "External edits refresh automatically" on the right. The duplicated "Project files" label and file path are gone.
  - The footer in `file-tree.tsx` drops its "Project files" label and keeps the muted "<n> files · .mmd · .mermaid · .md" line and the partial-list notice.
  - These changes ship with the FILE-002 explorer slice, because both edit the explorer footer.
- Verification (2026-09-11): the change was covered by the FILE-002 explorer slice's checks: web lint and typecheck, 177 unit tests, the build and 38 of 38 browser cases. No test asserts the removed labels.
- Deployment and live evidence (2026-09-11): with the same `5fcbe55` build on https://merdeck.example.test/, the status bar read "Connected" and "External edits refresh automatically", and the explorer footer read "3 files · .mmd · .mermaid · .md". Neither repeated the "Project files" label or the file path. FILE-002 records the session details.
