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
