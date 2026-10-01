# 20261001-1514-file-sync-status Present file synchronization with distinct shapes

- **status**: completed
- **createdAt**: 2026-10-01 15:14
- **approvedAt**: 2026-10-01 15:14 (explicit implementation request)
- **relatedTask**: 20261001-1514-file-sync-status

## Context

The header currently mixes a check icon for clean files with visible Saving, Unsaved and Saved text. Its presentation follows only the selected block; other unsaved blocks can remain. Draft warnings already capture save failure, external revision, deletion, session changes and unexpected save layout.

## Proposal

Render a small noninteractive status component using the existing circular-arrow icon and distinct check/dot/exclamation badges. Derive status from the full file, prioritize active saves, then warnings/locked drafts, then unsaved content. Keep descriptions visually hidden without title, tooltip or click actions. Add theme success tokens, phone-visible styling and reduced-motion handling.

## Risks

A successful save can leave a sibling block or newer edit unsaved; it must retain the pending shape. Review warnings must never show a synchronized check. Reduced motion must keep a distinct syncing shape.

## Scope

Header presentation, state component, focused unit/browser coverage and documentation. Complete normal local quality gate, matching source verification, native release acceptance and public asset verification under the existing delivery authorization.

## Alternatives

Cloud imagery would imply a service this project does not provide; circular arrows follow the owner's explicit non-cloud choice. Existing save/review semantics remain authoritative.

## Delivery

Published [v0.19.23](https://github.com/itxje/merdeck/releases/tag/v0.19.23) from `df4deb5122a50dac76ca090e718ae36bb1bbfc6c` after complete local preparation, [exact source verification](https://github.com/itxje/merdeck/actions/runs/36883730220), [complete native artifact acceptance and publication](https://github.com/itxje/merdeck/actions/runs/36884607204) and public asset checksum/build-identity verification. See [the task](../task/20261001-1514-file-sync-status.md).
