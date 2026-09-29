# 20260929-0831-settled-change-detection Detect changes made within one filesystem clock tick

- **status**: completed
- **priority**: P1
- **owner**: backend-maintainer-0929
- **createdAt**: 2026-09-29 08:31

## Description

Directory listings and file reads decide that nothing changed by comparing inode metadata, including `mtime` and `ctime`. On a Linux kernel without multigrain timestamps (6.12, as in Debian 13), those timestamps advance only once per clock tick, so a change made in the same tick as an observation leaves the metadata identical and goes unnoticed. Acceptance: a namespace change or in-place write made after an observation is always detected, on any Linux kernel, without rescanning a consumed prefix; the five churn tests that fail in this container at HEAD pass deterministically.

## ActiveForm

Detecting same-tick filesystem changes.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Tracked earlier as tk merdeck #61. Plan: [20260929-0831-settled-change-detection](../plan/20260929-0831-settled-change-detection.md).
- Approval: the owner approved the plan on 2026-09-29.
- Implementation: `settled()` in `src/modules/diagrams/repository.ts` returns an observation only once the realtime clock is more than one maximum tick (10 ms) past the inode's `ctime`, waiting and re-observing otherwise; a `ctime` more than a tick ahead (clock stepped back) is returned as is. `sample()` settles its first directory stat and `readIn()` settles its `before` stat, so every later change alters the compared metadata. README notes the behavior beside the revision endpoint.
- RED: on this 6.12 kernel the new `directory.test.ts` case (ten fresh folders, a file added right after the first page) and four existing churn tests failed at HEAD. GREEN: the diagrams suite passes 209/209 in three consecutive runs; the full backend suite passes 294/294.
- Gate (2026-09-29, local ext4 fixture parent, `/dev/shm` refusal parent, strace 6.13 installed): `check:ci` passes every stage — `lint:workflows`, `check:files`, storage checks, `check` (backend and 590 frontend tests, builds), physical directory streaming, `test:release`, and both executable and bundle browser suites (99 passed each) — and stops only at the final evidence export, which requires committed source by design. `git diff --check` passed. A pre-existing intermittent agents adapter test (tk merdeck #62) was corrected on the way; see the changelog.

- complete: Same-tick changes detected; see Notes.
