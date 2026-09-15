# 20260915-0403-release-compact-mobile-drawer-header Release the compact mobile drawer header fix

- **status**: implementing
- **createdAt**: 2026-09-15 04:03
- **approvedAt**: 2026-09-15 04:03 UTC
- **relatedTask**: 20260915-0403-release-compact-mobile-drawer-header

## Context

The completed mobile drawer repair removes the visible `Project files` title and explanatory description, retains an assistive dialog name and close control, and reserves the close-control rail above the explorer actions. Its focused browser cases, self-contained prototype checks, lint, type checks, coverage, builds, release tests, compiled acceptance, bundle acceptance, and implementation review have passed. The prior local aggregate could not finish its evidence-export step from a dirty worktree, because that step intentionally requires clean source provenance; the committed candidate can be checked cleanly and hosted verification remains the release gate.

`v0.11.3` is the latest published version. A bounded mobile presentation repair receives the next patch version, `v0.11.4`. The release workflow verifies the exact pushed `main` commit on Linux x64/native before an immutable annotated tag is created; its tag run repeats verification and publishes `merdeck.tar.gz` and `SHA256SUMS`.

## Proposal

1. Commit the reviewed compact mobile drawer repair, its design/test/task artifacts, and this release tracking record without changing dependencies or release automation.
2. Run the complete local gate from the clean candidate, then push it to `main` and require successful hosted verification for that exact commit.
3. Validate and create annotated tag `v0.11.4` at the verified commit, then push only that tag.
4. Require the tag workflow to repeat verification and publish a non-draft, non-prerelease release containing `merdeck.tar.gz` and `SHA256SUMS`.
5. Download the published assets, verify the checksum and extracted bundle identity, then record the immutable tag, commit, workflow, and asset evidence in a follow-up documentation commit pushed to `main`.

## Risks

- A version tag is immutable, so it must only be created after the exact candidate has passed hosted verification.
- If either hosted workflow fails, the tag must not be moved and a published release must not be mutated; the failure requires inspection before any retry.
- The release tag intentionally excludes the post-publication evidence record, which is committed only after the release is independently verified.

## Scope

Included: the completed compact mobile drawer header repair and its records, one patch release, and release-evidence tracking. Excluded: further product behavior changes, dependencies, security-boundary changes, release automation changes, deployment restarts, and unrelated project files.

## Alternatives

Do not publish: this would leave the completed repair unavailable to release consumers. A minor release would overstate the impact of this narrowly scoped mobile presentation defect fix.

## Annotations

- The owner explicitly directed on 2026-09-15 that completed repairs are committed, pushed, and released proactively. This approval applies after the investigation and proposal recorded above.
- Approval recorded 2026-09-15 04:03 UTC; release execution may proceed within the proposal scope.
