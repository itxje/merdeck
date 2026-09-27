# 20260927-0924-document-media-full-viewport Fill the document media zoom viewport

- **status**: completed
- **priority**: P2
- **owner**: root/session-20260927-0924
- **createdAt**: 2026-09-27 09:24

## Description

Open both Markdown diagrams and HTML images in a near-full-screen zoom dialog. Fit each medium proportionally into the available viewport on open; preserve zoom, drag panning, mobile bounds, and document scroll isolation.

## ActiveForm

Verifying full-viewport framing for both document media types.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

The owner clarified that Markdown and HTML should behave alike. The existing dialog sizes itself around the media's unzoomed dimensions, making small images open in a small frame.
The HTML browser regression failed on the previous 623px viewport at 1440px screen width. Both focused production browser cases now pass with proportional fit, retained drag panning and no background scrolling. Frontend typecheck, lint and production build pass. The full clean-source gate is pending.

## Verification

The focused production browser run passed both HTML and Markdown cases; the same cases passed in all three full-gate overlay attempts. Frontend typecheck, lint, build, and all 585 frontend unit tests passed. `git diff --check` passed. The local full `check:ci` did not pass: on the actual overlayfs fixture, unrelated existing browser cases intermittently received HTTP 503 from `/api/diagrams/directory` (and one directory revision HTTP 409). The three attempts failed at different cases; none involved the changed zoom component. A first attempt using the workspace's virtiofs was invalid for the existing raw-invalid-UTF-8 filename test, so subsequent attempts used overlayfs with a separate tmpfs refusal fixture. Native x64/ext4 acceptance and release were not run.

- complete: Focused browser and frontend checks pass; aggregate local gate remains red on unrelated intermittent directory HTTP errors.
