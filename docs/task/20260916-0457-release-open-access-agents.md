# 20260916-0457-release-open-access-agents Release open-access agent support

- **status**: completed
- **priority**: P1
- **owner**: coordinator/20260916-0457
- **createdAt**: 2026-09-16 04:57

## Description

Publish the reviewed open-access agent correction as patch release `v0.13.1`. Acceptance: the exact clean candidate passes local and hosted Linux x64/ext4 native gates before an annotated tag is created; the tag workflow publishes exactly the documented bundle and checksum assets; downloaded assets and embedded identity are independently verified; immutable evidence is recorded afterward.

## ActiveForm

Publishing open-access agent support.

## Dependencies

- **blocked by**: 20260916-0425-open-access-agents (completed)
- **blocks**: (none)

## Notes

- Authorization: the owner directed that completed repairs be published with release tags.
- Investigation: `v0.13.0` is the latest published release. `v0.13.1` is absent locally, from the remote tag namespace and from GitHub Releases. The correction removes an unintended token-only restriction from the existing AI editor without changing endpoint schemas, provider protocols, dependencies or persistence, so the documented pre-1.0 policy selects a patch release.
- Candidate: implementation commit `7fcf0f7015a1095c41f3650a9eac68a2ea15a4f5`; the exact clean worktree passed `check:ci`, both compiled-product browser suites, the configured-provider open-access browser case, `git diff --check`, and the tracked-file cleanliness check. GitHub [run 35058661638](https://github.com/itxje/merdeck/actions/runs/35058661638) then passed the required Linux x64/ext4 native gate for the same SHA.
- Proposal: [20260916-0457-release-open-access-agents](../plan/20260916-0457-release-open-access-agents.md).
- Verification (2026-09-16): Hosted tag run 35059368541 published v0.13.1; downloaded assets passed checksum, bundle structure and identity checks.

- complete: Tag v0.13.1 published on GitHub Releases.
