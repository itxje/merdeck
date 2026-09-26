# 20260926-1911-mobile-contents-blank Restore the phone document contents drawer

- **status**: in_progress
- **priority**: P1
- **owner**: root/session-20260926-1911
- **createdAt**: 2026-09-26 19:11

## Description

The owner reports that the v0.19.5 document contents drawer is a blank white panel on an iPhone. Identify why its title and links are not painted, repair the narrow reader without changing document content, and verify both Markdown and HTML where applicable.

The owner's clarified request removes the Markdown Document/Diagram switch entirely; that broader change is tracked by the document layout task.

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
- An initial no-diagram switch correction and focused test were included in `606fc79`. The later clarification requires complete removal; the document layout task supersedes this partial behavior.
- Clean code commit `606fc79` passed the complete local ARM64/overlay `check:ci`, including 582 frontend unit cases, two 96-case browser runs and bundle acceptance. Review found no additional issue in the changed reader positioning, conditional switch or focused assertions. Native Linux x64/ext4 acceptance and affected-iPhone confirmation remain pending.
