# 20260919-1736-ui-refresh-plan Plan a UI refresh: type, colour, interaction, mobile

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-19 17:36

## Description

Audit the whole interface and propose a UI refresh covering style, type, interaction and the phone layout,
with a previewable design so the owner can approve a direction before any implementation.

Measured on the running service (Bun 1.4.2 build of `main`):
- Desktop 1440x900: 95 elements render below 12px, the smallest at 9px; the explorer spends 249px of chrome
  above the first file row; file names are middle-truncated so six of eight `flow-*.mmd` names read the same.
  The chrome figure was estimated at 346px when this was written and is the measured one here.
- Phone 390x844: the AI panel covers 89.6% of the viewport over the document, whichever file is open, because
  it docks open by default with no phone-specific placement.
- The palette is fully achromatic: every `oklch` token in `:root` and `.dark` has zero chroma, so nothing
  carries brand, state or emphasis through colour.

## ActiveForm

Planning the UI refresh.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Proposal: [20260919-1736-ui-refresh-plan](../plan/20260919-1736-ui-refresh-plan.md).
- The owner reviewed a preview of the proposed screens before approving; it was working material and is not
  kept in the repository.
- The owner approved the accent and all five tracks on 2026-09-19. Delivered on 2026-09-20 as five changes,
  one per track; this task changed no source file itself.
