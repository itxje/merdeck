# RELEASE-003 Publish one architecture-independent bundle

- **status**: completed
- **priority**: P1
- **owner**: Release maintainer
- **createdAt**: 2026-09-12

## Description

The owner could not start a release on their `aarch64` host, because the published archive holds an x86-64 executable, and asked for one architecture-independent artifact like their other service, which publishes JavaScript run by the host's Bun. Acceptance: a release attaches one `merdeck.tar.gz` that runs on any Linux architecture with Bun installed, holding `merdeck.js` and the built `web/` tree with the release version stamped in; the archive is reproducible; the release checks refuse an archive whose contents do not match its manifest; a smoke run starts the extracted bundle, serves its assets and passes the browser suite; and the documentation states the Bun and Linux requirements.

## ActiveForm

Publishing one architecture-independent bundle.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-12): `scripts/compile.ts` embeds the runtime, backend and interface into one executable whose target is fixed at compile time, and `scripts/release-version.ts` offers only `bun-linux-x64` and `bun-linux-arm64`; `scripts/release/publisher.ts` refuses to publish anything but x64, and the workflow runs a single `ubuntu-24.04` job, so releases carry x86-64 machine code only. macOS is out of reach independently of packaging, because storage admission reads Linux procfs. The service already runs from a plain build: the hosted instance starts `bun dist/index.js` with the interface on disk, `dist/index.js` measures 270 KB and `web/dist` 4.2 MB, against 37 MB for the compressed executable. `src/index.ts` accepts both the assets map and the build info, so a generated entry can stamp the version and load the neighbouring `web/` tree.
- Proposal: recorded in [PLAN-019](../plan/PLAN-019.md).
- Approval: the owner asked for the architecture-independent form and then said to write the plan and implement it.
- Implementation (2026-09-12): `scripts/release/archive.ts` now writes and reads a sorted multi-entry ustar archive with fixed metadata (mode 0644, owner, group and modification time 0) and gzip without a stored name or timestamp, refusing unordered, duplicate, oversized or non-ordinary entries. `scripts/bundle.ts` generates an entry that stamps the release version, prerelease flag, commit and `bundle` target and loads the validated interface from the `web` directory beside it, bundles it to `merdeck.js` with the pinned Bun, snapshots the built interface through `snapshotBuildAssets`, and writes `merdeck.tar.gz`, `SHA256SUMS` and a strict manifest that records every archived file with its size and digest. `scripts/release/bundle-manifest.ts` verifies the directory entries, the checksum, the tag, version and commit, and reads the archive back, refusing contents that differ from the inventory or that lack the entry or the interface shell. `scripts/smoke-bundle.ts` extracts the archive, starts two services from it with the pinned Bun on disposable supported and refused roots, checks the reported version against the manifest, serves every archived resource byte for byte, holds the authentication and containment boundaries, runs the complete browser suite against the extracted service and confirms the extracted tree is unchanged afterwards. `check:ci` runs the bundle stage after the executable stage, the publisher now uploads the bundle assets and describes the Bun requirement, and the workflow retains and downloads both packages. The executable packaging returned to its `SHA256SUMS`-over-the-executable form, because it is no longer published.
- Verification (2026-09-12, main checkout, pinned Bun 1.4.2, inside the project tmux session): root ESLint, `tsc --noEmit` and `bun run test:release` passed with 24 tests across 10 files, including the rewritten archive tests and the new bundle package tests. A real bundle was then built and smoked on this `aarch64` host: `merdeck.tar.gz` measured 1,213,448 bytes across 95 files, against 37 MB for the compressed executable. The smoke started both services from the extracted tree, matched the reported version to the manifest, served all 94 archived interface resources byte for byte, kept the authenticated and containment boundaries, passed the complete browser suite 41 of 41 in 1.9 minutes, found the extraction unchanged afterwards and cleaned up its fixtures. The x86-64 side is covered by the push workflow, which runs the same stages after the traced executable smoke.
- Correction (2026-09-12): the first bundle started the service twice, because the source entry ran startup on import and the generated entry imported it. Startup moved to `src/service.ts`, `src/index.ts` now only runs it, and the compiled and bundled entries import the service module, so `--version` and `--build-info` report the stamped bundle identity once. The compile test now guards both startup files against rewriting, and the coverage exclusion follows the moved startup.
