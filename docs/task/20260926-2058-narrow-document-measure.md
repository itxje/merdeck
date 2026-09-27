# 20260926-2058-narrow-document-measure Narrow Markdown and HTML reading width

- **status**: completed
- **priority**: P2
- **owner**: reader/session-20260926-2058
- **createdAt**: 2026-09-26 20:58

## Description

Center Markdown and HTML document content in a shared 800px maximum frame with 24px horizontal padding. Keep responsive narrowing, aligned tables and local horizontal scrolling.

## ActiveForm

Adjusting the shared document measure and verifying both readers.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation: Both readers use `.document-reader` and their own body wrapper. The shared CSS currently caps bodies at 80rem and adds responsive horizontal padding to the scrolling article. The browser layout test still expects prose wider than 900px.
- Proposal: Move the horizontal inset to the centered body wrappers, set their border-box maximum to 800px with 24px padding, and update the existing layout assertion. Keep contents rail, document scrolling, and table framing as they are.
- Risk: Narrower lines can change wrapping and table overflow; verify desktop alignment and narrow keyboard scrolling for both formats.
- Authorization: The user directly requested an approximately 800px centered content design with 24px horizontal padding.
- RED: The HTML and Markdown browser layout cases each failed against the old computed 1280px maximum.
- GREEN: Both body wrappers compute to an 800px border-box maximum with 24px side padding. All four document reader browser cases pass against the rebuilt production frontend; desktop screenshots show centered prose/tables and narrow screenshots retain local table scrolling.
- `bun run check` passes: 292 backend tests, 582 frontend tests, lint, typechecks and production builds. Frontend lint reports two existing warnings outside this change. `git diff --check` passes.
- This change is local to the working tree; the separate v0.19.6 release task and running service are untouched.

- complete: Centered 800px reader measure verified by four browser cases and bun run check.
