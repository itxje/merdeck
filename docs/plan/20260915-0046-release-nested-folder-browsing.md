# 20260915-0046-release-nested-folder-browsing Release the nested folder browsing fix

- **status**: implementing
- **createdAt**: 2026-09-15 00:46
- **approvedAt**: 2026-09-15 00:46
- **relatedTask**: 20260915-0046-release-nested-folder-browsing

## Context

The nested folder browsing repair is integrated on local `main` at `f2d2e894c282663db2f023d20875b4314d0f03d2`, with a focused built-production browser regression covering `parent/child/grandchild/example.mmd`. The current published release is `v0.11.1`, targeting `9eab6c37605d2e2f7acc59d3b1aab04b970af1a6`. GitHub has neither a `v0.11.2` tag nor release. The repository's release rule uses a patch version for an ordinary defect fix and requires the exact main candidate to pass hosted Linux x64/native verification before creating an immutable annotated tag.

## Proposal

1. Commit the release tracking records with the already reviewed repair, without changing application code, dependencies, or release automation.
2. Push the candidate to `main` and require a successful hosted verification for that exact commit.
3. Validate and create annotated tag `v0.11.2` at that verified commit, then push only the tag.
4. Require the tag workflow to repeat verification and publish a non-draft, non-prerelease release with `merdeck.tar.gz` and `SHA256SUMS`.
5. Download and verify the published checksums and bundle metadata, then record the immutable tag, commit, workflow, and asset evidence in a follow-up documentation commit pushed to `main`.

## Risks

- A version tag is immutable, so it must only be created after the exact pushed candidate has passed its hosted verification.
- If either workflow fails, the tag must not be moved and release assets must not be replaced; the failure will be inspected before any authorized retry.
- The release tag excludes the post-publication evidence record by design; that record is committed separately only after publication is verified.

## Scope

Included: the reviewed nested-folder browsing repair and its completed records, one patch release, and release-evidence tracking. Excluded: changes to product behavior, dependencies, security boundaries, release automation, and unrelated project files.

## Alternatives

Do not publish: this would leave the completed defect fix unavailable to release consumers. A minor release would overstate the operator-visible impact of this bounded frontend defect repair.

## Annotations

- The owner explicitly authorized the push and release on 2026-09-15. This approval applies after the investigation and proposal recorded above.
- Approval recorded 2026-09-15 00:46; release execution may proceed within the proposal scope.
