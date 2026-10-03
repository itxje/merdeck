# 20261003-0522-ui-consistency-audit Unify interface control styles

- **status**: implementing
- **createdAt**: 2026-10-03 05:22
- **approvedAt**: 2026-10-03 05:22 (explicit audit, correction and release request)
- **relatedTask**: 20261003-0516-ui-consistency-audit

## Context

The shared teal primary palette already drives brand, Save, selected file rows and tooltips. Theme/file-type selections and pane tabs instead use neutral fills, while document-current links use another treatment. Main header action glyphs mix primary and foreground colors. Desktop toolbar/close buttons use 24/28/32px sizes; contents buttons use 44px on desktop. Phone sizing selects button slots but misses dialog-close, dropdown/dialog triggers, inputs and menu items. Native engine/model selects differ from the shared inputs in radius, border and dark styling. Dialog titles share the body size and lack space for close controls; footer actions align left. The source heading duplicates the language label, leaving less room for context on narrow panels. Opening the assistant also makes source-footer statistics wrap beyond the fixed footer height.

## Proposal

Use primary/primary-foreground for persistent selections across theme, file types, pane tabs and current document contents; retain neutral surfaces and destructive/warning semantics. Align toolbar action glyphs to primary and retain 20px main-header glyphs and 16px panel/toolbar glyphs. Standardize compact desktop toolbar and popup-close targets to 32px, with 44px phone targets, including wrapped triggers, form inputs, menus and contents navigation. Use 16px phone input text and shared input border/radius/focus treatment for existing native engine/model selectors, with native color scheme matching the chosen theme. Give visible dialog titles the 15px heading step and close-button clearance, and align footer actions to the trailing edge. Remove the repeated source-language badge and use a shrinkable single-line source title/context so narrow headings keep their close action contained. Keep source-footer statistics on one line with ordinary ellipsis and a full-text title; retain the block/line location. Preserve the original 20% source-pane minimum on roomy layouts, with a 64px floor for the 32px close action, 8px gap and 12px side insets; observe the actual group panel width and keep the 40px collapsed rail. Let both footer fields shrink and retain complete titles. Preserve existing controls, accessible labels, backend behavior, source editing, panel resizing, reading layout and dense full-width file rows.

## Risks

Larger phone controls may reduce space in assistant sheets and menus; verify 320/390px and short-height geometry. Larger desktop toolbar controls must retain the explorer's density acceptance. Primary selections must keep contrast in both schemes and preserve destructive colors. Wrapped primitives replace slots, so mobile target rules must cover their actual rendered slots. Title clearance must exclude visually hidden titles.

## Scope

Shared composition CSS, source-heading/footer markup, targeted browser acceptance, tracking and release documentation. Inspect header, explorer, editor, preview, document reader, assistant, menus, entry/login/review/logout dialogs and update notices. No backend, provider logic, dependency, stored-layout format, rendering-policy or release-policy changes.

## Alternatives

Flattening every icon and text style would lose hierarchy. Keep semantic sizes by role: main header icons 20px, ordinary toolbar icons 16px, compact file-row icons 14px and status metadata 12px. Rebuilding native selectors or redesigning the reading frame is unnecessary for these style corrections.

## Acceptance

Preserved browser RED before CSS changes, targeted GREEN in light/dark schemes, desktop and 320/390px screenshots, functional selection/menu/dialog/provider checks, containment, contrast, existing explorer density/pane/document/assistant short-sheet checks, frozen installs and complete frontend gates, implementation review, exact source acceptance, complete normal Linux x64/ext4 native gate, same-run publication and verified public assets.

## Annotations

The owner explicitly requests identification, correction and completed release. Routine choices follow the existing palette, component system and established dense/phone layouts.

## Boundary correction

A late independent probe at the maximum 560px assistant width reproduced footer overflow at 1101px and 901px, header/metadata overflow at 768px, and a 32px collapsed action outside a 28px source rail at 701px. The percent-only expanded minimum may fall below the 40px collapsed size and the space required for controls. Correct the actual source-pane constraint using the observed sum of panel widths, keeping the original 20% rule with a 64px floor, and make both footer fields shrink. Extend existing light/dark acceptance across these breakpoints, actual assistant resize and source collapse/expand. This is within the owner's explicit control-size/layout correction request.

v0.19.36 completed canonical source/native verification and publication before the probe finished; its tag and release remain unchanged. Complete the correction and publish v0.19.37 with fresh exact-candidate gates.

The preview navigation also overflows at narrow desktop pane widths. Keep the existing bottom-left horizontal toolbar in roomy panes; use the pane's container width to bound its insets and lay out compact icon controls in rows when needed. Preserve 32px desktop/44px phone targets, the complete zoom output and the accessible Fit action. Verify actual zoom/Fit and containment at every wide-assistant breakpoint. The expanded source size restores its most recent ratio bounded by the current minimum; observers disconnect when the group detaches.
