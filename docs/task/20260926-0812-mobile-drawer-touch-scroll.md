# 20260926-0812-mobile-drawer-touch-scroll Restore touch scrolling in the mobile file drawer

- **status**: pending
- **priority**: P1
- **owner**: (unassigned)
- **createdAt**: 2026-09-26 08:12

## Description

The owner reports that the project files drawer cannot be swiped upward on a phone. The supplied screenshot shows a populated drawer with 17 loaded files and only part of the list visible. Make the remaining file rows reachable by touch while retaining narrow-screen containment, the close control, search, pagination, and focus behavior.

## ActiveForm

Investigating mobile drawer touch scrolling.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation: the phone drawer is a Base UI modal whose popup clips overflow. The explorer navigation element alone has `overflow: auto`; its header, search, and footer do not scroll. Existing `drawer.spec.ts` checks scroll geometry and assigns `scrollTop` directly but does not exercise a touch swipe. The screenshot appears to be iPhone Chrome; the exact gesture start area is being clarified.
- Local reproduction: a disposable production service with 17 diagram files at a 402 by 874 CSS-pixel mobile viewport received a real Chromium touch swipe starting on a file row. The navigation region measured 291px client height and 583px scroll height; its `scrollTop` moved from 0 to 265. This rules out a browser-independent CSS height collapse at the screenshot's approximate size, but does not prove iOS behavior. The disposable service was stopped and its root removed.
- The pinned Playwright WebKit binary downloaded for investigation, but this Linux arm64 host lacks its GTK/GStreamer/ICU dependencies, so no WebKit browser result is available. The user's answer about gesture start location remains pending.
- Workflow tier: standard. A targeted mobile CSS change plus a browser regression is expected, and the choice of scrolling surface depends on whether a gesture that starts over a file row also fails. Implementation awaits that distinction and the PMA proposal gate.

- unclaim: Owner deferred the earlier mobile swipe report while the filter and dark preview changes proceed.
