# 20260929-0725-uniform-diagram-titles Give every diagram title one larger size

- **status**: completed
- **priority**: P3
- **owner**: frontend-maintainer-0929
- **createdAt**: 2026-09-29 07:25

## Description

A sequence diagram title renders at the 14 px body size and is no more prominent than message text. The project owner asked for titles to be enlarged uniformly across diagram types rather than for sequence diagrams alone. Acceptance: every diagram family that draws a title shows it at one shared size larger than the body text, and diagrams without a title render as before.

## ActiveForm

Enlarging diagram titles.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Tracked earlier as tk merdeck #48.
- Investigation (built service over `tmp/tk48/root`, Chromium): titles rendered at 14 px (sequence, class, entity relationship, requirement), 18 px (flowchart, state, Gantt, git), 20 px (quadrant, XY), 25 px (pie) and 28.4 px, i.e. 4ex (journey, timeline); block diagrams draw no title. Mermaid 11.17.2 sizes them through per-family CSS classes, configuration (`quadrantChart`/`xyChart.titleFontSize`, `pieTitleTextSize`), a hard-coded `4ex` attribute (timeline) or not at all (sequence). Every title that is not configured is a direct child of the diagram, unclassed or with a `titleText`/`*TitleText` class, while every other direct text there (sequence messages and numbers, journey legends) is classed. `themeCSS` cannot target it: Mermaid escapes the child combinator and prefixes the selector again.
- Decision: the owner chose one size for every family on 2026-09-29 and approved implementation. The size is 18 px, Mermaid's own title size for flowchart, state, Gantt and git; the 14 px titles grow and the pie, quadrant, XY, journey and timeline titles shrink to it.
- Implementation (`web/src/features/preview/renderer.ts`): a `titleSize` of 18; `quadrantChart` and `xyChart` `titleFontSize` and the `pieTitleTextSize` theme variable, since those families lay out around the title; and `sizeTitles()`, which sets the size on direct-child titles in the measurement host before computed styles are copied. New `web/src/test/e2e/renderer-titles.spec.ts` renders thirteen titled families and requires 18 px for each, and checks that untitled sequence and journey diagrams keep their direct text sizes; it failed first (14, 20, 25 and 28.4 px) and passes after the change.
- Verification (2026-09-29): web `lint` has no errors (the existing `agent-chat.tsx` warning only), `typecheck` clean, `test:coverage` 34 files and 587 tests passed. Screenshots before and after for every family are in ignored `tmp/tk48/before` and `tmp/tk48/after`; titles are not clipped and the fitted frames include them.
- Gate (2026-09-29, this container, local ext4 fixture parent and `/dev/shm` refusal parent): frozen installs and `lint:workflows` passed; `check:ci` stops at `check:files` on the five pre-existing churn-test failures that also occur at HEAD and with an overlayfs fixture here (tk merdeck #61), so the aggregate gate is not green locally and hosted Linux x64/ext4 CI remains the authority. The full browser acceptance run (`bun run test:e2e`, built source service) passed 109 cases with 7 configured skips and no failure. `git diff --check` passed. Nothing was committed.

- complete: Titles of every family render at 18 px; browser spec passes; see Notes for gate status.
