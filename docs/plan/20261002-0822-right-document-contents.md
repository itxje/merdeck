# 20261002-0822-right-document-contents Remove the document filename row and move contents right

- **status**: in_progress
- **createdAt**: 2026-10-02 08:19
- **approvedAt**: 2026-10-02 08:19 (explicit layout request and established release authorization)
- **relatedTask**: 20261002-0822-right-document-contents

## Context

The shared Markdown/HTML reader reserves a 48px full-width toolbar for a repeated filename and a contents toggle. Contents currently occupy a resizable left column and narrow drawers open on the left.

## Proposal

Remove the filename and full-width toolbar row. Let the article start at the reader top. Put the contents header and independently scrolling list in a right column, with the separator on its left. Reverse horizontal drag and arrow-key width deltas so moving the separator left grows the right rail. Keep the width preference and reset behavior. When the rail is hidden or the pane is narrow, show a compact contents button at the top right with sufficient article clearance. Open narrow contents from the right. Documents without contents need no toolbar or reserved clearance.

## Risks

Retain the article element and scroll position across collapse. Preserve current-section navigation, bounds, focus return and phone touch targets. Reserve space for the compact button so it does not cover prose. Keep Markdown and HTML widths and table scrolling unchanged.

## Scope

Shared reader markup/CSS, existing unit/browser acceptance cases and delivery documentation. No rendering, file storage, authentication, runtime, dependencies or verification-policy changes.

## Alternatives

Removing only the filename text would retain the unused full-width row. A permanent narrow contents strip would reduce the reading width even when the list is closed.

## Acceptance

Focused red/green tests for filename absence, right-hand rail/drawer, reclaimed article height, spatial resize directions and retained navigation/scroll state; full frontend checks; inspected desktop/phone screenshots; implementation review; exact hosted source gate; normal tag native gate and verified public artifacts.

## Delivery revision

The initial v0.19.30 native run caught the old phone-mode browser assertion still waiting for the deleted filename toolbar. Correct that existing assertion to verify its removal and the raised article. Keep the production layout unchanged, preserve the failed annotated tag and reports, and deliver the checked correction with a new v0.19.31 tag. Re-run expanded local browser/frontend verification and exact source/native gates without reducing coverage or changing time limits.
