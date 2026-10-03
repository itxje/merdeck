# 20261003-0459-mobile-header-control-sizes Unify mobile header control sizes

- **status**: in_progress
- **priority**: P2
- **owner**: mobile-header/session-20261003-0500
- **createdAt**: 2026-10-03 04:59

## Description

Align the phone header logo with the 44px control height and 20px icon viewport already used by copy, sync, assistant and overflow controls. Keep Save text, accessible touch targets, desktop density and phone navigation intact. Deliver through the established release workflow.

## ActiveForm

Aligning mobile header sizes and verifying narrow-screen controls.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Standard tier: one header composition, mobile CSS and its existing browser acceptance. The explicit size-unification request provides upfront approval; previous release authorization covers delivery. Investigation: mobile button targets increase from 32px to 44px, while the brand SVG retains a 32px box and 18px content viewport. Proposal: set the mobile brand box to 44px with 12px padding, producing a 20px content viewport; retain existing control and glyph sizes. Verify desktop remains 32px, mobile 320/360/390px header alignment and containment, menus and file actions. No dependencies, shared primitive changes or save behavior changes. Evidence belongs under /home/alan/warehouse/merdeck-mobile-header/ and /home/alan/warehouse/merdeck-release-v0.19.35/.

## Implementation and local acceptance

The phone-only brand SVG now has a 44px box with 12px padding and a 20px content viewport. Existing buttons and action icons already use those sizes. Desktop geometry stays at 32px. The existing header browser test now covers logo box/content size and vertical alignment along with control containment, glyph sizes, menu navigation and explorer actions at 320/360/390px.

Focused red: the new mobile logo check fails at the original 32px width, while the second header case passes. Green: both existing header cases pass with zero unexpected errors and confirmed service/fixture cleanup. All three phone header screenshots in tmp/e2e-Gdpowr/ have been inspected. Frozen installs, frontend lint/types, all 622 frontend cases with coverage, production build and whitespace checks pass; four pre-existing lint warnings remain. Implementation review passes with zero actionable introduced findings. Evidence: /home/alan/warehouse/merdeck-mobile-header/. Canonical source/native and public v0.19.35 delivery remain pending.
