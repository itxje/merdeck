# RELEASE-001 Publish the first version-tag release

- **status**: completed
- **priority**: P2
- **owner**: Release maintainer
- **createdAt**: 2026-09-11 14:32

## Description

The project owner asked on 2026-09-11 why the repository has no GitHub release and then chose `v0.1.0` for the first one. Only the version-tag workflow publishes releases; pushes to `main` keep the checked executable as a temporary workflow artifact. Acceptance: an annotated `v0.1.0` tag on a commit that passed the complete native workflow, a tag workflow that repeats all checks and publishes a non-draft, non-prerelease release with `merdeck-0.1.0-linux-x64` and a matching `SHA256SUMS`, and documentation that no longer says no release exists.

## ActiveForm

Publishing the first version-tag release.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Approval (2026-09-11): the owner confirmed `v0.1.0` after the release process was explained, including that the tag is permanent release identity.
- Implementation (2026-09-11): checked that the local `main`, its tracking ref and the remote `main` all pointed at `be42c59` with a clean tree, that `v0.1.0` existed neither locally nor remotely and is a valid non-prerelease version for `scripts/release-version.ts`, and that the push workflow for `be42c59` had succeeded. The annotated tag `v0.1.0` ("Release v0.1.0") was created at `be42c5979761682a78b6e18c498dd5588e6a4c9c`, and only that tag was pushed.
- Verification (2026-09-11): the tag workflow run 34610698460 succeeded. Its verify job repeated the complete native checks on `be42c59`, and its publish job published the release. GitHub reports release `Merdeck 0.1.0` for tag `v0.1.0` at `be42c5979761682a78b6e18c498dd5588e6a4c9c`, published at 14:36 UTC, neither a draft nor a prerelease, with generated notes and the publisher's provenance marker. It carries two assets, `merdeck-0.1.0-linux-x64` (85,657,056 bytes) and `SHA256SUMS`. The remote tag is an annotated tag object for that commit. The downloaded executable passed `sha256sum --check` against the downloaded `SHA256SUMS` (`ed964ce47a90ccce717390b57f232a30e2f1bdb2e2c5936399ddf2ef27bb5020`), which matches the digest GitHub reports, and its ELF header identifies a 64-bit x86-64 executable; it was not run on this ARM64 host. README no longer says that no release exists.
- Follow-up (2026-09-12): at the owner's request, `v0.2.0` was published from `a2d2c87` with the same commands, so the executable carries the explorer file type filter. The tag workflow verified that commit again and published release `Merdeck 0.2.0` at 01:56 UTC, neither a draft nor a prerelease and reported as the latest release, with `merdeck-0.2.0-linux-x64` (85,661,152 bytes) and `SHA256SUMS`. The downloaded executable passed `sha256sum --check` (`40846783f1c667a5524027281ce7ac58dc1b8454a09e5ee8fed78ab2db63e1af`) and carries an x86-64 ELF header.
