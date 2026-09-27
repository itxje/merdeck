# PLAN-004 Complete practical saves on a verified filesystem

- **status**: completed
- **createdAt**: 2026-09-07 20:02
- **approvedAt**: 2026-09-07 (explicit continuation; recorded before implementation)
- **relatedTask**: SAVE-001

## Context

Investigation completed before source import. The supplied retained source is fc0e41762adc44bfa9c390f03b3b6caa9157be33 relative to 686a36615e64c6833a040e72155cc999b082e553. Only the specified file module, integration tests, focused decisions and historical file notes may be reused. Current task claims and safety research remain intact.

## Proposal

1. Reuse the exact retained module/tests, two decisions, parser dependency promotion, and FILE-001 history. Preserve the current safety task and both indexes; add only an honest historical FILE-001 marker.
2. Enforce Linux overlayfs (statfs type 0x794c7630) for writes, with root, held destination directory and target device checks. Inspect filesystem metadata through descriptor anchors and recheck before temporary creation/publication. Unknown or different filesystems remain readable subject to existing checks but saves return a typed filesystem_unsupported error with a safe message. No environment switch bypasses enforcement. Export a storageStatus method for transport consumers.
3. Add an explicit DIAGRAMDOCK_TEST_FIXTURE_PARENT test-only setting, canonical validation and printed type/device. Without it, fixtures stay under project tmp and fail visibly on this unsupported mount; no silent relocation. Keep diagnostics unchanged. Add a check:files launcher with fixed test selection and timeouts, plus a real-process domain smoke. Exercise real unsupported writes in a separately configured DIAGRAMDOCK_TEST_UNSUPPORTED_PARENT on the observed mount.
4. Verify 20 consecutive standalone saves and 20 consecutive multi-block save pairs, retained real filesystem boundaries, and external edits/replacements before final validation. Keep the exact final-window diagnostic separate and its applicationSafetyPassed=false interpretation intact.
5. Run pinned frozen root/web installs, check:files, full root/web lint/typecheck/coverage/build, focused review and whitespace checks. Report per-condition counts and precise failures; no blind retry.

Observed roots on 2026-09-07: this worktree is statfs 0x6a656a63, st_dev 41; an exclusively created scratch directory is statfs 0x794c7630, st_dev 70. Identity is the observed filesystem type/device, never a hard-coded path. The supplied unchanged overlayfs direct suite (40/0) justifies selecting the candidate; no additional raw control is needed. The closed six-case matrix is not repeated.

The repository's read/replace call chain already checks root canonical identity, O_NOFOLLOW descriptors, file identity/metadata and whole-file hashes. No concrete source defect explains the host-shared inode transitions. Parser 2.0.3 remains latest stable at the official npm registry (rechecked 2026-09-07, integrity matches the retained lock); its official API and Node statfs documentation were inspected. System Bun is 1.3.12, so project-local 1.4.2 is being provisioned. Actual Node is 24.20.0.

## Risks

Optimistic comparison followed by rename cannot provide universal compare-and-swap against external writers. Host-shared mount inode transitions remain unexplained. Overlayfs eligibility is a deliberately narrow deployment contract, not proof for every overlay configuration. Operators must run the documented acceptance against their chosen storage before relying on it; other filesystem families need separate evidence. A local account able to move root/ancestors can still violate pathname containment after validation; HTTP traversal and symlink controls do not sandbox that account. Neither timing changes nor a passing control resolves that failure.

## Scope

File domain, focused integration checks and launcher, baseline parser dependency, and scoped documentation only. No HTTP, UI, design, hosting, database, native helper or ownership changes.

## Alternatives

Broad runtime research, relaxed identity checks, forced overwrite, exclusive editor ownership and staged proposals are excluded by the explicit continuation.

## Annotations

- 2026-09-07: User explicitly authorizes implementation after investigation/proposal records. Direct external editing is required. PLAN-003's unselected A/B gate is superseded by practical optimistic saving with its final-window limitation retained.

## Verification and completion

Implemented the selected filesystem contract without a causal runtime claim. [SAVE-001](../task/SAVE-001.md) records exact source reuse, exported contracts, actual supported/unsupported type and device, commands, cleanup, individual conditions and review. The required frozen-install/check:files/full-check/whitespace chain exited 0. Practical file tests: 85/0; full backend: 99/0; existing frontend: 8/0. Twenty consecutive standalone saves and twenty consecutive multi-block pairs passed on overlayfs. Actual host-shared writes were rejected. The unchanged final-window diagnostic separately reproduced overwrite and remains applicationSafetyPassed=false.

Only the retained diagnostic preload import order changed to satisfy the current lint gate; raw and final-window diagnostic semantics and source remain intact. No additional raw matrix/control, retry of the exhausted investigation, native helper or GUI check ran. Historical FILE-001 remains unresolved/in_progress; this plan completes only SAVE-001's practical continuation. PLAN-001 and final integration remain incomplete, and the prototype remains needs-review.
