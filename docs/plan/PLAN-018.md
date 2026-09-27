# PLAN-018 Publish one stable release archive

- **status**: completed
- **createdAt**: 2026-09-12
- **approvedAt**: 2026-09-12 (explicit owner choice `A`: publish only `merdeck.tar.gz` and `SHA256SUMS`)
- **relatedTask**: RELEASE-002

## Context

Releases attach the version-named executable and `SHA256SUMS`, so every download link changes with the version and no address keeps working across releases. The owner asked for the stable name `merdeck.tar.gz`, which also makes `releases/latest/download/merdeck.tar.gz` usable.

The CI and release decision of 2026-09-07 states that the public attachments are the raw version/platform-named executable and `SHA256SUMS` and that no archive is produced. That sentence aimed at archives which require an installed runtime or separate frontend resources; a compressed archive holding only the standalone executable keeps the same property. This plan supersedes that part of the decision.

## Proposal

1. **Attachments.** A release carries exactly `merdeck.tar.gz` and `SHA256SUMS`. The version-named executable stays a checked build output and a workflow artifact, but is no longer a public attachment.
2. **Archive.** A new `scripts/release/archive.ts` writes one deterministic ustar entry: the file `merdeck`, mode 0755, owner and group 0, modification time 0, followed by the end-of-archive blocks, gzip-compressed without a stored name or timestamp. The same executable therefore always yields identical archive bytes. The module also reads such an archive back, rejecting anything that is not exactly one ordinary file.
3. **Packaging.** `scripts/package-release.ts` writes `merdeck.tar.gz` beside the executable and `SHA256SUMS` covering the archive. `releaseFiles` then expects the four directory entries, keeps its tag, version, commit and ELF checks, additionally reads the archive back and compares it byte for byte with the checked executable, and returns the archive and `SHA256SUMS` as the publishable assets.
4. **Smoke.** The release smoke extracts the archive into its scratch runtime and runs that extracted executable under the tracer, instead of copying the build output, so the published bytes are the executed bytes.
5. **Publication.** The publisher is unchanged except for the release notes, which describe the archive, its single extracted executable and the checksum step. Its provenance marker keeps binding each asset digest, and it still refuses unrelated, duplicate or mismatched assets.
6. **Tests.** Archive determinism, structure, round-trip and refusals; the packaging inventory and checksum over the archive; the publisher asset list; and the existing failure cases.
7. **Documentation.** An addendum to the 2026-09-07 CI and release decision, the README release and verification steps, SECURITY, the architecture summary, the task and plan records and the changelog.

## Risks

- Existing links to a version-named executable stop working. Only two releases exist, both recent, and the owner chose this deliberately.
- A stable asset name repeats across releases, so a cached copy can be mistaken for a newer one. `SHA256SUMS`, the release notes and `./merdeck --version` identify the build.
- A hand-written archive writer could produce a file that ordinary tools misread. The round-trip check, the smoke extraction and the local verification with system tools guard against that.

## Scope

`scripts/release/archive.ts` (new), `scripts/package-release.ts`, `scripts/release/manifest.ts`, `scripts/release/publisher.ts`, `scripts/smoke-release.ts`, their tests and the documentation listed above. Out of scope: additional targets, signing, a second archive format, and any change to compilation, the embedded assets or the service.

## Alternatives

- **Keep both attachments.** Old links keep working, but each release stores roughly 120 MB and the entry point becomes ambiguous. The owner rejected it.
- **Rename the executable itself to a stable `merdeck`.** One asset, no archive, but the version disappears from the file name without any compression benefit, and a raw 86 MB download stays.
- **Zip instead of tar.gz.** Equivalent for one file; the owner named `merdeck.tar.gz`.

## Implementation record

Implemented as proposed, without a manifest schema change: the archive is bound by `SHA256SUMS`, by the byte-for-byte comparison in `releaseFiles` and by the publisher's provenance marker. Local checks covered reproducibility, an archive that system `tar` reads as one 0755 file with epoch metadata, and running the extracted executable; the traced smoke and the complete native gate run in the workflow. The evidence is recorded in [RELEASE-002](../task/RELEASE-002.md).
