# 20260919-1736-ui-refresh-plan Plan a UI refresh: type, colour, interaction, mobile

- **status**: in_progress
- **priority**: P2
- **owner**: l1/session-20260918-1627
- **createdAt**: 2026-09-19 17:36

## Description

Audit the whole interface and propose a UI refresh covering style, type, interaction and the phone layout,
with a previewable design so the owner can approve a direction before any implementation.

Measured on the running service (Bun 1.4.2 build of `main`, root `/workspace`):
- Desktop 1440x900: 95 elements render below 12px, the smallest at 9px; the explorer spends 346px of chrome
  above the first file row; file names are middle-truncated so six of eight `flow-*.mmd` names read the same.
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
- Preview served for the owner over the project-local nsl route; evidence in ignored `tmp/`.
- The plan stays at `draft` until the owner picks an accent and an order; no source file was changed.
