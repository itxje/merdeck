# 20261001-0238-workspace-usability Improve workspace navigation, editing context and feedback

- **status**: completed
- **priority**: P1
- **owner**: ui-worker/session-20261001-0238
- **createdAt**: 2026-10-01 02:38

## Description

Implement the eight approved interface review follow-ups (taskist 41–48): usable explorer search and breadcrumbs; compact unavailable editing panel; visible phone save feedback; explicit document diagram editing; current-section contents navigation; streamed conversation following and safe formatting; capability-aware save controls; larger primary navigation and source text.

## ActiveForm

Completed and verified the approved workspace usability improvements.

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

Focused regression assertions first failed against the original behavior. Conversation tests cover a manual scroll before its scroll event is delivered, viewport changes, streaming code-copy state and refused clipboard access. Browser regressions cover a 390×400 contents drawer, actual clipboard use, independent second-block saves, unavailable providers, hidden HTML headings and visually reordered sections. The latest seven usability browser cases passed; phone screenshots were visually inspected and retained.

Frozen root/frontend installs and the full local `bun run check:ci` passed on clean source commit `d4a374f9990e9255892c0111645a1f37349f7586`, using Bun 1.4.2, stable Node 24, ARM64/overlayfs (`0x794c7630`) and separate tmpfs refusal storage (`0x1021994`). File checks passed 209 tests, storage integration passed 6, backend checks passed 294, release checks passed 41, and frontend coverage passed 597 across 35 files (93.47% lines; 88.95% branches). ESLint reported four warnings and no errors. Physical directory checks passed through source, bundle and compiled application adapters. Executable and architecture-independent bundle browser suites each passed 106 tests, with 17 configuration-dependent skips; the separate configured-provider source suite passed all 17 relevant cases. Browser audits reported no unexpected errors. `git diff --check` passed.

Evidence: `/home/alan/warehouse/merdeck-ui-usability/check-ci-verified.log` (exit 0), `provider-browser.log`, focused regression logs and phone screenshots under that same directory; exported coverage and sanitized reports are in ignored `tmp/ci-evidence/`. Physical application-adapter evidence is in `tmp/directory-physical-H8u6c4/`.

Taskist 41–48 are closed as done, each with a completion note identifying the change, implementation location, checked commit and this task record.

Implementation self-review checked safe markup and links, block identity and write behavior, cleanup of observers/listeners, keyboard/focus behavior, and mobile layout. No remaining actionable introduced findings. Native Linux x64/ext4 delivery remains outside this local verification; no remote CI or release acceptance is claimed.

- complete: Implemented all eight approved follow-ups and passed full local check:ci on clean source commit d4a374f; native Linux x64/ext4 release acceptance remains outside this task.
