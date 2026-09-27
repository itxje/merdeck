# STORAGE-002 Admit host-shared storage under a content identity model

- **status**: completed
- **priority**: P2
- **owner**: Storage maintainer
- **createdAt**: 2026-09-12

## Description

[STORAGE-001](STORAGE-001.md) established that host-shared `virtiofs` storage keeps every save primitive intact but does not keep an inode number stable across an intervening atomic replacement, so the save protocol's identity comparison produces false conflicts and the type stays refused. The owner asked for the proposal that removes the dependency on inode stability. Acceptance: the measured mount selects an identity profile, the currently admitted filesystems keep their comparison unchanged, a content profile compares device, size, both timestamps and the complete-file content hash, staged and published bytes are verified by hash instead of by inode, `virtiofs` joins the allowlist bound to that profile, the reported storage status names the profile, the evidence listed in the plan is produced, and the documentation states the one distinction the content profile gives up. No configuration may select a profile or bypass admission.

## ActiveForm

Admitting host-shared storage under a content identity model.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Proposal: recorded in [PLAN-020](../plan/PLAN-020.md).
- Approval: the owner reviewed the proposal and said to proceed.
- Evidence (2026-09-12), the item the plan required first: directory and root identity are stable on the candidate storage under the same publication pressure that renumbers file inodes. Holding a directory descriptor and republishing a file inside it, the anchored real path, the anchored directory identity and the long-lived root device, inode and birth time matched on every one of 2,000 checks, with 0 mismatches, matching the overlay control at 400 of 400. Only the replaced file's inode moves.
- Implementation (2026-09-12): `src/modules/diagrams/filesystem.ts` now maps each admitted family to the identity model it supports, reports it as `identity` beside `writable`, and exports the comparison both models share. `requireWritableFilesystem` returns the model, so the repository carries it from the admission it already performs. On the `content` model a save compares device, size, both timestamps and the complete-file hash it already computes, proves its staged bytes by re-reading the temporary name and hashing it instead of comparing an inode, reads the published name back after the rename and refuses a mismatch as a conflict, cleans up its own temporary by device, link count and size, and proves an entry move through device, size, modification time and a link count of two. The `stable` model keeps every comparison unchanged. `virtiofs`/`0x65735546` joins the allowlist bound to the content model; tmpfs, unknown types, mismatched mount types and missing procfs metadata stay refused, and no configuration selects a model. The session capability and storage status report the model, and the interface decoder refuses an unknown value.
- Correction during implementation (2026-09-12): the first version proved an entry move with a full metadata comparison including the change time, which every move failed, because a hard link raises the link count and therefore moves the change time. A probe confirmed hard links are sound on that storage: 200 of 200 reported identical inodes and a link count of two on both names. The move now compares device, size, modification time and the link count.
- Verification (2026-09-12, main checkout, pinned Bun 1.4.2, inside the project tmux session): with fixtures on the candidate storage, the file, storage, API and acceptance tests ran twenty times over and passed 1,060 of 1,060 with 0 failures, against the recorded 5 failures in 80 runs before the change, and the complete browser suite passed 42 of 42 against a service rooted there. On the admitted overlay fixtures the source gate passed with 203 backend tests across 9 files and 207 frontend tests across 18 files, including thirteen new cases covering the family-to-model mapping and the two comparisons, and the browser suite passed 42 of 42. The refused fixture parent moved to tmpfs, because the checkout storage is no longer refused.
