# PLAN-020 Admit host-shared storage under a content identity model

- **status**: draft
- **createdAt**: 2026-09-12
- **approvedAt**: (pending)
- **relatedTask**: STORAGE-002

## Context

[STORAGE-001](../task/STORAGE-001.md) measured why a host-shared `virtiofs` project cannot be saved to. Every save primitive behaves there as on an admitted filesystem, and a single publish cycle is stable across 320 raw cycles and 600 isolating cycles. What is not stable is the inode number across an intervening atomic replacement in the same directory: the protocol's read, stage, re-read and rename cycle reported a new inode for unchanged bytes, size and timestamps in 7 of 400 cycles, against 0 of 400 on overlay. With admission temporarily extended, the real file tests failed 5 of 80 runs, always with the content version equal and the identity comparison failing.

The save protocol answers "is this still the same file" with device and inode. That answer is sound on the admitted filesystems and unusable on this one. The refusal is therefore correct today, and it leaves every deployment whose project arrives over a host share permanently read-only, which is the case the owner is running.

## Proposal

1. **A measured storage profile, not a flag.** `inspectFilesystem` already identifies the mount through its held descriptor. It additionally reports an identity profile derived from that measurement: `stable` for the currently admitted overlay and ext4 mounts, `content` for a mount whose type is admitted but whose inode numbers are not relied upon. No configuration, header or environment variable can select a profile; it follows the storage the service actually opened.
2. **Unchanged behaviour where it already works.** On the `stable` profile every comparison stays byte-for-byte as it is today, including device and inode. Existing deployments see no change in code path or in refusals.
3. **The content profile's comparison.** Where the strict profile compares device and inode plus size, modification and change time, the content profile compares device, size, modification time, change time and the complete-file content hash the protocol already computes for every read, and keeps the existing regular-file and single-link requirements. The only pair it cannot separate is a replacement whose bytes, size and both timestamps are all identical, which is indistinguishable from an unchanged file for an editor that is about to write the same bytes anyway.
4. **Staged file and publication.** On the content profile the pre-rename check re-reads the staged name through the directory anchor and compares its size and content hash with what was written, instead of comparing its inode, and the save re-reads the published name after the rename and compares its hash with the bytes it published. A mis-published file becomes a detected failure rather than an assumption. Files are bounded by the existing byte limit, so this costs one extra bounded read per save.
5. **Entry moves.** The move path proves its hard link with the inode today. On the content profile it instead requires the destination name to hold a file with the same size, timestamps and content hash, and the source link count to have risen, before it unlinks the source. Deletion semantics are unchanged.
6. **Admission.** `virtiofs` with `statfs.type = 0x65735546` joins the allowlist, bound to the content profile and still requiring Linux, procfs, a uniquely associated mount record, a matching mount device and one device for root, target and destination. tmpfs, unknown types and missing or malformed procfs metadata stay refused, and no configuration overrides the check.
7. **Reported status.** `storageStatus()` and the session capabilities report the profile beside the existing `writable`, `filesystemType` and `supportedFilesystem`, so an operator can see which model is in force without reading logs. No device identifier or absolute path is added.
8. **Documentation.** The README storage section, the architecture write-up, an addendum to the inode observations decision, the task and plan records and the changelog state the two profiles, the one distinction the content profile gives up, and that each deployment still runs the documented acceptance against its own storage.

## Evidence required before this is accepted

- Directory identity stability on the candidate storage, which STORAGE-001 did not measure directly: the anchored directory and root comparisons must hold across at least the same cycle count that exposed the file instability.
- The real file, storage and API tests, with fixtures on the candidate storage, passing twenty consecutive full runs with zero failures, against the recorded 5 failures in 80 runs today.
- The existing overlay gate unchanged, including tests that the `stable` profile still refuses an inode change.
- New unit tests: the content profile accepts an inode change with equal bytes, size and timestamps; refuses an equal-size replacement with different bytes; refuses a modification or change time difference; and the published-hash check refuses a mismatched publication.
- A browser run against a service whose configured root is on the candidate storage, saving the same file repeatedly.

## Risks

- The content profile gives up one distinction: a same-content, same-timestamp external atomic replacement no longer conflicts, and the save publishes over it. The earlier decision deliberately kept that conflict, so this is a stated reduction, not an oversight. Content that differs is still caught by the hash, and a timestamp difference is still caught.
- Inode reuse cannot be detected on that profile at all. It already could not be relied upon there; the profile makes that explicit rather than assuming a number that the storage does not keep.
- Host-shared mounts cache attributes, so a timestamp pair can be stale. Content is read through a held descriptor, so the hash is authoritative for the bytes; a stale timestamp with changed content is still refused.
- Two comparison paths mean two sets of tests and a real risk of them drifting apart. The profile is derived from the measured mount rather than chosen, and both paths must stay covered in the gate.
- Admitting a filesystem family on one measured host is not blanket support. Each deployment still needs its own acceptance run, exactly as the admitted types do today.

## Scope

`src/modules/diagrams/filesystem.ts` for the profile, `src/modules/diagrams/repository.ts` for the comparison sites (the save re-read, the staged and published verification, and the move), the storage contract and session capability shape, their tests, the browser and storage checks, and the documentation above. Out of scope: containment, symlink and hard-link refusals, root identity, the read retry path, the API surface beyond the reported profile, tmpfs or unknown storage, and any configuration override.

## Alternatives

- **One relaxed model everywhere**: one code path instead of two, but it removes a guarantee from deployments that do keep inode numbers stable, for no benefit to them.
- **A persistent file handle** through `name_to_handle_at`, which survives replacement by design: not reachable from the pinned runtime without native code, and it would need its own portability evidence.
- **Keep the refusal** and document the storage choices that satisfy the current model: no code risk, and the owner's host-share deployment stays read-only.
