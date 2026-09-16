# 20260916-1335-release-html-void-elements Release safe-HTML void element fix

- **status**: in_progress
- **priority**: P1
- **owner**: html-document/20260916-1335
- **createdAt**: 2026-09-16 13:35

## Description

Publish the safe-HTML void element rendering correction as patch release `v0.13.2`. Acceptance: the exact clean candidate passes local and hosted Linux x64/ext4 native gates before an annotated tag is created; the tag workflow publishes exactly the documented bundle and checksum assets; downloaded assets and embedded identity are independently verified; immutable evidence is recorded afterward.

## ActiveForm

Publishing safe-HTML void element fix.

## Dependencies

- **blocked by**: 20260916-1328-fix-html-void-elements (completed)
- **blocks**: (none)

## Notes

- Authorization: the owner explicitly directed "commit and push ,then release" on 2026-09-16.
- Investigation: `v0.13.1` is the latest published release. `v0.13.2` is absent locally and from GitHub Releases. The correction prevents React error #137 when rendering `<hr>` and `<br>` elements in safe-HTML documents without changing endpoint schemas, dependencies or persistence, so this defect correction selects patch version `v0.13.2`.
- Candidate: implementation commit with the fix to `web/src/features/document/html-document-view.tsx` and unit regression test.
- Proposal: [20260916-1335-release-html-void-elements](../plan/20260916-1335-release-html-void-elements.md).
