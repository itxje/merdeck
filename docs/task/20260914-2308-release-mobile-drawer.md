# 20260914-2308-release-mobile-drawer Release the mobile file drawer fix

- **status**: in_progress
- **priority**: P1
- **owner**: direct/release-mobile-drawer-20260914-2308
- **createdAt**: 2026-09-14 23:08

## Description

After the mobile project-files drawer repair was completed, the owner asked to commit, push and release it. Acceptance: a clean reviewed commit containing the repair is pushed to `main`; the exact commit passes the hosted Linux x64/native verification; an annotated `v0.11.1` tag resolves to that commit; its tag workflow publishes a non-draft, non-prerelease release with the checked `merdeck.tar.gz` and `SHA256SUMS` assets; and the release record is committed and pushed afterward.

## ActiveForm

Releasing the mobile file drawer fix.

## Dependencies

- **blocked by**: 20260914-1517-mobile-file-drawer (completed)
- **blocks**: (none)

## Notes

- Authorization (2026-09-14): the owner explicitly asked to "commit push and release" after asking for the mobile issue to be fixed directly.
- Investigation (2026-09-14): local `main`, `origin/main` and `HEAD` all resolve to `3d3d987a8718291976575095fb259fee57c712ff`; `v0.11.0` is the latest published tag and `v0.11.1` is absent locally, remotely and from GitHub Releases. The repository release procedure requires an annotated immutable tag only after the exact candidate has passed hosted Linux x64/native verification. The repair changes only narrow-screen drawer presentation and its design/browser coverage, so the README version rule selects patch version `v0.11.1`.
- Proposal (2026-09-14): commit the reviewed mobile drawer repair and its existing task/plan/design artifacts; push that commit to `main`; wait for its exact hosted verification to pass; validate `v0.11.1`, create and push an annotated tag at that exact commit, then wait for the tag workflow to verify and publish the release. Verify the published assets against `SHA256SUMS`, record the observed release identity, and commit/push that record. Do not move a tag, mutate a release, or publish if either required hosted verification fails.
- Risk control (2026-09-14): the local full aggregate did not obtain a clean provenance result because it began from a dirty source tree, and clean-candidate aggregate attempts exposed an existing source-pane end-to-end ordering instability. The focused new drawer cases, static checks and review passed, but only the hosted exact-commit gates may certify this release. A known ordering failure may be rerun once only after its failed log is inspected; any other failure stops publication for review.
