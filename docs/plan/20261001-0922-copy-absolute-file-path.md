# 20261001-0922-copy-absolute-file-path Compact the header and copy absolute file paths

- **status**: implementing
- **createdAt**: 2026-10-01 09:22
- **approvedAt**: 2026-10-01 09:22 (owner explicitly requests the copy control)
- **relatedTask**: 20261001-0922-copy-absolute-file-path

## Context

The header currently renders the selected project-relative path as its heading. The client does not receive the service's canonical root, so an absolute filesystem path must come from the authenticated backend rather than being inferred in the browser.

## Scope

Show the filename without its directory prefix and add a labelled, keyboard-accessible copy icon beside it. Resolve the validated active file path from the service's canonical project root through the existing API boundaries. Keep save and diagram context. Show concise copy success/failure feedback. Reuse project buttons/tooltips and the browser clipboard API.

## Acceptance

Prove nested/Unicode filenames and exact absolute copied bytes, ordinary/root files, auth/Origin/path refusal, empty selection, copy failure and active-file changes. Run affected backend/frontend suites, lint/typecheck/build, focused real-browser acceptance, implementation review and the required project quality gate. Delivery follows the existing commit/push/release authorization.

## Implementation decisions

Add the location read to the existing diagram API module instead of exposing the configured root through public build/session metadata. It delegates validation and containment to the normal repository read, keeping errors and limits intact. Continue the existing documented plain-Hono/Zod compatibility approach. Prepare location data with Query before the clipboard gesture; do not infer service/container/host roots. Keep the icon beside the filename/metadata group to preserve the 58px phone header with a 44px button. A check mark and accessible success status avoid consuming filename width.
