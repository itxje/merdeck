# PLAN-003 Investigate concurrent publication and containment

- **status**: completed
- **createdAt**: 2026-09-07 19:02
- **approvedAt**: 2026-09-07 (original authorization; day precision, no new approval event)
- **relatedTask**: SAFETY-001

## Context

Investigation baseline: `b314a1268f88be3ace1ccbd64ca9ab028044a117`, inspected only through Git objects. The local foundation provides configuration, contracts and dependencies; it does not contain the unaccepted file service. `DiagramService.saveDiagram` serializes service requests, then `FileRepository.replace` reads and hashes the target, constructs bytes, writes/syncs a sibling temporary file, re-reads the target, validates directories and temporary identity, and separately renames over the target. The final compare does not condition the rename on an inode or content version. Reads use Linux procfs directory descriptors with repeated pathname/identity validation. A descriptor can continue naming a moved directory.

The committed file-domain tests check earlier hooks, cleanup, simulated permission failures and service concurrency. They do not establish preservation in the final publication window. Native directory permission enforcement was previously observed to be ineffective on this filesystem; this investigation must measure capabilities again, not assume mode bits provide isolation. Markdown correction and the separate two-save regression are outside this task.

## Proposal

Implement a finite TypeScript research driver at `tests/investigation/safety/check.ts`, with helper modules in that directory only. Extract pinned modules to a unique ignored `tmp/safety/` module graph and inject a single final-publication seam into that copy with exact-match guards and recorded source hashes. Invoke the original publication operation after a real independent child process performs/fsyncs one specified mutation. Include nonconflicting and earlier-conflict controls, in-place write, atomic replacement, deletion, retained-descriptor and candidate cleanup/rollback schedules. Investigate ancestor moves before validation and after final validation using scratch sibling directories only.

Keep diagnostic loss observations separate from safety/control assertions in machine-readable evidence. Bound scenarios, child lifetimes and fixture sizes; restore hooks, close descriptors, terminate only owned children, remove unique fixtures, and retain only the evidence summary. Evaluate built-in backup/link/quarantine protocols and research native primitives without implementing or installing native code. Complete this plan with one recommendation and exact correction criteria.

## Risks

Scheduling proves an allowed interleaving, not its natural frequency. Hash evidence alone does not prove crash durability or retention after cleanup. Retaining a mutable inode cannot freeze writes from existing descriptors. Rollback and cleanup are publication operations with their own races. Native primitives and OS-enforced writer/root isolation would be material deployment boundaries and require concrete selection beyond this investigation.

## Scope

Only SAFETY-001, PLAN-003, their appended index entries and research TypeScript. No application/shared-document/manifest/lock changes; no dependencies, browser, daemon, external runtime helper, native/FFI implementation, host policy changes or production integration. All outside-root simulations stay within this worktree's ignored scratch. Required checks are frozen installs, the finite driver, lint, root and focused research typechecks, and whitespace review.

## Alternatives

Assess: repeated revalidation/locks; copy or hard-link backup then replacement; rename to quarantine then exclusive publication; atomic exchange plus retention; enforced cooperative or exclusive writer ownership. Each assessment must cover publication, retained versions, visibility, recovery, cleanup and open descriptors. If no built-in protocol meets all requirements, give two or three concrete alternatives with visible tradeoffs, not weaker acceptance documentation.

## Annotations

- Original 2026-09-07 MVP authorization covers this corrective investigation and research harness. The corrective decision explicitly requires preservation of concurrent external versions. Investigation/proposal are persisted before executable research. No additional user approval, prototype approval or application safety completion is asserted.
- Proceeding with the bounded research implementation under that recorded authorization after persisting the proposal.

## Evidence and conclusion

**No evaluated built-in protocol satisfies all required guarantees with independent, uncooperative writers and movable ancestors. Recommend an enforced single-writer root with mediated edits, subject to the explicit deployment choice below. The existing save protocol remains unsafe; this report does not approve it.**

The finite driver executes 21 scenarios. Three are expected baseline loss diagnostics, six are control assertions, three are containment diagnostics, seven evaluate candidate failures/tradeoffs, and two observe platform capabilities. A successful driver exit means these specified observations and controls were verified; `applicationSafetyPassed` is always `false`. It is deliberately separate from product acceptance and is not wired into the product's green safety gates.

### Observed publication evidence

Baseline repository source SHA-256: `0c486e14330917156126ddd6c88316b1658286c68aa3a344f92282b9bf50aa80`. The driver extracts seven exact Git objects, records every hash, and modifies only ignored copies. The publication graph wraps only the final `rename`; a separate graph adds read instrumentation for containment. Every insertion must match exactly once. There is no mock filesystem, service replacement or imported working-tree correction.

Let O be the initial bytes, E the independently written external bytes and N the submitted draft:

| Bytes | SHA-256 |
| --- | --- |
| O | `d67e0c0f2443ed90e6d036b75ed253372274103603691e7c22ba6df8099896be` |
| E | `cc5b164435957d8c9a5a185efc1bd920cda355b5363eb624e021c5a9d5d22787` |
| N | `20efd2f856f233cfd0c50548a33de5d3b74e43a93621b5995999e21045f75aa2` |

The final-window write/replacement/deletion actor runs in a real independent process, completes its file/directory sync, and exits before the original publication resumes. The held-descriptor probe instead writes after publication. Evidence records PID, device/inode/link count, size, hashes, before/after visibility, return/error, recoverable application hashes and fixture cleanup.

| Scheduled action after all final checks | Observed service result | Visible/recoverable application state |
| --- | --- | --- |
| No mutation | Success, N version | Complete O then N; no temporary names remain |
| In-place write of E | Success, N version | External inode unchanged by its write, then replaced by N; E is no longer recoverable |
| Atomic external replacement with E | Success, N version | External replacement has a new inode, subsequently unlinked by N; E is no longer recoverable |
| External deletion | Success, N version | Missing target is recreated with N |
| Already-open descriptor writes after publication | Service success; external truncate returns native `ENOENT` here | Descriptor reports original inode/link count zero; no successful late write is claimed on this mount |

Moving write/deletion earlier to `afterTempWrite` instead produces `conflict` with E's full hash / `deleted`, retaining E / absence and cleaning the temporary file. The no-conflict Markdown control preserves a simple BOM, CRLF, prose and second block exactly; it does not certify the parser subset or the separately owned Markdown correction.

These are deliberate schedules, not an incidence measurement, exhaustive interleaving proof or claim that every external edit is lost.

### Candidate protocol audit

All candidates still need stable, protected root ancestry. A file sync plus directory sync is necessary for durable names; this research does not simulate power loss. Candidate tests deliberately isolate namespace/retention behavior and do not implement a production recovery journal. [Linux fsync semantics](https://man7.org/linux/man-pages/man2/fsync.2.html) distinguish file data from containing-directory persistence.

| Candidate and publication point | Retained version and visibility | Recovery, cleanup and verdict |
| --- | --- | --- |
| Rehash/stat again; synchronous rename; advisory or process lock; publication is ordinary rename | No displaced inode retained. Target replacement is atomic, but independent writers can act after the last check. | Restart has no E to recover. Zero retention cannot fix loss. Return conflict only for detected changes; repetition is not an external-writer constraint. Reject. |
| Copy O to backup, then rename N over target | Backup preserves the copied O, not late E; copying while another writer mutates also lacks snapshot semantics. Target remains continuously named. `candidate-copy-write` loses E. | A synced backup/journal could recover O after restart, but cannot recover an uncaptured E. Deleting old copies cannot cure this gap; rollback can overwrite later versions. Reject. |
| Hard-link target to backup, then rename N | Backup retains that inode, including an open writer's later changes; it is not immutable O. `candidate-link-write` retains E but mutates the backup; `candidate-link-replace` loses external replacement E. Deletion can still be resurrected. | A retained link survives process exit if durably installed, but cleanup cannot infer that all independent descriptors are finished. Tests lose E both through a write after backup validation and replacement of the backup before unlink. Retaining forever is unbounded; finite retention needs enforced writer lifecycle plus acknowledgement. Reject as an unconditional protocol. |
| Rename target to quarantine, then exclusively link N into the vacant target name | Retains the inode moved at quarantine time. `candidate-quarantine-conflict` observes a missing target, external E, then `EEXIST`; O/E/N all remain recoverable in this schedule. | Crash between operations leaves the target missing; replay must preserve current target and quarantine, and signal conflict rather than restore blindly. Revalidate moved bytes before publication; an open writer can still mutate them later. Finite cleanup needs protected storage and acknowledged recovery. Fails required continuous visibility; not an in-scope fix. |
| Linux atomic exchange of N and current target | Exchange retains the displaced inode with no missing-name interval and fails if the target is absent at exchange. It still publishes N before checking the displaced content; subsequent in-place writers can mutate either inode. | Needs a durable transaction record and both named versions on restart. Never exchange/rename back after a separate check: a later E can be destroyed (`candidate-rollback-overwrite` proves this rollback pattern). A second exchange retaining a third version still allows further races; neither success nor bounded cleanup is proven. Research-only native boundary, not implemented. |
| Enforced single writer; version check under serialization, then rename | Other programs cannot modify target, retained inodes, temporary names or ancestry. Concurrent mediated requests conflict before publication. O/N visibility remains atomic. | Durable pending metadata and bounded retained versions can reconcile interrupted publication; stop accepting saves on retention exhaustion, never evict unresolved versions. Conflict returns 409 and preserves the draft. Feasible only after enforcement and restart criteria below are implemented and tested. |

A blind rollback is itself a destructive publication. The tested schedule validates N, allows an independent replacement with a later version, then restores O and loses that later version. An exchange with backup deletion is not a proof either: independent writes can occur after validation and before deletion. An already-open writer can outlive any fixed delay; repeated snapshots of its mutable inode can miss intermediate versions. No bounded history policy can preserve arbitrarily many independent versions without writer coordination, admission control or a stronger storage boundary.

### Configured-root containment

| Schedule or input | Verified boundary |
| --- | --- |
| Traversal, absolute/encoded paths, symlink target or ancestor | Service/schema controls reject read and save; no instrumented content read; scratch sibling bytes unchanged. HTTP transport is not present here, so no HTTP endpoint pass is claimed. |
| Move opened child directory before directory validation | `forbidden`; no content read; moved file unchanged. |
| Move opened child after read validation, before `handle.read` | A real read completes from the moved inode outside the configured pathname; later validation returns `forbidden`. Returning an error does not undo that read. |
| Move child directory or configured root after final publication validation | Save returns success and writes N into the moved directory outside the configured pathname. No redirection into a different symlink target is involved. |

The mover is an independent process with the same observed uid 1000. This demonstrates the consequence of having namespace-move capability, not that an HTTP client has that capability or that a second OS account was tested. Current runtime: Bun 1.4.2, Node 24.20.0 unchanged, Linux `6.12.76-linuxkit`, filesystem type `0x6a656a63`. A directory set to and observed as mode 0500 still permits independent file creation here. Injected EACCES maps to `forbidden`; it is separate from native permission enforcement. No ACL, mount sandbox, different-account denial or descriptor revocation guarantee is verified.

Required enforcement must deny non-service actors write/rename/unlink on files, temporary/recovery storage, the configured root, and every relevant ancestor; prevent alternate writable mounts/hard links and capability-based bypass; and exclude already-open writable descriptors when establishing ownership. Mode changes alone neither establish that boundary on this mount nor revoke existing descriptors. Provision a fresh controlled tree after stopping external writers, with service identity isolated from editors, and verify actual denial through the intended accounts/mounts before enabling writes. An actor retaining namespace-mutation or mount-administration capability is outside that enforced boundary because the control has not removed its capability; it cannot be waived away as merely a trusted operator.

### Supplied reliability evidence and matched control

The following evidence was supplied after the finite matrix completed. It was not reproduced or independently inspected in this investigation. The research baseline remains `b314a1268f88be3ace1ccbd64ca9ab028044a117`; no additional source, fixture or mount was accessed.

The real second-save regression intermittently returns a conservative conflict at an unchanged production identity comparison: reported device 41, inode `2728684` changing to `2728685`, with size 286, mtime, ctime and complete-file hashes equal. A smaller filesystem probe did not reproduce this. Temporary instrumentation was removed; identity checks were not relaxed and no tests were skipped or conflicts swallowed. Each direct integration test was reported to use its own `mkdtemp` beneath `resolve('tmp')`, with no shared fixture variable found in that entry.

| Supplied bounded run | Reported result |
| --- | --- |
| Direct integration acceptance entry, `bun test --rerun-each=20`, fixtures on the worktree host-shared mount | 36 passed, 4 conflict failures |
| One matched direct control, Bun 1.4.2, unchanged source HEAD `9930c2968b1e195e862dcf4372e2050ad54efdcc`, same absolute test entry, cwd and exclusive fixtures on overlayfs | 40 passed, 0 failed, 280 assertions, exit 0 |

Supplied mount inspection identifies the worktree filesystem as a fakeowner host-shared mount whose statfs type is UNKNOWN (`0x6a656a63`). The control's fixtures were on overlayfs (`0x794c7630`). These are reported environment observations, not a demonstrated cause. An earlier reported gate had 79 focused passes but 92 backend passes and one conflict failure; a later isolated pass cannot resolve the retained intermittence.

Interpretation: the evidence establishes a reliability issue and a contrasting control, not a specific filesystem/code cause, a failure probability or blanket Linux filesystem support. A same-content identity change still warrants the existing conservative check; do not drop it or relocate default tests to hide failures. This report's passing inode/containment controls establish only their recorded schedules, not general identity stability. Its native chmod/unlinked-descriptor observations remain distinct from injected EACCES. The separately reproduced final-window loss remains a data-preservation failure even if every second-save control passes. No new matrix, retry or acceptance waiver follows from this addendum; deployment-specific reliability and enforcement remain unresolved prerequisites of the recommendation.

### Primary API findings

Checked on 2026-09-07. The [Node 24 filesystem API](https://nodejs.org/docs/latest-v24.x/api/fs.html#fspromisesrenameoldpath-newpath) and [current Node API](https://nodejs.org/api/fs.html#fspromisesrenameoldpath-newpath) expose pathname rename without an expected-content/inode condition. [Bun compatibility](https://bun.sh/docs/runtime/nodejs-compat#nodefs) describes filesystem support, not stronger transaction semantics.

[Linux rename](https://man7.org/linux/man-pages/man2/rename.2.html) specifies atomic replacement and exchange, unchanged open descriptors, and the absence-only `RENAME_NOREPLACE` condition; exchange and no-replace cannot be combined. None compares an expected hash. [Hard links](https://man7.org/linux/man-pages/man2/link.2.html) share an inode and reject an existing destination, explaining both retention and quarantine behavior. [Directory descriptors](https://man7.org/linux/man-pages/man2/open.2.html) remain stable across rename. [openat2](https://man7.org/linux/man-pages/man2/openat2.2.html) constrains path resolution and can reject an escape race; it does not freeze an opened ancestor for subsequent I/O. These are semantic findings and inferences from the APIs, not native syscall test results. [Bun FFI](https://bun.sh/docs/runtime/ffi) is documented as experimental and unsuitable for production reliance. No addon, FFI call, helper runtime, syscall binding or host policy was installed or implemented.

### Recommendation and concrete alternatives

Select **A** if immediate file saves are required. There is no approved code-only correction that meets the original unrestricted external-writer guarantees. Do not ship the pinned protocol as safe or rename its acceptance criteria to best effort.

| Choice | User-visible behavior | Material boundary and next implementation |
| --- | --- | --- |
| **A. Enforced service-owned root (recommended)** | Save still updates the selected project file immediately. External editors must submit changes through the same versioned API; direct writes are denied. Conflicting clients retain drafts and receive 409. | New enforceable deployment ownership/isolation contract and migration to fresh owned inodes; existing-descriptor exclusion must be verified. Keep TypeScript/Bun and one executable, file storage and current API. Then implement serialized publication plus durable recovery metadata, bounded retention/admission control and the regressions below. No native helper is inherently required, but this mount has not proven the required enforcement. |
| **B. Explicit staged-change workflow** | Save stores a pending proposal without replacing the externally edited file; UI says pending, never saved. User reviews/reconciles and applies only after exclusive ownership is established. | Material API/UI semantics change, protected proposal storage beneath the configured root, opaque recovery identifiers and bounded capacity that refuses new proposals instead of deleting unresolved ones. Direct concurrent replacement remains prohibited; this is an alternative product workflow, not completion of immediate-save acceptance. |

Native exchange is not offered as a standalone third fix: it needs the same writer/retention constraints plus a new native deployment boundary and still lacks expected-version publication. OS/filesystem choices must be concrete and verified; this investigation does not implement them or authorize final integration.

### Exact correction acceptance

Future product regressions must fail when E is silently lost, even if saving returns an error. Keep this diagnostic driver separate and pin correction tests to the implementation being accepted.

1. At the precise final publication seam, independent in-place E and atomic replacement E must either be effectively prevented by the selected enforced boundary, or remain byte-for-byte recoverable with typed `conflict` (409), never silent success. Verify hashes, inode identities and retrieval after restart; a log hash is not a recoverable version.
2. External deletion must produce `deleted` (410) and leave the pathname absent; never recreate it from a stale request. No-conflict saves must return the new full-file hash and fresh selectors; readers see complete O or N, never a service-created missing/partial target.
3. Preserve selected-span-only Markdown changes, BOM/line endings/prose/other blocks, full-file version comparison and the current safe error schema. Any pending/recovery extension needs explicit opaque IDs, authenticated root-scoped retrieval, no absolute-path/content error leakage and no automatic force-save.
4. Exercise already-open writers before/after publication, before/after validation, throughout rollback and immediately before cleanup; also replace/delete target and backup names. Run on the supported deployment filesystem, not only this unusual mount. Never unlink unresolved/external-owned versions after a separate identity check.
5. Crash at durable intent, temporary sync, publication, directory sync, recovery recording and cleanup. Restart must reconcile without overwriting current external data, retain submitted drafts and prevent ambiguous automatic retries. Inject sync/storage failures and enforce bounded capacity by refusing new writes, not deleting unresolved history.
6. Verify permission/namespace denial with the actual external account and capabilities, including root/ancestor moves and pre-existing descriptors; test traversal/symlink controls independently. If an actor can still move an ancestor after validation, immediate pathname containment has not been established.

## Reproduction and review

Requires the pinned baseline Git object already present locally; the driver fails if it is missing and never fetches. This is a research prerequisite, not an application runtime dependency. Use the documented ignored local Bun installation, with Node unchanged:

```bash
npm install --prefix .cache/runtime --cache "$PWD/.cache/npm" --no-save --package-lock=false bun@1.4.2
export PATH="$PWD/.cache/runtime/node_modules/.bin:$PATH"
export BUN_INSTALL_CACHE_DIR="$PWD/.cache/bun-install"
bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run tests/investigation/safety/check.ts && bun run lint && bun run typecheck && git diff --check
bun x --no-install tsc --noEmit -p tests/investigation/safety/tsconfig.json
```

Run long commands through the prescribed project tmux session. The driver uses 21 fixed scenarios, 4-second child limits and a 45-second deadline, no race-retry/polling loop and no shared service. It verifies ignored canonical scratch, unique fixtures, exact evidence IDs, expected outcomes and cleanup; only its own children may be killed. On deadline it writes failed evidence and attempts owned-fixture cleanup rather than leaving a stale green result. Successful checks require all fixtures removed and no owned child remaining. Generated baseline graphs and fixtures are removed; `tmp/safety/evidence.json` retains the complete machine-readable evidence. This artifact contains diagnostic observations, not recovery storage for application users. Preview is not applicable.

Verified on 2026-09-07 at 19:10 UTC using the pinned local runtime. Both frozen installs, the exact driver/lint/root-typecheck/whitespace chain above, and the focused research typecheck exited 0. Evidence: `tmp/safety/final-check.log`, `tmp/safety/final-check.exit` and `tmp/safety/evidence.json`. The final run completed 21 scenarios with 28 independent child processes in 944 ms, all exiting 0, all generated fixtures/module graphs removed and zero remaining owned children. No manifest/lock or application source changed. These counts certify diagnostic completeness and controls only.

Reviewed the complete staged scope under the shared and TypeScript backend review policies: pinned-source extraction, real independent scheduling, contained fixtures, descriptor/process cleanup, typed evidence, loss-versus-safety labels and report claims. Corrected two evidence-integrity issues before the final gate: unexpected actor failures could have been treated as native permission denials, and arbitrary lstat failures could have been treated as verified cleanup. Only explicit EACCES/EPERM observations and ENOENT absence checks are accepted now. No unresolved actionable finding remains in the research deliverable.

| Severity | Outstanding count | Status |
| --- | --- | --- |
| Critical | 0 | pass |
| High | 0 | pass |
| Medium | 0 | pass |
| Low | 0 | pass |

Review verdict: PASS for this bounded research/report scope. SAFETY-001 and this investigation are complete. Application safety, corrective implementation, material deployment/workflow selection and PLAN-001 remain incomplete. No application preview or final integration was performed.

The supplied reliability-control addendum changes documentation only. Its staged diff and whitespace were reviewed; the previously completed executable matrix was not repeated. Original check results above remain scoped to that recorded run and do not certify the supplied second-save regression.

## 2026-09-07 superseding practical-save decision

The user explicitly requires external tools to keep editing original project files directly. The A/B alternatives above were not selected. The continuation recorded in [PLAN-004](PLAN-004.md) authorizes practical optimistic saves with full-file versions, serialized service saves, same-directory atomic replacement, external refresh and dirty-draft preservation. Changes detected before publication must conflict; detected deletion must remain typed deleted. The exact after-final-validation loss counterexample remains real and `applicationSafetyPassed=false`; it is no longer a universal-no-loss dispatch gate. All original research, results, labels and historical acceptance proposals above remain unchanged. No ownership migration, exclusive-editor prohibition, staged workflow, native helper or universal compare-and-swap search is authorized by this annotation.
