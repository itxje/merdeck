# 20260915-0156-release-short-mobile-file-listing Release the short mobile file-listing fix

- **status**: implementing
- **createdAt**: 2026-09-15 01:56
- **approvedAt**: 2026-09-15 01:56 UTC
- **relatedTask**: 20260915-0156-release-short-mobile-file-listing

## Context

The completed short-screen mobile Project files listing repair is currently local at `24a61f5b7b7b08608ab7bf917c40680a98a50366`, one commit ahead of `origin/main`. The latest published release is `v0.11.2`, targeting `55a2f0ba7ba6283b3a6d6f34d0772ebefbef9067`; GitHub has neither a `v0.11.3` tag nor release. The repository release procedure requires a candidate to pass hosted Linux x64/native verification before an immutable annotated tag is created, and the tag workflow repeats verification before publishing the bundle assets.

The repair is a bounded mobile presentation defect fix, so the documented versioning rule selects patch version `v0.11.3`. Focused implementation checks and review passed. The local aggregate check retained a documented cumulative browser-order failure in a pre-existing UTF-8 source-cap case; it is not treated as a passing aggregate and the exact hosted candidate remains authoritative for publication.

## Proposal

1. Commit the existing repair and completed records with these release tracking records, without changing application code, dependencies, or release automation.
2. Push the candidate to `main` and require successful hosted verification for its exact commit.
3. Validate and create annotated tag `v0.11.3` at that verified commit, then push only that tag.
4. Require the tag workflow to repeat verification and publish a non-draft, non-prerelease release containing `merdeck.tar.gz` and `SHA256SUMS`.
5. Download the published assets, verify the checksum and extracted bundle identity, then record the immutable tag, commit, workflow, and asset evidence in a follow-up documentation commit pushed to `main`.

## Risks

- A version tag is immutable, so it must only be created after the exact pushed candidate has passed hosted verification.
- If either workflow fails, the tag must not be moved and published assets must not be replaced; the failed evidence must be inspected before any retry.
- The release tag intentionally excludes the post-publication evidence record, which is committed only after publication and verification succeed.

## Scope

Included: the completed short mobile listing repair and its records, one patch release, and release-evidence tracking. Excluded: product behavior changes, dependencies, security-boundary changes, release automation changes, deployment restarts, and unrelated project files.

## Alternatives

Do not publish: this would leave the completed repair unavailable to release consumers. A minor release would overstate the impact of this narrowly scoped mobile presentation defect fix.

## Annotations

- The owner explicitly authorized the commit, push, and release on 2026-09-15. This approval applies after the investigation and proposal recorded above.
- Approval recorded 2026-09-15 01:56 UTC; release execution may proceed within the proposal scope.
