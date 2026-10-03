# 20261003-0516-ui-consistency-audit Audit and unify interface styles

- **status**: completed
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

v0.19.36 at 500760a7bf0520c6997fdd9d3182c6dcd37f8e01 passed exact source run 37100969807 and normal native/publication run 37101171892, both artifact suites passing 112 cases with 17 configuration-dependent skips. Public assets, checksums and build identity are verified under /home/alan/warehouse/merdeck-release-v0.19.36/. A later independent probe reproduced source controls/metadata outside their panes with the maximum 560px assistant at 1101/901/768/701px. It completed after publication; cancellation was rejected because the run had already completed. Preserve the immutable release and add a verified correction in v0.19.37. The task and plan remain in progress. Preserved failures: footer-boundary-red-browser.log and expanded-boundary-red-browser.log under the local evidence directory.

## Boundary correction verified locally

Maintain the original 20% expanded source minimum with a 64px control floor and the original 40px collapsed rail. Observe the actual panel-width sum, disconnect when the group detaches, and restore the latest expanded ratio within the current minimum. Both metadata fields shrink on one line and retain full titles. Bound preview controls to their pane and arrange compact icon controls in rows when necessary, preserving desktop/phone targets, complete zoom output and accessible Fit.

Independent source-boundary and preview-toolbar failures are preserved. The final affected suite passes 39 cases with three configuration-dependent skips, all 42 audit records reporting zero unexpected errors, and confirmed three-service/fixture cleanup. Both schemes verify actual widest-assistant resize, source collapse/expand and toolbar/source containment at 1440/1101/1100/901/768/701px; actual zoom/Fit and phone 320/390px behavior pass. Existing contrast, explorer density, pane persistence, document and assistant geometry checks pass. Both frozen installs, lint/types, all 622 frontend cases with coverage, production build and whitespace checks pass. Corrected narrow light/dark screenshots have been inspected. Local implementation review has zero actionable introduced findings. Fresh exact-candidate v0.19.37 source/native gates and public delivery remain pending.

## Complete acceptance and delivery

Implementation a29cecc01b2ad537dd63651405a8f7f151a3b189 passed both frozen installs, frontend lint/types, all 622 frontend cases with coverage, production build and whitespace checks. The final affected browser suite passed 39 cases with three configuration-dependent skips, zero unexpected errors and confirmed service/fixture cleanup. Light/dark geometry and colors, 320/390px phone forms/menus/assistant controls, dialog alignment, current contents, bounded source headings/metadata and responsive preview controls, explorer density, pane resize, contrast and short-sheet/safe-area checks pass. Both schemes verify actual widest-assistant resize, source collapse/expand and zoom/Fit at 1440/1101/1100/901/768/701px. Representative desktop/phone screenshots have been inspected. Implementation review has zero actionable introduced findings. Local evidence is under /home/alan/warehouse/merdeck-ui-consistency/; the exact final browser root is recorded in final-browser.log.

[Exact source verification](https://github.com/itxje/merdeck/actions/runs/37103052489) passed on the clean candidate with Linux x64/ext4, separate tmpfs refusal storage and physical source/bundle/compiled adapters verified in downloaded reports.

The immutable annotated v0.19.37 tag resolves to a29cecc01b2ad537dd63651405a8f7f151a3b189. [The tag workflow](https://github.com/itxje/merdeck/actions/runs/37103273261) passed the complete normal Linux x64/ext4 check:ci --native gate and same-run publication on attempt 1. Downloaded reports verify clean identity, matching held-descriptor ext4 provenance (0xef53), distinct tmpfs refusal storage (0x1021994), all twenty raw storage controls, file/HTTP checks and physical source/bundle/compiled adapters with cleanup. Both artifact browser suites passed 112 cases with 17 configuration-dependent skips each, in 4.2m and 4.3m. Native acceptance is explicitly passed.

The publisher downloaded checked artifact 11267050818 from the same run and commit, with verified artifact digest sha256:c058bb300aff276dea16c130f0ad8cd68189d5e71c6b041ceec33937e337b4b3.

[v0.19.37](https://github.com/itxje/merdeck/releases/tag/v0.19.37) is published. Both public attachments match GitHub digests and publisher provenance; SHA256SUMS validates the archive. The 97-file bundle reports version 0.19.37, tag v0.19.37, commit a29cecc01b2ad537dd63651405a8f7f151a3b189, bundle target and Bun 1.4.2. Archive SHA-256: 0c00e7eb0b5f48281968e9fffb59ded7bc529d0cac4cad463eaf89d487545357.

Release notes describe the interface color, size and layout corrections and documented runtime/platform requirements, retaining the publisher marker and both asset identities. Evidence is under /home/alan/warehouse/merdeck-release-v0.19.37/. Taskist #65 is resolved by the source-heading/footer layout and its light/dark containment acceptance. Existing #51 (minimum-width filename readability), #61 (generated support wording) and #64 (local ARM64 compiled-browser budget) remain outside this style-consistency delivery; no new deferred work was introduced.

- complete: Complete local/source/native acceptance, published v0.19.37 and verified public assets; the plan records completion.
