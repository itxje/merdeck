# 20260919-1759-type-ramp-monospace-paths Type ramp and monospace paths

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-19 17:59

## Description

Track 1 of the UI refresh proposal in `docs/plan/20260919-1736-ui-refresh-plan.md`: replace the
application shell's ad-hoc 9-19px font sizes with a five-step type ramp (11/12/13/15/17px), keep the
17px document reading surface untouched, and move path-like shell strings (the directory breadcrumb,
the agent's attached-file line, and its tool/file-change targets) onto the project's existing
monospace stack.

## Dependencies

- **relates to**: 20260919-1736-ui-refresh-plan (Track 1: Type scale)

## Notes

### Investigation and proposal (2026-09-19)

- This task's authorization is itself the approval for this slice of the draft plan; implementation
  proceeds without a separate sign-off.
- Read `docs/plan/20260919-1736-ui-refresh-plan.md`, the current `web/src/index.css`,
  `file-tree.tsx`, `agent-chat.tsx`, `workspace.tsx`, and the existing browser specs
  (`contrast.spec.ts`, `header.spec.ts`, `panes.spec.ts`, `acceptance.spec.ts`). Confirmed the plan's
  five-step table: `--text-xs` 11px (counters, footers, secondary metadata), `--text-sm` 12px
  (explorer rows, status bar, transcript meta), `--text-base` 13px (controls, buttons, inputs, agent
  transcript), `--text-lg` 15px (pane titles, header file name), `--text-xl` 17px (document body,
  already in place, unchanged).
- Grepped every `font-size`/`font:` declaration in `index.css` (about 60 rules) and classified each
  against the five-step table, including ones the plan doesn't name explicitly (the login heading,
  the empty-state heading, dialog-adjacent classes, mobile breakpoint overrides). Ambiguous cases
  were resolved by nearest bucket and then verified live in a browser rather than guessed:
  - Shared interface primitives (`Button`, `Input`, `Textarea`, the Select/Tabs/Toggle/DropdownMenu/
    Dialog/Tooltip/Alert families under `web/src/shared/components/ui`) are not edited. They carry
    Tailwind utility font sizes (`text-sm`, `text-[0.8rem]`, etc.) applied through `@layer utilities`.
    One new unlayered rule keyed on their `data-slot` attributes binds them all to the control step
    (`var(--text-base)`); being unlayered, it outranks the layered utility classes regardless of
    selector specificity, and every more specific shell class already in the file (`.tree-row`,
    `.status-bar`, `.pane-heading`, …) still wins its own step through ordinary specificity.
  - `body` itself had no explicit font-size (16px browser default). A handful of anonymous Base UI
    portal wrapper elements with no visible text inherited that 16px directly, invisible to
    class-based overrides. Setting `body { font-size: var(--text-base) }` gives every such element a
    ramp-conformant baseline without needing to name each one.
  - The document/HTML/Markdown reading surfaces (`.document-view`, `.markdown-document-view`,
    `.html-document-view` and their descendants), the in-canvas diagram label editor
    (`.label-editor`), and the rendered diagram SVG (`.diagram-graphic`) are out of scope by the
    plan's own exemption and are excluded from the new browser expectation; their sizes are
    unchanged (the two `font-size: 17px` document-body declarations were switched to
    `var(--text-xl)` for consistency with the token system, same computed value, no behavior change).
  - The login screen, and every `Dialog`-rendered surface (the project-files drawer, the create/
    rename dialog, the logout and review-current-file dialogs) are in scope and now conform, the
    dialogs via the new primitive-binding rule (`[data-slot="dialog-content"]` etc.) reaching their
    otherwise-unstyled descendants, the login screen via its own `.login-card h1` override plus its
    existing inheritance from `.workspace`.
- Monospace: `.directory-crumbs button` and `.agent-attachment code` gained an explicit
  `font-family: var(--font-mono)` (previously the attachment `<code>` only inherited a monospace
  family implicitly from the CSS reset, not from the project's own token). The tool-event span in
  `agent-chat.tsx` was changed to a `<code>` element so it shares the existing
  `.agent-event code { font: var(--text-base) var(--font-mono); }` rule already used for
  file-change targets, rather than adding a second selector.
- No API, contract, storage, save, or preview-semantics change. No shared primitive file, no
  `web/src/shared/components/**` file, was edited.

### Failing test and implementation (2026-09-19)

- Added `web/src/test/e2e/type-scale.spec.ts` first, before any source change, with four cases: (1)
  a full-shell walk (`document.querySelectorAll('body *')`, excluding the document/preview/label-
  editor/diagram-graphic surfaces) asserting every computed `font-size` rounds to one of
  11/12/13/15/17px, plus spot checks pinning the explorer row/status bar/counters/pane-title/header-
  file-name/button steps to their named values, at both 1440x900 and 390x844; (2) the Markdown
  document body stays at exactly 17px; (3) the directory breadcrumb and the agent attached-file line
  compute the project's `--font-mono` family; (4) an agent turn's file-change target (and, sharing
  the same selector, the tool-call target) computes that same family.
- Ran this spec against the unmodified source first over a manually built and started service
  (disposable fixtures under ignored `tmp/`, a token-protected instance and an open-access instance
  with a scripted fake provider mirroring `scripts/test-e2e.ts`'s fixture). All four cases failed as
  expected: the shell walk reported 51 offending elements from 16px down to 9px, and the monospace
  case reported the breadcrumb computing the sans-serif stack. Logged at `tmp/type-scale-red.log`.
- Implemented the token declarations, the primitive-binding rule, the `body` baseline, and every
  per-selector `font-size`/`font` literal-to-`var()` change described above in `web/src/index.css`,
  plus the `agent-chat.tsx` tool-event markup change. Reran the same spec against a rebuild: all four
  cases passed, with the shell-walk offender list empty (`tmp/type-scale-run2.log` after fixing two
  unrelated bugs in the new spec itself, a Markdown-file helper that force-switches to the Diagram
  tab and a `.pane-heading` locator that matched both panes).
- Ran the full existing browser suite (all `*.spec.ts` under `web/src/test/e2e`) against the same
  rebuilt service to check for regressions the new sizes might cause elsewhere; see the completion
  evidence below for the outcome and any follow-up.

### Completion evidence

- Implementation commit: `d256f23b809e30b4cae76454531dc45479c57921`, on top of parent
  `cf638baaa8f018cd648c984564a546c2a4eb21d9`. Changes: `web/src/index.css` (the five tokens, the
  primitive-binding rule, the `body` baseline, every `font-size`/`font` literal-to-`var()` change,
  and the three explicit `font-family: var(--font-mono)` additions), `web/src/features/agents/
  agent-chat.tsx` (tool-event `<span>` to `<code>`), `web/src/test/e2e/type-scale.spec.ts` (new),
  this task record (new). The review correction below adds a second commit on top of this one.
- Exact prescribed check, executed inside this worktree with the project-local Bun 1.4.2 runtime on
  PATH: `bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run lint &&
  bun run typecheck && bun run --cwd web test` — exit 0. Root and web installs reported no lockfile
  changes. Root and web lint/typecheck clean (one pre-existing, unrelated `react/dom-no-dangerously-
  set-innerhtml` warning in `document-view.tsx`, a file this task does not touch). Web Vitest: 33
  files, 568 tests, all passed; coverage 93.07% statements / 88.91% branches / 92.69% functions /
  93.28% lines, unchanged threshold.
- Browser evidence (outside the prescribed command, run manually to see the new Playwright
  expectation fail before it passes, as required for any new test): built the
  project (`bun run build`) and ran it as two disposable, owner-only local services against ignored
  `tmp/` fixture roots seeded from `examples/project` — one token-protected, one open-access with a
  scripted fake provider mirroring `scripts/test-e2e.ts`'s fixture, both stopped and their fixtures
  removed afterward.
  - `type-scale.spec.ts` against the unmodified source: 4 of 4 cases failed as expected (51 shell
    elements below or outside the five steps, from 9px to 16px; the breadcrumb computing the
    sans-serif family). Then against the implemented source: 4 of 4 passed, offender list empty.
  - The complete existing browser suite (`bun run --cwd web test:e2e`, all spec files) against the
    implemented build: 70 passed, 2 skipped (the two Chromium-performance specs, which this
    environment does not run), 4 failed. Three of the four failures are this manual harness's own
    setup gaps, not product defects: the token-protected service wasn't started with a codex
    fixture path (`agent-editing.spec.ts`'s first case expects one), no second "unsupported storage"
    service was started (`files.spec.ts`'s read-only case needs one), and the disposable `tmp/`
    fixture root sits on this sandbox's FUSE-backed mount rather than the overlayfs/ext4 the
    project's storage-identity gate requires (`workspace.spec.ts`'s `beforeAll`) — all three are
    prerequisites this task's own required check does not include. The fourth,
    `diagram-links.spec.ts`'s "without title front matter" case, was investigated rather than
    dismissed: it is a pre-existing race between the app header's `<h1>` and the Markdown document
    view's own `<h1>` (a linked Markdown file with diagram blocks opens with a block already
    selected, which renders `DocumentView` — and its own top-level heading — inside the split-pane
    preview rather than as the single full-width view), unrelated to type or monospace changes. Ran
    it three times in isolation against the unmodified source (3/3 passed) and three times in
    isolation against the implemented source (3/3 passed); it only surfaced once, under the full
    suite's sequential load, on the implemented build. Not attributed to this task's change and not
    fixed here, as the underlying dual-heading condition is outside this task's file scope and
    predates it.
- Manually exercised, over the same running services: the resizable source/preview panes, the
  diagram zoom/pan controls, the light/dark/system theme switch, and the project-files/rename/
  logout/review-current-file dialogs, via the passing `panes.spec.ts`, `renderer-*.spec.ts`,
  `label-editing.spec.ts`, `header.spec.ts`, `drawer.spec.ts`, `files.spec.ts` (all but its read-only
  case), and `acceptance.spec.ts`/`save-race.spec.ts` (draft protection) cases above; none needed a
  rewritten expectation beyond the new spec itself.
- Remaining limitation: `type-scale.spec.ts`'s tool-target monospace claim is verified structurally
  (the tool event now shares the exact `.agent-event code` markup and selector already verified for
  file-change targets) rather than through an independent live tool-call event, because
  `scripts/test-e2e.ts`'s fake provider fixture does not script a `tool.started` event and this task
  does not edit that fixture. A follow-up that adds a tool-call scenario to the fixture could close
  this gap with an independent assertion.

### Review correction (2026-09-19)

Two findings from independent review, both applied:

1. Acceptance item 4 names a 700px viewport height and the short-viewport CSS rules (the
   `@media (max-width: 700px)` block that sets `.status-bar` to `var(--text-sm)` and hides
   `.save-status`, and the compound `@media (max-width: 700px) and (max-height: 700px)` block) were
   unmeasured at that height: the two existing viewports were 1440x900 and 390x844, and 844 is above
   700. Extended `type-scale.spec.ts` with an `assertFits` helper that checks each named region's own
   bounding box (not inferred from the absence of other failures) against the viewport, plus the
   existing no-horizontal-scrollbar check, and applied it to the header, the status bar, the composer
   and the explorer rail at all three viewports: 1440x900 (docked rail), and 390x844 and the added
   390x700 (both opening the project-files drawer that the rail becomes below 1100px width, since the
   composer's fixed full-screen presentation and the drawer are what actually need to fit at that
   width, not a hidden docked sidebar).
2. `.login-card h1` and `.empty-state h2` had been placed on `var(--text-lg)` (15px) with no stated
   reason; the five-step table assigns 15px to pane titles and the header file name only, and
   acceptance item 1 admits 17px as a valid shell size, not only the document body's size. Restored
   both to `var(--text-xl)` (17px). Added a fifth spec case asserting both compute exactly `17px`
   (the login heading on a fresh, cookie-less page; the empty-state heading right after login, before
   any file is chosen) — the generic shell-wide walk alone cannot catch a wrong-but-still-valid step,
   since 15px is itself one of the five allowed values.
- Confirmed the new heading assertion is not vacuous: temporarily reverted the two declarations to
  `var(--text-lg)`, rebuilt, and reran; the new case failed with `Expected: "17px" / Received:
  "15px"`. Restored the fix, rebuilt, reran: all 5 cases in `type-scale.spec.ts` passed, and a
  focused rerun of `header.spec.ts`, `drawer.spec.ts`, `panes.spec.ts` and `explorer-resize.spec.ts`
  against the same build passed (7 of 7).
- Reran the exact prescribed check after both corrections: `bun install --frozen-lockfile && bun
  install --cwd web --frozen-lockfile && bun run lint && bun run typecheck && bun run --cwd web
  test` — exit 0, 33 files / 568 tests passed, coverage unchanged (93.07/88.91/92.69/93.28).
