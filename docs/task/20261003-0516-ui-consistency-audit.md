# 20261003-0516-ui-consistency-audit Audit and unify interface styles

- **status**: in_progress
- **priority**: P2
- **owner**: visual-audit/session-20261003-0516
- **createdAt**: 2026-10-03 05:16

## Description

Review application controls, colors, sizes and layout across the header, explorer, editor, preview, document reader, assistant, menus and dialogs on desktop and phones in light/dark themes. Correct evidenced inconsistencies using the established primary palette and component system. Preserve content semantics, compact desktop density, phone touch targets and existing behavior. Verify and publish the completed change.

## ActiveForm

Auditing interface styles and standardizing inconsistent controls.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Full tier: cross-module visual audit, targeted fixes and browser acceptance. The owner explicitly requests the review, corrections and completed release, providing implementation and release authorization for this bounded style-consistency scope. Record a concrete plan before editing source. Do not redesign the theme or change backend, persistence, providers, dependencies or verification policy. Evidence belongs under /home/alan/warehouse/merdeck-ui-consistency/ and /home/alan/warehouse/merdeck-release-v0.19.36/.

Concrete investigation and authorized proposal: [the implementation plan](../plan/20261003-0522-ui-consistency-audit.md). Establish independent selection/toolbar and form/dialog/assistant browser regressions in both schemes before changing source styles.

## Implementation and local verification

Use primary fills/text for persistent selections and primary toolbar glyphs. Match compact desktop toolbar/close targets to 32px and phone controls/inputs/menus to 44px; preserve segmented-choice frames and dense file rows. Align native selectors with shared input border/radius/theme/focus, use 16px phone entry text, give dialog headings close-button clearance and align actions right. Remove the repeated source-language badge, fit narrow source heading/actions, and keep footer statistics single-line with a complete title and retained block/line position.

The final affected browser suite passed 39 cases with three configuration-dependent skips, all 42 audit records reporting zero unexpected errors, and cleanup of all three services/fixture roots. It covers light/dark palette and actual interactions, 320/390px phone geometry, contrast, explorer density, pane resize, document contents, and assistant short-height/safe-area behavior. The original styles failed new acceptance assertions; the later narrow-footer reproducer independently failed in both schemes before correction. Keep these failures, including corrected test setup and animation-sampling issues, as evidence. Both frozen installs, frontend lint/types, all 622 frontend cases with coverage, production build and whitespace checks pass. Representative desktop/phone screenshots have been inspected; local diff review has zero actionable introduced findings. Evidence: /home/alan/warehouse/merdeck-ui-consistency/.

Exact clean-candidate source acceptance, the complete normal Linux x64/ext4 native gate and verified v0.19.36 publication remain pending. Source/header follow-up #65 is included in this approved audit; existing unrelated follow-ups remain outside scope.

## Late desktop-boundary finding

v0.19.36 at 500760a7bf0520c6997fdd9d3182c6dcd37f8e01 passed exact source run 37100969807 and normal native/publication run 37101171892, both artifact suites passing 112 cases with 17 configuration-dependent skips. Public assets, checksums and build identity are verified under /home/alan/warehouse/merdeck-release-v0.19.36/. A later independent probe reproduced source controls/metadata outside their panes with the maximum 560px assistant at 1101/901/768/701px. It completed after publication; cancellation was rejected because the run had already completed. Preserve the immutable release and add a verified correction in v0.19.37. The task and plan remain in progress. Preserved failures: footer-boundary-red-browser.log and boundary-browser.log under the local evidence directory.

## Boundary correction verified locally

Maintain the original 20% expanded source minimum with a 64px control floor and the original 40px collapsed rail. Observe the actual panel-width sum, disconnect when the group detaches, and restore the latest expanded ratio within the current minimum. Both metadata fields shrink on one line and retain full titles. Bound preview controls to their pane and arrange compact icon controls in rows when necessary, preserving desktop/phone targets, complete zoom output and accessible Fit.

Independent source-boundary and preview-toolbar failures are preserved. The final affected suite passes 39 cases with three configuration-dependent skips, all 42 audit records reporting zero unexpected errors, and confirmed three-service/fixture cleanup. Both schemes verify actual widest-assistant resize, source collapse/expand and toolbar/source containment at 1440/1101/1100/901/768/701px; actual zoom/Fit and phone 320/390px behavior pass. Existing contrast, explorer density, pane persistence, document and assistant geometry checks pass. Both frozen installs, lint/types, all 622 frontend cases with coverage, production build and whitespace checks pass. Corrected narrow light/dark screenshots have been inspected. Local implementation review has zero actionable introduced findings. Fresh exact-candidate v0.19.37 source/native gates and public delivery remain pending.
