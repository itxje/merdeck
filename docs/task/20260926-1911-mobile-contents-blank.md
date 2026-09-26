# 20260926-1911-mobile-contents-blank Restore the phone document contents drawer

- **status**: in_progress
- **priority**: P1
- **owner**: root/session-20260926-1911
- **createdAt**: 2026-09-26 19:11

## Description

The owner reports that the v0.19.5 document contents drawer is a blank white panel on an iPhone. Identify why its title and links are not painted, repair the narrow reader without changing document content, and verify both Markdown and HTML where applicable.

The owner also asks to remove the redundant Document/Diagram switch shown for a Markdown file with Diagram disabled. Keep the switch where a Mermaid block can actually be selected.

## ActiveForm

Investigating the blank iPhone contents drawer.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- The screenshot shows a left-side white sheet and a blurred document behind it, with no visible title, close control or links. The live service reports v0.19.5.
- `DocumentReader` renders the title and contents into a Base UI Dialog popup. The existing browser test checks DOM visibility, opacity and keyboard interaction but does not check painted output. Linux WebKit completed those interactions; its global audit failed only on a cancelled network request.
- RED: a new WebKit viewport assertion fails because the popup rectangle starts at x=-160. The optimized production CSS drops `translate: none` from the drawer rule while preserving the shared popup's `translate: -50% -50%` utility. An inline override makes the title and links visible in Linux WebKit screenshots; the test body passes. Its global audit still reports the unrelated WebKit `Load request cancelled` event.
- GREEN: the inline translate override keeps the complete 320px drawer within a 390px viewport; the production-build WebKit screenshot shows the title, close control and chapter links. Both Chromium reader cases pass their full browser audit and new viewport/occlusion assertions. Frontend lint (two existing warnings), typecheck and build pass.
- The second screenshot shows a Markdown file with a disabled Diagram tab. The focused unit test first failed on the old switch, then all 12 workspace component cases passed after hiding the switch only for Markdown without Mermaid blocks.
