# 20260916-1945-remove-html-preview-restrictions Remove HTML preview restrictions and notice banner

- **status**: completed
- **priority**: P1
- **owner**: html-preview/20260916-1945
- **createdAt**: 2026-09-16 19:45

## Description

Address user request: "Safe preview: scripts, styles, forms, media and external resources are not executed or loaded. 这个限制和提示去掉" as well as feedback regarding full screen width utilization and Google Antigravity engine availability.
User clarified to:
1. Remove the top notice banner ("Safe preview: scripts, styles, forms, media and external resources are not executed or loaded.").
2. Lift restrictions on images, media, scoped `<style>` tags, and inline styles in HTML document preview.
3. Remove 1360px centered padding and 980px max-width on main to allow full width utilization across wide screens.
4. Update Antigravity engine provider label to "Google Antigravity", fix model parsing (CR/LF spinner line stripping), and configure `MERDECK_AGY_PATH` in `lode.toml`.

## ActiveForm

Removed HTML preview restrictions and notice banner; expanded full screen layout; fixed Google Antigravity engine provider.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- User requested on 2026-09-16 to remove the "Safe preview" notice banner and lift restrictions on images, media, and styles.
- Investigation & Implementation:
  - Removed notice banner from `html-document-view.tsx`.
  - Supported `img`, `picture`, `audio`, `video`, `source`, `track`, scoped `<style>`, and safe inline styles in `html-policy.ts` and `html-document-view.tsx`.
  - Widened CSP in `boundary.ts` to allow `img-src 'self' data: https:` and `media-src 'self' data: https:`.
  - Expanded HTML document view padding to `24px 36px` without 1360px restriction, and set `main` to full width.
  - Renamed provider label to `Google Antigravity` and fixed `agy models` output parsing to strip interactive spinner output.
  - Added `MERDECK_AGY_PATH` in `lode.toml`.
- Proposal: [20260916-1945-remove-html-preview-restrictions](../plan/20260916-1945-remove-html-preview-restrictions.md).
