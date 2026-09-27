# PLAN-011 Stabilize validated document and revision reads

- **status**: completed
- **createdAt**: 2026-09-08 05:33
- **approvedAt**: 2026-09-08 (original continuous correction authorization; day precision)
- **relatedTask**: READ-001

## Context

The unchanged accepted repository at 9749dd49844dbc79b1b5fbb90b63c3a16367b933 was independently exercised through an authenticated real loopback HTTP server using new owned overlayfs fixtures (type 0x794c7630, device 70). A gated actual descriptor remained open while PUT succeeded: original inode 1446820/link count 1 became an unlinked held inode 1446820/link count 0, while the current target was inode 1446824. The overlapping revision returned forbidden/403; its stable control returned 200. A separate real process wrote in place after initial descriptor stat: revision returned conflict/409 and its stable control 200. No stat values or file contents were fabricated by the gate. The fixture was removed and server stopped. Ignored evidence: tmp/read/baseline-evidence.json, baseline.log and baseline.exit (0 means the expected failing behavior was reproduced).

The supplied sanitized report independently shows the same mechanisms. Neither controlled result attributes every older uninstrumented browser failure to these mechanisms or to host load. This is unrelated to the exhausted inode-causality investigation.

readDocument and documentRevision use FileRepository.read; tree scanning does too. replace directly calls readIn with forWrite=true for initial/final comparisons, without going through read. withDirectory maps domain errors and closes every held directory before returning. readIn closes its target in finally. The current single-link guard classifies nlink=0 the same as genuine hardlinks; consistency changes throw the same public conflict as writes. Root/ancestor and OS errors are separate. Existing adversarial tests require refusal of target symlink substitution, hardlinks, root/ancestor moves, permissions, oversize and missing procfs.

## Proposal

1. Add a private read-consistency error subclass using the existing public conflict code. For read-only calls, a genuinely unlinked descriptor (nlink=0) is transient; genuine multi-link descriptors remain forbidden. At existing identity/metadata mismatch checks, classify a transient only when the currently inspected target is a regular single-link file on the original device. Other failures retain their existing errors.
2. FileRepository.read alone gets a fixed maximum of three total attempts (two reopenings), with no delay or polling. Catch only the private classification. Every retry closes target and directory handles and reopens/revalidates the entire root/ancestor/target chain. On exhaustion return the existing typed conflict; never return partial/stale bytes. Deletion remains typed deleted and roots remain unavailable.
3. Keep forWrite calls, storage admission, save locking, expected-version checks, temporary writes/cleanup and final publication unchanged. No global 403/409 catch or write rebase.
4. Add a trusted read-only afterReadOpen hook immediately after actual open and before first stat, with the actual handle for event gating and lifecycle assertions. It never runs for forWrite and does not replace filesystem APIs or metadata. Keep existing hooks unchanged.
5. Add focused domain tests plus a new authenticated API read-consistency suite; include it through a new source-rooted read test entry without editing active HTTP tests or auth code. Verify exact bytes/version after successful PUT, independent in-place/atomic replacement, bounded churn, deletion, genuine rejections and real handle closure. Existing file/auth/procfs/storage checks remain active.
6. Run focused strict types/lint/file/HTTP checks and scoped review first. Commit the clean implementation, then execute the prescribed frozen-install/check:ci/diff AND-list once at that clean SHA. Preserve any failure and report rather than retry the unchanged aggregate. New native/ext4/x64 and combined live/browser acceptance remain separate.

## Risks

Retrying authorization errors or write conflicts indiscriminately would weaken containment or optimistic saves. Returning old descriptor bytes would bypass current-path validation. All failures and successful bytes must remain fully checked.

## Scope

Read repository/service internals, focused domain/API read tests, this task/plan and concise architecture/changelog/decision records. No frontend, auth/routes/contracts, dependency, script, filesystem admission or production write-protocol changes.

## Alternatives

A one-shot read exposes expected replacement timing as authorization failure. Retrying public forbidden/conflict indiscriminately hides boundary faults. Returning a held unlinked descriptor can return superseded content. Taking the service save lock would not cover independent editors and would couple reads to writes. Three complete validated attempts bound work while covering a normal completed replacement; persistent churn deliberately remains conflict. No write rebase, browser-wide error suppression, polling, ownership migration or global retries.

## Annotations

The original 2026-09-08 explicit continuous correction authorization permits implementation after focused investigation/proposal. It does not approve final integration or the prototype. Historical no-loss diagnostics and completed records remain intact.

## Implementation record

The proposed three-attempt read path and narrowly scoped real-descriptor hook are implemented. The write path retains its original short-circuit behavior and never uses the reopening loop. Focused file/API/domain/procfs checks and scoped review passed; see READ-001 for condition-specific counts, preserved baseline failures and pending clean-SHA aggregate. [Bounded read consistency](../decisions/2026-09-08-read-consistency.md) records the lasting contract.

## Verification disposition — 2026-09-08

The single mandatory aggregate at clean 8a7a672b0f19f56fd4e37c5da99862e2409a9afc exited 1 at Node-backed ESLint after passing frozen installs, workflow, file and storage gates. The two new test import orders had been formatted by Bun-backed ESLint. A concrete runtime builtin-classification observation explains the mismatch. Commit ac1d469cc076a413adba41e09e0727946e4576bf changes only those two imports and passes focused actual-Node lint; the aggregate was not rerun. Later source/build/browser/binary/trace phases remain unverified. READ-001 records exact counts, logs, hashes and verified cleanup.

The plan remains implementing and the task remains in progress for review and required acceptance. This bounded correction does not reopen exhausted file research, change save guarantees, authorize integration or claim combined/native/live readiness.


## Corrected validation proposal — 2026-09-08

The first authorized finite validation retry tests the corrected retained source at 80dbd02d0a74c02c09e140d31661c74557b928e8. Its only source difference from the earlier aggregate candidate is the already verified two-import ordering correction. Existing claim and original day-level 2026-09-08 authorization are retained.

Commit the tracking proposal first; verify all non-tracking bytes remain equal; choose fresh owned canonical supported/refusal parents and verify actual filesystem/device and pinned tools. Execute one exact frozen-install/check:ci/diff AND-list through the prescribed tmux and Node-backed lint path. Success requires all existing assertions, resource checks and strict trace audits, plus independent artifact/screenshot/cleanup inspection. Failure ends this finite attempt with evidence and cleanup, without another run or implementation correction. Record the actual tested commit and any later documentation-only child separately.

Scope is validation and READ-001/PLAN-011 tracking only. No changes to production code, tests, locks, configuration, runners, thresholds, renderer fixtures or security assertions. The alternative of accepting focused lint alone is insufficient; unbounded reruns would conceal the requested finite evidence. Prior failures and all native/live/save limitation records remain intact.


## Corrected validation disposition — 2026-09-08

The first authorized corrected aggregate ran once at clean 96263a43dc63057993302ec6c95bd8d3bb2bcc08 and exited 1, with unchanged tracked index and empty immediate status. Frozen/source/file/storage/frontend/release stages passed; 93 embedded resources passed. All 30 actual executable browser cases completed, with 28 passed and two failures: an own-save response-body observation protocol error and the unchanged empty-project assertion timeout. The lazy-family stage was not reached and only one strict trace summary was retained.

No source/test/runner/config/threshold correction or second full run followed. Owned listeners, observed processes, runtime/token/config paths and fixture parents were independently verified cleaned; all failure artifacts remain. READ-001 records exact counts, commit, logged artifact hash, literal runtime fields and evidence paths. The task and plan remain incomplete for review. Proposed follow-up scope is the existing browser observation/fixture evidence plus the separate incomplete trace acceptance; no new production read defect or shared cause is established.

This final status/evidence record remains separate from the actual tested executable commit. All original authorization, prior failures and downstream combined/native/live/prototype/integration boundaries are preserved.


## Final bounded correction proposal — 2026-09-08

Retry2 retains the existing claim and original day-level 2026-09-08 correction authorization. Investigation confirmed the retry1 response-body protocol failure and the surviving owned save-race fixture in the empty-tree context. No new production read defect is established.

The only authorized scope extension is web/src/test/e2e/save-race.spec.ts, reused exactly from committed correction f855403ce68f73f4b7003f39471a776bcba36552. Patch SHA-256: 3bfe72bb505aeb0583bf449500882cb9c948ef0cd694faa30795c008a1f34963. Current blob f6df36282c4cd51d9856d34d5bf811ed12ec8237 must become d49e013e89c21eeddbd9f60209700f2677d4ffdf. Commit this investigation/proposal before applying; verify the resulting blob and preserve every other nontracking byte.

The real complete-response observer preserves status/body/version and existing save timing, while nested cleanup removes both owned files despite earlier cleanup errors. All five scenarios, original disk/draft/selector/byte/PUT assertions, network audits and both tree tests remain. No build endpoint, feature, production protocol, trace parser, timeout or dependency change is included.

Run fresh-storage Node-backed frontend lint/types, current build and all seven focused real-service browser cases; stop after any focused failure and owned cleanup. On success, review the exact patch under the core/frontend policies, commit clean implementation/tracking and run one exact mandatory aggregate. Preserve failure and missing-stage evidence rather than rerunning or broadening. This is the final automatic retry; a status/evidence-only final child never replaces the actual tested commit. Combined editor, new hosted native/live, prototype and final integration remain separate.


## Pinned correction focused result — 2026-09-08

The exact target blob d49e013e89c21eeddbd9f60209700f2677d4ffdf is applied in the one authorized browser test. Node-backed frontend lint/types, current build and all five save-response/two unchanged tree cases passed. Independent service/private-path/fixture cleanup and archived prior evidence are recorded in READ-001. Scoped core/frontend review found no actionable finding; production and all other test/runner/config/lock bytes are unchanged.

Commit the reviewed correction and focused evidence, then run the one allowed full aggregate at that clean commit with fresh observed storage. Required full browser/resource/lazy/trace acceptance is still pending. Prior retries and all downstream limits remain unchanged.

## Final bounded aggregate disposition — 2026-09-08

The final allowed retry ran one mandatory AND-list at clean c48a30091f32bbf09bc0435313ca2d798d2c3da1 and exited 1, with empty immediate status and unchanged index. Frozen installs, workflow, file/storage acceptance, root lint/types and isolated procfs refusal passed. Backend coverage reported 171 passes, two failures and one error: the unchanged snapshot hash-budget test returned truncated=false and exceeded its 5000 ms timeout; the unchanged twenty-pair multi-block test also exceeded 5000 ms. No shared cause or production read attribution is established.

The full frontend/release/build/browser/resource/lazy/trace stages were not reached. The seven passing focused browser cases do not replace this missing aggregate acceptance. No further correction, timeout change or rerun followed. READ-001 records exact commands, counts, log hash, actual storage/runtime identity, source scope and independently verified child/parent/session cleanup.

The plan remains implementing and READ-001 remains in_progress for review, with retry2 exhausting the existing automatic retry limit. The final status/evidence child is separate from the actual tested SHA. Earlier failures and baseline evidence remain intact, as do the three-attempt read boundary, unchanged write protocol, applicationSafetyPassed=false and all combined/native/live/prototype/integration gates. No further automatic READ retry is implied.


## Explicit finite diagnostic proposal — 2026-09-08

This separately authorized diagnostic phase follows the original day-level 2026-09-08 correction authorization and explicit exhausted-budget disposition. The existing owner/status and exhausted retry0/1/2 records are retained. Clean source is d1437711d23827f8229527dde0fc7e6bb5cd00c6, nontracking-equivalent to c48a30091f32bbf09bc0435313ca2d798d2c3da1; baseline is the retained committed 9749dd49844dbc79b1b5fbb90b63c3a16367b933.

The tree policy is a fixed 32 MiB byte budget. The old false truncation assertion cannot be described as a time-budget policy error. Mutable service-test fixture variables and timeout cleanup are a concrete lifetime hypothesis, distinct from the locally owned forty-save case. Neither the old log nor elapsed time alone proves cause or load.

Commit this investigation/proposal before any case/control execution. The ledger permits four unchanged covered/default-timeout case executions total, two bounded instrumented controls total, and only after causal evidence at most two focused correction regressions. Preserve original source/work/assertions and classify case verdicts separately from coverage threshold exits. Use event-driven observation, actual filesystem metadata/content hashes and child identity; hard-bound each control to thirty seconds and await termination/pipes/cleanup. No sleeps, polling, repeated unchanged cases or pooled rate.

A minimal test lifetime/isolation or measured finite per-test-bound fix is conditional on evidence; application changes remain unauthorized. Preserve the full forty MiB fixture boundary, forty saves, read maximum three, all write/security/storage checks and the exact browser observer. No full gate occurs in this phase. A further clean aggregate is conditional on separate review and follow-up; otherwise return incomplete findings and cleaned evidence. All native/live/prototype/integration and historical safety limitations remain open.


## Causal lifetime finding and correction scope — 2026-09-08

Four unchanged case executions passed their selected assertions but retained nonzero coverage exits. The first event control reproduced a concrete lifecycle defect: after a real default timeout, afterEach removed the complete intended 40 MiB fixture while the body was pending; next beforeEach changed global root/config, and the old body scanned the new 15-byte fixture and produced real truncated=false. This induced mechanism does not attribute the old aggregate's exact timing. The forty-save control completed all work and cleanup within 668 ms; the old save timeout remains unexplained and no timeout increase is justified.

The existing conditional authorization covers only the demonstrated hash-test fixture correction: immutable local configuration/root and body-owned finally cleanup, retaining all input bytes, assertions and default five-second timeout. Do not alter the save test, hooks for other cases, product code, runner configuration or browser observer. The remaining allowance is two regression cases, including the induced timeout/cleanup proof and an ordinary covered exact-case execution. No full aggregate or further diagnostics follow this phase; return incomplete evidence for review.


## Finite diagnostic disposition — 2026-09-08

Implemented only the demonstrated hash-test lifetime correction: a captured local configuration, exclusive local root and body-owned finally. All original inputs/assertions and the five-second limit remain. Scoped Node lint and strict types passed. Two regressions ran in one covered child: the induced timeout stayed failed, while the original body retained all complete inputs, returned real truncated=true and cleaned after settlement; the following ordinary corrected case and cleanup assertions passed. The child retained exit 1 and the unchanged coverage threshold; this is not full acceptance.

The final ledger consumes exactly four original cases, two controls and two regression cases, with zero aggregates. Seven owned child identities, eleven child fixtures, both observed parents and the diagnostic window are independently cleaned; historical evidence is unchanged. READ-001 records the detailed results and provenance. The original forty-save timeout remains unexplained, so the task/plan stay incomplete and no additional automatic work follows. The conditional extended aggregate requires a separate reviewed follow-up. Retry0/1/2, native/live/main/prototype and historical safety limitations remain unchanged.


## Explicitly extended validation proposal — 2026-09-08

Independent review of clean 8e171529ba734686b3de6e72ba5453be1fe587d0 satisfies the explicit exhausted-budget disposition's condition for one extended full verification under the original day-level 2026-09-08 authorization. Historical retries and diagnostic A4/B2/C2 counts remain exhausted, with the forty-save timeout unexplained.

Commit tracking first, preserve every reviewed nontracking byte and record the actual clean tested SHA. Archive prior reused output, measure fresh owned supported/refusal parents, export the four documented fixture settings and run the exact mandatory frozen-install/check:ci/diff AND-list once from the normal checkout with pinned tools in tmux. No extra case, control, correction or rerun is authorized. Record immediate exits, actual reached stages and independent cleanup. Completion requires the complete current aggregate and source/artifact/browser/trace review; otherwise retain incomplete status. New hosted/native/live, prototype and final integration/release gates remain separate.


## Explicitly extended completion — 2026-09-08

The one authorized extended AND-list passed with immediate exit 0 at clean 52845cbf7e816dd3ea89bfdd874433c5e2b3f00c, with empty initial/immediate status and unchanged index. Every nontracking byte matched reviewed correction 8e171529ba734686b3de6e72ba5453be1fe587d0. All current source/frontend/release stages, 30 executable browser cases, 93 resources, four lazy families and both strict trace summaries passed. Independent binary/manifest/asset, selected actual screenshot and owned cleanup review also passed; READ-001 records exact counts, hashes and limits.

The plan and task are completed for scoped implementation and local ARM64/overlay acceptance, returning for review. Final tracking-only metadata is separate from the actual tested executable commit. The old forty-save timeout remains unexplained; historical failed and induced runs are preserved, and retry0/1/2 plus diagnostic A4/B2/C2 remain exhausted. No extra validation ran. Combined update, fresh hosted x64/ext4/native, same-owner HTTPS, prototype and separate main/first-release gates remain downstream; applicationSafetyPassed=false and final-write-window/local-actor limitations are unchanged.
