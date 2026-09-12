# LAYOUT-009 Distinguish folders from files in the explorer

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-12

## Description

The project owner reported that folders and files in the explorer are hard to tell apart and asked for the treatment to be improved and released. Acceptance: a folder row reads as a folder at a glance in both colour schemes; a child row starts to the right of its parent's icon at every depth; a collapsed folder no longer shows an open folder; nesting is visible without relying on the chevrons; the selected-row, open-file, hover and narrow-drawer behaviour stay as they are.

## ActiveForm

Distinguishing folders from files in the explorer.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-12, `main` at `8ef2d04`): reproduced on a built service against a project mirroring the owner's screenshot. Measured at 1280 by 900: the `mos` folder draws its chevron at 20 px, its folder icon at 42 px and its name at 64 px, while its child `mos/architecture.mmd` draws its icon at 32 px and its name at 54 px, so every child starts to the left of its parent's icon and name. The same holds one level deeper (`boot` at 54 and 76 px, its child at 44 and 66 px). Folder and file names share weight 400 and the foreground colour, and both icons share the muted colour and outline style.
- Investigation (2026-09-12): the cause is structural. Every row indents by `depth * 12` px, but a folder row spends a 14 px chevron and an 8 px gap before its icon while a file row starts with its icon, so one level of indentation (12 px) is smaller than the chevron column (22 px) it has to clear. The folder row also renders `FolderOpen` whatever its state.
- Investigation (2026-09-12): the application theme is neutral grayscale throughout, and the prototype uses both `Folder` and `FolderOpen`. `explorer.spec.ts` requires an expanded folder row to keep a transparent background when not hovered, and `drawer.spec.ts` requires long nested names to stay within the narrow drawer.
- Proposal (2026-09-12): reserve the chevron column on file rows so rows at one depth align their icons; indent by the width of that column so a child icon starts just right of its parent icon; draw a one-pixel guide per ancestor level in the indentation; show `Folder` when collapsed and `FolderOpen` when expanded; give folder rows a filled, foreground-coloured icon and a medium-weight name while file rows keep their outline, muted icon and regular weight. No new hue is introduced, so the treatment follows the neutral theme in both schemes, and the selected row keeps the stronger weight it already has. The owner asked for the change and a release directly, delegating the visual treatment; see [PLAN-026](../plan/PLAN-026.md).
- Implementation (2026-09-12): folder and file rows now both begin with a `tree-twistie` column, holding the chevron on a folder and nothing on a file. Rows indent through a `--depth` custom property at 16 px per level, and the same property sizes a repeating one-pixel border-coloured background in the row's padding, which draws one guide through each ancestor's chevron. A folder shows `Folder` when collapsed and `FolderOpen` when expanded, takes the foreground colour with a 14 % foreground fill, and a medium-weight name. A tree row contains its children's margins, so a Markdown file's diagram list no longer interrupts the guides beside it, and that list's own border moved under its file's icon. Retained draft rows take the same column.
- Verification (2026-09-12, built service in the project tmux session, Chromium headless shell 153 installed with its system libraries as the README describes): against the project that mirrors the owner's screenshot, the `mos` folder keeps its icon at 42 px and name at 64 px while its child moved from 32 and 54 px to 58 and 80 px; the nested `boot` folder and its sibling files share the 58 and 80 px columns; `boot-state.mmd` sits at 74 and 96 px; a Markdown file's diagram list border sits under that file's icon. Screenshots in both schemes are kept under `tmp/`. A unit case covers the folder state icons, the reserved column and the depth property, and a browser case asserts that each child starts right of its folder's icon and name at two depths, that a folder and file at one depth share both columns, that a folder name is heavier than a file name and that collapsing swaps the icon. The frontend suite passes, lint and typecheck pass, and the complete browser suite passed 55 of 55 locally, including the narrow drawer and the expanded row's transparent background.
