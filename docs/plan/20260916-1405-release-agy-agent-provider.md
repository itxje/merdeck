# 20260916-1405-release-agy-agent-provider Release Antigravity (agy) agent provider

- **status**: completed
- **createdAt**: 2026-09-16 14:05
- **approvedAt**: 2026-09-16 14:05 UTC
- **relatedTask**: 20260916-1405-release-agy-agent-provider

## Context

The Antigravity (`agy`) CLI engine provider support and HTML document rendering improvements (sidebar TOC layout, typography, anchor scrolling, and container allowlist) have been implemented, tested, and verified locally across backend and frontend. The user requested to release the changes. Adding a new engine provider and layout capabilities extends functionality in a backward-compatible manner, selecting minor release `v0.14.0`.

## Proposal

1. Commit the implementation, tests, and documentation to `main`.
2. Push `main` to `origin/main`.
3. Monitor hosted Linux x64/ext4 native verification workflow.
4. Once native verification passes on `main`, create annotated tag `v0.14.0` and push to `origin`.
5. Monitor tag release workflow to ensure verified release publication of `merdeck.tar.gz` and `SHA256SUMS`.
6. Verify published release assets and record evidence.

## Risks

- Tag `v0.14.0` must only be created after the candidate commit passes hosted Linux x64/ext4 native acceptance.
