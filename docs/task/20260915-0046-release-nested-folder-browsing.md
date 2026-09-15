# 20260915-0046-release-nested-folder-browsing Release the nested folder browsing fix

- **status**: in_progress
- **priority**: P1
- **owner**: release-maintainer/20260915-0046
- **createdAt**: 2026-09-15 00:46

## Description

Publish the completed nested project-folder browsing repair as a patch release. Acceptance: a clean reviewed candidate containing the repair and release tracking is pushed to `main`; the exact candidate passes hosted Linux x64/native verification; an annotated `v0.11.2` tag resolves to that commit; the tag workflow publishes a non-draft, non-prerelease release with `merdeck.tar.gz` and `SHA256SUMS`; and the release evidence is committed and pushed afterward.

## ActiveForm

Releasing the nested folder browsing fix.

## Dependencies

- **blocked by**: 20260914-2342-fix-nested-folder-browsing (completed)
- **blocks**: (none)

## Notes

- Authorization (2026-09-15): the owner explicitly requested to push and release the completed repair.
- Investigation (2026-09-15): local `main` is three commits ahead of `origin/main` at `f2d2e894c282663db2f023d20875b4314d0f03d2`; the reviewed repair and its documentation are included in that candidate. `v0.11.1` is the latest published release, and `v0.11.2` is absent both as a remote tag and release. The repository release policy assigns ordinary defect fixes to a patch version, selecting `v0.11.2`. The exact candidate must still pass hosted verification before an immutable tag is created.
