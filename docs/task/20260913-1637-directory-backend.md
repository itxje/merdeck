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

### Final checkpoint gate

- Source commit: `fd2a08ea73755b562cb3f763231cb75bdc5304f2`, clean at launch. `tmp/full-gate-metadata.json` records PID 175130, exact command, absolute log and start time 2026-09-13T16:54:26Z. Runtime observations are in `tmp/storage-observations.jsonl`; independently executed Node is v24.20.0 (`tmp/node-version.txt`), distinct from Bun's Node compatibility string.
- The unchanged command `bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run check:ci && git diff --check` ran in the required tmux session and exited **1**. Frozen installs and workflow lint passed; check:files reached its module suite (189 passed, 1 failed), then check:ci stopped. The retained descriptor assertion expected 2 but observed 1. Full log: `tmp/full-gate.log`; exit: `tmp/full-gate.exit`. Later aggregate stages did not run. Independent `git diff --check`, pinned typecheck and scoped lint passed; they do not satisfy the full gate.
- This is an introduced acceptance test exposing a verified pinned-runtime limitation, not a suspected unrelated/pre-existing project test failure. The source-independent runtime reflection and strace corroborate it; no untouched-base test pass is substituted for feature acceptance.
- First-read trace summary: `tmp/runtime-first-read-summary.json` records one requested read, 49 getdents64 calls, 10,005 dirents including dot entries, and EOF before the first result. Bounded streaming acceptance is false.
- Final status: blocked; self-review WARNING with one unresolved HIGH runtime-bounding finding. Backend task remains in_progress, overall feature plan remains implementing, and no native/release/prototype acceptance is claimed.

### 2026-09-13 17:10 UTC — resume reviewed correction

The existing claim and owner remain unchanged. The documentation-only diagnostic commit was selected separately after local baseline synchronization. The reviewed correction plan now authorizes implementation of the narrow getdents64 TypeScript FFI candidate plus committed actual-adapter physical acceptance within existing gates. The original HIGH remains unresolved until corrected application acceptance passes. No strategy has been silently adopted and no prior logical count is relabelled physical evidence. Local-green delivery will be ready for hosted validation only; task/feature/native status remains honest.

### Native candidate implementation and focused review

- Replaced the rejected adapter with fixed-name glibc getdents64 through the pinned TypeScript FFI. The native buffer is exactly 4096 bytes; i64_fast uses the pinned type enum, immediate errno capture, validated record bounds and independent UTF-8 names. Two actual descriptors remain owned until close; the growing-prefix move audit uses the same adapter. No package, runtime, transport-schema, storage-admission or frontend change was added.
- The libc bridge is retained for process life across service restarts. Native Linux close is attempted once; ambiguous errors refuse further pager work without retrying a possibly reused descriptor. Post-call event-loop yielding precedes abort/deadline/state checks and further metadata work. Synchronous calls can still block the service; no hard interruption bound is claimed.
- Corrected focused run: `tmp/native-check.log`, 247 tests passed, zero failed. The original actual two-descriptor regression is unchanged and now passes. Raw dot records add two consumed/excluded records under the reviewed contract. Native parser, unsupported ABI/libc/loader, actual EBADF, refill ownership, post-call abort, malformed records and close-error tests are included.
- Actual production repository/pager physical checks ran in source, bundled and compiled modes on ARM64/glibc 2.41/Bun 1.4.2: `tmp/directory-physical-EcipA1/summary.json` on overlay 0x794c7630/device55 and `tmp/directory-physical-KoduK9/summary.json` on virtiofs 0x65735546/device45. First pages in 1,003- and 32,771-file directories each used one 4096-capacity call returning 4088 bytes, before EOF. Complete traversal and 10,003 excluded entries, cursor replay, actual descriptors, injected EINTR and delayed-call cancellation passed. These harnesses import the actual adapter; they are distinct from the existing real release executable/bundle smoke checks and establish no x64 acceptance.
- Added the physical harness to the existing normal check:ci path, including --native. Retain small logs, traces and source hashes in the existing hosted evidence upload directory. Added physical move-audit assertions and HTTP quota/abort checks; final focused and aggregate reruns remain required after these additions.
- Review found test-runner contamination in the initial startup-failure test: 249 assertions/tests passed but the intentional process.exitCode=1 survived restoring undefined, so `tmp/pre-gate.log` exited 1 before physical checks. The corrected test isolates real startup failure in a child process and verifies exit1, safe error text and actual interval disposal without changing runner exit status. This was a test-harness defect, not a gate pass.
- PMA backend review checked native ABI/parser bounds, descriptor/library lifetime, fresh root/ancestor validation, mutation audit sharing, cursor/state reservations, principal binding, truthful trace accounting and normal-gate reachability. Fixed test isolation and failure-path fixture cleanup; final aggregate acceptance is still pending. Historical rejected-runtime HIGH remains unresolved for delivery until corrected aggregate checks pass.

### Source checkpoint for the normal aggregate

Final focused preflight exited 0: root lint/typecheck, 249 backend/config/contracts/startup/API tests, all source/bundle/compiled physical checks including EINTR, delayed cancellation and growing-prefix audit, then git diff --check. Evidence: `tmp/pre-gate-fixed.log` and `tmp/directory-physical-1quq7e/summary.json`; trace/log/hash copies are also retained under `tmp/ci-evidence/directory-physical-1quq7e`. Under strace the move audit reached its time bound before its record bound (3,089 source / 3,197 bundle reads), with fixed 4096-byte refills and no EOF; this is bounded refusal, not a completed move.

Self-review has no remaining actionable source finding after the corrections above; the prior descriptor defect is fixed in focused actual-adapter checks. Delivery acceptance still depends on the full normal aggregate, followed by actual Linux x64/ext4 validation. The clean source checkpoint is recorded in ignored `tmp/native-full-gate-metadata.json`; normal aggregate command and exit evidence use `tmp/native-full-gate.log` and `tmp/native-full-gate.exit`. A launched/running gate is not a pass. Keep this task in_progress, both plans implementing and prototype needs-review.
