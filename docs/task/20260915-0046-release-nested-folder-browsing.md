# 20260915-0046-release-nested-folder-browsing Release the nested folder browsing fix

- **status**: completed
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
- Implementation (2026-09-15): committed release tracking as `55a2f0ba7ba6283b3a6d6f34d0772ebefbef9067` and pushed it to `main`. [Hosted main verification](https://github.com/itxje/merdeck/actions/runs/34914655846) passed its complete Linux x64/native source, executable, and browser acceptance for that exact commit. `v0.11.2` was validated by the release-version parser, created as annotated tag object `e1aa91ab4e81794b1e5f5474217b84c460a05098`, and pushed only after that successful verification; the tag resolves to the same commit.
- Verification (2026-09-15): [the tag workflow](https://github.com/itxje/merdeck/actions/runs/34915373178) passed its repeat verification and publication jobs. [Merdeck 0.11.2](https://github.com/itxje/merdeck/releases/tag/v0.11.2) was published at 01:08 UTC, neither draft nor prerelease, with `merdeck.tar.gz` (1,227,244 bytes, sha256 `c3454f0b078d45d62b0a4a980ff1045d6d31c0ece985873df99f021d2c4f390c`) and `SHA256SUMS` (81 bytes, sha256 `3f6b3af8d877335802a8932034542b7938c1126a3daa64f496185a5aa8880cde`). Downloaded assets passed `sha256sum --check`; the 95-entry extracted bundle reports version 0.11.2 and the tagged commit.

- complete: Hosted verification, tag publication, checksum validation, and bundle metadata checks passed.
