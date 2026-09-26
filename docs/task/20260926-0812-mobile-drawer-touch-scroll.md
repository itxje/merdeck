# 20260926-0812-mobile-drawer-touch-scroll Restore touch scrolling in the mobile file drawer

- **status**: in_progress
- **priority**: P1
- **owner**: root/session-20260926-1006
- **createdAt**: 2026-09-26 08:12

## Description

The owner reports that the project files drawer cannot be swiped upward on a phone. The supplied screenshot shows a populated drawer with 17 loaded files and only part of the list visible. Make the remaining file rows reachable by touch while retaining narrow-screen containment, the close control, search, pagination, and focus behavior.

## ActiveForm

Verifying the first-open mobile drawer scrolling fix.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation: the phone drawer is a Base UI modal whose popup clips overflow. The explorer navigation element alone has `overflow: auto`; its header, search, and footer do not scroll. Existing `drawer.spec.ts` checks scroll geometry and assigns `scrollTop` directly but does not exercise a touch swipe. The screenshots show iOS browsers.
- Local reproduction: a disposable production service with 17 diagram files at a 402 by 874 CSS-pixel mobile viewport received a real Chromium touch swipe starting on a file row. The navigation region measured 291px client height and 583px scroll height; its `scrollTop` moved from 0 to 265. This rules out a browser-independent CSS height collapse at the screenshot's approximate size, but does not prove iOS behavior. The disposable service was stopped and its root removed.
- The owner clarified that entering through the phone Files button leaves the list unswipeable until a page refresh or a type change. Type changes replace the directory-list navigation element with a search-results navigation element. The new screenshot identifies iPhone Safari; the earlier screenshot shows a populated list under the filter field.
- The pinned Playwright WebKit binary now launches after installing its host dependencies. On Linux WebKit, reopening Files after choosing a file yields a 272px-tall navigation element with 821px of content and `overflow-y: auto`; assigning `scrollTop` succeeds. Native iOS finger scrolling remains untestable on this host. Chromium mobile touch swipes over the first-open file rows scroll normally, so the defect is specific to the iOS interaction or its scroll-layer setup, not a cross-browser height collapse.
- Proposal (standard tier): make the mobile file-list navigation an explicit vertical touch scroll region from its first mount, including the compact-to-populated transition; preserve the fixed drawer controls and existing list height. Add focused first-open/reopen browser coverage for scroll reachability and rerun the drawer and frontend checks. Risk: Linux browser automation cannot prove native iOS gesture behavior; the owner must validate on the affected phone after deployment. Alternative: make the whole popup scroll, which would also move its controls and footer and change the drawer interaction more broadly.
- The owner approved proceeding with the recorded approach on 2026-09-26. The phone drawer's immediate listing and search-results navigation now retain an explicit vertical native touch scroll surface, including while the directory is compact. Header, search, footer, dialog focus, and list height are unchanged.
- Verification so far: frontend build and typecheck pass; lint passes with two existing warnings. All three drawer browser tests pass at narrow widths. A disposable 24-file Chromium mobile touch test opens a file, reopens Files without switching types, and moves the directory list from scroll position 0 to 200 on its first swipe. Linux WebKit confirms first-open scroll geometry but cannot emulate a native iOS finger swipe. Full repository gate and owner-side iPhone validation remain pending.

- unclaim: Owner deferred the earlier mobile swipe report while the filter and dark preview changes proceed.
