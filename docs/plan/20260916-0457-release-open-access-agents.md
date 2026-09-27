# 20260916-0457-release-open-access-agents Release open-access agent support

- **status**: completed
- **createdAt**: 2026-09-16 04:57
- **approvedAt**: 2026-09-16 04:57 UTC
- **relatedTask**: 20260916-0457-release-open-access-agents

## Context

Release `v0.13.0` introduced the direct AI file editor but required token access even though Merdeck already supports an explicitly acknowledged open-access deployment. The reviewed correction permits an explicitly configured provider in that existing authorization mode, retains exact-Origin mutation checks and every provider/process boundary, and exposes the same engine/model interface without a cookie or CSRF value. It changes no endpoint shape, provider protocol, dependency, persistence format or release automation, so this defect correction selects patch version `v0.13.1`.

The repository tag workflow repeats native source, executable, bundle and browser verification before publication. A successful tag run publishes only `merdeck.tar.gz` and `SHA256SUMS`; it does not deploy or restart a separately hosted service.

## Proposal

1. Require the exact implementation commit to pass frozen installs, the complete clean local `check:ci` gate and the configured-provider open-access production-browser case.
2. Push that reviewed commit to `main` and require its exact GitHub workflow to pass Linux x64/ext4 native source, executable, bundle and browser acceptance.
3. Create and push annotated tag `v0.13.1` only at that verified commit. Never move the tag after creation.
4. Require the tag workflow to repeat native verification and publish a non-draft, non-prerelease release containing exactly `merdeck.tar.gz` and `SHA256SUMS`.
5. Download both assets, verify `SHA256SUMS`, inspect the extracted bundle version and commit identity, then record immutable evidence in a later documentation-only commit.

## Risks

- A version tag is immutable and must not be created before exact-commit hosted verification passes.
- Open access deliberately authorizes every client that can reach the service. Publication must retain the operator warning and must not weaken the explicit non-loopback acknowledgement or executable-path boundary.
- Local ARM64/overlay verification cannot establish the required Linux x64/ext4 native acceptance; the hosted gate remains mandatory.
- Publication does not update or restart an independently running Merdeck service.

## Scope

Included: the reviewed open-access agent correction, one patch release, release assets and immutable evidence tracking. Excluded: deployment/restart, provider account setup, bundled provider executables, public binding changes, release-workflow changes and unrelated worktree files.

## Alternatives

- Delaying publication would leave release consumers on the token-only defect.
- Reusing or moving `v0.13.0` would violate immutable release identity.
- Selecting a minor version would overstate a correction that changes no API shape or provider protocol.

## Annotations

- 2026-09-16: The owner previously directed that subsequent completed repairs be released with tags, authorizing this patch release after its gates pass.
- 2026-09-16: Exact candidate `7fcf0f7015a1095c41f3650a9eac68a2ea15a4f5` passed the clean local gate, including both compiled-product browser suites and the configured-provider open-access browser case. GitHub [run 35058661638](https://github.com/itxje/merdeck/actions/runs/35058661638) passed Linux x64/ext4 native acceptance for the same SHA before tag creation.
