# LAYOUT-008 Give the diagram the file bar's second line

- **status**: completed
- **priority**: P3
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-12

## Description

The file bar carried the open file's name on one line and its kind, or an instruction to choose a diagram, on a second. The project owner asked for that second line to go and for the space to reach the canvas. Acceptance: the bar keeps the file name and every action it held, the kind stays available without occupying a row, the instruction remains where a reader without a selection already sees it, and the panes gain the height.

## ActiveForm

Giving the diagram the file bar's second line.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Implementation (2026-09-12): the second line is gone. The heading's title attribute now carries the path with the file kind, so the kind is still one hover away, and the empty state keeps telling a reader without a selection to choose a diagram. The bar's minimum height drops from 76 to 46 pixels with its padding halved.
- Verification (2026-09-12, main checkout, pinned Bun 1.4.2, inside the project tmux session): measured against the real interface on a local build at 1440 by 900, the bar is 46 pixels tall where it was 76, the header and status bar are unchanged at 64 and 30, and the preview surface gained the difference. The name, the save state and the Save button all remain in the bar. `bun run check` passed with 204 backend tests across 9 files and 234 frontend tests across 19 files, and the complete browser suite passed 45 of 45.
