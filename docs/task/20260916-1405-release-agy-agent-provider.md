# 20260916-1405-release-agy-agent-provider Release Antigravity (agy) agent provider

- **status**: completed
- **priority**: P1
- **owner**: release/20260916-1405
- **createdAt**: 2026-09-16 14:05

## Description

Publish Antigravity (`agy`) agent provider support and HTML document rendering improvements (sidebar TOC layout, typography, anchor scroll and width) as minor release `v0.14.0`. Acceptance: the exact clean candidate passes local checks, is committed and pushed to `main`, passes hosted Linux x64/ext4 native gates; an annotated tag `v0.14.0` is created and pushed; the tag workflow publishes exactly the documented bundle and checksum assets; downloaded assets and embedded identity are verified.

## ActiveForm

Published Antigravity (agy) agent provider support and HTML document rendering improvements as `v0.14.0`.

## Dependencies

- **blocked by**: 20260916-1346-support-agy-agent-provider (completed)
- **blocks**: (none)

## Notes

- Authorization: the owner explicitly requested "要" on 2026-09-16 to release the new changes.
- Version selection: adding a new engine provider (`agy`) extends capabilities and endpoint provider schemas in a backward-compatible manner, selecting minor version `v0.14.0`.
- Proposal: [20260916-1405-release-agy-agent-provider](../plan/20260916-1405-release-agy-agent-provider.md).
- Verification:
  - Exact commit `e6feda6b2feefa91de7bb5d647bf415b45dedb7a` passed [hosted native Linux x64/ext4 acceptance on main](https://github.com/itxje/merdeck/actions/runs/35111679279).
  - Annotated tag `v0.14.0` created and pushed to `origin`.
  - [Tag release workflow run 35113027330](https://github.com/itxje/merdeck/actions/runs/35113027330) repeated full acceptance and published release [v0.14.0](https://github.com/itxje/merdeck/releases/tag/v0.14.0) with `merdeck.tar.gz` (sha256: `d70953d3d051ef5faa4b4dcd7e48cea6a26a193486ba6d7ff3f7902d512a4506`) and `SHA256SUMS`.
