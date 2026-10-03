# 20261003-0459-mobile-header-control-sizes Unify mobile header control sizes

- **status**: completed
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

## Canonical source and tag checkpoint

Exact hosted source run 37098455131 passed for clean commit adc2d25288bce66f8559b15c07d5ea4bd15954de on Linux x64/ext4 with distinct tmpfs refusal storage. Downloaded reports verify all twenty raw storage controls, file/HTTP checks, physical source/bundle/compiled adapters and cleanup. The immutable annotated v0.19.35 tag was created after the clean-main and local/source review gate; normal tag-native workflow 37098700418 is running. Native acceptance and public publication remain pending.

## Complete preparation and delivery

Implementation adc2d25288bce66f8559b15c07d5ea4bd15954de passed both frozen installs, frontend lint/types, all 622 frontend cases with coverage, production build and whitespace checks. The original 32px logo first failed the new mobile assertion; both existing header browser cases then passed. Desktop geometry remains 32px; phone checks at 320/360/390px confirm 44px logo/control heights, a 20px logo content viewport and action icons, aligned centers, contained controls, working menus and explorer actions. Both cases report zero unexpected errors and confirmed service/fixture cleanup. All three phone header screenshots have been inspected. Implementation review has zero actionable introduced findings. Local evidence lives under /home/alan/warehouse/merdeck-mobile-header/ and tmp/e2e-Gdpowr/.

[Exact source verification](https://github.com/itxje/merdeck/actions/runs/37098455131) passed on the clean candidate with Linux x64/ext4, separate tmpfs refusal storage and physical source/bundle/compiled adapters verified in downloaded reports.

The immutable annotated v0.19.35 tag resolves to adc2d25288bce66f8559b15c07d5ea4bd15954de. [The tag workflow](https://github.com/itxje/merdeck/actions/runs/37098700418) passed the complete normal Linux x64/ext4 check:ci --native gate and same-run publication on attempt 1. Downloaded reports verify clean identity, matching held-descriptor ext4 provenance (0xef53), distinct tmpfs refusal storage (0x1021994), all twenty raw storage controls, file/HTTP checks and physical source/bundle/compiled adapters with cleanup. Both artifact browser suites passed 108 cases with 17 configuration-dependent skips each, in 4.0m and 4.1m. Native acceptance is explicitly passed.

The publisher downloaded checked artifact 11265127940 from the same run and commit, with verified artifact digest sha256:e9af85b82359b5c330d7db1c277b24947709e4348f038480f2e98489a0782d89.

[v0.19.35](https://github.com/itxje/merdeck/releases/tag/v0.19.35) is published. Both public attachments match GitHub digests and publisher provenance; SHA256SUMS validates the archive. The 97-file bundle reports version 0.19.35, tag v0.19.35, commit adc2d25288bce66f8559b15c07d5ea4bd15954de, bundle target and Bun 1.4.2. Archive SHA-256: 70d79d370529b68dbd422d30f3e5e3cd89258086b6cb327e60bc3626d73cbb96.

Release notes describe the mobile header size correction and the documented runtime/platform requirements, retaining the publisher marker and both asset identities. Release evidence is under /home/alan/warehouse/merdeck-release-v0.19.35/. Existing taskist #61 (generated support wording), #64 (local ARM64 compiled-browser budget) and #65 (narrow source heading) remain deferred outside this phone-header change; no new follow-up was introduced.

- complete: Mobile header size alignment verified; v0.19.35 published after complete source/native acceptance and public asset checks.
