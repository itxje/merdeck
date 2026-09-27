# 20260915-0403-release-compact-mobile-drawer-header Release the compact mobile drawer header fix

- **status**: completed
- **priority**: P1
- **owner**: release-maintainer/20260915-0403
- **createdAt**: 2026-09-15 04:03

## Description

Publish the completed compact mobile file-drawer header repair as a patch release. Acceptance: a clean reviewed candidate containing the repair and release tracking is pushed to `main`; the exact candidate passes hosted Linux x64/native verification; an annotated `v0.11.4` tag resolves to that commit; the tag workflow publishes a non-draft, non-prerelease release with `merdeck.tar.gz` and `SHA256SUMS`; and verified release evidence is committed and pushed afterward.

## ActiveForm

Releasing the compact mobile drawer header fix.

## Dependencies

- **blocked by**: 20260915-0230-compact-mobile-drawer-header (completed)
- **blocks**: (none)

## Notes

- Authorization (2026-09-15): the owner explicitly directed that completed repairs be committed, pushed, and released proactively; this authorizes the completed compact mobile drawer header repair.
- Investigation (2026-09-15): `v0.11.3` is the latest published release and resolves to `204271baa1471bb46da0358664e0dcc2ca28c035`; `v0.11.4` is absent locally, remotely, and from GitHub Releases. Local `main` and `origin/main` both resolve to `477584480fa73ce3a43f223a884a634022291fd9`. The uncommitted candidate contains the completed, reviewed mobile drawer repair, its browser and prototype coverage, and its implementation records. The documented release rule assigns a patch version to this bounded presentation defect. The repository tag workflow is configured to repeat complete Linux x64/native verification before publishing the bundle assets.
- Proposal (2026-09-15): commit the reviewed repair and its tracking together with this release record, without changing application behavior, dependencies, or release automation; push the candidate to `main`; require successful hosted verification for its exact commit; validate and create annotated tag `v0.11.4` only at that verified commit; wait for the tag workflow to repeat verification and publish the release; download and verify `SHA256SUMS` and bundle metadata; then record immutable evidence in a follow-up documentation commit pushed to `main`.
- Implementation (2026-09-15): candidate `ebebccdb384e8ddc04df720ba8a37d67a79c2354` passed [hosted main verification](https://github.com/itxje/merdeck/actions/runs/34927937221). Annotated tag `v0.11.4` resolves to that exact commit.
- Verification (2026-09-15): [the tag workflow](https://github.com/itxje/merdeck/actions/runs/34928586559) repeated native verification and published [Merdeck 0.11.4](https://github.com/itxje/merdeck/releases/tag/v0.11.4), neither draft nor prerelease. Downloaded `merdeck.tar.gz` (1,227,663 bytes, sha256 `7850ccf9ffea6363f95d4e2c8a501aa904b3d09d0eb852e71eb25847064893f0`) passed the downloaded `SHA256SUMS` (81 bytes, sha256 `eff97edb6eaa4a52bdacfeb0edb4c16023a05dd3aecc952400bda5479e30b5b2`). Its extracted 95-entry bundle reports version 0.11.4 and the tagged commit.

- complete: Hosted verification, tag publication, checksum validation, and bundle metadata checks passed. This release does not deploy or restart a separately hosted service.
