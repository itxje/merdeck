# 20261001-1739-simplify-header-brand-colors Simplify the header and use brand colors

- **status**: in_progress
- **priority**: P2
- **owner**: header-worker/session-20261001-1739
- **createdAt**: 2026-10-01 17:39

## Description

Remove the static document icon and Reading mode header label. Use the logo's shared primary theme color for successful synchronization and the path-copy icons. Retain accessible file naming, draft/save state and clipboard behavior. Deliver the approved header refinements as v0.19.25 through complete native tag verification and public artifact validation.

## ActiveForm

Updating the header presentation and verifying the existing file controls.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

The explicit removal and color requests approve this Full-tier presentation change. The previous publication request continues to authorize delivery of these header refinements. The latest published version at preparation is v0.19.24. This patch removes decorative content, uses the existing primary token in light and dark themes, and retains the pending/attention state distinctions.

The existing read-only Markdown workspace test expects the Reading mode label. Update that assertion first and establish its failure, then apply the presentation change. Run focused workspace/copy/sync cases, frontend lint/types, the normal complete clean-source local gate and exact hosted source verification. Review real desktop/phone screenshots, then tag the reviewed candidate. The final tag workflow must pass complete Linux x64/ext4 native acceptance before same-run publication; verify downloaded reports, public digests/checksum and bundle/tag/commit identity.

## Implementation and focused verification

The header no longer renders the decorative document icon or Reading mode label. Its accessible filename and copy control remain, and selected diagrams retain their contextual synchronization status. Synchronized, copy and copied icons use the same primary token as the logo in both themes. Remove the obsolete icon/label rules and now-unused separate success token definitions.

The existing read-only document case first failed on the removed-label assertion, then all 26 workspace/copy/sync cases passed. Frontend lint and type checks pass with existing warnings. Local diff review found no actionable introduced issues. Complete clean-source local/source checks, screenshot inspection and native release acceptance remain pending. Evidence is under /home/alan/warehouse/merdeck-header-brand/.
