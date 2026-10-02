# 20261002-0903-preview-controls-bottom-left Anchor preview controls at the bottom left

- **status**: in_progress
- **priority**: P2
- **owner**: zoom-left/session-20261002-0903
- **createdAt**: 2026-10-02 09:03

## Description

Move the diagram zoom/Fit toolbar from the bottom center to the bottom left of its preview canvas on desktop and phones. Keep existing bottom spacing and verify controls remain contained and usable. Deliver through the established release workflow.

## ActiveForm

Anchoring preview navigation at the bottom left and verifying its layout.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Standard tier: one shared CSS rule and the existing pane browser case. The explicit positioning request provides upfront approval, and established release authorization covers delivery. Current positioning uses left:50% and translateX(-50%); replace these with a 16px left inset, keeping 18px desktop and 11px phone bottom spacing. The toolbar remains relative to the preview pane, including when source panes resize/collapse. Extend existing browser acceptance to require a contained toolbar at the canvas left edge, exercise zoom/Fit and inspect desktop/phone screenshots. No zoom calculations, rendering, pane sizing, storage, dependencies or verification-policy changes. Centering would retain the requested positioning problem; no alternative layout is needed.

Evidence belongs under /home/alan/warehouse/merdeck-zoom-left/ and /home/alan/warehouse/merdeck-release-v0.19.32/. Final acceptance requires exact source verification, the normal complete Linux x64/ext4 check:ci --native with distinct refusal storage, same-run publication and public asset verification. Existing deferred taskist items remain outside this change.

## Implementation and local acceptance

Replace horizontal centering with a 16px left inset in the shared preview-controls rule. The existing 18px desktop and 11px phone bottom offsets remain intact. One existing pane browser case first fails on the original centered toolbar, then passes at the canvas bottom-left edge on desktop, after pane resizing, and on phone. Both affected browser cases pass with actual zoom/Fit interaction, zero unexpected errors and confirmed fixture/service cleanup. Both frozen installs, frontend lint/types, all 622 frontend cases with coverage, build and git diff --check pass. Four existing unrelated lint warnings remain. Desktop/phone screenshots have been inspected; implementation review has zero actionable introduced findings. Evidence is under /home/alan/warehouse/merdeck-zoom-left/ and tmp/e2e-yRWSr1/. Exact source/native and public delivery acceptance remains pending.
