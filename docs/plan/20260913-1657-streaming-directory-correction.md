# 20260913-1657-streaming-directory-correction Bounded directory primitive correction

- **status**: implementing
- **createdAt**: 2026-09-13 16:57
- **approvedAt**: 2026-09-13 17:10 (reviewed candidate implementation authorization)
- **relatedTask**: 20260913-1657-streaming-directory-investigation

## Context

**Reviewed candidate authorized for implementation; production adoption and feature acceptance remain pending actual application verification.** The experiment establishes physical streaming on actual Linux ARM64/overlay with Bun 1.4.2. It does not establish production safety of experimental FFI, actual x64 execution, ext4 acceptance, or a passing directory feature.

The clean diagnostic branch first fast-forwarded local baseline `a74391983abdcb64c7f8a4d8d52988e59a2c61b6`, then the exact incomplete checkpoint `40f20fbc0b44ea7784fdd5540027e7c088e726ff`. The latter is **unaccepted inherited executable history**, not this investigation's implementation. Its full gate exited 1 on the introduced descriptor resource regression; subsequent gate stages did not run. The retained assertion in `src/modules/diagrams/directory.test.ts` expects two owned descriptors after page one. Do not remove or weaken it. The backend task remains `in_progress`, the feature plan `implementing`, and the prototype `needs-review`.

Owner authorization dated 2026-09-13 covers the existing directory feature after investigation/proposal. This bounded diagnostic scope is separately authorized; experimental FFI adoption still requires concrete review. Constraints on helpers, runtime changes and write scope are implementation constraints, not invented quotations from the owner. The inherited [routing decision](../decisions/20260913-1628-directory-contract-routing.md) already correctly says whole-backend OpenAPI migration is outside directory-browsing scope; it is preserved.

### Runtime and primitive findings

- Actual host: `Linux bkd 7.0.12-linuxkit`, aarch64, little endian; Debian glibc `2.41-12+deb13u3`. Independently executed Node reports `v24.20.0`; the project-local copy of the installed Bun reports `1.4.2`. No runtime or dependency was installed/upgraded.
- Real held-descriptor/procfs admission observations: `/tmp` overlay `0x794c7630`, device `55`, stable identity; checkout `tmp/` virtiofs `0x65735546`, device `45`, content identity; `/dev/shm` tmpfs `0x1021994`, device `99`, refused writes. These are measured through the existing `inspectFilesystem`, not configuration overrides. No actual x64 or ext4 target was available. ARM64 evidence must not be relabelled x64/ext4 acceptance.
- Pinned `node:fs.Dir` source and checkpoint runtime reflection show `read` and `readSync` retaining complete `readdir` arrays; `bufferSize` validation supplies no physical bound. Pinned `Bun.Glob.scan` awaits a complete native walk, whose `matched_paths` are converted to a JS array. Pinned `node:fs.glob` caches `readdir` arrays and sorts them. None of these exposed paths supplies an owned bounded stream. This is a checked set of relevant APIs, not a claim about every private runtime facility.
- Select the **exported glibc `getdents64(int, void*, size_t) -> ssize_t`**, not `syscall` with architecture-specific numbers. Local dynamic-symbol inspection identifies `getdents64@@GLIBC_2.30`; official glibc 2.41 ABI lists identify `GLIBC_2.30 getdents64` on both aarch64 and x86_64. The installed ARM64 disassembly and glibc source show a direct syscall wrapper, without directory allocation, with a negative result translated into thread-local errno.
- Candidate support requirement: actual Linux little-endian LP64 x64/arm64, procfs, Bun 1.4.2, dynamically loadable glibc `libc.so.6` with `getdents64` (glibc >= 2.30) and `__errno_location`. This is an explicit deployment prerequisite addition, even without an npm dependency. A musl/static-libc-only image, missing symbol, unavailable FFI/JIT, unsupported ABI, or blocked dynamic loading must fail initialization safely; no eager fallback, helper or runtime upgrade is implied.

### Exact ABI and error handling

`linux_dirent64` is a kernel record, not `sizeof(struct dirent)`: `d_ino` is unsigned 64-bit at byte 0; `d_off` signed 64-bit at 8; `d_reclen` unsigned 16-bit at 16; `d_type` one byte at 18; name bytes begin at 19. Linux record lengths align to 8 on the selected LP64 architectures. Use little-endian `DataView` reads; do not convert inode/cookie to JS Number, infer authority from either, or seek using `d_off`. x64 layout/export inspection is source evidence only; actual execution is still missing.

The probe allocates one `Uint8Array(4096)` per stream and calls `getdents64` with `args: ['i32','ptr','usize']`, `returns: 'i64_fast'`. This retains the correct signed 64-bit ABI while returning small values as JS numbers. Validate a safe integer return in `0..4096`, or exactly `-1`. A first exploratory `i64` binding worked locally but generated an unconditional `INT64_TO_JSVALUE_SLOW` conversion after the syscall. The final `i64_fast` bridge returns `-1..4096` through the immediate integer path, avoiding that unnecessary allocation before errno capture. `tmp/ffi-bridge.txt` and `tmp/ffi-fast-bridge.txt` record the actual pinned generated bridge. No C helper was authored or compiled; these are runtime-generated bridge inspection text.

Obtain `__errno_location()` on the calling JS thread **before** each native call, then read that pointer with `read.i32` immediately afterward, before logging, awaiting, closing, or another native operation. Only interpret errno when return is `-1`; success/EOF may leave stale errno. Never reuse that pointer on another worker thread or across runtime shutdown. No callbacks, worker migration, or async native execution are proposed. Local repeated EBADF/EINVAL and injected EINTR establish the observed path, not a universal guarantee that experimental FFI preserves every ABI/error case. Runtime changes require reinspection and rerunning the fault matrix.

`0` means EOF; cache it, issue no further syscall, and dispose. A negative result invalidates the page. EINTR is an operation failure mapped to `unavailable`, **without retry**, preserving the existing no-retry operation contract. EACCES/EPERM map to `forbidden`; a disappearance in an owned live traversal maps through directory-change/root checks, never to a false EOF. EINVAL, EBADF and unexpected errors fail safely as unavailable/internal resource failures. Errors must not expose descriptors, absolute roots, errno text or native pointers to clients.

For every record require remaining bytes >= 24, `reclen >= 24`, `reclen % 8 == 0`, and `reclen <= used - offset`. Find a nonempty NUL-terminated name only inside that record; reject malformed length, missing NUL, embedded slash and impossible returned-byte counts. Do not use unbounded `CString` reads for dirent names or assume a 256-byte record. Copy/decode at most this bounded slice, require UTF-8 round trip, and count an undecodable name as excluded rather than addressing a replacement-character path. Dot entries are excluded and consume the logical visit budget. Padding after the NUL is not another name. Do not retain a view into the buffer past refill; retain at most the existing one pending metadata entry.

### Physical evidence and reproduction

Evidence is ignored local `tmp/`, not shipping code. The disposable fixture parent is recorded in `tmp/fixtures.json` (`/tmp/merdeck-directory-probe-kpJtRV` for this run). `tmp/setup.ts` exclusively created directories with 1,003 and 100,003 empty regular files. Test reads stayed in those fixtures plus the required procfs/runtime metadata; no original project data was used.

After verification, `tmp/cleanup-fixtures.ts` removed only this owned disposable parent and asserted its absence (`tmp/cleanup.log`). Probe sources, outputs and traces remain available in ignored `tmp/`; a repeat run must create fresh fixtures.

Run from this diagnostic checkout with the local pinned binary:

```bash
./tmp/bin/bun tmp/setup.ts
bash tmp/run-final-probes.sh
./tmp/bin/bun build tmp/signal-probe.ts --compile --outfile=tmp/signal-executable
bash tmp/run-edges.sh
./tmp/bin/bun tmp/summarize.ts
```

The shell runners must execute in the project/path-hash tmux session, as they did here (`t71hw9hw-8bb5bd`, also retained in `tmp/tmux-session`). `run-final-probes.sh` reuses the fixture manifest; setup must be run only for a new isolated fixture set. These probe files are intentionally uncommitted. The document records their protocol/results so a fresh checkout cannot accidentally claim they are shipped acceptance tests.

| Final experiment | Result on actual ARM64/overlay |
| --- | --- |
| First page, 1,003 files | 100 emitted; 102 consumed records including dots; **one** syscall with count 4096, returning 4080 bytes / 128 physical records; no EOF. |
| First page, 100,003 files | Identical 100/102/128 counts and one 4080-byte return; 832 unconsumed bytes retained in the same buffer. |
| All pages, 100,003 files | 1,001 pages; 100,003 unique emitted names; 100,005 records including dots; 783 calls including one EOF; 3,200,144 bytes total; no offset rescan. |
| Source / Bun bundle / native compiled probe | Each ran successfully, including first-page and edge/resource checks. This is a probe executable, not the application's release executable. |
| Primitive descriptor ownership | Before/after 8/8; one owned descriptor while active; close invoked once despite two disposal calls. |
| Proposed two-descriptor adapter shape | Fresh procfs-opened native fd plus independent anchor: exactly two retained descriptors, matching identity, back to baseline after both closes. |
| Repeated failure cleanup | 32 cycles, each reading then throwing, leave no owned descriptor; source/bundle/compiled edge suite before/after 9/9 after warming runtime stderr. |
| Invalid records / errno | Eleven malformed record/byte cases refused, real invalid UTF-8 and dots counted, 100 EBADF checks and EINVAL observed; missing-library/symbol failures throw. |
| Targeted EINTR | One fixture `getdents64` returns injected EINTR; errno 4 captured, no retry, close once. |
| Targeted slow syscall | A fixture call delayed 200 ms takes about 211 ms; queued abort/shutdown flags remain false at native return and run after yielding; retained resource is released only afterward. |

`tmp/first-small.strace` and `tmp/first-huge.strace` trace all threads, fd paths, opens/closes, metadata, reads and allocation syscalls. `tmp/physical-summary.json` independently counts fixture getdents calls/records/bytes and proves no fixture document-content read in the first-page traces. Both first-page windows show two 589,824-byte runtime stack mappings, not directory-sized allocation. `tmp/all-huge.strace` is a **separate** getdents/close-only trace; its lack of read events is not proof about content reads. The source inspection establishes that the all-pages probe uses anchored lstat and no document reads.

The candidate's owned allocation is exactly one 4096-byte backing store, one byte cursor, and one current name slice, independent of total directory entries. First-page heap/external observations and equal allocation traces support this, but are not an allocator-wide/RSS proof. All-pages verification deliberately uses a Set as a uniqueness oracle; it is not part of the candidate and its memory cannot support a bounded-process claim. Kernel filesystem cache, underlying device work, runtime GC/FFI code and process stack allocations are outside the per-stream buffer bound.

Final evidence SHA-256: `tmp/primitive.ts` = `11e1f61ffbab6be365e3c1a1509a81f1ade9acf974beabfa4c588b059a4b7047`; `tmp/first-huge.strace` = `c9c58ed438c1573b425f51b45a86f9b12fd5ab7ff8f1d43652ced63d7266e99c`; `tmp/physical-summary.json` = `70508f02716c8cb5bb1dc2118fb42def4a6aef78d806936d0be71aa5e969e1ab`. Other probe/trace hashes are retained in `tmp/evidence-sha256.txt`.

The initially failing edge count (9 versus 8) was retained in `tmp/edges-initial-failure.log`. `tmp/edge-failure.strace` identifies a lazy `fcntl(2, F_DUPFD_CLOEXEC, 0)` stderr duplicate; descriptor snapshots identify the output log, not a leaked directory. Warming **Node stderr** before the baseline yields stable complete descriptor counts; warming only console output was insufficient. Missing-symbol loading was isolated for three repetitions in `tmp/loader.log` and showed stable descriptors. No process-owned descriptor was manually closed to force a pass.

Early fault injection targeted runtime startup enumeration rather than the fixture and failed its assertion; that evidence is retained as `tmp/eintr-mistargeted.*`. Corrected runs use `strace -P` for the exact fixture root; `tmp/eintr.strace` and `tmp/slow.strace` visibly mark the fixture call INJECTED/DELAYED. No busy waiting or sleeps were used.

### Security and lifecycle interpretation

Raw enumeration has native order and is not a snapshot. Read-ahead is bounded but may contain names changed before their later use. Before metadata access and page publication, retain the existing fresh root/ancestor opens, `O_DIRECTORY | O_NOFOLLOW`, held identity/fingerprint comparisons, local invalidation and root-error precedence. The native descriptor only carries traversal position. Classify through anchored `lstat`, never `d_type`, inode number, cookie, cursor validity or a stale buffer.

Real probes verified directory add/fingerprint change, target/root replacement, root symlink refusal, ancestor replacement and symlink refusal, and the fact that a held old target remains accessible even when the named ancestor has changed. This demonstrates why fresh chain validation remains necessary. They do not prove the application rejects every race. Existing mutation/continuation tests must be rerun after adoption, including deletion/rename during reads, pending entries, sibling stability, observable virtiofs identity, and the disclosed final comparison/rename/external-actor limitations.

Use the existing reservation-before-open model and two descriptor slots; 32 streams imply 128 KiB of native buffers in addition to the existing metadata/pending-entry budget. Four active operations, 32 service streams, four principal/origin streams and the 324-handle ceiling stay unchanged. Native code cannot free or close these fds. The TypeScript owner closes each exactly once after in-flight work settles, and never retries Linux close on EINTR/ambiguous failure (an fd may already have been released/reused). Preserve the existing fail-closed reservation behavior on unproven cleanup failure.

A synchronous syscall blocks all main-thread request, timer, logout and shutdown callbacks until it returns. The injected slow-call experiment shows that no timer can enforce a hard wall-clock timeout. Check the logical deadline/abort/service state before and immediately after each call and before any new I/O/publication; retain resource reservations until actual close. Yield to the event loop between bounded refills/metadata batches so excluded-only pages cannot indefinitely starve expiry processing. Pending cancellation may require that yield before publication even when a fast synchronous call returns. Shutdown must reject new work, wait for active native calls to settle, then dispose; it cannot promise a five-second stop for an indefinitely blocked mount. A worker/helper would be new architecture and is not silently proposed.

The slow probe models pending cancellation/shutdown flags and retained ownership; it is not an HTTP cancellation, quota exhaustion, logout or application shutdown integration test. Existing 4/32/4 reservations, TTLs and principal binding were reviewed in the checkpoint but were not proven by this primitive probe. There is no feature `check:ci` PASS here.

## Proposal

### Exact replacement clauses for the feature plan

The following reviewed replacements are now applied to [the implementing feature plan](20260913-1628-directory-navigation-pagination.md). Their prior draft proposal and evidence remain recorded below.

**Section 1 — replace the first paragraph:**

> Add one metadata-only directory page endpoint, one metadata revision endpoint, and one best-effort explicit cursor-close endpoint. Keep the existing file document/revision/save and entry endpoints. Use a held nonrecursive directory stream backed by the exported glibc getdents64 function through the pinned runtime's experimental TypeScript FFI, one fixed 4096-byte raw buffer per stream, a bounded in-process continuation table, and forward-only single-use opaque cursors. This narrowly scoped FFI exception requires reviewed ABI, loading, error and native-host evidence before adoption. Do not add a package dependency, database, filesystem index, watcher, offset scan, separately compiled/deployed helper, runtime upgrade or whole-directory sort. Use one directory/page request at a time in the UI and retain a bounded page window.

**Section 5 — replace the Runtime directory prefetch row:**

> Native directory buffer | Fixed 4096 bytes per stream | Call glibc getdents64 only when all previously returned raw records are consumed. Preserve unread bytes across pages. Never prefetch after an entry/visit/byte boundary; no eager readdir or EOF probe at a boundary. Returned bytes are bounded physically, not by a runtime option.

**Section 5 — clarify the Dirents per page row, without increasing the 1,024 cap:**

> Logical records consumed per page | Fixed 1024 | Count each consumed native record, including dots, undecodable and excluded names. Buffered read-ahead is not yet a logical visit; at any stop there are at most 4096 raw bytes (at most 170 minimum-sized records) ahead of consumed position. Each refill is at most 4096 bytes, with no more than one refill per consumed record; no refill after a stopping boundary. Report existing visited/excluded fields without adding raw-byte counters to the wire schema.

For avoidance of ambiguity, at most 1024 calls and 4 MiB returned directory bytes per page is a conservative bound, including a possible final EOF call: an EOF call is issued only while the visit budget has room. Short records normally pack many per buffer. This is a byte/record bound, not a guarantee about filesystem-internal disk reads, mount latency or kernel cache allocation. Pending metadata entries do not consume another logical visit.

**Section 5 — replace Stream memory enforcement and add the raw buffer accounting:**

> Retain no previous page or whole-directory name set. Keep the existing one pending entry and at most 32 KiB serialized metadata per stream, plus exactly one 4096-byte native buffer and constant cursor counters. Maximum raw buffer ownership is 32 × 4096 = 131072 bytes; retain no name views beyond a refill. In-flight JSON and runtime/object overhead remain separately bounded/accounted as already documented.

**Section 5 — replace Algorithm item 1's stream-opening sentence:**

> After reserving both descriptor slots and the buffer, open an owned target anchor from the freshly validated chain, then a distinct O_RDONLY/O_DIRECTORY/O_NOFOLLOW descriptor through the controlled `/proc/self/fd/<anchor>/.` path. Compare both held identities, validate the named chain, and record the fingerprint before the first syscall. The TypeScript stream owns both descriptors; glibc getdents64 takes neither ownership nor a DIR pointer. Close temporary ancestors in finally and unwind every partially opened resource on failure.

**Section 5 — replace the final explicit Dir.read/close paragraph:**

> Expose explicit asynchronous read/close methods over one serialized, forward-only getdents64 byte cursor. The syscall itself is synchronous; the Promise interface does not make it cancellable. Parse and validate linux_dirent64 bounds before decoding each name; ignore d_type and d_off for authorization/classification. Reject malformed records and byte counts, exclude invalid UTF-8/dot names while counting visits, retain raw unread bytes across pages, and cache EOF. Read errno immediately on the calling thread after a negative result; EINTR fails the operation without retry. Keep the fixed runtime, no-helper rule and all wire/security/lifecycle caps. Retain owned library/buffer/fd lifetimes until calls have settled, and close each handle exactly once.

**Section 5 / lifecycle clarification:**

> The 5000 ms operation deadline is logical: after it expires, issue no new I/O and publish no page. Main-thread synchronous native I/O can delay observing cancellation, expiry, logout and shutdown. Check time/state on both sides of the call, yield between bounded batches, invalidate before publication, and keep quotas reserved until actual completion/close. Never close/reuse a descriptor or unload FFI while a call might use it. Blocked-kernel-call interruption and a hard shutdown wall-clock bound are not promised.

All other clauses remain: exact strict page/revision/close wire schemas and envelopes; 100 default/200 maximum emitted entries; 256 KiB success JSON; zero content reads; path depth default/max 64 and 1,024-code-unit paths; 4/32/4 operation/stream/principal limits; 120-second idle, one-hour absolute and session-capped expiry; five-second deadline/sweep; two retained handles and 324 subsystem handle ceiling; single-use bound cursors; 8,192-record/1,024-directory/five-second growing-prefix move audit; actual storage admission/identity and 0.8.4 behavior. The audit also consumes raw dot/invalid records and must apply the same bounded primitive; no later entries are silently dropped to escape its cap.

### Minimum later production impact

Add a small internal TypeScript native-directory module owning ABI/loading, a fixed byte buffer and checked record iteration. Change only `FileRepository.withListingDirectory`'s rejected adapter to compose that module with the existing two owned handles and validation hooks; `auditMove` already calls the same `view.open`, so it must share the corrected primitive. Preserve `DirectoryStream.read/close` consumers and anchored `view.entry`; no schema, UI, OpenAPI, config knob, preview or package change is needed for this correction. Lifecycle plumbing must ensure one successful library load per service/runtime lifetime, initialization failure before accepting directory work, no per-request dlopen, and disposal after all streams/calls finish. Targeted tests and deployment-prerequisite documentation are later implementation work, outside this docs-only delta.

## Risks

The official FFI documentation explicitly marks it experimental, describes known limitations and discourages production reliance. This is a material production-risk decision, not a routine dependency-free equivalence claim. Incorrect ABI/pointer lifetimes can crash the whole service; ordinary JS catch cannot recover from a native fault. glibc remains external to the compiled executable; Bun's FFI bridge generation/loading has executable-memory and libc assumptions. Source/bundle/compiled local success cannot establish hardened-container, all-libc or cross-architecture compatibility. Library names must never come from request input; startup environment/library search-path integrity remains an operator assumption.

Actual Linux x64/ext4 source, bundle and compiled execution, minimum-libc loading, native faults/error cases and full hosted acceptance are missing. Available ARM64/virtiofs evidence checks admission only, not huge-directory streaming/latency on that mount. Long-blocking real storage, signal restart variations, close-error ambiguity and failure of FFI itself remain acceptance gaps. The synthetic delay is a reproducible blocked-call demonstration, not a performance benchmark or disk-failure recovery proof.

## Scope

This investigation changes only `docs/task/`, `docs/plan/`, `docs/decisions/` and a concise `docs/changelog.md` entry. All executable probe sources/build outputs/traces remain ignored `tmp/`. No production executable, tests, package/config/lockfile, README, web or design changes; no remote job, push, tag, release or main change. The documentation-only commit must be selected independently of the unaccepted checkpoint history. **Never integrate the entire diagnostic branch as green.**

## Alternatives

- `fdopendir/readdir` is a real libc stream, but glibc 2.41 allocates 32 KiB to 1 MiB according to `st_blksize`, transfers fd ownership into DIR, and returns an overwritten internal record pointer. EOF/error require clearing/capturing errno, and readdir treats ENOENT on a dead directory as EOF. This is not a simpler way to preserve the explicit 4 KiB raw bound, ownership and directory-change semantics. No second experimental adapter was implemented.
- `node:fs.Dir`, `Bun.Glob` and `node:fs.glob` fail the inspected bounded-enumeration requirement. Stateless offset rescans, larger caps and whole-list allocation remain rejected.
- A native helper/Node-API addon or runtime change could avoid some experimental-FFI concerns, but introduces a separately reviewed toolchain/runtime/deployment scope. No such change is authorized by this proposal.

## Review and remaining acceptance

Applicable PMA core/backend self-review covers correctness, security, ABI, physical resource accounting, concurrency/lifecycle and evidence claims. Documentation review must distinguish tested primitive behavior from missing feature integration. The inherited HIGH finding at `src/modules/diagrams/repository.ts:335` remains unresolved; the checkpoint is still WARNING and not accepted. This proposal neither fixes it nor relabels the failed full gate.

Completed self-review of this documentation-only delta: **PASS**, zero actionable CRITICAL/HIGH/MEDIUM/LOW findings after correcting the all-pages trace's content-read claim and separating primitive tests from lifecycle integration gaps. Local documentation links, English artifact text, unchanged provenance/statuses and `git diff --check` passed. Primitive and edge runners each exited 0. No full-feature gate was run or claimed for this diagnostic delta.

Before adoption: review the explicit experimental-FFI and glibc >= 2.30 prerequisite; verify actual x64 and ARM64 source/bundle/compiled behavior on the intended deployment; preserve and pass the existing two-descriptor regression; add physical first-page and parser/error/lifecycle tests to the implementation; run the unchanged frozen-install/full local gate and separately the normal actual Linux x64/ext4 `check:ci --native` with a real refusal parent. Hosted execution/publication belongs to the separately authorized integration workflow; none was dispatched here.

## Annotations and sources

The correction is implementing under the concrete candidate authorization recorded below. Investigation completion is not feature completion, design approval or integration permission. No new dependency was added, so no registry-version claim is needed.

Official references read and compared with the pinned/local implementation:

- [Linux getdents/getdents64 API](https://man7.org/linux/man-pages/man2/getdents.2.html), [Linux record layout](https://github.com/torvalds/linux/blob/v6.12/include/linux/dirent.h).
- [glibc 2.41 getdents64 wrapper](https://github.com/bminor/glibc/blob/glibc-2.41/sysdeps/unix/sysv/linux/getdents64.c), [aarch64 exported ABI](https://github.com/bminor/glibc/blob/glibc-2.41/sysdeps/unix/sysv/linux/aarch64/libc.abilist), [x64 exported ABI](https://github.com/bminor/glibc/blob/glibc-2.41/sysdeps/unix/sysv/linux/x86_64/64/libc.abilist).
- [readdir API](https://man7.org/linux/man-pages/man3/readdir.3.html), [opendir/fdopendir ownership](https://man7.org/linux/man-pages/man3/opendir.3.html), [glibc buffer allocation](https://github.com/bminor/glibc/blob/glibc-2.41/sysdeps/unix/sysv/linux/opendir.c), [glibc readdir64](https://github.com/bminor/glibc/blob/glibc-2.41/sysdeps/unix/sysv/linux/readdir64.c).
- [FFI status and pointer rules](https://bun.com/docs/runtime/ffi) and [legacy documentation address](https://bun.sh/docs/runtime/ffi), both checked; [pinned FFI module](https://github.com/oven-sh/bun/blob/bun-v1.4.2/src/js/bun/ffi.ts), plus locally generated bridge inspection.
- [Pinned fs/Dir source](https://github.com/oven-sh/bun/blob/bun-v1.4.2/src/js/node/fs.ts), [Glob JS adapter](https://github.com/oven-sh/bun/blob/bun-v1.4.2/src/js/builtins/Glob.ts), [native Glob result materialization](https://github.com/oven-sh/bun/blob/bun-v1.4.2/src/runtime/api/glob.rs), [node:fs.glob cache](https://github.com/oven-sh/bun/blob/bun-v1.4.2/src/js/internal/fs/glob.ts).

### 2026-09-13 17:10 UTC — reviewed implementation authorization

Concrete review of the diagnostic proposal, primitive, ABI bridge, physical traces and PMA criteria found no blocking strategy defect. Candidate implementation of the narrow TypeScript bun:ffi getdents64 correction is authorized under the existing 2026-09-13 owner implementation scope. This is an implementation review decision, not an owner-specific acceptance of experimental FFI production risk and not production acceptance.

Implement a fixed-name, lifecycle-owned glibc loader for little-endian Linux LP64 x64/arm64 with glibc >= 2.30; use i64_fast and immediate same-thread errno capture, a checked 4096-byte record buffer and the existing two descriptors. Both directory pages and growing-prefix move audits must use it, with no eager fallback. Preserve wire shapes, quotas, actual metadata validation, save/identity guarantees, no-snapshot semantics, logical deadlines and post-native-call yield/state checks. Keep the prior physical resource regression meaningful.

The executable scope additionally includes committed physical-streaming application-adapter source/bundle/compiled acceptance harnesses connected to the existing normal check:ci and hosted --native path. No helper, C/addon, package dependency, runtime upgrade, web/design change or unrelated CI redesign is authorized. Source, bundle and compiled actual x64/ext4 execution, full local/native gates and compatibility limitations remain mandatory before integration/release acceptance. The existing backend task remains in_progress under backend-maintainer/20260913. No new claim is required; the overall feature remains implementing and prototype needs-review.

### 2026-09-13 17:22 UTC — candidate implementation verification

The production adapter now uses the reviewed primitive and process-lifetime libc retention, with a fixed close binding to avoid Linux close retries. Local actual-adapter source/bundle/compiled first-page, traversal, errno/cancellation and ownership evidence is recorded in the [backend task](../task/20260913-1637-directory-backend.md), separately for overlay and virtiofs. The committed harness joins the existing normal check:ci/--native flow and its evidence upload path. The full local aggregate and real Linux x64/ext4 gates remain required. This correction and the overall feature stay implementing; prototype needs-review and original authorization provenance are unchanged.


### 2026-09-13 — evidence correction and validation consolidation

Exact clean candidate `6c09919d8bfb569f3813ca48adbe9fac1fc53f51` passed the full normal local ARM64 gate. Subsequent review required replacing raw hosted evidence copies with guarded sanitized summaries and success/failure retention. The correction changes only verification/export/tests/workflow documentation; production backend source is unchanged. Latest authorization consolidates further checks into focused local export/workflow/lint/type/diff validation plus the mandatory full hosted x64/ext4 --native gate on the corrected candidate. It supersedes repeating the costly local aggregate for this verification-only delta and does not waive final acceptance. See the backend task for exact evidence/status. Experimental FFI and unverified minimum-libc/hardened environments remain disclosed limits.
