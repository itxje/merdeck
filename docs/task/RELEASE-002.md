# RELEASE-002 Publish one stable release archive

- **status**: completed
- **priority**: P2
- **owner**: Release maintainer
- **createdAt**: 2026-09-12

## Description

The project owner asked on 2026-09-12 for a stable release asset name, `merdeck.tar.gz`, and chose to publish it instead of the version-named executable. Acceptance: every release carries exactly `merdeck.tar.gz` and `SHA256SUMS`; the archive is reproducible, holds one executable named `merdeck`, and matches the executable that the release checks accepted; `SHA256SUMS` covers the published archive; the publisher still refuses unrelated, duplicate or mismatched assets; and the documentation describes downloading, verifying and extracting the archive.

## ActiveForm

Publishing one stable release archive.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-12): `scripts/compile.ts` writes `dist/release/merdeck-<version>-linux-<target>` with `manifest.json`; `scripts/package-release.ts` adds `SHA256SUMS` for that one file, and `releaseFiles` in `scripts/release/manifest.ts` requires the directory to hold exactly those three entries, rechecks tag, version, commit, checksum and the ELF header, and returns the executable and `SHA256SUMS` as the publishable assets. `scripts/release/publisher.ts` uploads exactly those assets, binds their digests in a provenance marker inside the release body, and refuses unrelated, duplicate or mismatched assets. `scripts/smoke-release.ts` copies the executable into a scratch runtime and runs it under a tracer. `scripts/check-release.ts` revalidates a packaged directory. README, SECURITY, the architecture document and the CI/release decision all state that the public attachments are the raw version-named executable and `SHA256SUMS`, and the decision explicitly rules out an archive.
- Proposal: recorded in [PLAN-018](../plan/PLAN-018.md) and presented to the owner on 2026-09-12.
- Approval: the owner replied `A`, choosing to publish only the stable archive and `SHA256SUMS`, without the version-named executable as a public asset.
- Implementation (2026-09-12): `scripts/release/archive.ts` writes and reads a reproducible single-file ustar archive: the entry `merdeck` with mode 0755, owner, group and modification time 0, the end-of-archive blocks, and gzip without a stored name or timestamp. Reading refuses anything that is not exactly one ordinary named file. `package-release.ts` writes `merdeck.tar.gz` beside the executable and `SHA256SUMS` over the archive. `releaseFiles` expects the four directory entries, checks `SHA256SUMS` against the archive, reads the archive back and refuses it unless it holds the checked executable byte for byte under the expected name and mode, keeps the ELF check, and returns the archive and `SHA256SUMS` as the publishable assets. `smoke-release.ts` extracts the archive into its scratch runtime and traces that executable, and its runtime directory check expects the extracted name. The release notes describe the archive, and `check-release.ts` reports both names. `tests/release/archive.test.ts` covers reproducibility, the gzip header without a timestamp, the ustar structure, the round trip and four refusals. The manifest schema is unchanged: the archive is bound by `SHA256SUMS`, the comparison in `releaseFiles` and the publisher's provenance marker.
- Verification (2026-09-12, main checkout, pinned Bun 1.4.2, inside the project tmux session): root ESLint, `tsc --noEmit` and `bun run test:release` passed, the last with 22 tests across 9 files including the two new archive tests. A local end-to-end check then compiled and packaged an `arm64` build: the directory held the four expected entries, the publishable assets were `merdeck.tar.gz` and `SHA256SUMS`, the archive measured 37,549,827 bytes against an 85,641,512-byte executable (44%), system `tar -tzvf` listed exactly `-rwxr-xr-x 0/0 85641512 1970-01-01 00:00 merdeck`, and the extracted file was byte-identical to the checked executable. That extracted executable reported its version and build info and served `/api/health`, `/` and `/favicon.svg` from a disposable root. The traced release smoke needs strace, which this host lacks, so the complete `check:ci --native` remains the workflow's check.
- Release evidence (2026-09-12): the push workflow for this change passed the complete native gate, whose smoke now extracts and traces the published executable. `v0.3.0` was then published from that commit to exercise the packaging end to end. The release carries exactly `merdeck.tar.gz` (37,639,112 bytes) and `SHA256SUMS` (81 bytes). The downloaded archive passed `sha256sum --check` (`dd816295f6a4e6addef70910fc124b1cf49551d7784266018eb7c446863e3c7d`), `tar -tzvf` listed exactly `-rwxr-xr-x 0/0 85661152 1970-01-01 00:00 merdeck`, and the extracted 85,661,152-byte file kept mode 0755 and an x86-64 ELF header. The address `https://github.com/itxje/merdeck/releases/latest/download/merdeck.tar.gz` answered 200 with the same size.
