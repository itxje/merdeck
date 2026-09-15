# 20260915-0119-investigate-mobile-project-files-listing Investigate the mobile project-files listing

- **status**: completed
- **priority**: P1
- **owner**: maintenance/mobile-listing-20260915-0119
- **createdAt**: 2026-09-15 01:19

## Description

Determine why the mobile Project files sheet appears to show only one folder row after it opens. Distinguish an actual server-side directory response from a clipped or otherwise inaccessible mobile listing before proposing any product change.

## ActiveForm

Resolved the mobile Project files listing.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Reported evidence (2026-09-15): the supplied mobile screenshot shows the Project files sheet at Root with one `ai` folder row, `0 loaded files`, `Pages 1–1`, and `End of this listing.` The sheet, filter, row, and pagination footer are visible; the evidence alone cannot distinguish a one-entry server response from a mobile scrolling/layout defect.
- Deployed observation (2026-09-15): the running service identifies itself as `0.11.2`. Its root directory endpoint returned 20 directory entries in one complete page, including `ai`; the server response is therefore not a one-folder listing.
- Reproduction (2026-09-15): at a 315 by 533 CSS-pixel mobile visual viewport, all 20 directory rows exist in the DOM, but the `Files and diagrams` navigation region has no usable client height. The fixed `min(64dvh, 36rem)` tree height is consumed by the explorer heading, breadcrumbs, controls, filter, type selector, scope hint, and expanded footer. The first row can bleed into the clipped sheet while the remaining rows are inaccessible.
- Existing coverage only exercises 390 by 844 and 360 by 844 populated drawers. It confirms scrolling where enough height exists but cannot detect a collapsed list on a short mobile visual viewport.
- Implementation (2026-09-15): short mobile sheets reserve at least 88 CSS pixels for both immediate directory rows and recursive search results. The footer becomes a compact grid in that state; an unavailable `Next page` control is hidden, while an enabled page control remains full-width and reachable. The visual scope hint is retained for assistive technology without consuming layout space.
- Regression coverage (2026-09-15): a disposable 101-folder fixture verifies the first and later folder rows, scrolling, enabled pagination containment, and a recursive `.mmd` result at 315 by 533 CSS pixels. The pre-change case measured a zero-height listing; the repaired case measures 88 CSS pixels.
- Design evidence (2026-09-15): `Mobile-file-drawer-short-screen.html` is a separately recorded 315 by 533 self-contained prototype. Its HTTP browser check passed all four groups. It remains `needs-review` and is not an approved product design.
- Verification (2026-09-15): root and frontend lint, frontend strict type checking, 473 frontend unit tests with coverage, the focused three-case drawer browser suite, and the isolated source-cap browser diagnostic all passed. The prescribed aggregate reached compiled browser acceptance; the new short-drawer regression passed there as case 26.
- Aggregate limitation (2026-09-15): the prescribed `bun run check:ci` did not complete because its compiled 67-case browser run returned 503 for `GET /api/diagrams/directory` in the pre-existing UTF-8 source-cap acceptance case before the new drawer case ran. It finished with 65 passed, one skipped, and that one failed. A fresh-service run of that same source-cap case passed, so the failure is isolated to the aggregate run order and is not evidence that the mobile drawer regression failed.
- Review (2026-09-15): local TypeScript frontend/backend and shared-policy review found no actionable introduced issue.

- complete: Short mobile listing regression is fixed and the focused browser coverage passed; the aggregate limitation is recorded in the task.
