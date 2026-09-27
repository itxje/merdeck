# BRAND-001 Rename the product to Merdeck and replace the brand mark

- **status**: completed
- **priority**: P1
- **owner**: Repository maintainer
- **createdAt**: 2026-09-09 08:43

## Description

Rename the product from "DiagramDock" to "Merdeck" across code, configuration, documentation and the design prototype, then replace the brand mark/icon to match. Preserve every historical record (existing task/plan detail files, decisions, existing changelog entries and the recorded GitHub Actions run-link URLs) byte-identical.

## ActiveForm

Renaming the product to Merdeck and replacing the brand mark

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Claimed before investigation under the user's explicit 2026-09-09 naming/logo authorization recorded in [PLAN-012](../plan/PLAN-012.md). This task was delivered in three sequential phases: phase 1 (this record's current content) is the mechanical rename; phase 2 replaces the brand mark/icon; phase 3 performs final integration and closes this task to `[x]`. The marker stays `[-]` and status stays `in_progress` until that closing phase.

### Investigation

`git grep -il diagramdock` at claim time reported 92 files carrying the old name, grouped by area:

- **Root** (8): package.json, .env.example, .gitattributes, README.md, SECURITY.md, LICENSE, AGENTS.md, bun.lock.
- **CI** (1): .github/workflows/verify.yml — concurrency group/cache key prefixes and the tag-publish repository guard.
- **Backend `src/`** (9): app.ts and shared/contracts.ts (health payload `service` field), config.ts/config.test.ts (every `DIAGRAMDOCK_*` env var), index.ts (build-info banner), modules/auth/sessions.ts (session cookie name), modules/diagrams/repository.ts and its tests (temp-file prefix), filesystem.test.ts.
- **`scripts/`** (13): CI/native helpers, the dev launcher's nsl host-label default, the release publisher's GitHub repository guard and upload URL, the release binary-name template, and the private test-service/e2e env var wiring.
- **`tests/`** (12): integration API/files/storage suites and the release version test, all referencing the `DIAGRAMDOCK_*` test/env vars or the temp-file prefix.
- **`web/`** (15): bun.lock, index.html `<title>`, package.json, the theme localStorage key, the workspace header brand text, seven Playwright spec files, the e2e support helper and playwright.config.ts.
- **`designs/diagramdock/`** (whole folder, 12 files; 7 with textual matches): app.tsx brand text, build.ts/check.ts/serve.ts paths and the `DiagramDockPrototype` Vite lib name, README.md, `_d_meta.json`, and the generated `DiagramDock.html` (rebuilt, not hand-edited).
- **`docs/`** (27, of which 22 are historical and stay untouched): architecture.md and deployment-domain.md (living, each with one protected run-link line), the changelog (append-only), docs/task/index.md and docs/plan/index.md (living index files, fully cleaned including quoted historical titles), plus 5 historical docs/plan/PLAN-*.md, 15 historical docs/task/*.md and 2 historical docs/decisions/*.md files that must stay byte-identical.

Five locations carry recorded historical GitHub Actions run-link URLs (`github.com/itxje/diagramdock/actions/runs/...`) that must stay byte-identical even while the surrounding prose renames: README.md:266 and :268, SECURITY.md:9, docs/architecture.md:191, docs/deployment-domain.md:139 (pre-edit line numbers). README.md's `gh run ... --repo itxje/diagramdock` examples (lines ~291-296) and its plain clone-URL sentences are not run links and were renamed.

### Proposal

Fixed naming decisions (not re-litigated; see PLAN-012 for full authorization context):

- Product name "Merdeck", identifier `merdeck`, env prefix `MERDECK_` applied mechanically to every existing `DIAGRAMDOCK_*` variable.
- package.json names `merdeck` (root) / `merdeck-web` (web/); health payload `service: 'merdeck'`; release asset prefix `merdeck-`; GitHub release title `Merdeck <version>`; nsl dev host label default `merdeck-<suffix>`; CI concurrency/cache prefixes `merdeck-`; prototype Vite lib name `MerdeckPrototype`; document title "Merdeck".
- Repository slug `itxje/diagramdock` becomes `itxje/merdeck` in clone URLs, `gh run` examples, the publish-release guard/upload URL and the CI publish condition. The deployed hostname `diag.example.test` is explicitly unchanged.
- `designs/diagramdock/` moved to `designs/merdeck/` with `git mv`; `DiagramDock.html` renamed to `Merdeck.html` and rebuilt from the renamed TypeScript/CSS source via `bun run designs/merdeck/build.ts`, so the committed HTML contains no leftover old text. `_d_meta.json`'s asset key/path were updated and `updatedAt` refreshed; `createdAt` and `status: needs-review` were left untouched.
- The `GitBranch` brand icon in designs/merdeck/app.tsx is deliberately unchanged — the visual brand mark is phase 2's scope, not this phase's. Any eventual logo/icon choice will draw on the existing base-nova/Tailwind tokens and remains an assumption pending user review; prototype status stays needs-review.
- Both lockfiles were refreshed for the new workspace names using a project-local pinned Bun 1.4.2 runtime (provisioned under ignored `.cache/runtime/`, since the ambient system Bun is 1.3.12 and cannot parse this repository's lockfile format). No dependency was added, removed or upgraded; `bun install --frozen-lockfile` confirms both lockfiles resolve with zero drift beyond the workspace-name field.

Out of scope for this task (all three phases): touching `main`; pushing, fetching or tagging against `origin`; renaming the GitHub repository itself; the live deployment at `diag.example.test` and its private launcher; internal task-tracking metadata; renaming the `/workspace/diagramdock` directory on disk; cutting releases or tags; upgrading or removing dependencies; installing system packages.

### Phase 1 verification

Provisioned a project-local pinned Bun 1.4.2 runtime under ignored `.cache/runtime/` (the ambient system Bun is 1.3.12 and cannot parse this repository's lockfile format; a first accidental run with the wrong version rewrote `bun.lock` with unrelated transitive-dependency upgrades, was caught via `git diff`, and was reverted before redoing the install correctly). `bun install` and `bun install --cwd web` then `--frozen-lockfile` confirm both lockfiles resolve with zero drift beyond the renamed workspace name.

`bun run check` results with the pinned runtime: root `eslint .` clean; root `tsc --noEmit` clean; the acceptance tsconfig project and its one test passed; root `bun test --coverage` reports 137 pass / 36 fail across 173 tests, with every failure a write-path test (`saves`, `real descriptor checks`, `contained real filesystem service`, HTTP save/conflict cases) refused with `filesystemType: "0x65735546"`, `writable: false`. `stat -f` on this worktree independently confirms that magic number is FUSE, not the two admitted types (overlay `0x794c7630`, ext4 `0xef53`); `src/modules/diagrams/filesystem.ts` (the admission policy) was not part of this rename's file set and was not touched. This is the same class of pre-existing per-host storage incompatibility documented in [inode observations](../decisions/2026-09-07-inode-observations.md) and the architecture's storage-eligibility section, reproduced here by this worktree's own filesystem rather than by anything in this rename. Web `lint`, `typecheck` and `test:coverage` (135 pass / 0 fail; 92.84% statements / 89.48% branches / 89.76% functions / 93.43% lines) and `build` all passed cleanly.

`bun run designs/merdeck/check.ts` initially failed to find a browser under the empty fresh-worktree `.cache/playwright`; re-run once with `PLAYWRIGHT_BROWSERS_PATH=/home/alan/.cache/ms-playwright` per the documented fallback, it passed all 9 verification groups. `tsc --project designs/merdeck/tsconfig.json` (noEmit inherited from web/tsconfig.json) passed with no flag needed. `git diff --check` reported no whitespace errors.

Acceptance grep `git grep -i diagramdock -- . ':!docs/task' ':!docs/plan' ':!docs/changelog.md' ':!docs/decisions'` returns exactly five lines, each match inside a preserved `github.com/itxje/diagramdock/actions/runs/...` historical run-link URL (README.md ×2, SECURITY.md, docs/architecture.md, docs/deployment-domain.md). `git grep -in diagramdock -- docs/task/index.md docs/plan/index.md` returns nothing. All 22 pre-existing docs/task and docs/plan detail files plus both docs/decisions files are untouched (`git status` shows no changes to any of them).

`stat -f` on `.`, `..`, `../..`, `/tmp` and `/home/alan` shows the FUSE mount is specific to this checkout's directory tree itself (`/tmp` and `/home/alan` are overlayfs), confirming this is a property of the worktree mount, not of any git ref checked out inside it.

Overall phase-1 disposition at this point: **partial** — the rename itself is complete and verified by every check except the storage refusal in root `test:coverage`.

### Phase 1 verification — corrected

The reviewer identified the fix: the repository already ships a fixture-parent redirection mechanism precisely for this situation. `tests/integration/files/fixtures.ts` `fixtureParent()` reads `MERDECK_TEST_FIXTURE_PARENT`/`MERDECK_TEST_UNSUPPORTED_PARENT` and only falls back to repo-local `tmp/` (this worktree's refused virtiofs storage) when those are unset; `scripts/ci/hosted.ts` shows the intended pairing of a supported and a refused fixture parent. Pointing those variables at directories on this host's actually admitted storage — `/tmp` (overlayfs `0x794c7630`, admitted) for the supported parent and `/dev/shm` (tmpfs `0x1021994`, refused) for the unsupported parent, both created as fresh canonical `mktemp -d` directories, with `MERDECK_TEST_EXPECTED_FS=0x794c7630` and `MERDECK_TEST_UNSUPPORTED_FS=0x1021994` set to match — makes `bun run check` pass end to end: root `eslint`/`tsc --noEmit` clean, acceptance tsconfig project and its test pass, root `bun test --coverage` **173 pass / 0 fail** across 173 tests, web `lint`/`typecheck` clean, web `test:coverage` **135 pass / 0 fail**, and `build` succeeds (only the pre-existing large-chunk advisory, unrelated to this change). Exit code confirmed 0 for the whole `bun run check` invocation. Both temporary fixture directories were removed after the run. No production code, test, or the write-admission policy itself was changed to reach this result — only the test invocation's environment.

**Environment constraint for future runs in this worktree tree:** This checkout and its parent directories (confirmed via `stat -f`) mount via virtiofs (`0x65735546`), which the write-admission policy correctly refuses. `/tmp` and `/home/alan` on this host are overlayfs (admitted); `/dev/shm` is tmpfs (refused, for the unsupported-storage test cases). Any full `bun run check` (or the file/API/storage test suites individually) run from a worktree under this tree must export `MERDECK_TEST_FIXTURE_PARENT` and `MERDECK_TEST_UNSUPPORTED_PARENT` (plus `MERDECK_TEST_EXPECTED_FS`/`MERDECK_TEST_UNSUPPORTED_FS` if pointing at storage other than the code's own overlayfs/host-shared defaults) at canonical directories on admitted/refused storage respectively — repo-local `tmp/` alone is not sufficient here. This is an environment property of the worktree mount, not a defect in this rename.

Overall phase-1 disposition: **complete** — every mandatory check passes with the fixture parents correctly configured; see the commit history for the exact verification commit.

### Phase 2 implementation — brand mark

The placeholder `GitBranch` header icon is replaced by an original mark. Concept: Merdeck reads
as Mermaid plus deck, so three flowchart nodes and their edges form an **M** standing on a deck
bar with one wave line beneath. It is stroke-only in `currentColor`, `viewBox="0 0 24 24"`,
stroke width `1.7`, node radius `1.6`, round caps and joins — a drop-in replacement for the
lucide icon it displaces, inheriting the same sizing and the same theme tokens in both themes.
No fill, no gradient, no hex value, no raster file, no font, no network resource and no new
dependency.

`web/src/shared/components/brand/merdeck-mark.tsx` is the single source of the geometry. The
prototype's `app.tsx` imports that same component, so `Merdeck.html` cannot drift from the
application. `web/public/favicon.svg` and the `<symbol>` blocks in `brand.html` repeat the same
path data verbatim; all four carriers were diffed against each other after the final edit and
match. The favicon adds a small internal stylesheet so it follows `prefers-color-scheme`,
naming `black`/`white` rather than a hex value, because a standalone favicon has no theme token
to inherit.

The first geometry (valley at 43 % of the letter height) rendered as a crown rather than an M
when inspected in the brand sheet at 64 and 128 px. The valley was deepened to 85 % so the
middle node rests on the deck bar, which is what makes the letterform read. This was found by
looking at the rendered screenshots, not by assertion.

Two unrelated `GitBranch` usages — the login card and the mobile Preview tab — are deliberately
untouched; they are generic icons, not brand.

**Favicon serving (verified, not assumed).** `loadStaticAssets` already accepts a root-level
`favicon.svg`: the name matches `^[\w.-]+$`, `svg` is in the `contentTypes` map and only
`index.html` is restricted among `.html` files. The CSP in `src/shared/middleware/boundary.ts`
already permits it via `img-src 'self' data:`, so that file needed no change. `staticResponse`
in the same module, however, served only `/`, `/index.html` and `/assets/**`, and would have
returned `undefined` for `/favicon.svg`. One minimal two-line change adds a root-level
`/favicon.svg` to the allowed paths; no other path becomes reachable. Confirmed live against the
built server: `GET /favicon.svg` returns `200 image/svg+xml`, and the served bytes are
byte-identical to `web/public/favicon.svg`.

`designs/merdeck/check.ts` asserted exactly one registered asset (`Merdeck.html`), which is
incompatible with registering `brand.html` as this task requires. The assertion was generalised
to require exactly `Merdeck.html` and `brand.html`, both at `needs-review`, and extended with
real self-containment assertions for the brand sheet (no script, no non-`data:`/`#` reference,
no `@import`, no external CSS `url()`). This is the only file edited outside this phase's
declared scope; the check became stronger, not weaker.

**Screenshot evidence** (real artifacts, uncommitted, under the gitignored `tmp/brand/`):

- `tmp/brand/workspace-header-light.png` — workspace header, light theme
- `tmp/brand/workspace-header-dark.png` — workspace header, dark theme
- `tmp/brand/brand-sheet.png` — full brand sheet
- `tmp/brand/workspace-full-light.png`, `tmp/brand/workspace-full-dark.png` — full window context

Captured with the repository's pinned Playwright (`@playwright/test` 1.63.0, chromium revision
1243) resolved from `/home/alan/.cache/ms-playwright`, driving the real production server
(`bun dist/index.js`) against a temporary project root on admitted storage, at
`deviceScaleFactor: 2`, with a real token login. Zero console or page errors in either theme;
the brand sheet issued zero external requests. Sizes 16/24/32/64/128 px were reviewed on both
surfaces from the rendered sheet.

**Checks** (pinned Bun 1.4.2 from the ignored `.cache/runtime/`, fixture parents on admitted
storage as the phase-1 correction established):

- `bun install --frozen-lockfile` and `bun install --cwd web --frozen-lockfile` — no changes;
  `bun.lock` and `web/bun.lock` untouched by this phase
- `bun run check` — exit 0; root 173 pass / 0 fail, web 135 pass / 0 fail, build clean apart
  from the pre-existing large-chunk advisory
- `bun run designs/merdeck/check.ts` — exit 0, 9/9 verification groups
- `git diff --check` — clean
- `git grep -i diagramdock -- designs/ web/` — no match

The mark, its sizing and both surface treatments are chosen from existing stack tokens and are
**an assumption, not user-approved**. `Merdeck.html` and `brand.html` both stay at
`needs-review`; this record stays `[-]` / `in_progress` for phase 3 to close.

### Phase 3 — final verification and close

Upstream sync: fast-forward-merged cleanly to
`08c75a861260388f0ecb964e0569234f5719f30c` (phases 1+2 combined), matching the head already
verified by the reviewer beforehand. Tree was clean before and after; `designs/merdeck/brand.html` and
`web/public/favicon.svg` were present.

**Acceptance grep.** `git grep -i diagramdock -- . ':!docs/task' ':!docs/plan' ':!docs/changelog.md' ':!docs/decisions'` returns exactly 5 lines (README.md ×2, SECURITY.md, docs/architecture.md, docs/deployment-domain.md), every match inside a preserved `github.com/itxje/diagramdock/actions/runs/...` historical run-link URL. `git grep -in diagramdock -- docs/task/index.md docs/plan/index.md` is empty. `git grep -rn "DIAGRAMDOCK_"` matches only inside docs/changelog.md, docs/decisions/, docs/plan/ and docs/task/ (the excluded historical set); no live code, script, test, workflow or `.env.example` hit.

**Domain/route rename (v2 amendment).** Per the user's 2026-09-09 request, the documented hosted domain and nsl route move from `diag.example.test`/`diag` to `merdeck.example.test`/`merdeck` in the living configuration/launch/ingress-table/cleanup guidance of README.md and docs/deployment-domain.md. This is documentation only — no `nsl run`, daemon change or HTTPS verification was performed. **Deliberate exception, reported rather than silently resolved:** two passages in docs/deployment-domain.md record a *specific, timestamped, already-completed* verification (the "as of the corrected 2026-09-08 deployment" status line, and the Host-header probe recorded at 2026-09-08 02:12:52 UTC with its HTTP 200 result) that factually happened against `diag.example.test`. Per already-confirmed environment facts, `merdeck.example.test` currently answers 502 (ingress not configured) — rewriting those two historical claims to the new hostname would assert a verification that never happened. Both were left on `diag.example.test`; a rewritten rename-scope note immediately below the status line explains the split and states the documentation now targets `merdeck.example.test`/`merdeck` going forward. Consequence: the added acceptance grep for the literal hostname string (no exclusion for this file) does **not** return empty — it returns exactly those 2 lines plus the rewritten note itself (3 lines total, all in docs/deployment-domain.md, all deliberate). Similarly the added acceptance grep for the old nsl launch flag/value pair (no exclusions at all, as literally specified) does not return empty either: after renaming docs/deployment-domain.md's own launch-recipe line to use the new route name, one hit remains in the protected historical `docs/task/DOMAIN-001.md:40`, which this task's own rules forbid editing — see that file for the exact quoted command. (This paragraph itself was worded to avoid reproducing that exact flag/value substring, so it does not add a second false hit to its own grep.) Both discrepancies are between two mutually-inconsistent added acceptance criteria (one demanding the literal historical hostname stay in the rewritten note, the other demanding the same file contain no trace of it) rather than a fix left undone; see Remaining issues. The third added grep, `git grep -n 'diag\.localhost' -- . ':!docs/task' ':!docs/plan' ':!docs/changelog.md'`, **is** empty. `merdeck.example.test` appears in both README.md and docs/deployment-domain.md. A repo-wide `git grep -n '\bdiag\b' -- . ':!docs'` (scripts/tests/workflows/src/config) is empty — phases 1-2 introduced no hardcoded hostname/route references outside docs.

**Lockfiles.** Pinned Bun 1.4.2 provisioned fresh in this worktree via `npm install --prefix .cache/runtime --no-save --package-lock=false bun@1.4.2` (system Bun is 1.3.12). `bun install --frozen-lockfile` and `bun install --cwd web --frozen-lockfile` both reported "no changes"; `git status --porcelain bun.lock web/bun.lock` is empty.

**`bun run check`.** Storage fixture parents measured, not copied from an earlier phase's checkout (each worktree is a distinct virtiofs mount): `MERDECK_TEST_FIXTURE_PARENT` a fresh `mktemp -d` under `/tmp` (measured `0x794c7630` overlayfs), `MERDECK_TEST_EXPECTED_FS=0x794c7630`, `MERDECK_TEST_UNSUPPORTED_PARENT="$PWD/tmp"` (measured `0x65735546` virtiofs, canonical), `MERDECK_TEST_UNSUPPORTED_FS=0x65735546`. Exit 0 end to end: root `eslint .` clean, `tsc --noEmit` clean, acceptance tsconfig project 1/1, root `bun test --coverage` **174 pass / 0 fail** across 8 files (up from phase 2's 173 — this phase added one regression test, see below), all source files at 100% funcs/lines except pre-existing `repository.ts` 97.67/99.58 and `service.ts` 95.65/100, web `lint`/`typecheck` clean, web `test:coverage` **135 pass / 0 fail** (92.84% statements / 89.48% branches / 89.76% functions / 93.43% lines), `build` clean apart from the pre-existing large-chunk advisory. All 36 storage-gated write-path tests passed with no refusals. (An earlier run of this same command, launched before this phase's test-file edit landed, transiently reported 173/0; it was stale relative to the tree and was re-run — the 174/0 figure above is the one that reflects this phase's final tree.)

**`designs/merdeck/check.ts`.** `PLAYWRIGHT_BROWSERS_PATH=/home/alan/.cache/ms-playwright bun run designs/merdeck/check.ts` — exit 0, all 9 verification groups pass (same 9 groups phase 1/2 listed).

**Scoped design tsc.** `bun node_modules/typescript/bin/tsc --project designs/merdeck/tsconfig.json` — exit 0, no output. `noEmit` is inherited from `web/tsconfig.json` (`"noEmit": true`), confirmed by inspection; no extra flag needed.

**`git diff --check`.** Exit 0, no output.

**Favicon in build output.** After `bun run build`: `web/dist/` contains `assets/` (94 entries), `favicon.svg` (595 bytes) and `index.html` (1516 bytes) at the root; `index.html` links `favicon.svg" type="image/svg+xml"`.

**Health payload.** `src/app.ts`: `return c.json({ success: true as const, data: { status: 'ok', service: 'merdeck' } satisfies HealthStatus })`. Asserted by `src/config.test.ts:95` and `tests/integration/api/http.test.ts:66`.

**`test:e2e` (conditional).** The script hard-requires a tmux session (`process.env.TMUX`) and Bun 1.4.2 by design; it was run inside this worktree's own dedicated project tmux session with the pinned browser via `PLAYWRIGHT_BROWSERS_PATH=/home/alan/.cache/ms-playwright` and the same four storage variables as above. No browser was downloaded and no system package was installed. Result: exit 0, **30 passed** (1.6m), zero unexpected browser/page errors across every spec (acceptance, drawer, renderer-breaks, renderer-flowchart, save-race, tree, workspace), including the unsupported-storage case (`workspace.spec.ts:236`, refused with saving disabled as expected).

**Favicon regression test.** Added to `tests/integration/api/static.test.ts`: `staticResponse` now has a direct case asserting `GET /favicon.svg` returns 200 with `Content-Type: image/svg+xml` and the exact fixture bytes, and that `GET /robots.txt` still returns `undefined`. Included in the 174-pass total above.

**Prototype check assertion.** The reviewer already reviewed and accepted phase 2's edit to this file (it was listed read-only in phase 2's spec) as strictly stronger than what it replaced. Confirmed unchanged and still passing at this phase's head (see the `designs/merdeck/check.ts` result above); not reverted.

**Contested legibility finding, recorded not resolved.** Phase 2 reported correcting an early "crown" reading by deepening the M's valley. The reviewer's independent read of the delivered 64/128 px renderings still finds the mark crown-like (two posts capped by node circles, a central V, over a bar) — the same silhouette the reviewer's own brief specified. This phase did not re-derive either visual judgment (no geometry change, no redesign); it is recorded here, neutrally, as unresolved: the implementer judged the valley correction sufficient; the reviewer still read the mark as crown-like; the project owner decides. `designs/merdeck/README.md` and `brand.html`'s own status block already state plainly that the design is an unapproved proposal (verified, not re-worded) and both assets stay `needs-review` in `_d_meta.json` (verified unchanged).

**Favicon theme adaptation.** Informational only, no action taken: the `prefers-color-scheme` stylesheet inside `web/public/favicon.svg` falls back to its light branch wherever a browser does not support media queries inside SVG favicons.

**README's `MERDECK_TEST_UNSUPPORTED_FS=0x6a656a63` — judged, not changed.** `0x6a656a63` is not stale documentation of *this* host; it is the actual hardcoded fallback default in the code itself (`process.env.MERDECK_TEST_UNSUPPORTED_FS ?? '0x6a656a63'` in `scripts/check-files.ts`, `scripts/test-e2e.ts` and three test files — confirmed by grep), and README.md:89 accurately describes that code default. README.md:230's mention is explicitly labeled "Historical local result from CI-001" and stays as that run's own record. README.md:165 and :190 use the same value as a worked example; :190 is already explicitly captioned "Example observed locally; identify the actual mount" — it never claimed to be *this* worktree's value. This phase measured and used `0x65735546` for *this* worktree's own `$PWD/tmp` (recorded above under `bun run check`), which is a different fact (this host's refusal magic) from the code's documented default (an unrelated reference host's). No README line was changed; none of them assert something false about this host.

**README/architecture stale-statement sync.** Searched both files for stale mentions of the old `designs/diagramdock` path, the pre-mark `GitBranch` header icon, or an absent favicon; found none — `designs/merdeck/` is already correct throughout and neither file makes a specific claim about the header icon that the new mark would contradict. No edit was needed beyond the domain-rename passages already covered above.

Overall phase 3 disposition: every mandatory check passes at this task's final head. The rename, the brand mark and the documented domain move are complete; the brand mark's legibility is an open, honestly-recorded disagreement for user review, not a phase-3 defect; two added acceptance greps cannot be literally satisfied simultaneously with the added note-preservation requirement and with not editing protected historical files, and were resolved in favor of historical accuracy and file-scope protection — see Remaining issues in the follow-up report. This record is now **completed** / `[x]`.

### Phase 4 — nsl deployment outcome (deployment-only note)

This note records the outcome of a fourth, deployment-only phase; it does not reopen or change this task's `completed`/`[x]` status, which reflects the rename and brand work above.

Upstream sync: fast-forward-merged cleanly to `f1fe857e26760975a62f30cf6faa9017647d1ec6` (phases 1-3 combined), matching the head already verified by the reviewer beforehand. Tree was clean before and after; `merdeck.example.test` markers were present in README.md and docs/deployment-domain.md, and `git grep -in diagramdock -- src web scripts` was empty.

**Build.** Pinned Bun 1.4.2 copied from `.cache/runtime/bun-1.4.2/` in another checkout of this repository (this worktree had none provisioned yet); `bun install --frozen-lockfile` and `bun install --cwd web --frozen-lockfile` both reported no changes, `git diff --stat bun.lock web/bun.lock` empty. `bun run build` exited 0, producing `dist/index.js` (262,969 bytes) and `web/dist/` (94 entries including `favicon.svg`), apart from the pre-existing large-chunk advisory.

**Deployment records.** Fresh disposable demo root created at `/tmp/merdeck-domain-JVPzal/project` (verified `stat -f` magic `0x794c7630`, overlay, before use), populated by copying committed `examples/project`. The demo root recorded in docs/deployment-domain.md's earlier sections (`/tmp/diagramdock-domain-kX7lSf/project`) no longer exists after the 2026-09-08 host restart, confirmed absent before creating the new one — this is a new root and a new token, not a resumption. A fresh 64-hex-character token was generated with `openssl rand -hex 32` into `tmp/domain/token` (mode 600) and was never printed, logged or committed. `tmp/domain/service.sh`, `root.txt`, `session.txt`, `storage.json` and `route-owner.json` were written under the worktree's gitignored `tmp/domain/`.

**Launch.** A dedicated tmux session, window `domain`, running `node_modules/.bin/nsl run -n merdeck -- bash tmp/domain/service.sh`. Before launch, `nsl list` showed only unrelated `invest` routes and no `merdeck` route. After launch: `http://merdeck.localhost:3003 -> localhost:23675 (pid 176424)`, with the actual Bun server as its child, pid 176425.

**Local verification.** All three required Host-header probes against `127.0.0.1:3003` with `Host: merdeck.example.test` passed:

- `GET /` → `200`, built HTML shell (`<title>Merdeck</title>`, hashed asset bundle).
- `GET /api/health` → `{"success":true,"data":{"status":"ok","service":"merdeck"}}`.
- `GET /api/diagrams/tree` (no credentials) → `401 {"success":false,"error":{"code":"unauthorized","message":"Sign in to continue."}}`.

**HTTPS verification — not yet reachable, recorded exactly.** `curl -sS -o /dev/null -w '%{http_code} %{remote_ip}'`:

- `https://merdeck.example.test/` → `502`, peer `192.0.2.1`, body `Bad Gateway`.
- `https://merdeck.example.test/api/health` → `502`, peer `192.0.2.1`, body `Bad Gateway`.

This matches the environment fact already confirmed: the external ingress/DNS for the new hostname is not yet configured; that configuration is outside this repository and this task and was left to the user. No tunnel, `/etc/hosts` edit, DNS change or nsl daemon reconfiguration was attempted to work around it, per this task's hard safety rules. **Domain acceptance is therefore partial: verified at the local nsl-daemon level, not end-to-end over HTTPS.**

**Checks.** `bun run check` was run with the four storage fixture variables measured fresh for this worktree (`MERDECK_TEST_FIXTURE_PARENT` under `/tmp`, measured `0x794c7630`; `MERDECK_TEST_UNSUPPORTED_PARENT="$PWD/tmp"`, measured `0x65735546`) — exit 0. `git diff --check` — exit 0, no output. `git status --porcelain` shows no `tmp/` files staged or committed.

**Documentation.** docs/deployment-domain.md "Current status" got one new dated paragraph appended (2026-09-09 09:54 UTC); all earlier records, including the 2026-09-08 sections, are untouched. docs/changelog.md got one new entry appended. This note is the required append to this file.

The service is left running (tmux `domain` window, route `merdeck`) for the ingress owner to test once external routing exists. Prototype/brand review status is unchanged by this phase.

### Brand mark decision — approved by the project owner (2026-09-09)

This note records a decision outcome and its carrier updates; it does not reopen or change this task's `completed`/`[x]` status.

The project owner reviewed `designs/merdeck/brand.html` on 2026-09-09 and chose the deck-without-wave direction (previously recorded above as "Alternate B") as the approved product mark. The earlier crown-like reading recorded in the phase-3 note above concerned the first primary mark — the direction with an added wave line beneath the deck, nodes at y=5/14 — and is resolved by this choice: the approved mark carries no wave path, plainly reads as three flowchart nodes and their edges forming an M standing on a deck bar, and does not repeat the geometry the reviewer read as crown-like. That former-primary geometry is preserved unchanged and clearly labelled "not chosen" in the brand sheet's alternates for comparison, alongside the solid-node alternate. The prototype layout as a whole (`Merdeck.html`) is unaffected by this decision and remains **needs-review**.

**Approved geometry** (`viewBox 0 0 24 24`, `fill none`, `stroke currentColor`, `stroke-width 1.7`, round caps/joins):
```
<path d="M4.6 8.6V17.6M19.4 8.6V17.6M5.62 8.24 10.98 14.76M18.38 8.24 13.02 14.76"/>
<path d="M2.6 17.6H21.4"/>
<circle cx="4.6" cy="7" r="1.6"/>
<circle cx="12" cy="16" r="1.6"/>
<circle cx="19.4" cy="7" r="1.6"/>
```
No wave path. This is byte-identical to what the owner reviewed as `merdeck-alt-deck` in the prior brand sheet.

**Carriers updated**, all now carrying this geometry byte-identically:
- `web/src/shared/components/brand/merdeck-mark.tsx` — path/circle data swapped; props, sizing and className behaviour unchanged; the comment's stale "with one wave line beneath" phrase was removed since it no longer describes the geometry.
- `web/public/favicon.svg` — same swap; its internal `prefers-color-scheme` stylesheet is unchanged.
- `designs/merdeck/brand.html` — the `merdeck-mark` symbol (16 `use` references across sizes, the wordmark lockup and the header-tile figures) now carries the approved geometry. The slot formerly named `merdeck-alt-deck` (which held this same geometry as an alternate) was renamed `merdeck-alt-wave` and its 3 `use` references updated; it now holds the former primary's wave geometry instead, relabelled "not chosen" with an updated trade-off note naming the crown-like reading as the reason it was not chosen. `merdeck-alt-solid` is untouched (geometry and its "not chosen" badge exactly as the owner saw it), with only its trade-off note reworded since it is no longer "identical geometry" to the new chosen mark. The intro paragraph and the status block were rewritten to state the mark is approved (2026-09-09) while the prototype layout stays under review; no wording still calls the mark an unapproved proposal.
- `designs/merdeck/app.tsx` — verified, not assumed: it only imports the `MerdeckMark` component and carries no geometry of its own, so no edit was needed here.
- `designs/merdeck/Merdeck.html` — rebuilt via `bun run designs/merdeck/build.ts` from the updated component; carries the approved mark with no manual edit.
- `designs/merdeck/README.md` — "Brand mark" section rewritten: drops the wave-line description, states the mark is approved with the crown concern resolved by this choice, and keeps `Merdeck.html`/layout at needs-review.

**Metadata and its check.** `designs/merdeck/_d_meta.json`: `brand.html` moved to `approved`; `Merdeck.html` stays `needs-review`; top-level `updatedAt` refreshed to `2026-09-09T17:40:07.000Z`; `createdAt` (top-level and per-asset) untouched. `designs/merdeck/check.ts`'s metadata-status assertion (was line ~25) was tightened from "every asset stays needs-review" to an exact per-path expectation (`Merdeck.html` = `needs-review`, `brand.html` = `approved`, failing with a named mismatch otherwise); its descriptive check-list string (was line ~48) was updated to match. No other assertion in that file was changed.

**Verification.** Pinned Bun 1.4.2 provisioned fresh in this worktree (`npm install --prefix .cache/runtime --no-save --package-lock=false bun@1.4.2`; the ambient system Bun is 1.3.12). Storage fixture parents measured fresh for this worktree, not assumed: this worktree's own tree mounts via virtiofs (`stat -f -c '%t %T' .` → `65735546 fuse`), a fresh `mktemp -d` under `/tmp` measured `794c7630 overlayfs`.

```
$ bun install --frozen-lockfile
bun install v1.4.2 (744846f84)
+ @antfu/eslint-config@9.5.1
+ @nsio/nsl@0.1.7
+ @playwright/test@1.63.0
+ @types/bun@1.4.1
+ eslint@10.10.0
+ jiti@2.7.0
+ typescript@6.0.3
+ hono@4.13.7
+ mdast-util-from-markdown@2.0.3
+ zod@4.5.4
328 packages installed [4.69s]

$ bun install --cwd web --frozen-lockfile
bun install v1.4.2 (744846f84)
(… 32 packages already in web/bun.lock, none upgraded/added/removed …)
948 packages installed [15.12s]

$ git status --porcelain bun.lock web/bun.lock
(empty — both lockfiles byte-identical to before this task)
```

```
$ MERDECK_TEST_FIXTURE_PARENT=/tmp/merdeck-brand-check-zetP5h MERDECK_TEST_EXPECTED_FS=0x794c7630 \
  MERDECK_TEST_UNSUPPORTED_PARENT="$PWD/tmp" MERDECK_TEST_UNSUPPORTED_FS=0x65735546 bun run check
EXIT_CODE:0
(root) 174 pass / 0 fail across 8 files, 1463 expect() calls
$ eslint . — clean; $ tsc --noEmit — clean
(web) Test Files 10 passed (10); Tests 135 passed (135)
Coverage: 92.84% statements / 89.48% branches / 89.76% functions / 93.43% lines
$ bun scripts/build.ts → vite build succeeded (only the pre-existing large-chunk advisory)
```

```
$ PLAYWRIGHT_BROWSERS_PATH=/home/alan/.cache/ms-playwright bun run designs/merdeck/check.ts
Single inline script/style, no CSS imports or external assets; metadata at Merdeck.html=needs-review, brand.html=approved, without fabricated system bindings
1440x960 desktop: project tree, source, live SVG, no horizontal page overflow
Markdown block/standalone selection, independent drafts, live edit, syntax error/stale preview, keyboard save, typing during save remains dirty
External-change banner and conflict dialog preserve draft; explicit discard loads simulated file snapshot
Zoom in/out/fit, light/dark/system and live OS preference change
No-block, loading, empty project, no selection, session expiry, disconnection and deletion review states
Hostile HTML/resource source rejected; sanitized preview has no executable/link/image elements
390x844 narrow pane switching, source editing, file drawer selection, Escape and focus restoration with visible focus ring
All external requests blocked during primary browser checks; standalone file opens and re-renders fully offline; zero console/runtime errors
PASS: 9 verification groups
EXIT_CODE:0
```

```
$ bun node_modules/typescript/bin/tsc --project designs/merdeck/tsconfig.json
EXIT_CODE:0
(no output; noEmit inherited from web/tsconfig.json)
```

```
$ PLAYWRIGHT_BROWSERS_PATH=/home/alan/.cache/ms-playwright bun run test:e2e
(run inside this worktree's own dedicated project tmux session, same four storage variables)
{"root":"/tmp/merdeck-brand-check-zetP5h","filesystemType":"0x794c7630","device":"55"}
{"root":".../tmp","filesystemType":"0x65735546","device":"45"}
{"bun":"1.4.2","node":"v24.20.0","platform":"linux","architecture":"arm64"}
Running 30 tests using 1 worker
... 30 passed (1.6m) ...
{"browserExit":0,"evidence":".../tmp/e2e-q1bjk9"}
{"serviceStopped":"unsupported.ready"}
{"serviceStopped":"supported.ready"}
{"fixtureRemoved":"/tmp/merdeck-brand-check-zetP5h/browser-supported-KYTGk8"}
{"fixtureRemoved":".../tmp/browser-unsupported-1i1YeZ"}
EXIT:0
```

Every spec file ran clean (acceptance, drawer, renderer-breaks, renderer-flowchart, save-race, tree, workspace), including the unsupported-storage case (`workspace.spec.ts:236`, refused with saving disabled as expected). This includes the header/favicon coverage implicitly (the workspace specs render the header on every page load); no spec name-matches "favicon" specifically, consistent with the existing suite (the dedicated favicon-route regression lives in `tests/integration/api/static.test.ts`, part of the `bun run check` result above).

```
$ git diff --check
EXIT_CODE:0
(no output)
```

**Acceptance greps.**
```
$ git grep -i diagramdock -- . ':!docs/task' ':!docs/plan' ':!docs/changelog.md' ':!docs/decisions'
```
returns exactly 5 lines (README.md ×2, SECURITY.md, docs/architecture.md, docs/deployment-domain.md), every match inside a preserved `github.com/itxje/diagramdock/actions/runs/...` historical run-link URL — unchanged from the phase-3 record above, confirming this decision touched none of them.

Two further required checks scan every line added since this task's upstream sync point (excluding the rebuilt prototype HTML). The first, for internal-process wording, returns exactly one match, in README.md's candidate-verification section: a pre-existing GitHub Actions trigger name that happens to contain one of the scanned words as a substring, already carved out by this task's own instructions as acceptable. The second, for a fixed list of short identifier strings, returns `0`. (Neither check's exact pattern or matched term is quoted here: doing so would itself add a matching line and make the check fail against this very file.)

**Geometry consistency proof.** The approved path data (`M4.6 8.6V17.6M19.4 8.6V17.6M5.62 8.24 10.98 14.76M18.38 8.24 13.02 14.76`) and the deck-bar path (`M2.6 17.6H21.4`) each occur exactly once, byte-identically, in `merdeck-mark.tsx`, `favicon.svg` and `brand.html`'s `merdeck-mark` symbol, and are present in the rebuilt `Merdeck.html`'s embedded bundle (confirmed both as the literal path string and as the individual `cy:` node-circle values for all three nodes, since the built output is minified JS rather than raw SVG markup). The old wave path `M3 20q4.5-1.5 9 0t9 0` occurs in exactly two places repository-wide, both inside `designs/merdeck/brand.html`: the `merdeck-alt-solid` symbol and the `merdeck-alt-wave` symbol — its two not-chosen alternates. It does not appear in `merdeck-mark.tsx`, `favicon.svg`, or the rebuilt `Merdeck.html`.

**Provenance of this decision note.** Recorded directly from the project owner's 2026-09-09 review instruction, which is this work's authorization per PLAN-012's annotations; no separate follow-up report file is needed since that instruction already specified the exact geometry and every carrier by path.

### Approved mark redeployed and verified over HTTPS (2026-09-09)

This note records a further deployment-only step; it does not reopen or change this task's `completed`/`[x]` status.

The running service was rebuilt from the merged head carrying the approved brand mark (`16cf11ce06409ac3299824e8743654b83d497069`) and restarted in the same deployment tmux session and window, reusing the existing demo root and token. The prior process (pid 176424) was stopped and confirmed gone, along with its route, before the identical launch command produced a new process (pid 212906) under the same route; the unrelated design-preview route and the unrelated `invest` routes were left untouched. Real HTTPS verification now succeeds end to end, observed 2026-09-09 ~18:02 UTC: `/api/health` returns `200` reporting the service healthy, `/favicon.svg` returns `200` carrying the approved path data with no trace of the earlier wave path, and `/` returns `200` with the built shell. This closes the external ingress gap the previous deployment note left open. Full commands and output are recorded in [deployment ownership and recovery](../deployment-domain.md).
