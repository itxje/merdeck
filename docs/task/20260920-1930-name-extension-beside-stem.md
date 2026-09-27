# 20260920-1930-name-extension-beside-stem A file name and its extension read as one string

- **status**: completed
- **priority**: P1
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-20 19:30

## Description

In a listing wider than its names, every row showed the name on the left and its extension against the right
edge, with empty space between the two halves of one file name.

## ActiveForm

Keeping the extension beside the stem it belongs to.

## Dependencies

- **blocked by**: 20260920-0014-explorer-name-wrapping
- **blocks**: (none)

## Notes

### Why the two halves separated (2026-09-20)

- Wrapping split a row name into a stem and an extension so the extension can stay on the first line when the
  stem wraps. The stem was given `flex: 1 1 auto`, which also lets it *grow*: in a row wider than the name,
  the stem's box took all the free width and pushed the extension to the far right, with the name it belongs
  to left behind at the other end.
- Only wide listings showed it, which is why the docked 232px explorer and the earlier review missed it: the
  narrower the column, the more of it the stem's text fills, and the extension follows right behind.
- This is the same root cause as the centred names fixed in v0.17.1 — a stem sized to the row rather than to
  its own text — and that fix corrected the alignment without stopping the growth.
- The stem now shrinks but never grows (`flex: 0 1 auto`). A long name still shrinks to the available width
  and wraps up to three lines exactly as before, because a stem wider than its column is shrunk to it either
  way; a short name now hugs its own text, so the extension sits beside it across the 3px gap.

### Checks

- The three wrapped-name browser cases now also measure the distance from the end of the stem's rendered
  glyphs to the start of the extension, with a range over the text node rather than a style property, and
  require it to be no more than the gap between them. The measurement was falsified first: restoring
  `flex: 1 1 auto` fails all three, and the fix passes them.
- `bun run --cwd web lint`, the web suite and the full browser suite against a built service.

- complete: a name and its extension read as one string at any row width.
