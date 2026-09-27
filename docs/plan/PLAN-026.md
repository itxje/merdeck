# PLAN-026 Distinguish folders from files in the explorer

- **status**: completed
- **createdAt**: 2026-09-12
- **approvedAt**: 2026-09-12 (the owner asked for the change and a release directly, delegating the visual treatment)
- **relatedTask**: LAYOUT-009

## Context

The explorer renders a flat list whose rows indent by `depth * 12` px. A folder row draws a chevron and a gap before its icon; a file row starts with its icon. One level of indentation is narrower than the chevron column, so every child starts to the left of its parent's icon and name, which reads as the opposite of nesting. Folders and files share the name weight, the name colour and the icon colour and style, and a collapsed folder still shows an open folder. Measurements are recorded in [LAYOUT-009](../task/LAYOUT-009.md).

## Proposal

1. **One chevron column.** File rows reserve an empty column the width of the chevron, so rows at the same depth align their icons and names.
2. **Indentation that clears the column.** Each level indents by 16 px, so a child's icon starts just to the right of its parent's icon and a child's name to the right of its parent's name.
3. **Indent guides.** The indentation carries a one-pixel border-coloured guide per ancestor level, drawn as a background of the row's own padding, so nesting stays legible when a folder holds many files and no extra elements are added.
4. **Folder state.** A collapsed folder shows `Folder`; an expanded folder shows `FolderOpen`.
5. **Folder emphasis within the neutral theme.** A folder icon takes the foreground colour with a light foreground fill, and a folder name takes medium weight. File icons stay outlined and muted and file names stay regular. The selected row keeps its existing stronger weight, so selection still stands out from both.
6. **Unchanged behaviour.** Selection, the open Markdown file marker, hover and focus, row menus, keyboard shortcuts, the expanded row's transparent background and truncation in the narrow drawer.
7. **Verification.** A unit case for the folder state icons and the reserved column; a browser case measuring that a child starts right of its parent's icon at two depths, that a folder name is heavier than a file name, and that sibling files and folders align; the existing explorer and drawer cases; screenshots in both schemes kept under ignored `tmp/`.
8. **Records.** Task, plan, changelog; release as a patch version under the README rule for interface adjustments.

## Risks

- **Deeper rows lose width.** Moving from 12 to 16 px per level and reserving the chevron column on files costs width at depth; the depth cap of six levels and existing truncation bound it, and the narrow-drawer case covers long nested names.
- **Weight as a signal.** Medium weight on folders sits between file rows and the selected row; if a scheme renders 500 and 600 too similarly, the filled icon still separates folders.
- **Guides behind rows.** The guides live in the row padding, outside the button's hover and selection fill, so they cannot change the transparent-background assertion.

## Scope

`web/src/features/workspace/file-tree.tsx`, the explorer rules in `web/src/index.css`, `file-tree.test.tsx`, one browser case in the explorer suite, and the records above. Out of scope: tree data, sorting, file-type icons beyond the folder state, and colour tokens.

## Alternatives

- **Colour folders with a hue** such as amber: strongest distinction, but it would be the only hue in an otherwise neutral interface.
- **Nest real lists per folder** instead of a flat list: guides and indentation would follow naturally, but it changes the tree's structure, filtering and collapse logic for a visual problem.

## Implementation record

Implemented as proposed, with one addition found while measuring: a Markdown file's diagram list collapsed its bottom margin through the row, which broke the ancestor guides beside it, and its border still sat under the old icon position. Tree rows now contain their children's margins and the list's border sits under its file's icon. Retained draft rows take the reserved column too. Evidence is recorded in [LAYOUT-009](../task/LAYOUT-009.md).
