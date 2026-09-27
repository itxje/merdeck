# LAYOUT-007 Let the explorer be resized

- **status**: completed
- **priority**: P3
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-12

## Description

The project owner asked for the line between the project files and the editor to be draggable. The explorer had a fixed width, so longer file names were truncated with no way to see them. Acceptance: the border between the explorer and the editor is an ordinary window splitter that drags left and right, steps with the arrow keys, returns to its default on a double click, keeps its width per browser, cannot make the explorer disappear or swallow the workspace, and does not appear where the explorer is a drawer.

## ActiveForm

Letting the explorer be resized.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-12): `.file-tree` was a fixed `232px` flex item and the source and preview panes already resized through the existing panel group. Wrapping the whole body in that group would have had to account for the narrow layout, where the explorer is replaced by a drawer and hidden with `display: none`, so a plain splitter on the existing border is the smaller change and leaves the drawer untouched.
- Implementation (2026-09-12): `explorer-width.ts` keeps the width in browser storage between 180 and 520 pixels, defaulting to 232, exactly as the file type filter keeps its choice. The workspace body sets that width as a custom property, and a `separator` element on the border drags with a captured pointer, steps 16 pixels with the arrow keys, returns to the default on a double click and reports its value through `aria-valuenow`, `aria-valuemin` and `aria-valuemax`. The narrow layout hides the splitter with the explorer it belongs to.
- Verification (2026-09-12, main checkout, pinned Bun 1.4.2, inside the project tmux session): a new browser case starts from the default 232 pixels, drags the splitter 120 pixels right and observes the explorer widen, reloads and finds the same width, steps it 16 pixels left with the keyboard and then drags 600 pixels left and observes the explorer stop at its 180 pixel minimum. A unit case covers the bounds and rounding. `bun run check` passed with 203 backend tests across 9 files and 219 frontend tests across 19 files, and the complete browser suite passed 44 of 44.
