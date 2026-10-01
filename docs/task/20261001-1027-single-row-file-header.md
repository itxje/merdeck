# 20261001-1027-single-row-file-header Show the file status and path copy on one header row

- **status**: completed
- **priority**: P2
- **owner**: l1/session-20261001
- **createdAt**: 2026-10-01 10:27

## Description

The header showed the open file's name above its save status, with the path copy button beside the name and
a tooltip on hover. The owner asked to drop the visible name and the tooltip and to line the status and the
copy button up with the brand on one row.

## ActiveForm

Showing the file status and path copy on one header row.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- The file name stays as a visually hidden level-one heading, so the page keeps its accessible title and the
  browser suite still identifies the open file; the explorer highlights it visibly.
- The copy button keeps its accessible name "Copy absolute path" and its status announcement, without a
  tooltip.
- Verified: workspace unit tests 125/125, lint and type checks, and the header, file-path-copy and type-scale
  browser specs (7 passed, 1 skipped by design) with desktop and phone screenshots.

- complete: Delivered on main.
