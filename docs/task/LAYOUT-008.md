# LAYOUT-008 Move the file bar into the header

- **status**: completed
- **priority**: P3
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-12

## Description

The file bar carried the open file's name on one line and its kind, or an instruction to choose a diagram, on a second. The project owner asked first for the second line to go, then for the bar itself to go and its Save control to join the row above. Acceptance: the header carries the open file and its saving controls, nothing the bar held is lost, the header names no file when none is open, the kind stays available without occupying a row, and the panes gain the whole bar.

## ActiveForm

Moving the file bar into the header.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Implementation (2026-09-12): the second line is gone. The heading's title attribute now carries the path with the file kind, so the kind is still one hover away, and the empty state keeps telling a reader without a selection to choose a diagram. The bar's minimum height drops from 76 to 46 pixels with its padding halved.
- Verification (2026-09-12, main checkout, pinned Bun 1.4.2, inside the project tmux session): measured against the real interface on a local build at 1440 by 900, the bar is 46 pixels tall where it was 76, the header and status bar are unchanged at 64 and 30, and the preview surface gained the difference. The name, the save state and the Save button all remain in the bar. `bun run check` passed with 204 backend tests across 9 files and 234 frontend tests across 19 files, and the complete browser suite passed 45 of 45.
- Implementation, second step (2026-09-12): the bar is gone. The header now holds the brand, the explorer toggle, the open file's name, the save state, the Save button with its shortcut, the theme switch and log out. With no file open the header names none, because the explorer and the empty state already say what to do. The narrow layout hides the brand name instead of the file, and the shortcut hint and save state drop out as they did in the bar.
- Verification (2026-09-12, second step): measured on a local build at 1440 by 900, the header stays 64 pixels, the file bar no longer exists and the preview surface grew from 685 to 731 pixels. The header browser case now pins the new inventory: five controls, a disabled Save with no file open and no heading in the header until one is opened. `bun run check` passed with 204 backend tests across 9 files and 234 frontend tests across 19 files, and the complete browser suite passed 45 of 45.
