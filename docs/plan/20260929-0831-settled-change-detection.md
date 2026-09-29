# 20260929-0831-settled-change-detection Detect changes made within one filesystem clock tick

- **status**: completed
- **createdAt**: 2026-09-29 08:32
- **approvedAt**: 2026-09-29 08:35
- **relatedTask**: 20260929-0831-settled-change-detection

## Context

- `FileRepository.withListingDirectory().sample()` (`src/modules/diagrams/repository.ts`) proves a directory unchanged by comparing `dev`, `ino`, birth time, `mtimeNs`, `ctimeNs`, `size` and `nlink`. `DirectoryPager` builds page and revision identities from that sample and compares them between pages, before and after reading a page, and between revision probes. `readIn()` proves a file read consistent with `unchanged(before, after)` on the same fields.
- Linux stamps `mtime`/`ctime` from the coarse realtime clock, which advances once per tick (1/HZ, at most 10 ms). Kernels from 6.13 give a fine timestamp to an inode whose timestamp has been read since its last change (multigrain timestamps); 6.12 (Debian 13, this container) does not.
- Measured here: 199 of 200 consecutive file creations left the directory `mtime` unchanged, with 4 ms steps (HZ=250). With a listing taken and a file added right after it, the next continuation missed the change 23 of 40 times; waiting 10 ms before the change missed it 0 of 40 times (`tmp/tk61`).
- Effects: a file added, removed or renamed in the same tick as a sample does not change the directory revision, so the explorer can omit it until some later change; a continuation can resume across a changed directory; a same-size in-place write during a read goes unnoticed. Saves are not affected: they re-read and compare the full-file hash before the rename.
- Five tests fail at HEAD in this container on any local fixture (namespace add/delete between pages, growing-prefix move audit, external churn during enumeration, continued read churn); hosted CI passes them, presumably on a multigrain kernel.

## Proposal

Apply the rule git uses for racily clean entries: metadata proves "unchanged since" only once the filesystem clock has moved past the observed change time, because any later change must then carry a later timestamp.

- Add one helper in `repository.ts`, `settle(stat, restat)`: while the realtime clock is not more than one maximum tick (10 ms, the Linux bound for HZ >= 100) past the observed `ctime`, wait for the remaining time, then re-stat. The coarse clock trails the fine clock by at most one tick, so after that wait any later change gets a strictly later `ctime`. Return the re-stat for comparison.
- `sample()`: settle the sampled directory's final stat before returning, and fail with `directory_changed` if the settled stat differs, so every returned sample is one that later changes must alter.
- `readIn()`: settle the `before` stat (re-stat the held handle) before reading; a difference is the existing read-change path (retry up to three times, then conflict).
- No change to response shapes, revision format, budgets or the save path.

RED: the five existing failing tests, plus a focused `directory.test.ts` case that adds a file immediately after a first page on a fresh folder and requires `directory_changed`; GREEN after the change on this 6.12 kernel. Then the full backend suite, root lint/typecheck, and the browser acceptance run.

## Risks

- Latency: an observation of something changed within the last ~10 ms waits up to ~10 ms, once per sample or read. Directory pages sample three times and revision probes once; ordinary browsing of folders changed seconds ago does not wait.
- Clock steps: a realtime clock stepped backwards makes the wait longer than a tick, never shorter than required; the wait is bounded by re-checking against the current clock, and the operation deadline still applies.
- The 10 ms bound relies on Linux CONFIG_HZ >= 100, which holds for every supported configuration (100/250/300/1000).

## Scope

`src/modules/diagrams/repository.ts` (helper and two call sites), `src/modules/diagrams/directory.test.ts` (one case), README storage notes (one sentence), task, plan and changelog records.

## Alternatives

- Read `CLOCK_REALTIME_COARSE` through the existing libc FFI binding and wait exactly until it passes `ctime`: precise to the tick, but widens the native surface for a few milliseconds of latency.
- Include a hash of every name in each sample: exact on any kernel, but rereads whole folders on every page and poll, which the forward-only paging design exists to avoid.
- Require a multigrain kernel (6.13+) for deployments: no code change, but leaves Debian 13 and similar hosts silently missing changes.

## Annotations

(none)
