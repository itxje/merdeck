# 20260920-0720-refresh-followups Interface refresh follow-ups: row alignment and heading navigation

- **status**: completed
- **priority**: P1
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-20 07:20

## Description

Two defects the owner found in v0.17.0, both visible on first use: explorer rows centre their file names in
a wide listing, and a Markdown contents entry leaves its heading at the bottom of the view instead of the top.

## ActiveForm

Fixing the row alignment and the heading navigation.

## Dependencies

- **blocked by**: 20260920-0014-explorer-name-wrapping, 20260919-0816-markdown-contents-and-type
- **blocks**: (none)

## Notes

### Centred file names (2026-09-20)

- A row is a button, and a button's text centres by default. Before the wrapping work the name was one
  `.truncate` span, a flex item sized to its own content, so the box hugged the text and the centring had
  nothing to centre within. The wrapping work split the name into a stem and an extension and gave the stem
  `flex: 1 1 auto`, so the box now spans the row's free width and the inherited centring shows: the name sits
  in the middle of an empty column with the extension pushed to the right edge.
- Only the wide listings show it. At the docked explorer's 232px the name fills its box, which is why the
  browser suite and the review missed it; the project-files sheet at desktop width is where the owner saw it.
- `.file-tree .tree-row` already overrode `justify-content` for the same reason and simply never set
  `text-align`. It does now.

### A heading landing at the bottom (2026-09-20)

- The Markdown contents list and the in-document heading links scrolled with `block: 'nearest'`, which moves
  the minimum distance that makes the target visible: a heading below the fold stops at the bottom edge of the
  view, under the reading area, rather than at the top. A heading above the fold stopped at the top, which is
  why only some entries looked wrong.
- The HTML preview's anchors already used `{ block: 'start', behavior: 'smooth' }`. The Markdown view now
  matches it, so the two previews behave the same way.
- Footnote navigation keeps `nearest`: jumping to a definition and back is a different interaction and was not
  reported.

### Checks

- Browser expectations: a new case measures where the name's glyphs actually start against their box, using a
  range over the text node, and requires them within 1px of its left edge — it fails on a centred row rather
  than on a style property that happens to spell the defect.
- The component expectations for the contents list and the two in-document heading links were rewritten to the
  new scroll arguments; the footnote ones keep theirs.
- `bun run --cwd web lint`, `typecheck` and the web suite: 33 files, 572 tests, clean.
- Browser suite, the affected specs against a built service: explorer hierarchy, name wrapping including the
  new alignment case, and the Markdown document — 6 passed, 0 failed.

- complete: names read from the left and a chosen heading arrives at the top.
