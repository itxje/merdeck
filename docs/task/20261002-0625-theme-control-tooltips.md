# 20261002-0625-theme-control-tooltips Use primary tooltips and simplify the Save label

- **status**: in_progress
- **priority**: P2
- **owner**: tooltip-save/session-20261002-0625
- **createdAt**: 2026-10-02 06:25

## Description

Use the shared primary theme background and foreground for control tooltips, including their arrows, and remove the shortcut hint from the Save button. Verify both themes and publish v0.19.28 through the established acceptance pipeline.

## ActiveForm

Updating primary tooltip colors and simplifying Save, then verifying delivery.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Full tier: the shared tooltip, workspace markup, obsolete header shortcut CSS and existing browser assertions span multiple files. The explicit screenshot request approves this fully specified presentation change; established release authorization covers delivery. Keyboard save handling remains independently implemented and is outside the requested label removal. Inspect painted background/foreground and arrow colors, readable contrast and hover/focus behavior in both themes, desktop and phone geometry, and the exact Save text. Preserve existing functional checks, review the minimal diff and complete frozen installs plus clean local/source/native and public asset acceptance before publishing. Evidence belongs under /home/alan/warehouse/merdeck-tooltip-save/ and /home/alan/warehouse/merdeck-release-v0.19.28/.

## Implementation and focused verification

The shared control tooltip uses primary for its background and arrow background/fill, with primary-foreground text. Save shows only Save or Saving; the separate Ctrl/Meta+S listener and button behavior remain intact. Three obsolete header-only shortcut CSS references are removed.

The existing workspace assertion first failed on Save shortcut text, and the existing browser case first failed on the old tooltip background. All 19 affected workspace/theme cases now pass; frontend lint/types pass with four pre-existing unrelated warnings. Both existing header browser cases pass with zero unexpected browser errors and confirmed service/fixture cleanup. Painted popup background/text and arrow colors match the logo tokens in both themes, with at least 4.5:1 text contrast. Theme hover/focus, preference persistence, explorer controls and 320/360/390px phone layout still pass. The dark screenshot is captured after closing and reopening the popup following the theme change. Light/dark tooltip, Save and 320px header screenshots have been inspected; the minimal implementation review found zero actionable introduced issues.

Evidence: /home/alan/warehouse/merdeck-tooltip-save/ red/green unit/browser logs, confirm-browser.log and review.md; confirmed screenshots are under tmp/e2e-0ZZ8bC/browser-results/. Complete local/source/native verification and v0.19.28 delivery remain pending.
