# 20261003-0522-ui-consistency-audit Unify interface control styles

- **status**: implementing
- **createdAt**: 2026-10-03 05:22
- **approvedAt**: 2026-10-03 05:22 (explicit audit, correction and release request)
- **relatedTask**: 20261003-0516-ui-consistency-audit

## Context

The shared teal primary palette already drives brand, Save, selected file rows and tooltips. Theme/file-type selections and pane tabs instead use neutral fills, while document-current links use another treatment. Main header action glyphs mix primary and foreground colors. Desktop toolbar/close buttons use 24/28/32px sizes; contents buttons use 44px on desktop. Phone sizing selects button slots but misses dialog-close, dropdown/dialog triggers, inputs and menu items. Native engine/model selects differ from the shared inputs in radius, border and dark styling. Dialog titles share the body size and lack space for close controls; footer actions align left. The source heading duplicates the language label, leaving less room for context on narrow panels. Opening the assistant also makes source-footer statistics wrap beyond the fixed footer height.

## Proposal

Use primary/primary-foreground for persistent selections across theme, file types, pane tabs and current document contents; retain neutral surfaces and destructive/warning semantics. Align toolbar action glyphs to primary and retain 20px main-header glyphs and 16px panel/toolbar glyphs. Standardize compact desktop toolbar and popup-close targets to 32px, with 44px phone targets, including wrapped triggers, form inputs, menus and contents navigation. Use 16px phone input text and shared input border/radius/focus treatment for existing native engine/model selectors, with native color scheme matching the chosen theme. Give visible dialog titles the 15px heading step and close-button clearance, and align footer actions to the trailing edge. Remove the repeated source-language badge and use a shrinkable single-line source title/context so narrow headings keep their close action contained. Keep source-footer statistics on one line with ordinary ellipsis and a full-text title; retain the block/line location. Preserve existing controls, accessible labels, backend behavior, source editing, panel resizing, reading layout and dense full-width file rows.

## Risks

Larger phone controls may reduce space in assistant sheets and menus; verify 320/390px and short-height geometry. Larger desktop toolbar controls must retain the explorer's density acceptance. Primary selections must keep contrast in both schemes and preserve destructive colors. Wrapped primitives replace slots, so mobile target rules must cover their actual rendered slots. Title clearance must exclude visually hidden titles.

## Scope

Shared composition CSS, source-heading/footer markup, targeted browser acceptance, tracking and release documentation. Inspect header, explorer, editor, preview, document reader, assistant, menus, entry/login/review/logout dialogs and update notices. No backend, provider logic, dependency, persistence, rendering-policy or release-policy changes.

## Alternatives

Flattening every icon and text style would lose hierarchy. Keep semantic sizes by role: main header icons 20px, ordinary toolbar icons 16px, compact file-row icons 14px and status metadata 12px. Rebuilding native selectors or redesigning the reading frame is unnecessary for these style corrections.

## Acceptance

Preserved browser RED before CSS changes, targeted GREEN in light/dark schemes, desktop and 320/390px screenshots, functional selection/menu/dialog/provider checks, containment, contrast, existing explorer density/pane/document/assistant short-sheet checks, frozen installs and complete frontend gates, implementation review, exact source acceptance, complete normal Linux x64/ext4 native gate, same-run publication and verified public assets.

## Annotations

The owner explicitly requests identification, correction and completed release. Routine choices follow the existing palette, component system and established dense/phone layouts.
