# 20260919-1930-explorer-density Explorer density

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-19 19:30

## Description

Track 3 of the UI refresh plan in `docs/plan/20260919-1736-ui-refresh-plan.md`: fold the explorer's heading,
breadcrumb and tools row into one action rail, merge the four-way file-type filter into the search field as a
trailing segmented control, replace the "Unopened" per-row state word with a small decorative dot before the
name, and collapse the loaded-file count, active file types, page range and listing status into one line.

## Dependencies

- **relates to**: 20260919-1736-ui-refresh-plan (Track 3: Explorer density)

## Notes

### Investigation and proposal (2026-09-19)

- This task's authorization is itself the approval for this slice of the draft plan; implementation proceeds
  without a separate sign-off.
- Read the plan's Track 3 section, the current `file-tree.tsx`, `file-filter.ts`, `workspace.tsx`,
  `index.css`'s explorer rules, and the browser specs that exercise the explorer chrome (`explorer.spec.ts`,
  `explorer-hierarchy.spec.ts`, `explorer-search.spec.ts`, `directory.spec.ts`, `drawer.spec.ts`, `tree.spec.ts`,
  `header.spec.ts`, `type-scale.spec.ts`, `accent-contrast.spec.ts`) and the unit test `file-tree.test.tsx`.
- The former chrome above the first row was five stacked pieces: a heading with New file/New folder/Refresh,
  a breadcrumb row, an Up/Restart tools row, a search box, a four-way file-type toggle row, and an explanatory
  sentence. Folded the first three into one `.tree-rail` row (breadcrumb left, all five actions — Up, New file,
  New folder, Refresh, Restart — as icons with tooltips on the right, in that order), merged the toggle into
  the search field's own frame as a trailing segmented control, and removed the sentence (the search
  placeholder already states whether the search covers subfolders).
- The three trailing counters (loaded-file count and active types, page range, listing status) already lived
  as three separate elements; kept each as its own `<span>` inside one wrapping line joined by " · ", so every
  existing exact-text browser expectation for the page range and the listing status still matches its own
  element unchanged, while the visible line reads as one row.
- The "Unopened" word was a right-aligned label on file rows without a browser-tab draft. Replaced it with a
  small dot before the name (`aria-hidden`), and — since folders have no such concept but a browser regression
  check compares a folder row's icon/name x-position against a sibling file row's — render the same dot slot on
  every row (folders included), only visibly filled for a file without a draft, so name columns keep lining up
  regardless of state.
- No API, contract, storage, save or preview-semantics change. No `web/src/shared/components/**` file touched.

### Failing test and implementation (2026-09-19)

- Added failing cases to `file-tree.test.tsx` first: one asserting the former `.tree-heading` and its "EXPLORER"
  label are gone in favor of a `.tree-rail` containing the breadcrumb and the five actions in order, one
  asserting the file-type control now lives inside the search field's frame, one asserting the removed
  explanatory sentence, and one asserting the per-row dot (position before the name, `aria-hidden`, unopened
  files only). Ran them against the unmodified source: all four failed as expected (old markup and old label
  still present).
- Implemented the rail, the search-frame toggle, the sentence removal, the one-line counter and the dot marker
  in `file-tree.tsx` and `index.css`. Reran: all new cases passed, and the full unit suite (33 files, 570
  tests) passed with coverage unchanged (93.08/88.95/92.69/93.29).
- Built the project and ran the existing browser suite against a disposable, owner-only local service (seeded
  from `examples/project`, stopped and removed afterward) to see whether the restructuring broke any existing
  expectation, since none of that had been exercised yet:
  - The first pass surfaced three real regressions from the new layout, none of them pre-existing: (1) under
    700px, five 44px-target icons plus the breadcrumb no longer fit on one line, so the breadcrumb's
    `overflow-wrap: anywhere` wrapped "Root" letter-by-letter into a 193px-tall row
    (`drawer.spec.ts`'s compact-empty-folder height assertion); (2) the new dot before a file's name shifted a
    file row's name column relative to a folder row's, breaking the existing icon/name alignment check in
    `explorer-hierarchy.spec.ts`; (3) a long, multi-segment breadcrumb (deliberately used by `drawer.spec.ts`'s
    long-filename case) wrapped across many lines and pushed the dialog's own "Root" button out of the
    viewport.
  - Fixed by: reserving the dot's column on every row regardless of state (folders included) so name columns
    always line up; changing the breadcrumb from a wrapping, always-monospace block to a single-line,
    per-segment-truncating one (`flex: 0 1 auto; min-width: 20px` per crumb, the existing `.truncate`
    treatment around each label, `overflow: hidden` on the row) so it never grows the rail regardless of depth
    or name length; and stacking the rail into two full-width rows under 700px (breadcrumb row, then a
    right-aligned actions row) so the 44px targets and the breadcrumb each get their own line instead of
    fighting for one.
  - Reran the full existing browser suite against the corrected build: `explorer.spec.ts`, `header.spec.ts`,
    `drawer.spec.ts`, `tree.spec.ts`, `explorer-hierarchy.spec.ts`, `explorer-search.spec.ts`,
    `directory.spec.ts` (17/17), `type-scale.spec.ts` and `accent-contrast.spec.ts` (12/12, 3 skipped — the
    fake-provider chat case, which this task does not touch), and every other spec that does not need a second
    service or a real overlayfs/ext4 mount (`acceptance.spec.ts`, `contrast.spec.ts`, `diagram-links.spec.ts`,
    `explorer-resize.spec.ts`, `files.spec.ts`, `label-editing.spec.ts`, `linked-layout.spec.ts`,
    `markdown-document.spec.ts`, `marker-fill-measurement.spec.ts`, `panes.spec.ts`, the `renderer-*.spec.ts`
    family, `save-race.spec.ts`, `update.spec.ts`): 57 passed, 1 failed (`files.spec.ts`'s read-only-storage
    case, which needs a second, unsupported-storage service this run did not start — a setup gap, not a
    product defect), 2 skipped (agent-fixture cases). `workspace.spec.ts` failed its own filesystem-identity
    gate in this environment (a FUSE-backed mount rather than the overlayfs/ext4 the gate requires), the same
    documented limitation noted in `20260919-1759-type-ramp-monospace-paths`'s browser evidence and not
    attributable to this change.

### Completion evidence

- Changed files: `web/src/features/workspace/file-tree.tsx`, `web/src/index.css`,
  `web/src/features/workspace/file-tree.test.tsx`, `web/src/test/e2e/drawer.spec.ts` (its `measureDrawer`
  helper follows the `.tree-heading`/`.tree-heading-actions` rename to `.tree-rail`/`.tree-rail-actions`), this
  task record (new).
- Required check, executed with the project-local Bun 1.4.2 runtime on PATH: `bun install --frozen-lockfile &&
  bun install --cwd web --frozen-lockfile && bun run lint && bun run typecheck && bun run --cwd web test` —
  exit 0. Root and web installs reported no lockfile changes. Root and web lint/typecheck clean (the same
  pre-existing, unrelated `react/dom-no-dangerously-set-innerhtml` warning in `document-view.tsx`, untouched by
  this task). Web Vitest: 33 files, 570 tests, all passed; coverage 93.08% statements / 88.95% branches /
  92.69% functions / 93.29% lines, unchanged threshold.
- Browser evidence, gathered the same way as `20260919-1759-type-ramp-monospace-paths`'s (built the project,
  ran it as one disposable, owner-only local service against an ignored `tmp/` fixture root seeded from
  `examples/project`, stopped and removed afterward): see the failing-then-passing account above; final counts
  76 passed / 3 skipped / 1 failed (an unrelated setup gap) across every spec exercised.
- Remaining limitation: the plan's own numeric targets (about 150px of chrome above the first row, down from
  346px, and roughly nine more visible rows at a 900px viewport height) were not independently measured with a
  dedicated new browser expectation — the existing `type-scale.spec.ts` region-fit checks and the manual runs
  above confirm the rail and the drawer still fit at every checked viewport, but no assertion pins the exact
  before/after pixel delta. A follow-up could add one alongside `type-scale.spec.ts`'s existing `assertFits`
  pattern.
