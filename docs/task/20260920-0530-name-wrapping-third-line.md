# 20260920-0530-name-wrapping-third-line Explorer name wrapping: a third line

- **status**: completed
- **priority**: P1
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-20 05:30

## Description

Explorer rows clamped a wrapped name at two lines. On a machine whose fonts are wider than the one the change
was measured on, the longest of the names the refresh set out to make distinguishable does not fit in two
lines, so the clamp cut it and showed an ellipsis — the exact outcome
[20260920-0014-explorer-name-wrapping](20260920-0014-explorer-name-wrapping.md) set out to remove. Raise the
clamp to three lines and stop asserting which names wrap.

## ActiveForm

Raising the wrapped-name clamp to three lines.

## Dependencies

- **blocked by**: 20260920-0014-explorer-name-wrapping
- **blocks**: (none)

## Notes

### Investigation (2026-09-20)

- Native acceptance on `main` failed twice on `explorer-name-wrapping.spec.ts`, each time on a different
  assertion, and passed locally both times. The two failures have one explanation: the checking machine's
  fonts are wider than the one the names were measured on.
  - The first failure was the spec's own fault. It listed which names wrap, so a name that fits one line here
    and takes two there fails an assertion about the environment rather than about the layout.
  - The second, after that list was replaced by the rendered line count, is the product's: the stem clamp
    reported content taller than its box for `flow-decisions_zh.mmd`, meaning three lines of text inside a
    two-line clamp, which renders as an ellipsis.
- The acceptance item this track carries is "no row shows an ellipsis in place of a name". A two-line clamp
  cannot hold that for the names the plan itself names, on any font wider than the one measured.

### Change (2026-09-20)

- `web/src/index.css`: `.tree-name-stem` clamps at three lines instead of two. The row is already
  `height: auto` with a 34px minimum, so it grows on its own; no height rule changed.
- `web/src/test/e2e/explorer-name-wrapping.spec.ts` stops encoding geometry it can read:
  - the line count comes from the rendered stem — its box height against the extension's, which is always one
    line in the same font — rather than from a list of names;
  - a one-line row is still exactly 34px, the constant the explorer's density depends on; a row that took more
    lines is only required to be taller, rather than checked against a height rebuilt from padding and line
    height, which is the kind of second copy that has already been wrong here once;
  - the name stays whole, unclipped, with the extension unsplit on the first line, and resolves to exactly one
    row by its exact accessible name, at both the default explorer width and in the phone sheet;
  - the desktop case still requires at least one row to have wrapped, so the taller shape stays exercised.

### Checks

- `bun run --cwd web lint` and `bun run --cwd web typecheck`: clean.
- Browser suite, the affected specs against a built service with the documented fixture parents and the
  fake-provider flag: `explorer-name-wrapping` (both cases), `explorer-density` and `drawer` (all three) —
  6 passed, 0 failed.
- Native acceptance on `main` after this change: recorded in the release that carries it.

- complete: the clamp holds three lines and the checks no longer encode the machine's fonts.
