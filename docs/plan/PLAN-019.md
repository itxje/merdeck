# PLAN-019 Publish one architecture-independent bundle

- **status**: completed
- **createdAt**: 2026-09-12
- **approvedAt**: 2026-09-12 (the owner asked for one artifact that runs on every architecture, as their other service does, and then said to plan and implement)
- **relatedTask**: RELEASE-003

## Context

The published archive holds one compiled executable. Bun fixes the architecture into the ELF header at compile time, so an archive built for `bun-linux-x64` cannot start on the owner's `aarch64` host, and one stable name cannot stand for two machine codes. Their other service publishes plain JavaScript and lets the host's Bun absorb the difference; the owner asked for the same form here.

Merdeck already runs that way: the hosted instance starts `bun dist/index.js` and serves the built interface from disk. `bun run build` emits a 270 KB backend bundle beside a 4.2 MB asset tree, so an architecture-independent archive is far smaller than the 37 MB compressed executable. Only the runtime requirement changes: the host needs Bun. Linux stays required either way, because storage admission reads procfs.

## Proposal

1. **Published assets.** One architecture-independent `merdeck.tar.gz` and `SHA256SUMS` over it. The compiled executable remains a checked build output and workflow artifact but is no longer published, so its package returns to the earlier `SHA256SUMS`-over-the-executable form.
2. **Archive contents.** `merdeck.js`, the bundled backend with the release version and commit stamped in, and `web/`, the validated built asset tree. Running it is `bun merdeck.js` with the documented environment.
3. **Reproducible packaging.** The single-entry archive writer grows a sorted multi-entry form with the same fixed metadata and gzip without a stored name or timestamp, so identical inputs produce identical archive bytes.
4. **Bundle manifest.** A strict manifest records the schema version, version, tag, prerelease flag, commit, the pinned Bun that built it and every archived file with its size and digest. The release checks read the archive back and refuse it unless its contents match that inventory exactly.
5. **Bundle smoke.** The release smoke extracts the archive into a scratch directory, starts it with the pinned Bun against a disposable sample root, checks health, serves every archived asset byte for byte, runs the complete browser suite against that service and verifies that the extracted tree is unchanged afterwards. The traced executable smoke stays, so the syscall evidence is not lost.
6. **Publication.** The publisher uploads the bundle assets and keeps its provenance marker, its refusal of unrelated, duplicate or mismatched assets and its draft resume. The release notes state the Bun and Linux requirements.
7. **Documentation.** README download and run steps, SECURITY, the architecture summary, an addendum to the CI and release decision that supersedes both the "no archive or fallback package requiring installed Bun" sentence and the single-executable attachment rule, the task and plan records and the changelog.

## Risks

- The host must provide Bun 1.4.2 or newer; a machine without it can no longer run a release without installing Bun first. The owner's deployment already has it.
- macOS stays unsupported, because storage admission needs Linux procfs. Architecture independence does not change that.
- The interface now sits on disk beside the bundle, so an operator can alter it after extraction. The checksum and manifest cover the archive, not a later local edit, and the service still serves only the validated tree it loaded at startup.
- The published artifact is now checked by the bundle smoke, while the tracer-based syscall evidence continues to cover the compiled executable, which is no longer published.

## Scope

`scripts/release/archive.ts`, a new bundle build with its manifest and verification module, `scripts/package-release.ts`, the release smoke scripts, `scripts/check-ci.ts`, `scripts/release/publisher.ts`, `scripts/publish-release.ts`, the workflow artifact and publish steps, their tests and the documentation above. Out of scope: per-architecture executables, macOS support, signing and any change to the service itself.

## Alternatives

- **Per-architecture executables** with a native gate on each architecture: keeps the zero-runtime promise but needs an arm64 runner and doubles the release evidence. The owner chose one artifact instead.
- **Publishing both forms**: one entry point becomes two, and every release carries both evidence paths.
- **A cross-compiled arm64 executable without native evidence**: contradicts the rule that cross-compilation alone is not execution proof.

## Implementation record

Implemented as proposed. The archive writer became a sorted multi-entry form, the bundle build stamps the version and commit into the generated entry, a strict bundle manifest binds every archived file, and the bundle smoke runs the extracted tree through the complete browser suite before the publisher uploads it. The compiled executable keeps its traced smoke as internal evidence and is no longer published. The evidence, including a 1.2 MB archive that passed its smoke on an `aarch64` host, is recorded in [RELEASE-003](../task/RELEASE-003.md).
