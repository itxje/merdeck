# PLAN-012 Rename the product to Merdeck and replace the brand mark

- **status**: completed
- **createdAt**: 2026-09-09 08:43
- **approvedAt**: 2026-09-09 (explicit user naming/logo authorization; day precision)
- **relatedTask**: BRAND-001

## Context

On 2026-09-09 the user chose the product name "Merdeck" to replace "DiagramDock" and separately requested a matching brand-mark (logo/icon) change. That instruction is the authorization for this entire scope; no prior plan named this rename. The GitHub repository is renamed to `itxje/merdeck` as part of this authorization, so remote-facing slugs (clone URLs, `gh run` examples, the CI publish guard and upload API path) move to `itxje/merdeck`. The deployed hostname `diag.example.test` and its private launcher are explicitly unchanged by this rename; the hostname only changes later if and when the user reconfigures the external ingress. Any brand-mark visual defaults chosen while executing this authorization come from the existing base-nova/Tailwind token set and are assumptions, not an approved design; the prototype stays **needs-review** exactly as before.

This plan was carried out in three sequential phases: phase 1 is the mechanical text/identifier rename (this plan's immediate scope), phase 2 replaces the brand mark/icon, and phase 3 performs final integration and closes BRAND-001/this plan. Each phase reports independently; this plan and BRAND-001 stay marked in-progress (`[-]`) until the closing phase.

## Proposal

1. Enumerate every file carrying the old name with `git grep -il diagramdock` (92 files at investigation time) rather than guessing, and classify each as: a living document to rename, a historical record to leave byte-identical, or a generated artifact to rebuild from renamed source.
2. Apply a case-aware three-tier substitution — `DIAGRAMDOCK_` to `MERDECK_`, `DiagramDock` to `Merdeck`, `diagramdock` to `merdeck` — file by file, never a blind repository-wide `sed`. Re-read edited prose so sentences that name the product mid-sentence stay grammatical.
3. Preserve the historical GitHub Actions run-link URLs (`github.com/itxje/diagramdock/actions/runs/...`) at their exact recorded locations in README.md, SECURITY.md, docs/architecture.md and docs/deployment-domain.md, even while renaming the surrounding prose and the unrelated `gh run`/clone-URL commands in the same documents.
4. Leave every existing detail file under docs/task/ and docs/plan/, every file under docs/decisions/, and every existing docs/changelog.md entry byte-identical; only append new rows/entries. docs/task/index.md and docs/plan/index.md are living pointer documents and do get fully cleaned, including the quoted titles of historical entries they link to.
5. Move `designs/diagramdock/` to `designs/merdeck/` with `git mv`, rename `DiagramDock.html` to `Merdeck.html`, update every in-repo path/route/env-var reference to the new folder, and rebuild the prototype bundle from the renamed TypeScript/CSS source so the committed HTML contains no leftover "DiagramDock" text. Leave the `GitBranch` brand icon exactly as-is; the logo/icon change is explicitly out of scope for this phase and belongs to phase 2.
6. Rename both package names (`merdeck`, `merdeck-web`) and refresh `bun.lock`/`web/bun.lock` with the pinned Bun 1.4.2 runtime so the lockfiles pick up the new workspace names without re-resolving or upgrading any dependency.
7. Record this plan and BRAND-001 with investigation/proposal notes, append one changelog entry, and run the full mandatory project check suite before reporting.

## Risks

A blind find-and-replace could corrupt the protected historical run-link URLs or silently reword byte-identical historical records; mitigated by explicitly excluding those paths/lines from every substitution pass and diffing the protected lines afterward. Running project scripts with the wrong Bun version (the system default is 1.3.12, not the pinned 1.4.2) can rewrite `bun.lock` with unrelated transitive-dependency upgrades; mitigated by provisioning a project-local pinned Bun 1.4.2 runtime and verifying `bun install --frozen-lockfile` reports no changes beyond the intended workspace-name edit. Renaming identifiers used at runtime (health payload, session cookie name, temp-file prefix, environment variable names) risks behavioral drift if any reference is missed; mitigated by re-running the full test suite after the rename.

## Scope

Repository-wide text/identifier rename only: root config/docs, `.github/workflows/verify.yml`, `src/`, `scripts/`, `tests/`, `web/` (excluding generated `web/bun.lock` content beyond the name field), the `designs/diagramdock` to `designs/merdeck` folder move and rebuild, `docs/architecture.md`, `docs/deployment-domain.md`, the two docs index files, one changelog entry, and this plan plus BRAND-001. Explicitly out of scope: any icon/logo/visual redesign (phase 2), touching `main`, pushing/fetching/tagging against `origin`, renaming the GitHub repository itself, the live deployment at `diag.example.test` and its private launcher, internal task-tracking metadata, renaming the `/workspace/diagramdock` directory on disk, cutting releases or tags, upgrading or removing any dependency, and installing system packages.

## Alternatives

Keeping "DiagramDock" as an internal-only identifier while renaming just user-facing copy was considered and rejected: the user's authorization covers the product name itself, including environment variables and identifiers that a downstream operator would reasonably expect to match the product name (`MERDECK_ROOT`, the health payload, the session cookie). Collapsing all three phases into a single step was considered and rejected in favor of keeping them as separate sequential phases, which keeps the pure-rename diff reviewable separately from the upcoming visual brand-mark change.

## Annotations

The 2026-09-09 user naming/logo instruction is the sole authorization for this plan; it does not extend to final main-integration approval, a new release, or any brand-mark visual decision, which stays needs-review pending phase 2. Historical decisions, task and plan records, and existing changelog entries are preserved unchanged as instructed.

On 2026-09-09 the project owner reviewed the brand sheet and approved the deck-without-wave direction as the product mark, closing the brand-mark visual decision this plan's authorization left pending. The earlier crown-like reading recorded in BRAND-001 concerned the first primary mark (the wave direction) and is resolved by this choice, not by any geometry change to a still-open design. The prototype layout as a whole remains a separate, still-open review; this decision does not extend to it, to final main-integration approval, or to a new release.

## Implementation record

Phase 1 (this plan) renamed every in-scope file identified by `git grep -il diagramdock`, moved and rebuilt the `designs/` prototype, patched both lockfiles' workspace names using a project-local pinned Bun 1.4.2 runtime (the system Bun is 1.3.12 and cannot read the repository's lockfile format), and left every historical record and protected run-link URL byte-identical. BRAND-001 records the full per-area breakdown, exact acceptance-grep output and mandatory check results, including a corrected finding: this checkout lives on a virtiofs mount, refused by the write-admission policy by design, and the mandatory checks pass end to end once the existing `MERDECK_TEST_FIXTURE_PARENT`/`MERDECK_TEST_UNSUPPORTED_PARENT` env vars redirect the test fixtures to admitted/refused storage outside the worktree.

Phase 2 replaced the placeholder `GitBranch` header icon with an original stroke-only mark (`web/src/shared/components/brand/merdeck-mark.tsx`), added `web/public/favicon.svg` and the self-contained `designs/merdeck/brand.html` brand sheet, and fixed a gap in the static-asset route so the built favicon is actually served. BRAND-001 records its full evidence.

Phase 3 (final verification, this closing update) merged both prior phases, re-ran the complete mandatory check suite, added regression coverage for the favicon route, and delivered one piece of scope added midway through by explicit user request on 2026-09-09: the documented hosted domain and nsl route name move from `diag.example.test`/`diag` to `merdeck.example.test`/`merdeck` throughout the living configuration/launch/ingress guidance in README.md and docs/deployment-domain.md. This is a **documentation-only** change — no deployment, `nsl run`, daemon change or HTTPS verification was performed as part of this; a later follow-up step owns the actual redeployment. Specific historical, timestamped verification records (the 2026-09-08 live-acceptance paragraph and the dated Host-header probe in docs/deployment-domain.md) were deliberately left referring to the hostname that was actually tested, `diag.example.test`, rather than rewritten to the new name, since the new hostname's external ingress is not yet configured (confirmed 502) and rewriting those specific records would have fabricated a verification claim that was never performed. A rewritten rename-scope note explains this split. See BRAND-001 for the exact grep evidence and the resulting two known deviations from a fully literal reading of the added acceptance greps.

The brand mark's visual defaults remain an assumption chosen from existing stack tokens and are **not user-approved**; both `Merdeck.html` and `brand.html` stay `needs-review`. Phase 3 also records an honest, unresolved disagreement about the mark's legibility: the implementer judged an early "crown" reading corrected, while the reviewer's independent read of the delivered sizes still finds it crown-like. Nothing in the geometry was changed to resolve this; see BRAND-001 for the neutral record. This plan and BRAND-001 are now **completed**/`[x]`; final main-branch integration remains a separate, later approval outside this plan's scope.
