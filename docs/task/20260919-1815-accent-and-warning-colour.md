# 20260919-1815-accent-and-warning-colour Accent and warning colour

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-19 18:15

## Description

Track 2 of the UI refresh proposal in `docs/plan/20260919-1736-ui-refresh-plan.md`: introduce a low-chroma
teal `--primary` and a new `--warning` amber, carried by exactly the surfaces the proposal and its settling
ruling name, and add a browser contrast expectation covering every text/icon/fill pair those two tokens newly
introduce.

## Dependencies

- **relates to**: 20260919-1736-ui-refresh-plan (Track 2: Colour)

## Notes

### Investigation and proposal (2026-09-19)

- This task's authorization is itself the approval for this slice of the draft plan; implementation proceeds
  without a separate sign-off, per the settling ruling attached to this task's instructions.
- Read the current `web/src/index.css`, `file-tree.tsx`, `preview.tsx`, `renderer.ts:110-169`,
  `label-contrast.test.ts`, and `web/src/test/e2e/contrast.spec.ts`. Confirmed the map of existing `--primary`
  consumers (`button.tsx` default/link variants, `.brand-symbol`, `.login-mark`, `.agent-user`,
  `.document-link`) already reference the token by variable, so repointing `--primary`'s two values is
  sufficient for those; no edit to `button.tsx` or the document/agent components was needed or made.
- Two of the four surfaces the ruling requires did not use `--primary` yet: the selected explorer row
  (`.tree-row[aria-current="true"]`, a neutral `color-mix`) and the live-preview indicator (plain `.muted`
  text in `preview.tsx`). The focus ring also did not: `--ring` is its own, separate zero-chroma token, shared
  by several non-focus static borders (`.agent-approval`, `.document-diagram.selected`) that the ruling
  requires to stay neutral.
  - Resolved by adding `:focus-visible { --ring: var(--primary); }` as an unlayered rule. A CSS custom
    property set on the focused element itself overrides the inherited root value only for that element and
    only while it matches `:focus-visible`; every genuine focus-visible ring or outline that already reads
    `var(--ring)` (the button primitive's ring, the source editor's outline, the diagram file-link outline,
    the document-diagram-select outline, the explorer resizer's own focus state) picks up the accent, while
    the static, non-focus consumers of the same token (the approval border, the selected-diagram border) are
    untouched, since they are not themselves `:focus-visible`. This keeps borders at zero chroma outside the
    one authorized surface, as the ruling requires.
- `--warning`/`--warning-foreground` were added as new tokens (plus a `@theme inline` mapping, matching the
  existing pattern for the other semantic colours). The two functional states named by the requirements are
  `.preview-warning` (recoloured from `--destructive` to `--warning`) and the unsaved-changes marker
  (`.dirty-dot`, recoloured from `--foreground` to `--warning` as its new default fill), with a selected-row
  override keeping the marker on the accent foreground when it sits inside the accent-filled row, per "use the
  accent foreground for its text, icon and unsaved marker."
- Computed every required contrast pair analytically first (OKLCH → linear-sRGB → WCAG relative luminance,
  the same formula the diagram label check and the existing `contrast.spec.ts` already use in the browser),
  before writing any CSS, to know in advance which pairs the fixed token values can and cannot satisfy:
  - `--warning` against `--background`/`--sidebar`/`--card` in both schemes: 4.74–10.47:1. Passes everywhere
    measured; no lightness adjustment needed.
  - `--primary` as plain text against `--background`/`--card` in both schemes (the live-preview indicator, an
    inline `--document-link`): 4.65–8.33:1. Passes.
  - `--primary-foreground` **on** `--primary` (the primary button label, the selected row's text/icon/marker,
    the chat bubble text — every place the accent is *filled* rather than used as text colour): 7.54:1 in the
    dark scheme, but **4.43:1 in the light scheme** — under the 4.5:1 requirement.
  - Per the ruling's item 4, this specific shortfall is not corrected here: the two `--primary` values are
    fixed by the proposal and are not reinterpreted, and only `--warning` is authorized to move in lightness
    to reach 4.5:1 — `--primary-foreground` is a separate, existing token, not `--warning`, and the ruling
    names no authority to move it either. Implemented the fixed values as specified, wrote the browser
    expectation to assert the full 4.5:1 requirement on every pair without narrowing it, and record the
    measured shortfall here and in the completion report rather than silently passing it.

### Failing test and implementation (2026-09-19)

- Added `web/src/test/e2e/accent-contrast.spec.ts`, new and separate from `contrast.spec.ts` (which stays
  unmodified, per the acceptance criteria that the diagram label check is unchanged). Reuses `contrast.spec.ts`'s
  inline WCAG-luminance pattern (there is no exported single-pair helper) via two small in-browser helpers,
  `textContrast` (a text/icon colour against the painted background behind a possibly different element,
  walking up `parentElement` past any transparent ancestor) and `fillContrast` (the same walk on both sides,
  for a no-text fill like the unsaved marker). Covers, in both colour schemes:
  - the primary button label (login screen `Connect to project` button) against its own fill;
  - that tabbing to a control repoints `--ring` to `var(--primary)` on the focused element;
  - the selected explorer row's text, icon and unsaved marker against the filled accent, immediately after
    making the open file dirty;
  - the same file's row once another file is selected (open-but-unselected, still dirty): its background no
    longer equals `--primary`, and its marker (now on the default warning fill) still clears 4.5:1 against the
    row's own (sidebar) background;
  - that a hovered, unselected row's background differs from the selected row's fill, so the three states
    (selected / open / hovered) stay visually distinct;
  - the live-preview indicator's colour equals `--primary` and clears 4.5:1, then, after an invalid edit,
    that both the indicator ("Last valid preview") and the `.preview-warning` banner equal `--warning`, differ
    from `--destructive`, and clear 4.5:1;
  - an inline `.document-link` (a same-document heading link, written into a disposable Markdown fixture)
    against the surface behind it;
  - the person's chat bubble text against its filled accent background, gated behind
    `MERDECK_TEST_AGENTS`/`MERDECK_OPEN_URL`/`MERDECK_OPEN_ROOT` like the existing fake-provider specs, since
    populating a real `.agent-user` bubble requires the scripted fake provider turn round-trip.
  - Every assertion asserts the full `>= 4.5` requirement; none is narrowed or weakened, per the ruling.
- Implemented `web/src/index.css` (`--primary`, `--warning`, `--warning-foreground` in both schemes, the
  `@theme inline` mapping, the `:focus-visible` ring repoint, the selected-row fill/foreground/marker rules,
  the `.dirty-dot` default fill, `.preview-warning`'s colour, and two small status classes `.preview-live` /
  `.preview-stale`) and `web/src/features/preview/preview.tsx` (the pane-heading status span now picks
  `.preview-live`, `.preview-stale` or `.muted` based on which of the four status strings is showing, instead
  of always `.muted`). No change was needed in `file-tree.tsx` or `workspace.tsx`: every row and marker
  already keys off the same `aria-current`/`.dirty-dot` CSS selectors the new rules target, and the button,
  brand mark, sign-in mark, chat bubble and document-link already read `var(--primary)`/`var(--primary-
  foreground)` before this task, so the token-value change alone carries them, per the ruling's "nothing else
  binds what you may newly accent, not what already carries the token."
- Could not execute `accent-contrast.spec.ts` (or any Playwright spec) in this worktree: no
  `MERDECK_TEST_URL`/`MERDECK_SMOKE_TOKEN_FILE`/dev server is configured in this sandbox, and standing one up
  (build, seed disposable fixtures, install browsers, route through nsl) is outside this task's prescribed
  check, which names only lint/typecheck/the Vitest suite. The new spec type-checks and lints cleanly
  alongside the rest of the suite (see below); its correctness against a live build is unverified here and is
  flagged in the completion report rather than claimed.

### Completion evidence

- Changed files: `web/src/index.css`, `web/src/features/preview/preview.tsx`,
  `web/src/test/e2e/accent-contrast.spec.ts` (new), this task record (new).
- Exact prescribed check, executed inside this worktree with the project-local Bun 1.4.2 runtime on PATH:
  `bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run lint && bun run
  typecheck && bun run --cwd web test` — exit 0. Root and web installs reported no lockfile changes. Root and
  web lint clean (one pre-existing, unrelated `react/dom-no-dangerously-set-innerhtml` warning in
  `document-view.tsx`, a file this task does not touch). Web typecheck clean. Web Vitest: 33 files, 568 tests,
  all passed; `preview.test.tsx`'s existing status-text assertions (`getByText('Live preview')`) are
  unaffected by the new class names. `git diff --check`: clean.
- Known, reported (not fixed) shortfall: `--primary-foreground` on `--primary` measures 4.43:1 in the light
  scheme (7.54:1 in dark), under the 4.5:1 requirement, for every surface where the accent is filled rather
  than used as text colour — the primary button label, the selected explorer row's text/icon/marker, and the
  person's chat bubble text, all in the light scheme only. Per the ruling's item 4 this is not corrected by
  moving the accent or its foreground; `accent-contrast.spec.ts`'s light-scheme assertions for these three
  pairs are expected to fail once run against a live build, and are left asserting the full requirement rather
  than narrowed.

### Review correction (2026-09-19)

The campaign's stage-2 browser suite (log `T2-evidence-5e3297b654ad.log`, 76 passed / 10 failed / 2 skipped)
found two defects in this task's own files, both fixed:

1. **The contrast measurement itself was wrong.** `textContrast`/`fillContrast` read
   `getComputedStyle(...).color`/`.backgroundColor` and extracted the first three numbers with
   `color.match(/[\d.]+/g)`, assuming an `rgb()` serialization. Every token here is authored in `oklch`, and
   Chromium serialises the computed value in that same function (e.g. `"oklch(0.55 0.09 195)"`), so the old
   code silently misread the three OKLCH components (L, C, H — 0.55, 0.09, 195) as 0–255 sRGB channels. Every
   pair, regardless of which tokens were actually involved, collapsed to a near-black constant, which is why
   all eight failing cases in the log clustered on two near-identical numbers per scheme (`~1.79`) instead of
   reflecting the actual colours. Fixed by painting the raw computed colour string onto a 1x1 canvas and
   reading the pixel back (`context.fillStyle = color; context.fillRect(...); getImageData(...).data`),
   which asks the browser to do the colour-space conversion for whatever function the value happens to be
   serialised in, rather than hand-parsing it. Added a new first case per scheme, "the contrast measurement
   route is sound," asserting body text on its own background (an independently known, very high ratio,
   ~19.8:1 light / ~19.0:1 dark by the same OKLCH → linear-sRGB → WCAG maths used to derive every other number
   in this record) reads `>= 15`, before any accent-specific pair is trusted.
   - Analytically recomputed (OKLCH → linear-sRGB → WCAG relative luminance) every required pair with this
     corrected route, to state in advance what a live run should now report:
     - Primary button label, selected row text/icon, unsaved marker in a *selected* row, and the chat bubble
       text (all the same `--primary-foreground`-on-`--primary` pairing): **4.430:1 light, 7.536:1 dark.**
     - Unsaved marker in an *open-but-unselected* row (`--warning` on the sidebar background):
       **4.743:1 light, 9.474:1 dark.**
     - Warning text against the surface behind it (`--warning` on `--background`, both the live-preview
       indicator's "Last valid preview" state and the `.preview-warning` banner): **4.952:1 light,
       10.468:1 dark.**
     - Inline document link against the surface behind it (`--primary` as plain text on `--background`):
       **4.645:1 light, 8.327:1 dark.**
   - Per the ruling's item 4, the first group's light-scheme figure (4.430:1) is below 4.5:1 and is not
     corrected by moving `--primary` or `--primary-foreground`; only `--warning` may move, and every pair it
     covers already clears 4.5:1 without adjustment. This is unchanged from the initial submission and is
     reported again here, now with a trustworthy number behind it instead of a parser artefact.
   - These are computed offline; this worktree still has no dev server/browser to run Playwright against
     (see the unchanged limitation noted in "Failing test and implementation" above), so they are the expected
     values a corrected live run should produce, not a live measurement.
2. **Two disposable-fixture collisions.** `agent-editing.spec.ts`'s open-access case and
   `type-scale.spec.ts`'s fake-provider case both wrote an exclusive-create (`{ flag: 'wx' }`) fixture named
   `agent-live.mmd` into the same shared `MERDECK_OPEN_ROOT`; adding a third spec file to the suite changed the
   worker distribution enough that the two began running concurrently and colliding
   (`EEXIST: file already exists`). Gave each its own `agent-live-${randomUUID()}.mmd` name, updating every
   reference to the literal filename in each test (the `choose()` call, and, in `type-scale.spec.ts`, the
   `hasText` match on the rendered tool target) so each stays internally consistent; left the exclusive-create
   flag and each test's own cleanup unchanged.
- Reran the exact prescribed check after both corrections:
  `bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run lint && bun run
  typecheck && bun run --cwd web test` — exit 0, 33 files / 568 tests passed, coverage unchanged
  (93.08/88.95/92.69/93.29). `git diff --check`: clean.

### Review correction 2 (2026-09-19)

Stage-2 log `T2-evidence2-fc0cae60e68d.log` (83 passed, 5 failed, 2 skipped) confirmed the corrected
measurement route and found two further defects, both in this task's own files, both fixed. The accent
itself (`--primary`, `--primary-foreground`, `--warning`) is untouched, per instruction: the confirmed
4.4286:1 light-scheme shortfall on `--primary-foreground` against `--primary` stands and is with the tier
above this task.

1. **The focus-ring assertion compared declaration text instead of colour.** `expect(focusRing).toBe('var(--primary)')`
   asserted the literal string `--ring` was declared with, but `getComputedStyle(...).getPropertyValue('--ring')`
   resolves the `var(--primary)` reference to a concrete colour function at read time (e.g. `"oklch(72% .1 195)"`
   in the dark scheme, the accent already correctly applied) — so the assertion failed on the very behaviour it
   was meant to confirm, in both schemes, before either scheme's later accent-row assertions ever ran. Replaced
   with `focusedRingMatchesPrimary`, which reads both `--ring` on the focused element and `--primary` on the
   root, converts each through the same canvas-based sRGB route the other checks use, and compares the
   resulting bytes — colour equality, not text equality.
   - With that fixed, the dark-scheme "accent-filled surfaces" case now runs its accent-row assertions for
     the first time and passes them (7.536:1, as recorded above). The light-scheme case now also reaches
     those assertions and fails there — correctly, on the confirmed 4.4286:1 shortfall, not on the earlier
     unrelated bug.
2. **The de-collision fix from review correction 1 broke the two cases it was meant to protect.**
   `agent-editing.spec.ts`'s open-access case and `type-scale.spec.ts`'s fake-provider case both time out
   waiting for the scripted edit, because `scripts/test-e2e.ts` (outside this task's scope, not edited) scripts
   its fake-provider edit against the literal file name `agent-live.mmd`; renaming the file to
   `agent-live-<uuid>.mmd` left the provider with nothing matching to act on. Reverted the file name to the
   literal `agent-live.mmd` in both specs and de-collided by giving each its own fresh, uniquely-named
   directory under the open-access root instead (`agent-editing-<uuid>/agent-live.mmd` and
   `type-scale-<uuid>/agent-live.mmd`), `mkdir`ed before the exclusive-create `writeFile`. `choose()` already
   browses into a directory component before selecting the file, so no support-file change was needed. Cleanup
   now removes each test's own directory recursively; the exclusive-create flag is unchanged; the suite is not
   serialised.
- Reran the exact prescribed check after both corrections:
  `bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run lint && bun run
  typecheck && bun run --cwd web test` — exit 0, 33 files / 568 tests passed, coverage unchanged
  (93.08/88.95/92.69/93.29). `git diff --check`: clean.
- Expected next stage-2 result, reasoned from the two fixes above plus the confirmed-and-untouched shortfall:
  only two failures remain, both attributable to the same confirmed 4.4286:1 light-scheme shortfall and
  neither a new defect — `accent-contrast.spec.ts`'s light-scheme "the accent-filled surfaces meet 4.5:1
  contrast" case (fails at the selected row's text/icon/marker assertions) and, if the environment runs it
  (`MERDECK_TEST_AGENTS`/`MERDECK_OPEN_URL`/`MERDECK_OPEN_ROOT` set), its light-scheme chat-bubble case. Every
  other case, including both previously-masked dark-scheme accent assertions and both de-collided fake-provider
  cases, is expected to pass.
