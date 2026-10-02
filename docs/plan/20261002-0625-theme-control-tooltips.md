# 20261002-0625-theme-control-tooltips Use primary tooltips and simplify the Save label

- **status**: implementing
- **createdAt**: 2026-10-02 06:25
- **approvedAt**: 2026-10-02 06:25 (explicit tooltip-color and Save-label request; established release authorization)
- **relatedTask**: 20261002-0625-theme-control-tooltips

## Context

The screenshot shows the Light theme tooltip using the shared tooltip primitive's foreground background and background text, with a matching arrow. Header Save embeds a separate kbd shortcut hint. Save keyboard handling is an independent window keydown listener; three stylesheet references apply only to the header hint.

## Proposal

Replace the shared tooltip background/text with primary/primary-foreground tokens and its arrow background/fill with primary. Remove the Save kbd element and its unused header-only CSS references. Extend existing unit/browser cases to check the exact Save text, painted popup/arrow colors and readable text in light/dark themes, retaining existing hover, focus and phone layout checks. Verify and publish v0.19.28.

## Risks

Both tooltip text and arrow must follow the active theme, including dark-mode foreground contrast. Removing the label must not change keyboard save behavior. Release artifacts must retain the checked tag/commit identity.

## Scope

Existing tooltip primitive, workspace Save markup, related stylesheet selectors, focused existing tests, delivery tracking and acceptance documentation. No dependencies, API, persistence, authentication, query lifecycle or renderer changes.

## Alternatives

Hardcoded tooltip teal would lose the theme contract. Changing popup or dialog surfaces globally would exceed the screenshot's control-tooltip request.
