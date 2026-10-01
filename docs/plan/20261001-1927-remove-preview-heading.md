# 20261001-1927-remove-preview-heading Remove the redundant preview heading

- **status**: implementing
- **createdAt**: 2026-10-01 19:27
- **approvedAt**: 2026-10-01 19:27 (explicit conditional removal request and existing publication authorization)
- **relatedTask**: 20261001-1927-remove-preview-heading

## Context

The preview pane starts with a static Preview title and dynamic Live preview/rendering/stale status. This row has no controls. A separate preview-warning alert already explains rejected renders and retention of the last valid diagram. The canvas itself explains initial loading and empty source. Existing unit/browser tests use render status for readiness, and two contrast cases currently assert the visible row's colors.

## Proposal

Remove the heading wrapper and static title. Retain its dynamic role=status as sr-only text, and remove only the now-unused preview-live/preview-stale styles. Preserve visible error, empty/loading and interaction feedback. Update existing readiness/status assertions and keep the light/dark warning contrast checks meaningful. Commit and push, run the complete clean-source local/source gates, inspect desktop/phone screenshots, then publish v0.19.26 through complete native tag acceptance and public artifact verification.

## Risks

The last valid diagram must never be mistaken for a successfully rendered invalid draft; retain the existing visible error alert and accessible status. Hidden status must not consume layout height. Canvas fit, zoom/pan, node editing and links must work with the extra available height. The release must use the exact tag workflow's checked artifact.

## Scope

Preview component, its stylesheet rules, existing preview unit tests and affected browser readiness/contrast/state assertions. PMA tracking, release metadata and acceptance documentation. No renderer, storage, authentication or dependency changes.

## Alternatives

Keeping the heading repeats the already-labelled pane and consumes canvas height. Removing useful render feedback entirely is unnecessary; the existing accessible status and error alert preserve it.
