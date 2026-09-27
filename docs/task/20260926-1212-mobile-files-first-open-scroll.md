# 20260926-1212-mobile-files-first-open-scroll Repair first-open Files scrolling on iOS

- **status**: in_progress
- **priority**: P1
- **owner**: root/session-20260926-1212
- **createdAt**: 2026-09-26 12:12

## Description

The owner reports that v0.19.3 still cannot scroll the populated phone Files drawer immediately after opening it. Using the drawer's Refresh control or switching a file type makes it scrollable. Diagnose the first-open scroll layer and correct the actual iOS interaction while retaining drawer controls, layout and focus.

## ActiveForm

Investigating the still-broken first-open iOS scroll.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- The prior CSS-only attempt in 20260926-0812-mobile-drawer-touch-scroll did not fix the owner's phone. The deployed open-access instance reports version 0.19.3 through `/api/session`, so the failure is present in the released build, not explained by stale deployment.
- The screenshot shows 12 loaded files, selected and unselected rows, and more rows clipped under the footer. The visible scroll surface is the directory-list `<nav>` inside a fixed, clipping Base UI Dialog popup.
- Linux Chromium touch simulation and WebKit geometry checks passed before the failed release; neither reproduces native iOS gesture registration. Avoid treating them as proof of a fix.
- Proposal: [20260926-1213-mobile-files-touch-focus](../plan/20260926-1213-mobile-files-touch-focus.md). The drawer overrides Base UI's touch-aware initial focus and focuses the search input; the owner's screenshot shows that input focused. Refresh and type interactions move focus away. Test this focused hypothesis before another CSS change.
- RED: the new touch-open browser regression failed on v0.19.3 because the search input remained focused after tapping Files. GREEN: removing the explicit focus override leaves the Root breadcrumb focused and permits a first-swipe Chromium touch scroll over a file row. The existing drawer and file-operation focus checks were updated to preserve keyboard traversal, Escape and return focus. The failed v0.19.3 overflow declarations were reverted.
- Focused verification: six related Chromium browser cases pass, including the new first-open case. The same first-open focus/geometry case passes on Linux WebKit, which cannot emulate native iOS finger scrolling. Frontend build, lint (two existing warnings) and typecheck pass.
- Clean code commit `bfe0a9b` passed the local ARM64/overlay `check:ci`, including two 93-case browser runs and extracted-bundle acceptance. Review of the changed focus, CSS and tests found no further local issue. Linux x64/ext4 native acceptance and affected-iPhone confirmation remain pending.
- The same code shipped in [v0.19.4](https://github.com/itxje/merdeck/releases/tag/v0.19.4) after native x64/ext4 acceptance. The live service still reports v0.19.3; the owner must validate the affected iPhone after deploying the newer build before this task can be closed.
