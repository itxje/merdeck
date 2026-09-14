# 20260914-2308-release-mobile-drawer Release the mobile file drawer fix

- **status**: implementing
- **createdAt**: 2026-09-14 23:08
- **approvedAt**: 2026-09-14 23:08 (the owner explicitly asked to commit, push and release the directly authorized mobile drawer repair)
- **relatedTask**: 20260914-2308-release-mobile-drawer

## Context

The completed mobile drawer repair is an interface-only defect fix following published `v0.11.0`. The release policy requires the candidate commit to pass the hosted Linux x64/native workflow before an annotated version tag is pushed, and the tag workflow repeats the checks before it publishes the bundle assets.

## Proposal

1. Commit the reviewed repair, its prototype and checks, the completed repair records, and this release tracking record without changing dependencies or release automation.
2. Push the candidate to `main` and require a successful hosted verification for its exact commit.
3. Create annotated tag `v0.11.1` at that verified commit and push only that tag. The patch version follows the documented rule for a fixed interface defect.
4. Require the tag verification and publication jobs to succeed. Confirm that the published release is neither draft nor prerelease and that its `merdeck.tar.gz` and `SHA256SUMS` assets verify together.
5. Record the immutable tag, commit, workflow and asset evidence in this task and mark the plan complete in a follow-up documentation commit pushed to `main`.

## Risks

- A version tag is immutable, so the exact candidate and its hosted verification must be checked before the tag is created.
- A release workflow failure must not be repaired by replacing assets or moving the tag. Its published-state safeguards remain authoritative.
- The local aggregate has a separately tracked source-pane browser-ordering instability. It is not treated as a passing aggregate; hosted exact-commit acceptance determines whether publication proceeds.

## Scope

Included: the existing mobile drawer repair and its test/design/task artifacts; one patch release from the verified candidate; release evidence tracking. Excluded: implementation of the pending source-pane ordering investigation, dependency changes, release automation changes, and unrelated project files.

## Acceptance

- The repair candidate is committed and `main` is pushed.
- Hosted main verification passes for the exact candidate commit.
- `v0.11.1` is an annotated tag resolving to that commit.
- The tag workflow verifies and publishes a non-draft, non-prerelease release with `merdeck.tar.gz` and `SHA256SUMS`.
- Downloaded assets pass `sha256sum --check`, and the completed records are committed and pushed.
