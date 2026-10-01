# 20261001-1739-simplify-header-brand-colors Simplify the header and use brand colors

- **status**: completed
- **createdAt**: 2026-10-01 17:39
- **approvedAt**: 2026-10-01 17:39 (explicit removal/color requests and existing publication authorization)
- **relatedTask**: 20261001-1739-simplify-header-brand-colors

## Context

The active-file header retains a static FileCode2 icon after hiding the filename. Files without an editable selected diagram show a Reading mode label. The logo uses the primary theme token, while synchronized and copied states use a separate green success token. The existing read-only document test asserts the label's presence.

## Proposal

Remove the static icon and Reading mode label, keeping the accessible filename. Show header file metadata only when there is a selected diagram. Change synchronized and copy icon colors to the existing primary theme token. Remove styles and success token definitions made unused by these changes. Update the existing read-only document assertion and verify the existing clipboard/save/status interactions. Commit and push the reviewed implementation, pass complete local/source checks, then publish v0.19.25 through the existing native tag workflow and verify the public artifacts.

## Risks

The header must retain an accessible filename and functional copy control for read-only documents. Whole-file synchronization states and attention colors remain meaningful. Brand colors must follow both theme variants. Native release acceptance must be established at the immutable final tag commit, using that run's checked artifacts.

## Scope

Workspace header, path-copy presentation, shared stylesheet, the existing workspace test, task/plan tracking and release acceptance documentation. Existing native verification/publication and public asset checks.

## Alternatives

The current primary token already colors the logo in both themes; introducing another color token is unnecessary.

## Verification checkpoint

The implementation at 0e476aa passes focused red/green verification, frontend lint/types, complete clean-source local preparation, exact hosted Linux x64/ext4 source verification, desktop/phone screenshot inspection and implementation review. The immutable candidate also passed complete native tag verification and same-run publication on attempt 1. Both artifact browser suites passed 108 cases with 17 configuration-dependent skips each. Public asset digests, SHA256SUMS, the annotated tag and the 97-file bundle's version/commit identity are verified for [v0.19.25](https://github.com/itxje/merdeck/releases/tag/v0.19.25). The task records the exact source and native workflow evidence. The existing release-note generator wording follow-up remains taskist #61.
