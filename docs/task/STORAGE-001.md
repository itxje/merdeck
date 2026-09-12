# STORAGE-001 Evaluate write admission for host-shared virtiofs project storage

- **status**: pending
- **priority**: P2
- **owner**: (unassigned)
- **createdAt**: 2026-09-12

## Description

The deployed instance reaches its configured project over a host-shared `virtiofs` mount (`statfs.type = 0x65735546`, mount record type `virtiofs`). Write admission accepts only overlay and ext4, so that deployment browses and previews every file but refuses every save with `filesystem_unsupported`. The project owner asked to evaluate admitting this filesystem family rather than leaving the deployment read-only. Acceptance: an investigation that records the exact mount, statfs and device identity of the storage under test; repeats the consecutive-save identity experiment from the [inode observations](../decisions/2026-09-07-inode-observations.md) on that mount with at least the same number of iterations, so the earlier failure class would be visible if it recurs; exercises each primitive the save protocol depends on there (`O_EXCL` creation, `link`/`unlink`, directory `rename`, `fsync`, and descriptor identity revalidation around the final comparison); states plainly whether the protocol's identity guarantees hold on that mount; and ends either with a proposal to admit the type under stated conditions or with a recorded refusal carrying its evidence. Admission itself does not change in this task: any change needs its own approved plan, and read-only browsing of unsupported storage stays as it is.

## ActiveForm

Evaluating write admission for host-shared virtiofs project storage.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Context (2026-09-12): `writableFilesystem` in `src/modules/diagrams/filesystem.ts` requires Linux with procfs, a `statfs` type of overlay `0x794c7630` or ext4 `0xef53`, a uniquely associated mount record whose type string is `overlay` or `ext4`, a mount device matching the held descriptor's `stat` device, and the root, target and destination directory on one device. A `virtiofs` mount fails the type test twice, so `storageStatus()` reports `writable: false` and every save returns 503 before a temporary file is created. The allowlist exists because a host-shared mount produced two consistent reads of unchanged content with different inodes, which the save protocol uses to decide whether another writer replaced the file; that history is recorded in the inode observations decision and in [SAFETY-001](SAFETY-001.md). The question to answer is whether `virtiofs` shows the same behaviour or whether it can be admitted with the existing descriptor checks.
- Scope note: the evaluation covers the specific mount under test. A passing result on one host is deployment evidence for that host, not blanket support for the filesystem family, and each deployment still runs the documented acceptance against its own storage.
