# STORAGE-002 Admit host-shared storage under a content identity model

- **status**: pending
- **priority**: P2
- **owner**: (unassigned)
- **createdAt**: 2026-09-12

## Description

[STORAGE-001](STORAGE-001.md) established that host-shared `virtiofs` storage keeps every save primitive intact but does not keep an inode number stable across an intervening atomic replacement, so the save protocol's identity comparison produces false conflicts and the type stays refused. The owner asked for the proposal that removes the dependency on inode stability. Acceptance: the measured mount selects an identity profile, the currently admitted filesystems keep their comparison unchanged, a content profile compares device, size, both timestamps and the complete-file content hash, staged and published bytes are verified by hash instead of by inode, `virtiofs` joins the allowlist bound to that profile, the reported storage status names the profile, the evidence listed in the plan is produced, and the documentation states the one distinction the content profile gives up. No configuration may select a profile or bypass admission.

## ActiveForm

Admitting host-shared storage under a content identity model.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Proposal: recorded in [PLAN-020](../plan/PLAN-020.md), awaiting approval.
