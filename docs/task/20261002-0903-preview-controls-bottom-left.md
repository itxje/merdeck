# 20261002-0903-preview-controls-bottom-left Anchor preview controls at the bottom left

- **status**: completed
- **priority**: P2
- **owner**: zoom-left/session-20261002-0903
- **createdAt**: 2026-10-02 09:03

## Description

Move the diagram zoom/Fit toolbar from the bottom center to the bottom left of its preview canvas on desktop and phones. Keep existing bottom spacing and verify controls remain contained and usable. Deliver through the established release workflow.

## ActiveForm

Anchoring preview navigation at the bottom left and verifying its layout.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Standard tier: one shared CSS rule and the existing pane browser case. The explicit positioning request provides upfront approval, and established release authorization covers delivery. Current positioning uses left:50% and translateX(-50%); replace these with a 16px left inset, keeping 18px desktop and 11px phone bottom spacing. The toolbar remains relative to the preview pane, including when source panes resize/collapse. Extend existing browser acceptance to require a contained toolbar at the canvas left edge, exercise zoom/Fit and inspect desktop/phone screenshots. No zoom calculations, rendering, pane sizing, storage, dependencies or verification-policy changes. Centering would retain the requested positioning problem; no alternative layout is needed.

Evidence belongs under /home/alan/warehouse/merdeck-zoom-left/ and /home/alan/warehouse/merdeck-release-v0.19.32/. Final acceptance requires exact source verification, the normal complete Linux x64/ext4 check:ci --native with distinct refusal storage, same-run publication and public asset verification. Existing deferred taskist items remain outside this change.

## Implementation and local acceptance

Replace horizontal centering with a 16px left inset in the shared preview-controls rule. The existing 18px desktop and 11px phone bottom offsets remain intact. One existing pane browser case first fails on the original centered toolbar, then passes at the canvas bottom-left edge on desktop, after pane resizing, and on phone. Both affected browser cases pass with actual zoom/Fit interaction, zero unexpected errors and confirmed fixture/service cleanup. Both frozen installs, frontend lint/types, all 622 frontend cases with coverage, build and git diff --check pass. Four existing unrelated lint warnings remain. Desktop/phone screenshots have been inspected; implementation review has zero actionable introduced findings. Evidence is under /home/alan/warehouse/merdeck-zoom-left/ and tmp/e2e-yRWSr1/. Exact source/native and public delivery acceptance remains pending.

## Complete preparation and delivery

Implementation 94377f343d4ccee870eb7fadbb2b15c6bb8bf67c passed both frozen installs, frontend lint/types, all 622 frontend cases with coverage, build and whitespace checks. The initial browser case failed on the original centered location; both final affected browser cases pass with contained controls near the canvas bottom-left edge on desktop, after source-pane resizing and on phone. Actual zoom-in and Fit restore the displayed scale, with zero unexpected errors and confirmed cleanup. Desktop/phone screenshots have been inspected. Implementation review has zero actionable introduced findings. Local evidence is under /home/alan/warehouse/merdeck-zoom-left/ and tmp/e2e-yRWSr1/.

[Exact source verification](https://github.com/itxje/merdeck/actions/runs/36987745600) passed on the clean candidate with Linux x64/ext4, separate tmpfs refusal storage and physical source/bundle/compiled adapters verified in downloaded reports.

The immutable annotated v0.19.32 tag resolves to 94377f343d4ccee870eb7fadbb2b15c6bb8bf67c. [The tag workflow](https://github.com/itxje/merdeck/actions/runs/36988170775) passed the complete normal Linux x64/ext4 check:ci --native gate and same-run publication on attempt 1. Downloaded reports verify clean identity, matching held-descriptor ext4 provenance (0xef53), distinct tmpfs refusal storage (0x1021994), all twenty raw storage controls, file/HTTP checks and physical source/bundle/compiled adapters with cleanup. Both artifact browser suites passed 108 cases with 17 configuration-dependent skips each, in 4.4m and 4.5m. Native acceptance is explicitly passed.

The publisher downloaded checked artifact 11218851396 from the same run and commit, with verified artifact digest sha256:9371972a76e25187947f578f3c6529094231b96868b9dba700cb384706c4790e.

[v0.19.32](https://github.com/itxje/merdeck/releases/tag/v0.19.32) is published. Both public attachments match GitHub digests and publisher provenance; SHA256SUMS validates the archive. The 97-file bundle reports version 0.19.32, tag v0.19.32, commit 94377f343d4ccee870eb7fadbb2b15c6bb8bf67c, bundle target and Bun 1.4.2. Archive SHA-256: 6094374c86a5ba7adbe75db62a306a6274b2b656bf1657eef5b690e7243b7439.

Release notes describe the bottom-left diagram navigation and the documented runtime/platform requirements, retaining the publisher marker and both asset identities. Release evidence is under /home/alan/warehouse/merdeck-release-v0.19.32/. Existing deferred taskist #61 (generated support wording), #64 (local ARM64 compiled-browser budget) and #65 (narrow source heading) remain outside this positioning change.

- complete: Published v0.19.32 from 94377f343d4ccee870eb7fadbb2b15c6bb8bf67c after focused red/green, complete frontend and canonical source/native gates, same-run publication and public artifact verification.
