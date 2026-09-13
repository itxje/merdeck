# 20260913-1637-directory-backend Implement bounded directory browsing backend

- **status**: in_progress
- **priority**: P1
- **owner**: backend-maintainer/20260913
- **createdAt**: 2026-09-13 16:37

## Description

Implement and verify the backend portion of [directory navigation](../plan/20260913-1628-directory-navigation-pagination.md), including bounded safe pagination, independent path depth, lifecycle cleanup and legacy compatibility. Complete only this task after verified backend acceptance; the feature plan remains implementing.

## ActiveForm

Implementing and verifying bounded directory browsing

## Dependencies

- **blocked by**: 20260913-1626-directory-browsing-contract (completed)
- **blocks**: downstream directory navigation integration

## Notes

- Existing owner authorization dated 2026-09-13 applies to the concrete approved contract. No new scope or design approval is implied.
- Authoritative contract merged before task creation. Investigation and executable implementation have not started.

### Investigation and implementation proposal

- Confirmed that repository read/replace/split use maxTreeDepth and the global tree eagerly parses content; there is no persistent iterator lifecycle today. Auth exposes verified session identity and origin, and startup must add disposal on failure.
- Implement the authoritative plan without API shape changes: a separate bounded directory pager over freshly validated descriptor chains, zero-content metadata entries, single-use cursors, exact expiry and operation reservations; add maxPathDepth to all direct operations and a bounded growing-prefix move audit.
- Preserve actual overlay/ext4/virtiofs admission and all existing write checks. Keep legacy tree independent. No dependencies, frontend/design changes or new routing framework.
- Main risks are delayed filesystem I/O, resource accounting during cancellation, observable namespace changes and deep move projection. Focused RED/GREEN tests precede implementation; self-review and the unchanged full local gate follow.
- Existing authorization is recorded in the feature plan; investigation and this concrete implementation proposal are complete before executable changes. Overall feature status remains implementing.
- Runtime observations: system Bun 1.4.2 and Node 24.20.0; project-local runtime copy is used. Checkout is virtiofs 0x65735546; /tmp is overlayfs 0x794c7630; /dev/shm is tmpfs 0x1021994. The optional /work/ai/rules/tmux-servers.md is absent; supplied session naming/lifecycle instructions apply.

### 2026-09-13 16:54 UTC — runtime blocker and self-review

- Implemented the exact provisional page/revision/close schema, metadata-only entries, typed restart errors, path-depth separation, principal/lifecycle plumbing and bounded move-audit protocol. No frontend/design edits, dependencies, runtime upgrades or routing-framework changes.
- RED: `tmp/directory-red.log` has one iterator API test pass and two missing-feature failures. Initial protocol GREEN passed. Expanded source run `tmp/backend-v3.log`: 235 passed, 0 failed. These logical tests do not prove bounded underlying enumeration.
- Runtime/resource RED: `tmp/backend-final.log`: 239 passed, 1 failed. The real `/proc/self/fd` check expected an anchor plus a retained directory descriptor but found only the anchor. `tmp/bun-dir-class.txt` captures actual pinned runtime `Dir.toString()`: `#readOp` calls `fs.readdir`, `#onReaddir` retains the entire array in `#entries`, and `bufferSize` is only validated. `tmp/runtime-first-read.strace` traces all threads: the first single `Dir.read()` enumerates all 10,003 fixture names through EOF before returning. `tmp/runtime-probe.log` records probe completion, not acceptance.
- The earlier 10,003-name test verifies emitted names, logical reads and zero file-content reads only. It cannot be cited as proof of bounded syscall work, memory or a true directory stream. The 8 focused virtiofs metadata/change tests in `tmp/virtiofs.log` pass, but do not overcome the same runtime enumeration blocker.
- PMA implementation self-review: **HIGH**, `src/modules/diagrams/repository.ts` directory adapter materializes unbounded directory data in the pinned runtime and defeats both page and move-audit visit limits. Verdict: **WARNING**, implementation acceptance blocked by this hard contract violation. No misleading PASS or task completion is recorded.
- The authoritative contract excludes native helpers and runtime upgrades while requiring explicit streaming Dir.read/close. A reviewed contract correction selecting and verifying an actually bounded primitive is necessary; none is silently introduced here. The backend task remains in_progress and the overall feature plan remains implementing. Do not integrate this checkpoint as an accepted implementation.
- Next action: resolve the runtime/iterator contract, replace the adapter, retain the resource RED test, rerun focused safety/lifecycle cases, then complete the unchanged full local gate. Hosted Linux x64/ext4 native acceptance remains separate. No final release or design acceptance is claimed.
