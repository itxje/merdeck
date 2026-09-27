# 20260916-1335-release-html-void-elements Release safe-HTML void element fix

- **status**: completed
- **createdAt**: 2026-09-16 13:35
- **approvedAt**: 2026-09-16 13:34 UTC
- **completedAt**: 2026-09-16 13:59
- **relatedTask**: 20260916-1335-release-html-void-elements

## Context

Safe HTML document preview threw React error #137 when rendering documents containing `<hr>` or `<br>` because void element tags were passed children in `React.createElement`. The reviewed correction renders void tags without children, preventing React runtime errors while retaining the complete security boundary and element allowlist. This defect correction changes no endpoint shape, provider protocol, dependency or persistence format, so it selects patch version `v0.13.2`.

The repository tag workflow repeats native source, executable, bundle and browser verification before publication. A successful tag run publishes only `merdeck.tar.gz` and `SHA256SUMS`; it does not deploy or restart a separately hosted service.

## Proposal

1. Require the exact implementation commit to pass frozen installs, clean local lint, types, unit tests and repository checks.
2. Push that reviewed commit to `main` and require its exact GitHub workflow to pass Linux x64/ext4 native source, executable, bundle and browser acceptance.
3. Create and push annotated tag `v0.13.2` only at that verified commit. Never move the tag after creation.
4. Require the tag workflow to repeat native verification and publish a non-draft, non-prerelease release containing exactly `merdeck.tar.gz` and `SHA256SUMS`.
5. Download both assets, verify `SHA256SUMS`, inspect the extracted bundle version and commit identity, then record immutable evidence in a later documentation-only commit.

## Risks

- A version tag is immutable and must not be created before exact-commit hosted verification passes.
- Publication does not update or restart an independently running Merdeck service.

## Scope

Included: the reviewed safe-HTML void element fix, one patch release, release assets and immutable evidence tracking. Excluded: deployment/restart and unrelated worktree files.
