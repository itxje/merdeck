# 20260914-2308-release-mobile-drawer Release the mobile file drawer fix

- **status**: completed
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
- Implementation (2026-09-14): committed the reviewed repair as `9eab6c37605d2e2f7acc59d3b1aab04b970af1a6` (`fix: improve mobile file drawer`) and pushed it to `main`. [Hosted main verification](https://github.com/itxje/merdeck/actions/runs/34907616557) passed its complete Linux x64/native source, executable and browser acceptance for that exact commit. `v0.11.1` was validated by the release-version parser, created as annotated tag object `49abec3ad160cedd13576d1583d982db6f39d8bd`, and pushed only after that successful verification; the tag resolves to the same commit.
- Verification (2026-09-14): [the tag workflow](https://github.com/itxje/merdeck/actions/runs/34908456433) passed its repeat verification and publication jobs. [Merdeck 0.11.1](https://github.com/itxje/merdeck/releases/tag/v0.11.1) was published at 23:30 UTC, neither draft nor prerelease, with `merdeck.tar.gz` (1,227,464 bytes, sha256 `3d2bdfa90d7ddb0858863d7bbf420f377dad2b1217694897594cee6aa4a8cefb`) and `SHA256SUMS` (81 bytes, sha256 `109dfa0262727dc20e71f81f81f2449e79361633fe14b096f5f80777a8aa40f9`). Downloaded assets passed `sha256sum --check`; the 95-entry archive's `merdeck.js --version` reported `Merdeck 0.11.1`, and `--build-info` reported the exact tag, commit, bundle target and Bun 1.4.2.
