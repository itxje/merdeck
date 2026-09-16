# 20260916-1405-release-agy-agent-provider Release Antigravity (agy) agent provider

- **status**: in_progress
- **priority**: P1
- **owner**: release/20260916-1405
- **createdAt**: 2026-09-16 14:05

## Description

Publish Antigravity (`agy`) agent provider support as minor release `v0.14.0`. Acceptance: the exact clean candidate passes local checks, is committed and pushed to `main`, passes hosted Linux x64/ext4 native gates; an annotated tag `v0.14.0` is created and pushed; the tag workflow publishes exactly the documented bundle and checksum assets; downloaded assets and embedded identity are verified.

## ActiveForm

Publishing Antigravity (agy) agent provider support as `v0.14.0`.

## Dependencies

- **blocked by**: 20260916-1346-support-agy-agent-provider (completed)
- **blocks**: (none)

## Notes

- Authorization: the owner explicitly requested "要" on 2026-09-16 to release the new changes.
- Version selection: adding a new engine provider (`agy`) extends capabilities and endpoint provider schemas in a backward-compatible manner, selecting minor version `v0.14.0`.
- Proposal: [20260916-1405-release-agy-agent-provider](../plan/20260916-1405-release-agy-agent-provider.md).
