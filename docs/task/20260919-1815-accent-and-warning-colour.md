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

### Review addendum: the light-scheme shortfall is ruled, one token moves (2026-09-19)

The tier above this task ruled on the confirmed 4.4286:1 shortfall: `--primary-foreground` in the light scheme
only may move toward pure white to satisfy the fixed `--primary` value, since the proposal fixes the two accent
values but never gives the foreground one — moving the free token to satisfy the fixed requirement enforces the
proposal rather than amending it. `--primary` (both schemes), `--warning` (both schemes, already passing as
specified) and the dark scheme's `--primary-foreground` are explicitly out of this ruling and are unchanged.

- Changed `web/src/index.css` `:root`'s `--primary-foreground` from `oklch(0.985 0 0)` to `oklch(1 0 0)` (pure
  white, zero chroma, satisfying the zero-chroma rule as instructed). The `.dark` value
  (`oklch(0.205 0 0)`) is untouched. No other token, and no other file, changed for this ruling.
- Analytically recomputed (same OKLCH → linear-sRGB → WCAG maths as before, not yet a live measurement — this
  worktree still has no dev server/browser, per the unchanged limitation noted above): pure white on
  `--primary` (light) now measures **4.6445:1**, clearing 4.5:1. The dark-scheme pairing
  (`--primary-foreground` unchanged) remains **7.5361:1**, also unchanged. Per instruction, the assertions in
  `accent-contrast.spec.ts` are unweakened and still assert the full `>= 4.5` requirement; if the real,
  browser-measured number lands under 4.5:1 despite this analysis, no further token is to move and the
  measured number is reported and left to the tier above, per the same ruling as before.
- Added a `reportRatio` helper to `accent-contrast.spec.ts` that logs the measured ratio for each of the five
  required pairs sharing this token (primary button label, selected row text, selected row icon, selected row
  unsaved marker, chat bubble text) under a distinct, greppable label per colour scheme, regardless of whether
  the assertion passes — so each is confirmed by its own case in the run's log rather than inferred from one
  case (the button) standing in for the rest, and so a look at the log states the actual number even when the
  assertion is green.

### Review correction 3: the directory de-collision was wrong; two more fixes (2026-09-19)

Investigating "item 7" (whether the fake-provider timeout on `type-scale.spec.ts`'s case was this task's
doing or a flake) required reading the fake-provider mechanism itself, which surfaced that review correction
1's directory-based de-collision (round 3) was built on a wrong assumption and needed reverting.

- **The fake provider's write path does not follow the open file.** Read `src/modules/agents/process.ts`
  (`spawnProvider`, `cwd: projectRoot`) and `scripts/test-e2e.ts`'s embedded fake-provider script (both
  read-only; neither edited) and confirmed: the provider process is spawned once per conversation with the
  open-access service's fixed root as its `cwd`, and on an accepted file-change approval it always runs
  `Bun.write('agent-live.mmd', ...)` — a literal, hard-coded, context-independent relative path. It never
  reads the turn's `context.path` to decide where to write. Placing the browser's open file in a per-spec
  subdirectory (`<uuid>/agent-live.mmd`, review correction 1's fix) therefore never touched the file the
  provider actually wrote — a **deterministic** mismatch, not a timing-dependent one, which is why it broke
  both previously-passing cases outright rather than flaking. Established without a live re-run (this sandbox
  still cannot execute Playwright) from the mechanism itself: the write target is fixed regardless of
  scheduling, so this failure mode reproduces on every run, not intermittently, once the fixture is off that
  literal root-level path.
- **Corrected de-collision: a lock file, not a renamed path.** Since the exact literal path
  `<openRoot>/agent-live.mmd` is not negotiable, `agent-editing.spec.ts`'s open-access case and
  `type-scale.spec.ts`'s case now both call a small `withAgentLiveLock` helper (duplicated in each file, since
  `support.ts` is outside this task's file scope) that exclusive-creates a `.agent-live.lock` file under the
  open-access root, retrying every 200ms for up to 60s, before writing the real fixture at the literal path;
  the lock is removed once the wrapped action settles. Both specs are back to the exact original literal path
  and filename; the exclusive-create flag and each test's own cleanup are unchanged; the suite itself is not
  serialised, only these specific cases' shared external side effect.
- **A third, previously unflagged instance of the same hazard.** Re-reading the fake-provider script while
  investigating this showed it always performs this literal-path write on *any* accepted file-change approval,
  regardless of which file is actually open — meaning `accent-contrast.spec.ts`'s own chat-bubble case (which
  opens its own uniquely-named fixture and sends one turn) triggers the same background write to
  `<openRoot>/agent-live.mmd`, and could silently corrupt `agent-editing.spec.ts`'s or `type-scale.spec.ts`'s
  fixture if either is running at the same time. Wrapped that case's provider interaction in the same lock
  (duplicated a third time) as a precaution, even though it was not named in the failing cases.
- Reran the exact prescribed check after all three fixes:
  `bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run lint && bun run
  typecheck && bun run --cwd web test` — exit 0, 33 files / 568 tests passed, coverage unchanged
  (93.08/88.95/92.69/93.29). `git diff --check`: clean.
- **On whether the type-scale.spec.ts timeout was this task's doing or a flake** (item 7): established by
  code-level analysis rather than a live isolated re-run, which this sandbox cannot perform. Two distinct
  failures, two distinct answers: the *original* round-1 collision was contingent on scheduling (this task's
  own doing in the sense the reviewer already established — adding a third spec file changed worker
  distribution enough to let two pre-existing, previously-never-concurrent cases collide — not a pre-existing
  flake independent of this branch, and not inherent to either test in isolation). The *subsequent* round-2/3
  failures were this task's doing outright and deterministically (the renamed/relocated fixture guaranteed a
  path mismatch against the provider's fixed write target on every run, not intermittently). Neither is a
  flake unrelated to this branch. The corrected lock-based fix addresses the root cause of both: it keeps the
  literal path the provider requires and only serialises the specific cases that must share it.

### Review correction 4: a real diagnosis supersedes both prior guesses (2026-09-19)

An independent diagnosis found the actual mechanism behind the fixture failure, which was neither the
scheduling theory (correction 1) nor the write-path theory (correction 3): the browser suite runs with a
single Playwright worker (`web/src/test/e2e/playwright.config.ts:9`), so nothing in it is ever concurrent, and
the deterministic provider fixture always writes the literal relative path `agent-live.mmd` in its working
directory (`scripts/test-e2e.ts:84`, cwd = the service's project root per `src/modules/agents/codex.ts:48`) on
every *auto-accepted* file-change approval (`src/modules/agents/codex.ts:270`). `accent-contrast.spec.ts`'s
chat-bubble cases send a real turn but only ever owned their own uuid-named fixture, so each left
`<openRoot>/agent-live.mmd` behind afterwards; the next case that exclusive-creates that exact path then fails
immediately (~30ms), not from any race.

- **Applied the diagnosed fix exactly as directed.** Synced with `feat/ui-refresh` (already current) and
  `git cherry-pick d6230b2` (clean, no conflicts) — the fix commit, touching only
  `web/src/test/e2e/accent-contrast.spec.ts`. Did **not** cherry-pick its parent `34008e2` (the repro), which
  lives partly under `src/modules/agents/` and asserts a property of the out-of-scope fixture; confirmed its
  changes to `agent-editing.spec.ts`/`type-scale.spec.ts` are byte-identical to the untouched
  `feat/ui-refresh` versions of those files, so restoring those two files to that pristine state (`git checkout
  8a2b529 -- ...`, committed separately) reaches the same "integration-branch shape" without importing the
  out-of-scope commit.
- **Confirmed the resulting shape matches what was asked:** `accent-contrast.spec.ts`'s chat-bubble case now
  holds both paths (its own uuid fixture and the root-level `agent-live.mmd` the provider always produces),
  waits for the reported file-change target in the conversation log before leaving the case (the provider
  writes before it reports, so this puts clean-up after the write rather than in a race with it), and removes
  both in its `finally`. The `withAgentLiveLock` helper is gone from all three spec files.
  `agent-editing.spec.ts` and `type-scale.spec.ts` are back to the literal path and plain exclusive-create,
  unchanged from `feat/ui-refresh`, so a future leftover fails loudly again instead of being masked by a lock.
- **Item 7 (flake vs. regression), asked again with corrected framing:** with the real mechanism now known,
  both of this task's own prior attempts (the worker-distribution theory and the write-path theory) were
  wrong guesses, not confirmed causes — this is recorded plainly rather than restated as settled.
- Reran the exact prescribed check: `bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile
  && bun run lint && bun run typecheck && bun run --cwd web test` — exit 0, 33 files / 568 tests passed,
  coverage unchanged (93.08/88.95/92.69/93.29). `git diff --check`: clean.

**Item 3 investigation (the open-but-unselected marker, `accent-contrast.spec.ts:199`).** Instructed to
establish, before changing anything, whether `fillContrast(page, openMarker, openRow)` measuring 1.0726:1
(light) / 1.2467:1 (dark) is a locator reaching into the selected row, or a genuine `web/src/index.css` defect
where the accent-foreground override applies to a row without `aria-current="true"`. No source file was
changed for this item pending that determination.

- Read `web/src/index.css:214-218` (the two `.dirty-dot` rules) and the `.tree-row[aria-current="true"]`
  selector's specificity against the plain `.dirty-dot { background: var(--warning); }` rule: both are
  unlayered (outside the file's one `@layer base {}` block, verified by counting braces), so ordinary
  specificity applies — `(0,4,0)` for the attribute-scoped rule beats `(0,1,0)` for the plain one only when
  both could match, and the attribute selector `[aria-current="true"]` cannot match an element whose
  `aria-current` value is the literal string `"false"`. No `!important`, no duplicate `.dirty-dot` or
  `--warning`/`--sidebar` definition, no cascade-layer mismatch found anywhere in the file (grepped and
  read the relevant regions directly rather than assuming).
  - Confirmed the risk this reasoning depends on — that React might omit rather than stringify
    `aria-current={false}` — is not real: `renderToStaticMarkup` on a plain `<button aria-current={false}>`
    element (using the project's own React) prints `aria-current="false"` (verified by running it, not
    assumed).
  - Rendered the real `FileTree` component (not a rewritten stand-in) with the project's own Vitest/RTL
    harness twice — once with `path='welcome.mmd'` (selected) and once with `path='sequence.mermaid'`
    (welcome.mmd open-but-unselected), both with an identical dirty draft for `welcome.mmd` — and diffed the
    two renders' `welcome.mmd` row `outerHTML` byte-for-byte. The two are **identical except for the
    `aria-current` attribute value** (`"true"` vs `"false"`); same classes, same single `.dirty-dot` child, no
    stray element, no different marker.
- This evidence does not support "the locator is reaching a marker inside the selected row": the row and its
  marker are the correct, uniquely-identified element for the unselected state, structurally indistinguishable
  from the selected case except for the one attribute the CSS selector keys on. It also does not, by itself,
  reveal a mechanism for "the override genuinely applies to rows without aria-current" — the selector text is
  unambiguous and, read literally, cannot match here.
- **Could not reach a certain determination.** Every static and component-level check available in this
  sandbox (no live browser to run the actual Playwright suite, an unchanged limitation throughout this task)
  shows the source, as written, should not produce this pairing. Rather than guess a defensive CSS change
  against an unconfirmed mechanism — which the instruction for this item explicitly rules out — this is left
  unfixed, reported honestly as inconclusive from available tools, pending either a live run's DevTools
  "computed style" inspection of the actual marker (which would show which rule wins and settle this
  directly) or further direction.

### Review correction 5: the marker investigation was right, the measurement was not (2026-09-19)

An independent diagnosis confirmed correction 4's investigation on every point — no CSS rule applies the
accent to an unselected row — and found what it could not: the accent there was never from a rule. Selecting
another file starts a 150ms fade of the previously-selected row out of `var(--primary)` (the shared button
primitive carries `transition-all`, unedited, `web/src/shared/components/ui/button.tsx:7`), and the
measurement route took a handle immediately after the click, mid-fade, then discarded the fill's alpha when
reading it back — painting one translucent layer alone on an empty canvas and reading the colour channels
keeps the fade's hue and loses its transparency, so a translucent accent measured as an opaque one. Against
the settled sidebar the same pair measures about 4.75:1 and passes; the colours were always sound.

- Synced with `feat/ui-refresh` (already current) and applied the diagnosed fix in order:
  `git cherry-pick fa95597` (the repro, a new permanent spec) then `git cherry-pick a10bfb2` (the fix, editing
  `accent-contrast.spec.ts` and the new repro spec). Both applied cleanly, no conflicts.
- Confirmed the resulting shape: `requireElementHandle` now waits for the element's own running transitions
  (`getAnimations({ subtree: true })`) to finish in a bounded loop before taking a handle, skipping endless
  animations rather than hanging on them; `paintedBackground` collects every painted layer up to and including
  the first opaque one instead of returning only the topmost; `toSrgbBytes` paints that stack bottom-up so the
  canvas composites the layers the way the browser would rather than just converting one; `textContrast`
  passes the subject's own colour as the top layer of its own background stack, so translucent ink composites
  the same way. `web/src/test/e2e/marker-fill-measurement.spec.ts` keeps the repro as a permanent pair of
  cases (not a scratch file): one asserts no transition is left running on a measurement handle, the other
  asserts the marker's contrast against its own row once settled — both already read as ordinary repository
  text, no task or process vocabulary, nothing further needed there.
- **The guards this also flagged.** `accent-contrast.spec.ts`'s two "this row isn't accent-filled" guards
  compared `getComputedStyle(...).backgroundColor` strings directly (`.not.toBe(...)`). A translucent,
  mid-fade fill serialises as `oklab(...)` while the settled `--primary` token serialises as `oklch(...)`, so
  the string comparison always reported them as different regardless of whether the row had actually settled
  away from the accent — a guard that could not fail was not proving anything. Added `colorBytesEqual`
  (mirroring `focusedRingMatchesPrimary`'s existing canvas-byte-comparison pattern) and used it for both the
  open-row and the hovered-row checks, so they compare what the two colours actually paint rather than their
  declaration text.
- Changed no colour token: `--primary` (both schemes), `--primary-foreground` (pure white light, unchanged
  dark) and `--warning` (both schemes) are exactly as the last accepted state left them
  (`git diff 9c838df -- web/src/index.css` is empty).
- Reran the exact prescribed check: `bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile
  && bun run lint && bun run typecheck && bun run --cwd web test` — exit 0, 33 files / 568 tests passed,
  coverage unchanged (93.08/88.95/92.69/93.29). `git diff --check`: clean.

### Review correction 6: the two guards this fixed still bypassed the settle wait (2026-09-19)

The compose check ran the merge onto the integration head: 89 passed, 1 failed, 2 skipped. Everything
correction 5 addressed was fixed, including both marker cases and the measurement-route pair; the one
failure was the open-row guard correction 5 had just fixed, failing for the reason that fix was worth making.

- `accent-contrast.spec.ts`'s open-row and hovered-row guards read `getComputedStyle(...).backgroundColor`
  through a bare `openRow.evaluate(...)`, immediately after `choose(page, 'sequence.mermaid')` and after
  `openRow.hover()` respectively — neither goes through `requireElementHandle`, so neither waited for the
  150ms fade to settle before reading. A read landing inside that fade sees the accent at partial alpha,
  whose colour channels equal `--primary`'s, which is exactly what `colorBytesEqual` (added last round) then
  correctly reported as equal — the byte comparison was right; the read feeding it was not settled. Confirmed
  this is a race rather than a scheme difference: the dark scheme happened to pass in the failing run, which
  is what an unwaited read does, not evidence the schemes differ.
- Extracted the wait already inside `requireElementHandle` (the bounded loop over
  `getAnimations({ subtree: true })`, skipping endless animations, already used by every measuring helper)
  into its own `settleTransitions` function, called from `requireElementHandle` and, newly, from both guard
  sites before each reads `backgroundColor` — one place waits, every site that reads a painted colour calls
  it, no second copy of the loop. Did not compare alpha, did not widen either guard to "different or
  translucent", did not drop either guard: both still assert that an unselected and a hovered row are not
  accent-filled once settled.
- Changed no colour token (`git diff bd28935 -- web/src/index.css` is empty). Left the marker cases, the chat
  bubble, the document link, the warning pairs, the focus ring and both fake-provider cases untouched, all
  already confirmed passing in the failing run.
- Reran the exact prescribed check: `bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile
  && bun run lint && bun run typecheck && bun run --cwd web test` — exit 0, 33 files / 568 tests passed,
  coverage unchanged (93.08/88.95/92.69/93.29). `git diff --check`: clean.
