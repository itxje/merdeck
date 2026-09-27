# 20260920-0014-explorer-name-wrapping Wrap explorer row names instead of truncating them

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-20 00:14

## Description

Track 4 of the UI refresh plan in `docs/plan/20260919-1736-ui-refresh-plan.md`: replace the middle-of-row
ellipsis truncation on explorer rows (the folder listing and the search results) with wrapping. A row's name
splits into a stem, which may break anywhere and wraps to at most two lines, and an extension, held on the
row's first line and never split. A name too long for two lines clamps at two lines, with the full path kept
in the row's title. A row whose name fits keeps its former 34px height; a wrapped row grows to 48px.

## Dependencies

- **relates to**: 20260919-1736-ui-refresh-plan (Track 4: Explorer name wrapping)
- **relates to**: 20260919-1930-explorer-density (the row height and chrome figures this task's height change touches)

## Notes

### Investigation and proposal (2026-09-20)

- This task's authorization is itself the approval for this slice of the draft plan; implementation proceeds
  without a separate sign-off.
- Read the current `file-tree.tsx`, `index.css`'s explorer row rules, `entries.ts`, and the browser specs that
  exercise row geometry, paging and the mobile sheet's focus handling (`explorer.spec.ts`,
  `explorer-search.spec.ts`, `explorer-density.spec.ts`, `drawer.spec.ts`, `files.spec.ts`), plus the two
  prior UI refresh task records for the type ramp and the explorer density reduction, whose row-height and
  chrome figures this task's height change could move.
- Every row name (the folder listing, the search results, and the retained-drafts list shown under both)
  rendered as one `<span className="truncate">`, a Tailwind utility that end-truncates with an ellipsis once
  the text overflows its box. Replaced it with a small `RowName` component: `splitName` takes the extension
  from the last path segment's final `.` (so a search result's slashes stay part of the wrapping stem, and a
  folder with no dot in its name gets an empty extension), then renders a `.tree-name-stem` span (wraps
  anywhere, clamps at two lines) and a `.tree-name-ext` span (never wraps) side by side. Added a `title`
  attribute carrying the full path to the two rows that lacked one (the folder row and the retained-drafts
  row); the file row and the search-result row already carried it.
- No API, contract, storage, save or preview-semantics change. No `web/src/shared/components/**` file touched.

### Failing test and implementation (2026-09-20)

- Added failing cases to `file-tree.test.tsx` first: one asserting a file row splits into a `.tree-name-stem`
  and a `.tree-name-ext` in that order and carries the full path as its `title`, one asserting a folder row
  (no extension) renders no `.tree-name-ext` and still carries its `title`, and updated the existing
  decorative-dot ordering case to look for `.tree-name` instead of the retired `.truncate` class. Ran them
  against the unmodified source: all three failed as expected (no such classes, no `title` attribute).
- Implemented `splitName`/`RowName` in `file-tree.tsx` and used it at all four name sites (folder row, file
  row, search-result row, retained-drafts row); reran the unit cases: all passed.
- The stem and extension needed to be two elements to let the extension resist wrapping independently of the
  stem's clamp, but two adjacent flex-item spans changed the button's browser-computed accessible name: a
  live check found `welcome.mmd` becoming `welcome .mmd`, an inserted space every existing exact-name browser
  expectation across the suite would fail against. Fixed by marking both inner spans `aria-hidden` and putting
  the exact original string on the wrapper's own `aria-label`, so the row's accessible name stays exactly the
  file name (plus the pre-existing " Unsaved changes" suffix contributed by the sibling dirty-dot's own
  `aria-label`, unaffected).
- CSS: the row's total height comes from its own 1px top-and-bottom border (from the shared Button primitive),
  this rule's padding, and its tallest child. The primitive's own size class fixes a `height`, which blocks
  auto-sizing entirely regardless of a competing `min-height`, so `height: auto` had to be set explicitly (not
  only `min-height`) before the row could grow past one line. Working through the actual (not assumed) 16px
  rendered icon height, measured live rather than assumed square from its 14px CSS width, gave `padding: 8px
  9px` and `line-height: 15px`: one line is `2 (border) + 16 (padding) + 16 (icon, the tallest single-line
  child) = 34px`, unchanged from the prior fixed height; two clamped lines are `2 + 16 + 30 (two 15px lines,
  now the tallest child) = 48px`. Verified both figures directly in a browser rather than trusting the
  arithmetic on its own, since an earlier pass with unmeasured assumptions (14px line-height, no explicit
  `height: auto`) produced 38px and 50px instead.
- `.tree-name-stem` clamps with `display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; text-overflow: ellipsis; overflow-wrap: anywhere;` and needed an explicit `white-space:
  normal`, because the shared Button primitive's own base class sets `white-space: nowrap` and that value is
  inherited into any descendant that doesn't set its own — without the override, the clamp rule was present in
  the stylesheet but never took effect, and every name still rendered on one line with letters cut off, not
  wrapped.

### Completion evidence

- Changed files: `web/src/features/workspace/file-tree.tsx`, `web/src/index.css`,
  `web/src/features/workspace/file-tree.test.tsx`, `web/src/test/e2e/accent-contrast.spec.ts`,
  `web/src/test/e2e/drawer.spec.ts`, `web/src/test/e2e/explorer-hierarchy.spec.ts`, this task record.
- Required check, executed with the project-local Bun 1.4.2 runtime on PATH: `bun install --frozen-lockfile &&
  bun install --cwd web --frozen-lockfile && bun run lint && bun run typecheck && bun run --cwd web test` —
  exit 0. Root and web installs reported no lockfile changes. Root and web lint/typecheck clean. Web Vitest:
  33 files, 572 tests, all passed; coverage 93.08% statements / 88.95% branches / 92.69% functions / 93.29%
  lines, unchanged threshold.
- Browser evidence, gathered the same way as the two prior UI refresh task records (built the project, ran it
  as a disposable, owner-only local service against an ignored `tmp/` fixture root seeded from
  `examples/project` plus a temporary subfolder holding six same-stem names across every supported extension
  and one longer variant, stopped and removed afterward): measured the two row heights directly (34px for a
  fitting name, 48px for a wrapped one, both exact) and confirmed the six same-stem names stayed mutually
  distinguishable, each extension visible on its row's first line, no ellipsis in place of any name.
  `explorer.spec.ts`, `explorer-density.spec.ts`, `drawer.spec.ts`, `explorer-search.spec.ts` and
  `type-scale.spec.ts` together: 11 passed, 1 skipped (the fake-provider chat case, which this task does not
  touch) — one prior failure (`drawer.spec.ts`'s narrow-width sheet-focus case, matching a row by a span with
  the full file name as exact text, which no single span carries once the name has a stem and an extension)
  was fixed by matching the row's accessible name instead, which the aria-label fix above kept exact.
- A wider rerun covering every other spec that does not need a second service or a real overlayfs/ext4 mount
  (`accent-contrast.spec.ts`, `acceptance.spec.ts`, `contrast.spec.ts`, `diagram-links.spec.ts`,
  `directory.spec.ts`, `explorer-hierarchy.spec.ts`, `explorer-resize.spec.ts`, `files.spec.ts`'s management
  case, `header.spec.ts`, `html-document.spec.ts`, `label-editing.spec.ts`, `linked-layout.spec.ts`,
  `markdown-document.spec.ts`, `marker-fill-measurement.spec.ts`, `panes.spec.ts`, the `renderer-*.spec.ts`
  family, `save-race.spec.ts`, `tree.spec.ts`): 74 passed, 4 skipped (fake-provider and chat-bubble-contrast
  cases this task does not touch). Two more pre-existing failures surfaced and were fixed for the same reason
  as the drawer case: `accent-contrast.spec.ts`'s selected-row text-contrast check and
  `explorer-hierarchy.spec.ts`'s icon/name alignment check both located the name element by the retired
  `.truncate` class; repointed both at `.tree-name-stem` and `.tree-name` respectively, the properties each
  one actually measures (painted text colour; left position and font weight) unchanged.
- `workspace.spec.ts` failed its own filesystem-identity gate in this environment (a FUSE-backed mount rather
  than the overlayfs/ext4 the gate requires), the same documented limitation noted in the two prior UI refresh
  task records and not attributable to this change.

### Review correction (2026-09-20)

Independent review found the acceptance geometry itself had no browser assertion: the unit cases pin the
markup (a stem span, an extension span, a title) but would pass unchanged if the stem never actually wrapped,
if the extension fell to a second line, or if a wrapped row clipped at 34px instead of growing. Added
`web/src/test/e2e/explorer-name-wrapping.spec.ts`, a new spec so nothing already passing is disturbed.

- Fixture: the exact six names the UI refresh plan's own audit found indistinguishable once middle-truncated —
  `flow-decisions.mmd`, `flow-decisions_zh.mmd`, `flow-recovery.mmd`, `flow-recovery_zh.mmd`, `flow-task.mmd`,
  `flow-task_zh.mmd` — plus a trivially short `a.mmd` control, in one disposable folder.
- Measured rather than assumed which names actually wrap at the default 232px explorer width and a 1440x900
  viewport: only `flow-decisions_zh.mmd` (stem `flow-decisions_zh`, 17 characters) and `flow-recovery_zh.mmd`
  (stem `flow-recovery_zh`, 16 characters) need the stem's second line and measure 48px; the other five,
  including the shorter `flow-task_zh.mmd` (stem `flow-task_zh`, 12 characters), fit on one line and measure
  34px. The assertion encodes this measured split by name, not a blanket "all six wrap" assumption.
- For every one of the seven rows the spec asserts: the row resolves by its exact accessible name to exactly
  one row (mutually distinguishable — no two of these names collapse onto the same rendered text the way they
  did under middle truncation); the stem's `scrollHeight` equals its `clientHeight` (nothing clipped behind an
  ellipsis, at either height); the extension reads exactly `.mmd`; the extension's top edge sits within 1px of
  the stem's own top (held on the first line, not centred across a two-line stem); and the row's own height is
  the measured 34 or 48.
- Ran the new spec against the pre-change shape first, in a disposable worktree built from the commit
  immediately before this task's first commit: it failed, throwing on the missing `.tree-name-stem`/
  `.tree-name-ext` markup entirely (the old single span has neither). A second probe against that same
  pre-change build, checking `scrollWidth` against `clientWidth` on the old `.truncate` span, confirmed the
  plan's own claim directly: `flow-decisions_zh.mmd` and `flow-recovery_zh.mmd` overflowed their one-line box
  (an ellipsis was showing) while the other five, `flow-task_zh.mmd` included, did not. Reran against the
  implemented shape: passed.
- Re-checked `explorer-density.spec.ts` in a real browser rather than assuming this task's height change left
  it alone: its 60-file fixture uses short, non-wrapping names, and it still measures exactly 92px of chrome
  and 18 of 60 rows visible, the same figures the explorer density task recorded and the spec already asserts;
  no update needed.
- Reran the required check after adding the new spec: `bun install --frozen-lockfile && bun install --cwd web
  --frozen-lockfile && bun run lint && bun run typecheck && bun run --cwd web test` — exit 0, 33 files / 572
  tests passed (the new spec is a Playwright file, outside this Vitest run), coverage unchanged
  (93.08/88.95/92.69/93.29).
- Changed files (this correction): `web/src/test/e2e/explorer-name-wrapping.spec.ts` (new), this task record.
