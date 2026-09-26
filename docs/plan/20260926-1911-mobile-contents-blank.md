# 20260926-1911-mobile-contents-blank Restore the phone document contents drawer

- **status**: completed
- **createdAt**: 2026-09-26 19:11
- **approvedAt**: 2026-09-26 19:08 UTC
- **relatedTask**: 20260926-1911-mobile-contents-blank

## Context

The released v0.19.5 shared document reader opens its contents through a Base UI Dialog in narrow panes. The owner's iPhone screenshot shows the sheet background but none of its title, close control or navigation content. The existing browser test confirms interaction in Chromium and Linux WebKit but lacks a visual check for the painted sheet. The document type and Safari desktop-site preference were requested from the owner and remain pending; investigation can proceed on both formats.

## Proposal

1. Reproduce the narrow contents sheet in the repository browser harness, inspect computed layout and rendered pixels, and add a regression that fails on the observed blank presentation.
2. Correct the root layout or stacking behavior with the smallest change in the shared reader. Preserve the independent article/contents scrolling and keyboard dismissal.
3. Verify Markdown and HTML on phone-sized Chromium and WebKit, run the relevant frontend checks and the repository gate, then record the iPhone validation limit.
4. The initial no-diagram Markdown switch correction is superseded by the owner's clarified request to remove the Markdown switch entirely. Track that change in the separate document layout task.

## Risks

- Linux WebKit does not exactly reproduce iOS Safari compositor behavior, so affected-device validation remains necessary.
- A dialog stacking change could affect other modal sheets; keep the change scoped to the contents drawer and check existing dialogs.

## Scope

Shared document reader, its CSS, and focused coverage. The Markdown switch change is tracked in the document layout task. No backend, document parsing, file explorer or dependency change.

## Alternatives

- Adding another forced repaint could mask the issue without addressing the sheet's layout or stacking; inspect the actual painted result first.

## Annotations

- 2026-09-26 19:08: The owner reported the blank mobile contents drawer, authorizing correction of the released behavior.
- 2026-09-26 19:11: The owner added that the Markdown Document/Diagram switch in a screenshot with Diagram disabled is not needed. The no-diagram condition is the narrow interpretation while a preference question remains pending.
- 2026-09-26 19:27: The owner clarified that the Markdown switch is unnecessary as a whole. The document layout task owns complete removal.

## Outcome

Clean code commit `606fc79` passed local ARM64/overlay `check:ci` with 582 frontend unit cases, two 96-case browser runs and bundle acceptance. The production-built Linux WebKit visual check shows the contents title and links on screen; its unrelated global audit flags a cancelled navigation request. Linux x64/ext4 native acceptance and affected-iPhone confirmation remain pending.

The combined reader candidate at `856be92` passed the complete local gate again with 582 frontend cases and two 98-case browser runs. Both production browser runs passed the contents viewport assertions. Release and affected-device confirmation remain pending.
