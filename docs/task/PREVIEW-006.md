# PREVIEW-006 Fit a Gantt chart to its bars, not to its today marker

- **status**: completed
- **priority**: P3
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-12

## Description

The project owner asked whether Gantt charts are supported. They are: the preview policy accepts the family and Mermaid renders it with its bars, sections, milestones and date axis. A chart whose tasks sit away from the current date is unreadable, though, because Mermaid marks today even when no task is near it, and the fitted size is computed from the whole drawing, so the marker's distance decides the zoom. Acceptance: a chart whose tasks are far from today fits at a readable zoom; the today marker stays part of the diagram; charts that do include today are unchanged; and other diagram families keep their fitted size.

## ActiveForm

Fitting a Gantt chart to its bars.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-12): the preview replaces the rendered `viewBox` with the SVG's measured bounding box, which includes Mermaid's `today` marker. Measured against the real renderer with a chart whose tasks ran from 2026-03-02: the bounding box came out 31,433 units wide and the fitted zoom landed at 2 percent, and the single element beyond 3,000 units was the `today` line at 18,438. The same chart with `todayMarker off`, and an otherwise identical chart whose tasks include today, both measured 1,594 units and fitted at 38 percent. The policy was never involved: the source is accepted as it stands.
- Implementation (2026-09-12): the measurement step hides any `today` marker while it reads the bounding box and restores it immediately afterwards, so the marker stays in the diagram and only stops deciding the fitted size. Nothing else changed in the renderer or the policy.
- Verification (2026-09-12, main checkout, pinned Bun 1.4.2, inside the project tmux session): against the real renderer on a local build, the owner-shaped chart with tasks in March 2026 now measures 1,594 units and fits at 38 percent, where it measured 31,433 units and 2 percent before; a chart that includes today is unchanged at 1,594 and 38 percent; and the rendered chart shows its title, three sections, six bars, a critical task, a milestone and the date axis. A new browser case writes a chart whose tasks sit years from today, then requires three task rectangles, the marker still present, the expected labels, a fitted width under 4,000 units and a fitted zoom of at least 20 percent. `bun run check` passed with 203 backend tests across 9 files and 207 frontend tests across 18 files, and the complete browser suite passed 43 of 43 in 2.0 minutes.

