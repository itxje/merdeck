# 20260919-2015-design-record-density-figures Design record density figures

- **status**: completed
- **priority**: P3
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-19 20:15

## Description

Correct the two density figures in `docs/plan/20260919-1736-ui-refresh-plan.md` (Track 3's context paragraph
and its result line) from the plan's original estimate to the figures `20260919-1930-explorer-density.md`
measured when it implemented the change, so the plan and the completed task record do not carry two different
baselines for the same layout.

## Dependencies

- relates to: 20260919-1736-ui-refresh-plan (Track 3: Explorer density), 20260919-1930-explorer-density

## Notes

### Investigation (2026-09-19)

- Read the plan's Density paragraph, its Track 3 "Result" line, and `20260919-1930-explorer-density.md`'s own
  density-measurement notes and completion evidence.
- The plan's context paragraph stated an estimated 346px of chrome above the first file row (38% of a 900px
  viewport). Track 3's proposal stated a target result of about 150px of chrome instead of 346px, roughly nine
  more visible rows.
- `20260919-1930-explorer-density.md` measured the same layout directly, before and after its change, at the
  same 1440x900 viewport and default 232px explorer width, against a folder holding 60 files: 249px of chrome
  and 12 of 60 rows visible before, 92px of chrome and 18 of 60 rows visible after (a 157px reduction, six more
  rows), and pinned both readings in `web/src/test/e2e/explorer-density.spec.ts` (an 80-105px tolerance band
  around the 92px reading, and a minimum of 18 visible rows).
- The plan document still carried its original estimate in both places, so the two documents disagreed about
  the previous layout's own chrome (346px vs. 249px) and about the delivered result (150px/nine rows vs.
  92px/six rows) for the same layout.

### Correction (2026-09-19)

- Replaced "346px above the first file row (38% of a 900px viewport)" with "249px above the first file row (28%
  of a 900px viewport, measured by `web/src/test/e2e/explorer-density.spec.ts` rather than estimated)" — the
  proportion recomputed from 249/900, not left at the old 38%.
- Replaced "about 150px of chrome above the first row instead of 346px, roughly nine more visible rows" with
  "between 80px and 105px of chrome above the first row (measured at 92px, as delivered) against the previous
  layout's 249px, and six more rows of a sixty-file folder visible at a 900px viewport height, per
  `web/src/test/e2e/explorer-density.spec.ts`".
- No other line of the plan changed: the rest of the Context section, the Type/Colour/File names/Phone
  proposals, the Risks, Scope, Alternatives and Annotations sections, and the plan's own status line, are
  untouched.
- No source file changed; this is a documentation-only correction.

### Other figures checked (2026-09-19)

- Scanned the rest of the plan for figures outside this task's two lines, to report rather than adjust or guess
  at any that a reader cannot rerun:
  - Line 13: "`body` computes to 16px, but 95 elements render below 12px and the smallest is 9px" is sourced
    from the plan's own opening audit, which was working material and is not kept in the repository, not from
    a committed, rerunnable expectation. Left unchanged; reported here rather than altered.
  - Line 31: "The AI panel covers 89.6% of the viewport" is sourced from that same audit. Left
    unchanged; reported here rather than altered.
  - Both figures belong to the plan's original Context section rather than Track 3, and are outside the two
    lines this task was asked to correct.

### Completion evidence

- Changed files: `docs/plan/20260919-1736-ui-refresh-plan.md` (the two density figures), this task record.
- No failing-test step: this is a documentation correction with no executable behavior to exercise first.
- Required check, run with the project-local Bun 1.4.2 runtime on PATH: `bun install --frozen-lockfile && bun
  install --cwd web --frozen-lockfile && bun run lint && bun run typecheck && bun run --cwd web test` — exit 0.
- Reported, not corrected: plan lines 13 and 31, both sourced from the gitignored initial audit rather than a
  committed expectation.
