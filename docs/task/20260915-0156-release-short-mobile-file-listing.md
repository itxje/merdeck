# 20260915-0156-release-short-mobile-file-listing Release the short mobile file-listing fix

- **status**: in_progress
- **priority**: P1
- **owner**: release-maintainer/20260915-0156
- **createdAt**: 2026-09-15 01:56

## Description

Publish the completed short mobile Project files listing repair as a patch release. Acceptance: a clean reviewed candidate containing the repair and release tracking is pushed to `main`; the exact candidate passes hosted Linux x64/native verification; an annotated `v0.11.3` tag resolves to that commit; the tag workflow publishes a non-draft, non-prerelease release with `merdeck.tar.gz` and `SHA256SUMS`; and verified release evidence is committed and pushed afterward.

## ActiveForm

Releasing the short mobile file-listing fix.

## Dependencies

- **blocked by**: 20260915-0119-investigate-mobile-project-files-listing (completed)
- **blocks**: (none)

## Notes

- Authorization (2026-09-15): the owner explicitly instructed completion of the commit, push, and release for the completed repair.
- Investigation (2026-09-15): `v0.11.2` is the latest published release and resolves to `55a2f0ba7ba6283b3a6d6f34d0772ebefbef9067`; `v0.11.3` is absent as both a remote tag and GitHub Release. Local `main` is one commit ahead of `origin/main` at `24a61f5b7b7b08608ab7bf917c40680a98a50366`, containing the reviewed short-screen mobile file-listing repair and its completed records. The documented release rule selects patch version `v0.11.3` for this bounded defect fix. Focused checks passed, while the local aggregate browser sequence retained the separately documented cumulative UTF-8 source-cap 503 limitation; hosted exact-commit acceptance remains the release gate.
- Proposal (2026-09-15): commit this release tracking without changing application behavior, dependencies, or automation; push the candidate to `main`; require successful hosted verification for its exact commit; validate and create annotated tag `v0.11.3` only at that verified commit; wait for the tag workflow to repeat verification and publish the release; download and verify `SHA256SUMS` and bundle metadata; then record immutable evidence in a follow-up documentation commit pushed to `main`.
