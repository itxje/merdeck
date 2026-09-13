# 20260913-2030-explorer-order Sort the loaded explorer window

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-13 20:30

## Description

After directory navigation shipped, the project owner reported that the explorer no longer lists files in order. The directory page endpoint deliberately returns entries in native directory order so it can page a directory without reading all of it, and the explorer rendered those rows unchanged, so a folder of numbered diagrams appeared shuffled. Acceptance: the loaded window lists folders before files and names in natural order, with numbers compared by value; paging, filtering and the endpoint's native order stay as they are.

## ActiveForm

Sorting the loaded explorer window.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-13): `file-tree.tsx` built its visible rows with `entries.filter(...)` and no ordering, and [the directory plan](../plan/20260913-1628-directory-navigation-pagination.md) records native filesystem order as a server-side trade-off for bounded paging rather than a presentation requirement. The owner's screenshot shows `06`, `01`, `02`, `00`, `03`, `11`, `09` in that order.
- Implementation (2026-09-13): the explorer sorts the rows it already holds, folders first and then by name with a numeric-aware collator, falling back to the full path so equal names stay stable. A window that holds a whole directory, which is every directory of up to one page, is therefore completely ordered; a longer directory is ordered across the pages loaded so far, and the existing notice still says more entries exist. The endpoint, its cursors and the filters are unchanged.
- Verification (2026-09-13, main checkout, pinned Bun 1.4.2, inside the project tmux session): a new component case feeds a page in shuffled order and requires `alpha`, `zeta`, `00-map.mmd`, `02-early.mmd`, `10-late.mmd`, `c01-compare.mmd`. `bun run check` passed with 250 backend tests and 465 frontend tests across 24 files, and the complete browser suite passed 63 of 63.
