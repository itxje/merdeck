# 20261001-0238-workspace-usability Improve workspace navigation, editing context and feedback

- **status**: in_progress
- **priority**: P1
- **owner**: ui-worker/session-20261001-0238
- **createdAt**: 2026-10-01 02:38

## Description

Implement the eight approved interface review follow-ups (taskist 41–48): usable explorer search and breadcrumbs; compact unavailable editing panel; visible phone save feedback; explicit document diagram editing; current-section contents navigation; streamed conversation following and safe formatting; capability-aware save controls; larger primary navigation and source text.

## ActiveForm

Implementing and verifying the approved workspace usability improvements.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

The owner authorized all eight recommendations on 2026-10-01 by requesting that taskist 41–48 be handled. This is a Full-tier frontend change; that instruction satisfies the implementation approval gate. Existing file save, authentication and external-change contracts remain the acceptance baseline. Unrelated in-progress tasks are outside this work.

## Implementation

Breadcrumbs occupy their own full-width row, file types use a single-choice menu, and secondary creation/restart actions use an overflow menu. Completed single-page listings omit redundant pagination controls. File names and desktop source use 14px text; phone source/search use 16px, with 44px touch targets for the new menus.

The unavailable editor is a compact dismissible notice. Editable documents name their diagram in the header and source label, and expose a separate Edit diagram action without changing zoom or independent save behavior. Reading documents without editable blocks have a Reading mode label and no Save control. Phone save feedback stays visible.

Both document formats derive current-section state from their article scroller and reveal the selected contents item after the phone drawer opens. Conversation following accounts for streamed text growth, viewport changes and a scroll event that has not yet been delivered. Manual reading pauses following until View latest content or a new instruction. Provider Markdown uses the existing parser, owned React elements, inert HTML/images and validated external links; displayed code can be copied with explicit failure feedback.

HTML current-section tracking uses visible heading positions sorted by their actual layout, so hidden targets and authored visual reordering do not select the wrong section. Its focused browser regression failed against DOM-order tracking and passed after the correction; the seven usability browser cases all passed without unexpected errors.

## Verification

The new assertions first failed against the original behavior. Initial frontend coverage passed 597 tests. After the final scroll and drawer corrections, the focused conversation unit suite passed 18 tests and the latest browser run passed all 9 focused cases, including a 390×400 contents drawer, actual clipboard use, independent second-block saves and viewport changes. Browser audits reported no unexpected errors. Phone screenshots were visually inspected and retained under the task evidence directory.

Implementation self-review followed the frontend review policy, checking safe markup and links, block identity and write behavior, cleanup of observers/listeners, keyboard/focus behavior, and mobile layout. No remaining actionable introduced findings. Frozen root/frontend installs passed. The full local aggregate gate is next; it requires clean committed source provenance. Native Linux x64/ext4 delivery remains outside this local ARM64/overlay verification.
