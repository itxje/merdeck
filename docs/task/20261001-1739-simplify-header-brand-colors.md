# 20261001-1739-simplify-header-brand-colors Simplify the header and use brand colors

- **status**: completed
- **priority**: P2
- **owner**: header-worker/session-20261001-1739
- **createdAt**: 2026-10-01 17:39

## Description

Remove the static document icon and Reading mode header label. Use the logo's shared primary theme color for successful synchronization and the path-copy icons. Retain accessible file naming, draft/save state and clipboard behavior. Deliver the approved header refinements as v0.19.25 through complete native tag verification and public artifact validation.

## ActiveForm

The simplified header and controls using brand colors are published as v0.19.25.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

The explicit removal and color requests approve this Full-tier presentation change. The previous publication request continues to authorize delivery of these header refinements. The latest published version at preparation is v0.19.24. This patch removes decorative content, uses the existing primary token in light and dark themes, and retains the pending/attention state distinctions.

The existing read-only Markdown workspace test expects the Reading mode label. Update that assertion first and establish its failure, then apply the presentation change. Run focused workspace/copy/sync cases, frontend lint/types, the normal complete clean-source local gate and exact hosted source verification. Review real desktop/phone screenshots, then tag the reviewed candidate. The final tag workflow must pass complete Linux x64/ext4 native acceptance before same-run publication; verify downloaded reports, public digests/checksum and bundle/tag/commit identity.

## Implementation and focused verification

The header no longer renders the decorative document icon or Reading mode label. Its accessible filename and copy control remain, and selected diagrams retain their contextual synchronization status. Synchronized, copy and copied icons use the same primary token as the logo in both themes. Remove the obsolete icon/label rules and now-unused separate success token definitions.

The existing read-only document case first failed on the removed-label assertion, then all 26 workspace/copy/sync cases passed. Frontend lint and type checks pass with existing warnings. Local diff review found no actionable introduced issues. At that checkpoint, complete clean-source local/source checks, screenshot inspection and native release acceptance remained pending. Evidence is under /home/alan/warehouse/merdeck-header-brand/.

## Complete preparation

Clean implementation 0e476aa05d1688a8f06e4c875e6988b419b71483 passed both frozen installs and the complete local ARM64/overlayfs check:ci gate with distinct tmpfs refusal storage: frontend 620, backend 303, file 212, storage 6 and release/CI 52 cases. Both artifact browser suites passed 108 cases with 17 configuration-dependent skips each. Desktop and phone screenshots confirm the removed decorative content and shared logo color. Local implementation review passes with zero actionable findings.

[Exact implementation source verification](https://github.com/itxje/merdeck/actions/runs/36901267579) passed on Linux x64/ext4, with clean commit identity, separate tmpfs refusal storage and physical source/bundle/compiled directory checks confirmed in downloaded reports. The reviewed implementation is the immutable v0.19.25 candidate. At preparation, complete native tag acceptance and public artifact verification were pending; the final results are recorded below. Release evidence is under /home/alan/warehouse/merdeck-release-v0.19.25/.

## Tagged candidate

The annotated v0.19.25 tag is pushed at 0e476aa05d1688a8f06e4c875e6988b419b71483. [The tag workflow](https://github.com/itxje/merdeck/actions/runs/36902158987) passed complete native acceptance and same-run publication on attempt 1.

## Final acceptance and delivery

Downloaded sanitized reports confirm actual Linux x64/ext4 (0xef53, device 2049, descriptor mount 27 / 8:1) and distinct tmpfs refusal storage (0x1021994, device 26, descriptor mount 32 / 0:26). All twenty raw storage controls, file/HTTP checks, physical source/bundle/compiled directory adapters and the complete normal native gate passed with cleanup. Both artifact browser suites passed 108 cases with 17 configuration-dependent skips each, in 4.8m and 5.0m. Native acceptance is explicitly passed.

The publisher downloaded checked artifact 11182746879 from the same run and commit, with verified artifact digest sha256:1bc72246f0c28b6e4ec47176847430e45d03cd4d5b69e879a1f4bd4bc4bff33e. No prior artifact or duplicate pre-tag native run was used.

[v0.19.25](https://github.com/itxje/merdeck/releases/tag/v0.19.25) is published. Both public attachments match GitHub digests and publisher provenance; SHA256SUMS validates the archive. The 97-file bundle reports version 0.19.25, tag v0.19.25, commit 0e476aa05d1688a8f06e4c875e6988b419b71483, bundle target and Bun 1.4.2. The annotated remote tag resolves to that commit. Archive SHA-256: bc9868ec5d1c726525df852f164b3ad525dc09c1897d0f1a41eb686e409a05d8.

Release notes describe the header removals and brand colors with the exact documented runtime/platform requirements, retaining the verified publisher marker and unchanged assets. Evidence is under /home/alan/warehouse/merdeck-release-v0.19.25/. The existing release generator wording follow-up remains taskist #61.

- complete: Removed decorative header content, applied shared brand colors and published v0.19.25 after complete local/source/native verification; same-run artifact, public digests/checksum, tag and bundle identity verified.
