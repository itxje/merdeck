# Consecutive-save inode observations

Status: unresolved reliability concern. No production change or acceptance waiver.

The README regression can fail on its second save because the file's inode differs between the preparation read and final read. Both reads still report the same complete content, size and timestamps. Conservative identity checks remain necessary: a same-content external atomic replacement must still conflict. A passing full quality command does not invalidate the retained repeated-test failures.

## Finite experiment

Six cases ran once, each with twenty iterations. There were no child timeouts or signals. The repeated test processes had a 45-second outer timeout and the test runner's default 5-second per-test limit. Each isolated child had a 10-second timeout with forced termination on expiration. No retry or polling loop was used.

| Case | Workload | Passed | Failed | Evidence under ignored `tmp/` |
| --- | --- | ---: | ---: | --- |
| 1 | Unchanged README acceptance test, one process, twenty repeats | 19 | 1 | `inode-case1.log`, `inode-case1.exit` |
| 2 | Unchanged test, twenty separate Bun processes, initial metadata preload | 18 | 2 | `inode-service-isolated-A2iwbS/summary.json` and per-child output |
| 3 | Raw built-in filesystem sequence, twenty Bun processes | 18 | 2 | `inode-raw-bun-BP5xpe/` |
| 4 | Identical raw source, twenty Node processes | 20 | 0 | `inode-raw-node-lQwRhg/` |
| 5 | Unchanged test, twenty repeats, metadata preload with test lifecycle persistence | 17 | 3 | `inode-case5.log`, `inode-case5.json` |
| 6 | Raw Bun sequence with extra synchronous boundary snapshots, twenty processes | 20 | 0 | `inode-raw-bun-boundaries-II0Tac/` |

These are distinct experimental conditions, not an aggregate reliability acceptance rate. All eight failing iterations remain recorded. The original 36-pass / 4-failure run and subsequent passing gate remain in [FILE-001](../task/FILE-001.md).

Bun was the project-local 1.4.2 binary; actual Node was unchanged at 24.20.0. Bun's `process.versions.node` reported its compatibility value 26.3.0, not a separately executed Node version. All traced fixtures reported filesystem type `0x6a656a63` and device 41. The type value alone does not identify a cause. No syscall tracer was available through `command -v strace`; nothing was installed or mounted.

## Observations and limitations

Raw case 3 reproduced the conflict without the application parser, service queue or test framework. For child PID 75635 (iteration 6):

| Field | Preparation read | Final read |
| --- | --- | --- |
| Device | 41 | 41 |
| Inode | 2787190 | 2787192 |
| Size | 286 | 286 |
| mtime, nanoseconds | 1788808201775912055 | 1788808201775912055 |
| ctime, nanoseconds | 1788808201777228064 | 1788808201777228064 |
| Birth time, nanoseconds | 1788808201775629261 | 1788808201775629261 |
| Link count | 1 | 1 |

The two full reads had equal bytes (SHA-256 `08a741f1753f03d020d148ba66479dc4195a8db0d06a5d7b3b1ee0f63490dd1f`). Each read's descriptor `stat` and anchored path `lstat` agreed. The intervening recorded write was to the second sibling temporary file, inode 2787191, with the next submitted content. There was no second target rename: the identity assertion failed first, the temporary file was removed, and fixture removal was verified. The other raw failure was iteration 14, PID 75758.

Case 5 (PID 76621) recorded the same pattern for the three failing saves. It also observed one inode-only transition after a successful second save, between two subsequent read-only attempts that reject stale content and invalid input before creating a temporary file. Sequence 295 reported inode 2787667; sequence 311 reported 2787668 with matching size, all recorded timestamps and link count. No traced target write or rename occurred between those observations. That is evidence about calls made by this process, not proof that an independent host writer or filesystem layer was absent.

Case 6 added direct-path and descriptor-anchored `lstatSync` observations around temporary creation, write, chmod, sync and rename, plus `fstatSync` immediately after existing asynchronous descriptor stats. Its 880 asynchronous/synchronous pairs matched, but none of its twenty iterations failed. Extra calls change scheduling; this negative result neither proves synchronous calls fix the problem nor establishes an asynchronous runtime defect. Node's twenty successful runs are likewise a negative observation, not a causal attribution.

Evidence collection has explicit gaps. The process-exit listener used in case 2 did not produce JSON traces under the test runner; its twenty child PIDs, exit codes and output are retained, but per-boundary metadata and fixture cleanup were not independently recorded. Case 1 records its shell PID and test output, not the test child PID or metadata. Case 5 switched to the documented [test lifecycle hook](https://bun.sh/docs/test/lifecycle) and recorded twenty fixture removals with no tracked descriptors left open. All sixty raw children independently recorded zero leftover temporary entries and verified removal of their own fixture. No unrelated path was traced or cleaned.

No actual test-created unexpected target replacement was established, nor was runtime or filesystem attribution. The narrow observation is that two consistent descriptor/path views can report different inodes across reads of unchanged content on this host. The original regression remains unresolved. No application code, original test assertion, identity/version check, dependency or save protocol was changed.

## Supplied independent filesystem control

A subsequently supplied report identifies the worktree storage as a host-shared `fakeowner` mount with statfs type `0x6a656a63`. It provides one matched direct acceptance control whose current working directory was an exclusive project scratch directory on overlayfs (`0x794c7630`). Both tests create their own `mkdtemp` beneath `resolve('tmp')`; consequently their fixtures followed that overlayfs working directory even though the test source was loaded from the retained worktree. The supplied source inspection found no shared fixture variable in that entry.

The control used unchanged source baseline `9930c2968b1e195e862dcf4372e2050ad54efdcc` and Bun 1.4.2. Its command was `bun test --rerun-each=20` followed by the absolute path to that baseline's `tests/integration/files/acceptance.test.ts`. Reported evidence files `result.log` and `result.exit` in the project scratch directory record **40 passed, 0 failed, 280 assertions, exit 0**. These forty tests are two tests repeated twenty times, matching the earlier 36-pass / 4-failure direct run rather than the single-test cases in the local matrix. The control was supplied after that matrix; it was neither rerun nor independently inspected here, and its counts are not added to the six-case table.

This supplies a relevant different-filesystem comparison and supersedes the earlier absence-of-control statement. It does not establish which implementation layer caused the observed inode changes, quantify a failure probability, erase the host-shared failures, or resolve external overwrite. It also does not provide the raw probe's descriptor/path metadata or syscall evidence at a failing boundary. File-domain reliability remains unresolved. Default test fixture placement, identity/version checks and acceptance criteria remain unchanged; no blanket Linux filesystem support claim follows from this result. The matrix is closed, with no further case or retry scheduled.

## Reproduction and diagnostic checks

The diagnostic files are manual executables, not automatically discovered test files. The metadata preload must run only in a separate test process. The raw probe uses TypeScript plus built-in APIs supported by both pinned runtimes; it does not import application modules. See the official [FileHandle stats API](https://nodejs.org/docs/latest-v24.x/api/fs.html#filehandlestatoptions) for descriptor metadata semantics.

All commands below run from the project worktree with the local runtime on PATH. They describe individual finite cases, not permission to restart this completed matrix:

```bash
export PATH="$PWD/.cache/runtime/node_modules/.bin:$PATH"
timeout --kill-after=2s 45s bun test --rerun-each=20 --test-name-pattern='^ordinary README contexts' ./tests/integration/files/acceptance.test.ts
bun tests/integration/files/inode-matrix.ts service-isolated
bun tests/integration/files/inode-matrix.ts raw-bun
bun tests/integration/files/inode-matrix.ts raw-node
DIAGRAMDOCK_INODE_TRACE="$PWD/tmp/inode-case5.json" timeout --kill-after=2s 45s bun test --preload ./tests/integration/files/inode-preload.ts --rerun-each=20 --test-name-pattern='^ordinary README contexts' ./tests/integration/files/acceptance.test.ts
bun tests/integration/files/inode-matrix.ts raw-bun-boundaries
```

The committed runner reports every child result and exits nonzero if any child fails. Earlier collector runs for cases 2–4 exited zero when collection completed; their explicit child results, not collector status, determine the table above. The final preload uses `afterAll`; case 2's earlier missing traces are not retroactively claimed as verified.

Diagnostic-only verification uses a focused configuration without changing the project manifest or normal test selection:

```bash
cat > tmp/inode-diagnostics.tsconfig.json <<'JSON'
{
  "extends": "../tsconfig.json",
  "include": ["../tests/integration/files/inode-*.ts"],
  "exclude": []
}
JSON
bun node_modules/typescript/bin/tsc --project tmp/inode-diagnostics.tsconfig.json
bun node_modules/eslint/bin/eslint.js tests/integration/files/inode-*.ts
git diff --check
```

The full application gate is not repeated for diagnostic-only work. Earlier passing gate results are historical evidence, not acceptance of this reliability issue. The separate final publication-window investigation is unaffected.

## Host-shared virtiofs measurement (2026-09-12)

A later, separately scoped investigation ([STORAGE-001](../task/STORAGE-001.md)) measured the same failure class on a different host-shared mount: statfs type `0x65735546`, mount type `virtiofs`, carrying the configured project of a container deployment. It does not reopen the closed matrix above; it is its own finite experiment on different storage.

One publish cycle is stable there: 320 raw cycles, in-process and across twenty separate processes, published without a mismatch, and an isolating probe over the absolute path, the descriptor anchor and the temporary file's metadata calls found no inode change in 600 cycles. Consecutive publication is not: the protocol's read, stage, re-read and rename cycle, repeated twenty times per fixture over twenty fixtures, produced 7 mismatches in 400 cycles against 0 in 400 on an overlay control. Each mismatch carried identical bytes, identical size and identical modification and change times to the nanosecond, with only the inode number different, so the instability follows an intervening atomic replacement in the same directory rather than a read.

With admission temporarily extended to that type in a throwaway checkout, the real file tests failed 5 of 80 runs, all in consecutive-save cases, with the content version matching and the identity comparison failing. Write admission is unchanged: the type stays refused, saves on it keep failing closed with `filesystem_unsupported`, and reads keep their existing containment checks. Whether the identity model should stop depending on inode stability is a separate question with its own cost, recorded in that task and not decided here.
