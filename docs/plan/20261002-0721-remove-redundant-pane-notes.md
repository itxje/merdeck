# 20261002-0721-remove-redundant-pane-notes Remove redundant editor and preview notes

- **status**: completed
- **createdAt**: 2026-10-02 07:21
- **approvedAt**: 2026-10-02 07:21 (explicit removal request and established release authorization)
- **relatedTask**: 20261002-0721-remove-redundant-pane-notes

## Context

The file-editor header always renders a subtitle, choosing Direct local CLI session when idle. Preview renders a 31px footer containing the diagram title and interaction instructions; the title also names the diagram accessibly. Shared pane-footer styles also serve the source metadata row and remain needed. The floating preview toolbar's desktop/phone bottom offsets include the removed footer height.

## Proposal

Render the header subtitle only for active editing or reconnecting. Remove the preview footer entirely and subtract its 31px height from the existing floating-toolbar offsets so its distance from the canvas edge stays the same. Extend existing unit/browser cases to verify absent redundant text, retained dynamic state, canvas height, usable zoom/fit and phone layout. Run focused and full frontend gates, exact hosted source verification, the normal tag native gate and public release checks.

## Risks

Preserve actionable editing/reconnecting state and accessible diagram naming. The canvas must fill the removed row, and its controls must fit without overlapping phone navigation. Source metadata uses shared footer styles and must remain intact.

## Scope

Agent header markup, preview footer markup, two related toolbar offsets, existing affected tests and delivery documentation. No application lifecycle, authentication, persistence, renderer, dependency or verification-policy changes.

## Alternatives

Hiding only the instruction text would leave an empty footer taking space. Removing shared footer CSS would also remove source metadata styling.

## Acceptance

Implemented and published v0.19.29 after focused red/green, full frontend gates, inspected desktop/phone screenshots, implementation review, exact source verification, the complete canonical tag native gate and public artifact verification. [The task](../task/20261002-0721-remove-redundant-pane-notes.md) records the checked candidate and run identities.
