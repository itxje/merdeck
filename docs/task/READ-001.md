# READ-001 Stabilize validated reads across file replacement

- **status**: completed
- **priority**: P1
- **owner**: File service maintainer
- **createdAt**: 2026-09-08 05:33

## Description

Resolve independently demonstrated transient read failures during normal file replacement and in-place editing, without changing write admission or publication semantics.

## ActiveForm

Completed the scoped read correction and explicitly extended local verification.

## Dependencies

- **blocked by**: SAVE-001 (completed)
- **blocks**: combined update acceptance

## Notes

- Claimed before substantive investigation. PLAN-011 records the focused investigation/proposal before implementation.
- Authorization: the original 2026-09-08 continuous correction authorization explicitly covers demonstrated defects required for ordinary diagram/update/browser delivery, at day-level precision. Routine correction is authorized; no new product approval is needed. Final integration, native/live acceptance and prototype approval remain separate.
- Preserve completed SAVE-001/PLAN-004, closed FILE-001 and all historical results. The final comparison/rename diagnostic remains applicationSafetyPassed=false.

- Investigation/proposal complete before implementation: both controlled baseline races independently reproduced with actual authenticated HTTP, stable 200 controls and real descriptor metadata. See PLAN-011. Implement under the original 2026-09-08 authorization; no new approval pause.

## Scoped review

Applied the core and TypeScript backend review policies to the full read path, its directory/target lifetime, all read and write callers, and the new deterministic tests. The private retry signal survives domain error mapping, while target and ancestor handles close in finally before the next full attempt. No write call enters read(), and the original write-side final-stat short circuit is preserved. Auth routes, public error contracts, admission and save publication are unchanged.

The trusted hook observes actual descriptors only; independent mutations use real child processes and the replacement case uses an authenticated real PUT. Retry-boundary tests reach no accepted read stage for refused replacements and verify the outside sentinel and target directory contents. Ordinary error injection is explicitly distinguished from real identity/mutation evidence. Existing isolated missing-procfs and permission/admission/save tests remain active. First focused lint found 11 formatting errors; scoped formatting corrections resolved them without changing semantics.

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: PASS for the scoped implementation review; aggregate verification remains pending. No browser or deployment approval follows.

## Focused verification before implementation commit

All commands used project-local Bun 1.4.2, actual Node 24.20.0 and the prescribed project tmux session. Explicit fresh supported/refusal fixture parents and expected types were exported as in README; observed overlayfs 0x794c7630/device 70 and host-shared 0x6a656a63/device 41. Production filesystem policy decided admission; tests did not override it. Each test removed its own child fixtures and stopped its HTTP service.

| Command / condition | Result | Ignored evidence |
|---|---|---|
| Root and web frozen installs | Both passed, exit 0 | tmp/read/install.log, install.exit |
| Root tsc --noEmit; API integration tsc project | Each exit 0 | tmp/read/focused-types.log, focused-api-types.log and exit files |
| Scoped ESLint after formatting correction | Exit 0 | tmp/read/fixed-lint.log and exit file |
| bun test src/modules/diagrams/read-consistency.test.ts | 21 passed, 0 failed, 237 assertions | tmp/read/focused-tests.log and exit file |
| bun run check:files | 136 passed, 0 failed, 951 assertions; direct domain smoke passed | tmp/read/files.log and exit file |
| bun test ./tests/integration/api --coverage | 29 passed, 0 failed, 550 assertions | tmp/read/api.log and exit file |
| bun test ./tests/integration/acceptance | Missing-procfs refusal: 1 passed, 0 failed, 4 assertions | tmp/read/procfs.log and exit file |
| git diff --check | Exit 0 | Checked before implementation commit |

The six real authenticated read cases cover document/revision across successful service save, independent in-place mutation and independent atomic replacement. Each overlapping read returns 200 with the exact current full-file SHA-256; document reads and stable controls return exact current source. A service PUT really unlinks the held old descriptor, and each case needs exactly two read attempts. Session/Host/Origin/CSRF refusals retain 401/403 without entering reads; stale PUT retains 409. All held targets close and no temporary entry remains. Separate domain tests prove exactly three attempts under continued churn, no retry of ordinary public errors, typed deletion, refusal at changed boundaries and unchanged successful/conflicting write comparisons.

Tool prerequisites were verified in project-owned storage: pinned actionlint, Chromium and the README-required actual strace (6.13). No runtime, dependency, mount, shared service or user-data configuration changed. The next step is one frozen-install/check:ci/diff AND-list at the clean implementation SHA. Native, combined editor and live acceptance remain open for that new candidate.

## Single aggregate result and bounded handoff

The prescribed AND-list ran once at clean implementation commit **8a7a672b0f19f56fd4e37c5da99862e2409a9afc**, from 2026-09-08 05:47:41 UTC through 05:50:01 UTC:

    bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run check:ci && git diff --check

**Result: exit 1; not accepted.** The immediate working-tree status was empty. Frozen root/web installs passed without changes; actionlint 1.7.12 verified the workflow and pins; file acceptance passed 136 tests/951 assertions and the domain smoke; six storage tests/55 assertions passed. The real native-target mismatch was an expected refusal condition, with native acceptance still pending.

The root check stopped at ESLint with two import-order errors in the new read test files. Earlier focused ESLint had run directly in Bun, while the prescribed lint command executes ESLint with actual Node 24.20.0. A finite runtime observation confirmed that Bun 1.4.2 lists bun:test as a builtin and Node 24.20.0 does not; the two lint invocations therefore ordered that import differently. Original focused and aggregate logs remain intact.

The only subsequent source correction, **ac1d469cc076a413adba41e09e0727946e4576bf**, moves bun:test after node builtins in those two test files. Node-backed scoped ESLint fix and non-mutating verification each exited 0. Production repository bytes are identical to the tested implementation commit. No tests were removed, assertions relaxed, runtime configuration changed or aggregate rerun. The final documentation commit only records this handoff.

| Gate after the failing lint stage | Current evidence |
|---|---|
| Aggregate strict types, procfs and backend coverage | Not reached; earlier focused results remain separate |
| Frontend lint, types, coverage and production build | Not reached |
| CI/release tests, compilation and package identity | Not reached; no newly verified executable |
| Embedded assets, actual browser cases and process/file tracing | Not reached; no browser discovery or execution in this aggregate |
| Final AND-list whitespace step | Short-circuited; separate scoped whitespace checks passed |

Ignored evidence: tmp/read/full.log, full.exit, full-tested-sha.txt, full-start.txt, full-end.txt and full-immediate-status.txt; node-lint-fix.log/exit, node-lint-verify.log/exit and lint-runtime-observation.jsonl. Full log SHA-256: fddc8601323af123972c4cccab5c12d5fcac5aa963f199dc584c42688e0e0932. Baseline evidence SHA-256: 041a26be298f9a91d32c3642224f75eedfdbf3e1909c3abcb6573e7f9a326b90. Other focused log hashes are retained in tmp/read/evidence-sha256.txt.

Independent post-gate inspection (tmp/read/final-audit.json) confirmed that both explicitly observed fixture parents were empty, and no release result existed for this run. All test HTTP services had stopped; no binary/browser service had started. Both owned empty parents were then removed with canonical bounds and rmdir, with absence recorded in tmp/read/parent-cleanup.json. Logs, supplied/baseline evidence and project-local tool caches remain. Downstream checks must create fresh explicitly verified parents as documented in README; removed fixture paths are not deployment targets.

READ-001 and PLAN-011 stay in progress because mandatory aggregate acceptance is missing, despite passing focused behavior and corrected scoped lint. The bounded work returns for review without another automatic full run. Combined editor validation, a new native/ext4/Linux x64 candidate, live HTTPS acceptance and final integration remain open. Previously accepted native/live history is unchanged and does not certify this new candidate. Completed SAVE-001/PLAN-004, closed FILE-001, exhausted histories, applicationSafetyPassed=false and needs-review prototype status remain preserved.


## Corrected validation proposal — 2026-09-08

The existing File service maintainer claim remains active. The first explicitly routed validation retry follows the concrete import-order correction; it does not reset or reopen any earlier work. The original 2026-09-08 continuous correction authorization, at day-level precision, covers this bounded validation. Verified clean retained candidate: 80dbd02d0a74c02c09e140d31661c74557b928e8. The retained local foundation 9749dd49844dbc79b1b5fbb90b63c3a16367b933 remains its ancestor; no synchronization or source change is needed.

Proposal before execution: commit this tracking-only record, prove source/test/config/lock bytes still match the corrected candidate, create new canonical supported and refusal fixture parents, and record actual storage/runtime/tool identity. Run exactly one new prescribed frozen-install/check:ci/diff AND-list at that new clean commit, using the normal Node-backed command path and existing local prerequisites. Preserve the immediate result, full log, nested counts and cleanup. No redundant focused suite or source/test/runner/config change is proposed.

If the command fails, retain the finite failure and verify only owned cleanup before returning for review. If it passes, independently inspect binary/manifest/checksums, all actual asset/browser/lazy-family results, strict trace audits and screenshots before a status/evidence-only final commit. The prior failed aggregate at 8a7a672 and the builtin-classification diagnostic remain historical. Local ARM64/overlay cannot establish new hosted native or live acceptance; final integration and prototype approval remain separate.


## Corrected validation result — 2026-09-08

The one authorized validation retry ran the exact mandatory AND-list at **clean tested commit 96263a43dc63057993302ec6c95bd8d3bb2bcc08**, from 06:00:58 UTC to 06:06:41 UTC. This commit changes only the prior tracking proposal; all source/test/config/lock bytes match 80dbd02d0a74c02c09e140d31661c74557b928e8. **Immediate aggregate exit: 1.** Immediate status was empty and the tracked index was unchanged. No second run or implementation/test/runner/config correction followed.

Fresh canonical parents were independently observed as overlayfs 0x794c7630/device 70 and refused host-shared 0x6a656a63/device 41 before their actual values were exported. Tool provenance: project-local Bun 1.4.2; actual Node v24.20.0 through the prescribed command path; actionlint 1.7.12; Chrome for Testing 153.0.8010.12; strace 6.13; Linux arm64. Existing tools were reused without installation or global configuration changes.

| Stage | Actual result |
|---|---|
| Root/web frozen installs | Passed without changes |
| Workflow and immutable action validation | Passed, actionlint 1.7.12 |
| File checks and domain smoke | 136 passed, 0 failed, 951 assertions; smoke passed |
| Storage checks | 6 passed, 0 failed, 55 assertions; actual mismatch refusal preserved |
| Missing-procfs refusal | 1 passed, 0 failed, 4 assertions |
| Backend lint/types/coverage | Passed; 173 tests, 0 failures, 1459 assertions; functions 98.95%, lines 99.47% |
| Frontend lint/types/coverage/build | Passed; 135 tests; statements 92.84%, branches 89.48%, functions 89.76%, lines 93.43% |
| CI/release tests and compilation/package | 18 passed, 0 failed, 97 assertions; nonpublishing ARM64 fixture packaged |
| Embedded HTTP resources | 93 of 93 passed the existing byte, MIME and security-header checks |
| Actual executable browser suite | All 30 discovered cases ran once: 28 passed, 2 failed, browserExit 1 |
| Lazy-family browser stage | Not reached after browser suite failure |
| Two-service trace acceptance | Incomplete: only one summary retained; no full acceptance claim |
| Final AND-list whitespace step | Short-circuited; final scoped whitespace check passed separately |

File and backend counts overlap and are not a pooled total. All 30 browser audit records reported zero unexpected errors, including the two failed cases; those failures are retained as failures.

### Exact browser failures

1. Own-save response observation at web/src/test/e2e/save-race.spec.ts:30, invoked at line 78: page.waitForResponse rejected when response.json could not retrieve a response body through Network.getResponseBody. The runtime reported no data for the resource identifier and that the response had been navigated away from. This is the actual reported observer failure, not evidence of an HTTP 403/409.
2. Empty-project state at web/src/test/e2e/tree.spec.ts:29: the exact empty-project message was not found within the original 12000 ms timeout. No fixture/assertion/time limit was changed.

No common cause, host-load explanation or production read regression is inferred. The original byte, geometry, renderer and security assertions remain intact. The observed failures warrant review of response-body observation lifetime and empty-project fixture/state evidence in the existing browser scope. The missing second strict trace summary is a separate acceptance gap; the parser was neither changed nor re-audited after this failed gate.

### Artifact and scope of evidence

The gate packaged diagramdock-0.0.0-ci.fixture-linux-arm64 with logged SHA-256 **d8027fc4c7107be968a40d1509922883e48783264cab3474d9214886283fdcec**. The retained, unaccepted staging manifest at tmp/checked-release-9zaZPp/manifest.json identifies tested commit 96263a43dc63057993302ec6c95bd8d3bb2bcc08, Bun 1.4.2, target bun-linux-arm64, fixture tag v0.0.0-ci.fixture and 93 resources. This is not an accepted release package and was not promoted by the failed aggregate.

The runtime result at tmp/release-smoke-AAYAkT/result.json literally records result=failed, cleanup=true and nativeAcceptance=pending. Its one retained trace summary reports executions=1, pairedCalls=20, fileAccesses=589, writes=0, checkoutAccesses=0, runtimePath=empty and frontendExtraction=false. Both raw traces remain; no second passing summary or lazy-browser result is inferred. Actual browser screenshots/error contexts remain evidence, without a new visual acceptance claim.

Full log: tmp/read-retry1/full.log; SHA-256 **3707339b767e35063d88c7e743a74f75a275aadd0d11feb6be6fff9303a91f8a**. The adjacent full.exit, start.txt, end.txt, tested-sha.txt, initial/immediate status and index files preserve exact provenance. Other hashes are in tmp/read-retry1/evidence-sha256.txt. Both browser error contexts are retained beneath tmp/playwright-results; the browser environment is tmp/e2e-7sxYRk/environment.json. Previous baseline/focused/failed-gate evidence hashes were rechecked unchanged.

### Cleanup and disposition

Only owned cleanup was independently inspected after failure. tmp/read-retry1/audit.json confirms both observed parents empty and both exact executable listeners unreachable. The two service stop markers were zero. tmp/read-retry1/cleanup-processes-paths.json confirms all 21 recorded nonpersistent owned processes absent and 11 runtime/token/config/executable path checks absent. Both empty parents were then removed with canonical bounds and rmdir; parent-cleanup.json records absence. The owned check window had no children and was closed, preserving the original session. Logs, traces, screenshots, unaccepted staging output and local tool caches remain.

READ-001 and PLAN-011 remain in progress for review; no automatic additional retry, source change or acceptance is implied. The final child is status/evidence-only and must not be relabeled as the executable's tested commit. Combined editor validation, new hosted x64/ext4 and same-owner live HTTPS acceptance remain downstream. Prototype review and final integration stay separate. Earlier baseline 403/409, the failed 8a7a672 import gate, exhausted FILE/SAVE history, native/review history, applicationSafetyPassed=false and the final-write-window/local-actor limits are unchanged.


## Final bounded correction proposal — 2026-09-08

READ retry2 is the final automatic attempt under the existing limit of two retries. The File service maintainer claim and original day-level 2026-09-08 continuous correction authorization remain active. Starting clean commit: 5357db7ea86717557b2aefd1cfe5ac31eb516c62; the retained local foundation 9749dd49844dbc79b1b5fbb90b63c3a16367b933 is still an ancestor. No synchronization is needed.

Investigation before implementation: retry1 completed 30 browser cases with 28 passes and two retained failures. The old own-save observer could not read a canceled Chromium response body; the empty-project failure context actually lists save-race-own-save.md. The existing cleanup sequence could skip fixture removal if route teardown rejected. Browser audits reported zero unexpected errors and these observations do not establish a new production read defect.

The supplied committed correction has provenance f855403ce68f73f4b7003f39471a776bcba36552 and patch SHA-256 3bfe72bb505aeb0583bf449500882cb9c948ef0cd694faa30795c008a1f34963. Its only source path is web/src/test/e2e/save-race.spec.ts. Verified current/base blob: f6df36282c4cd51d9856d34d5bf811ed12ec8237; required exact target blob: d49e013e89c21eeddbd9f60209700f2677d4ffdf. Existing contracts, helpers and tree tests are present.

Proposal: commit this record before applying the exact pinned patch. The observer consumes a complete real original response through route.fetch, fulfills that same response and pairs actual revision/document versions. PUT commits before its browser response is held. Nested finally removes both exclusively owned files even if diagnostics or route teardown fail. No substituted body/version, swallowed error, generic HTTP allowance, pre-commit delay, build endpoint or changed assertion is authorized. Tree tests and all other source/config/runner/lock bytes stay unchanged.

Verify fresh actual supported/refusal parents and pinned tools in the prescribed tmux session. Run Node-backed frontend lint/types, the required current build, then the five save-response and two tree browser cases against owned real services. Preserve exact source/build provenance and independently verify owned cleanup. A focused failure stops this attempt. After focused success and scoped core/frontend review, commit the correction and tracking, then run exactly one clean-commit frozen-install/check:ci/diff AND-list. Record actual discovered cases, resources, lazy families, strict traces and cleanup; any failure stops without another run or scope expansion. Final evidence-only metadata stays separate from the tested executable commit.

The fixed patch keeps this correction reviewable; a new observer implementation or broader browser/application import is outside this finite scope. Earlier retries, exhausted file history, applicationSafetyPassed=false and all native/live/prototype/integration limits remain preserved.


## Pinned correction implementation and focused review — 2026-09-08

Applied the exact supplied patch after the committed proposal at 72b4511927fc052c5f1c13a7c501e9f979f70970. The resulting test blob is exactly d49e013e89c21eeddbd9f60209700f2677d4ffdf. No other nontracking source/test/config/runner/lock byte changed, including tree assertions and the production three-attempt read/write boundaries.

Scoped core/frontend review found no actionable defect in the pinned correction. The GET observer inspects the complete original API response and fulfills that same response; status failures are still visible to the unchanged network audit. It pairs real full-file versions without synthesizing data. The PUT response gate still follows the real commit, preserving newer/sibling drafts, warning timing, selectors, original bytes and PUT counts. Diagnostic events contain method/path/status/timing, not tokens, query values or diagram bodies. Nested finally retains error propagation while removing both owned files if diagnostic writing or route teardown fails. No build endpoint or unrelated feature is introduced.

| Severity | Count | Status |
|---|---|---|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: PASS for the scoped patch review. Full aggregate acceptance remains required.

Focused commands ran sequentially in the prescribed tmux session from 06:24:15 UTC to 06:27:25 UTC, using actual Node v24.20.0 through the standard command path and local Bun 1.4.2:

- bun run --cwd web lint: exit 0.
- bun run --cwd web typecheck: exit 0.
- bun run build: exit 0.
- bun run test:e2e save-race.spec.ts tree.spec.ts: exit 0, all 7 cases passed in 40.6 seconds, seven zero-error browser audits. All five save scenarios and both unchanged tree cases executed.

Focused provenance is proposal commit 72b4511 plus the single uncommitted exact target test blob, not a clean aggregate/executable claim. tmp/read-retry2/focused retains source.patch, source-sha.txt, test-blob.txt, initial/immediate status, runtime/storage provenance, stage logs/exits and build-sha256.txt. The built backend hash is 47c8e0746fdba7eb727065b0e91103fc5bdcdfae2d0a25442e1a95e77cfab947; built shell hash is 94884290192ce3dbb2003c7511437d8f50e8634a4ae6a9836e7dd96262142f81.

The fresh focused parents were actual overlayfs 0x794c7630/device 70 and refusal 0x6a656a63/device 41. Independent cleanup confirmed both exact listeners unreachable, both service exit markers zero, both child roots and all three private token/config paths absent, and parents empty with unchanged identity. Both empty parents were then removed with canonical guards. Service windows had exited and the check shell was idle.

Previous browser artifacts were copied and hash-verified before normal output-directory reuse: 26 retained artifacts are mapped in tmp/read-retry2/prior-browser-archive.json to tmp/read-retry1/browser-artifact-archive. Focused lifecycle JSON and screenshots are likewise preserved in focused/browser-artifacts with a hash map before the full run. Earlier logs/traces/results are unchanged; archive mappings preserve the original overwritten output paths without relabeling prior failures.

The next step is a clean correction commit and exactly one full mandatory aggregate with another fresh supported/refusal pair. Focused success does not complete READ-001 or approve integration.

## Final bounded aggregate result — 2026-09-08

Retry2 ran the one prescribed AND-list at **clean tested commit c48a30091f32bbf09bc0435313ca2d798d2c3da1**, from 06:31:19 UTC to 06:37:46 UTC:

    bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run check:ci && git diff --check

**Immediate aggregate exit: 1; runner exit: 1.** Initial and immediate status were empty and the tracked index was unchanged. The exact pinned browser test blob remains d49e013e89c21eeddbd9f60209700f2677d4ffdf. Apart from that file and this task/plan tracking, all bytes remain equal to starting commit 5357db7ea86717557b2aefd1cfe5ac31eb516c62. No second aggregate, test-budget change, source correction or broadened acceptance followed.

Fresh storage was measured before exporting all four documented fixture settings: supported overlayfs 0x794c7630/device 70 and refused host-shared 0x6a656a63/device 41. Runtime/tool provenance remains local Bun 1.4.2, actual Node v24.20.0 through the prescribed lint command, actionlint 1.7.12, Chrome for Testing 153.0.8010.12, strace 6.13 and Linux arm64. See tmp/read-retry2/full/provenance.json and run.sh; removed parents must not be reused as deployment roots.

| Stage | Actual result |
|---|---|
| Frozen root/web installs | Passed; no changes |
| Workflow validation | 1 workflow passed; action pins verified |
| Practical file acceptance | 136 passed, 0 failed, 951 assertions; direct domain smoke passed |
| Storage acceptance | 6 passed, 0 failed, 55 assertions |
| Root Node-backed lint and strict types | Passed |
| Isolated missing-procfs types/refusal | Passed; 1 test, 4 assertions |
| Backend coverage | 171 passed, 2 failed, 1 error, 1450 assertions across 173 tests; exit 1 |
| Aggregate frontend lint/types/coverage/build and release tests | Not reached |
| New executable, manifest and embedded resource checks | Not reached |
| Full executable browser cases, lazy families and both strict trace summaries | Not reached; zero cases/summaries in this aggregate |
| Final AND-list whitespace command | Short-circuited; final scoped whitespace inspection is separate |

File and backend counts overlap and are not additive. Reported backend coverage was 98.95% functions and 99.47% lines; the failing test gate remains failed. Each reached suite emitted the same six authenticated read-consistency conditions: service replacement, in-place change and atomic replacement for document/revision. Their validated responses were current 200, stale PUT remained 409, and each condition recorded closed read handles and service/fixture cleanup. These are six conditions per suite, not twelve distinct tests.

Two unchanged tests failed during backend coverage:

- src/modules/diagrams/service.test.ts:403, snapshot total hash budget: expected truncated=true, received false. The log records an unhandled assertion error and the test timing out after 5000 ms, at 5347.54 ms.
- tests/integration/files/practical.test.ts:32, twenty consecutive multi-block save pairs: timed out after 5000 ms, at 5000.34 ms.

Both files are byte-identical to the starting candidate. The earlier file stage passed; that result does not erase these later failures. No host-load cause, timeout/cleanup causal ordering or new production read defect is established. The unresolved scope is these actual budget/consistency failures in aggregate execution; no timeout increase, assertion relaxation or further automatic READ retry is authorized here.

No executable, manifest, resource inventory or trace acceptance was produced for the clean tested SHA. The separately passing seven focused browser cases and their earlier source build hashes remain focused evidence only. Full 30-case browser, 93-resource, four-family and two-trace acceptance is still missing for this candidate. The expected native-refusal record literally retains nativeSourceChecks=failed, nativeAcceptance=pending, deployedBinary=pending and browser=pending; its Bun compatibility field is 26.3.0, separate from the actual Node v24.20.0 tooling pin. Local arm64/overlay results do not certify hosted x64/ext4.

### Evidence and cleanup

Full log SHA-256: b0b78cd85a316a1b62cd74f2234aa7e008cbd3491737dbacaa00ff4aa0fec14e. The ignored tmp/read-retry2/full directory retains the exact tested SHA, command, start/end, immediate exits/status/index, provenance, full log, failure callback and independent cleanup records. audit.json reports aggregateExit=1, no reached release result and empty parents with unchanged observed filesystem/device.

Independent inspection found all 177 logged child roots absent with matching removal records. All six HTTP conditions in each reached suite recorded stopped services and removed fixtures. The check pane had no children; it was closed, leaving the original session. No executable/browser service window or listener was created by this aggregate, so no aggregate executable PID/trace proof is claimed. Both exclusively owned empty parents were removed with canonical guards and rmdir; parent-cleanup.json records absence. The initial cleanup observation's six-record assumption is preserved in cleanup-initial-observation.txt; corrected stage grouping reflects the two overlapping suites and did not rerun acceptance.

Focused service stop markers, closed listeners, private token/config removal and both focused parent removals remain recorded separately. Prior baseline and failed aggregate log hashes remain unchanged. The 26 prior browser artifacts and seven focused artifacts remain hash-verified in their archive maps. No rejected trace was reinterpreted or historical output relabeled.

READ-001 remains in_progress and PLAN-011 remains implementing for review. Retry2 exhausts the existing automatic retry limit; no retry3 or replacement task was started. The final child records status/evidence only and is distinct from the tested executable-source commit. Combined update validation, new hosted native/ext4/x64, same-owner HTTPS acceptance, prototype review and final integration remain open. Baseline 403/409, retry0/retry1 failures, completed SAVE and exhausted FILE history, native/review history, applicationSafetyPassed=false and final-write-window/local-actor limits remain preserved.


## Explicit finite diagnostic disposition — 2026-09-08

The existing File service maintainer claim remains active, with task in_progress and plan implementing. The original day-level 2026-09-08 continuous correction authorization and explicit exhausted-budget disposition authorize this separate finite diagnostic phase. Retry0, retry1 and retry2 remain exhausted; this phase is not retry3 or a reset. Starting clean commit d1437711d23827f8229527dde0fc7e6bb5cd00c6 has identical nontracking bytes to tested c48a30091f32bbf09bc0435313ca2d798d2c3da1. Retained foundation 9749dd49844dbc79b1b5fbb90b63c3a16367b933 remains an ancestor; no synchronization is required.

Investigation: the snapshot byte allowance is fixed at 32 MiB, independent of elapsed time. Five complete 8 MiB inputs exceed it. The failing test writes those files using mutable module-level root/config, while beforeEach replaces those variables and afterEach removes the module-level fixture. A timeout could expose a lifetime problem, but ordering in the old run is not proven. The twenty-pair case instead owns a local fixture and finally block; its forty real atomic saves need a separate duration/lifetime observation. The committed read delta changes only bounded read consistency; write admission/publication and both original failing tests are unchanged.

Proposal before execution:

1. Maintain an ignored invocation ledger with reserved identifiers, exact source/command/config identity, start/end, immediate exit and cleanup. Maximum four unchanged case executions: each exact failing case once at 9749dd4 and once at c48a300. Extract only their required committed source/test/config files into owned ignored scratch, sharing the existing dependencies. Keep original coverage configuration, default five-second test limit, work and assertions. Any coverage threshold failure from selecting one case remains visible and separate from the case verdict. Passive parent observation may record existing fixture output, filesystem events, actual sizes/hashes and timing without altering child source or return values.
2. Maximum two controls, each in one owned child with a hard thirty-second bound and awaited exit/output/cleanup. The hash control retains original work/assertions but gates continuation on actual timeout/afterEach/next-beforeEach events, records immutable intended fixture identities, actual entries/hashes and product results. The save control records phase timing around all forty real saves and exact assertions under an explicit diagnostic work bound. Instrumented control outcomes remain separate from unchanged cases; no synthetic filesystem metadata or product result is permitted.
3. Only if those observations establish a causal test-lifetime/isolation or finite per-test-budget correction, author the smallest correction and run at most two focused regressions. Preserve all five large inputs, forty saves and original byte/version/security assertions. Any reconsidered per-test bound requires measured legitimate work and induced failure/cleanup evidence within these limits. Product source changes are outside this disposition. No cause means a nonfinding handoff, not acceptance.
4. Do not run a full aggregate. Return clean diagnostic/correction evidence for review first. One conditional clean aggregate requires a separate follow-up after review; it is not an automatic retry or approval granted by this phase.

Fresh canonical supported/refusal parents must be observed and all four README fixture settings explicitly exported with actual types. Use existing local Bun 1.4.2, actual Node 24.20.0 and the prescribed tmux session. No dependency, runner-wide timeout, coverage threshold, production/storage policy or browser observer change. Preserve exact observer blob d49e013e89c21eeddbd9f60209700f2677d4ffdf, every prior failure and applicationSafetyPassed=false. A passing isolated case neither establishes cause nor certifies aggregate reliability. Setup failures consume their ledger entry and stop rather than silently extending limits.


## Finite diagnosis and scoped correction proposal — 2026-09-08

The four unchanged covered case executions are consumed, exactly once per source/case. Each selected case passed its assertions with the original five-second limit: baseline hash 970 ms (3 assertions), candidate hash 1111 ms (3), baseline forty-save 1.56 s (61), candidate forty-save 1.64 s (61). All four command exits were 1 with the original 80% coverage threshold retained; these narrow selections do not cover the full module. No threshold was lowered. Passive file observations are opportunistic and record concurrent-removal/stability failures rather than pretending to inventory every original input.

Both authorized controls are consumed. B1 gates the original hash test only after all five 8 MiB files are complete. The actual intended directory contained 41,943,055 bytes including the original 15-byte seed; each large file had SHA-256 b16bd32b101132fd0102461bc75ea65442c37293ac881ae953486c8ac26a7388, with genuine device/inode observations. At 5011.99 ms afterEach started with the body unsettled; at 5015.91 ms it had removed the intended fixture. The next beforeEach replaced global root/config, then released the original body. At 5017.47 ms that body observed the new directory containing only the 15-byte seed. The unchanged service actually returned truncated=false at 5028.54 ms; the original assertion failed and the body settled after the next test began. B1 retained exit 1, one expected timeout failure and one unhandled assertion error. This proves an induced mutable-fixture lifecycle defect, not the exact timing or cause of the old aggregate failure.

B2 performed all forty real saves with unchanged byte/version assertions, completing its finally cleanup at 667.80 ms. Its diagnostic-only 25-second case ceiling was enclosed by the parent's 30-second hard bound; it was not an acceptance timeout change. All 61 original assertions passed, with exit 1 under unchanged coverage thresholds. The control establishes no cause for the original forty-save timeout and supplies no justification to increase production-test timeouts. No product regression or load explanation is established by these observations.

Under the existing conditional correction authorization, change only the hash-budget test to own an immutable local configuration and exclusive local fixture, removed in its own finally after its body settles. Retain the original seed, five complete 8 MiB files, all three assertions and the unchanged five-second limit. Existing module hooks and other tests remain untouched; they cannot remove or redirect this local fixture. Leave the forty-save test unchanged and unresolved. This deliberately addresses only the demonstrated lifetime defect, without claiming complete aggregate repair.

Use at most two regression entries: one event-gated induced timeout through next-beforeEach proving that the corrected body still scans its complete original 40 MiB inputs and cleans its own fixture; one ordinary covered execution of the corrected exact hash case. Retain the expected induced timeout and coverage exits. No full gate is permitted here, and the unresolved save timeout remains a review limitation. Evidence and exact child lifetimes are in tmp/read-gate-diagnosis/A1 through B2 and ledger.json.


## Scoped correction, regressions and diagnostic handoff — 2026-09-08

The only source correction in this phase is src/modules/diagrams/service.test.ts: the hash-budget case captures its configuration before its first await, creates an exclusive local root, and removes that root in its own finally. Its five complete 8 MiB files, original 15-byte seed, all three original assertions and default five-second timeout are preserved. The existing module hooks remain unchanged. The forty-save test, product source, read maximum three, write protocol, security/storage/parser policy, dependencies, coverage configuration and browser observer are unchanged.

Core/backend lifetime review found no remaining actionable finding in this scoped correction. Captured configuration is not subsequently mutated; later beforeEach assignments cannot redirect the service's explicitly supplied local root. Assertions and service failures still propagate through finally. This review does not resolve the original save timeout or establish complete acceptance.

Node v24.20.0-backed scoped ESLint and root strict TypeScript each exited 0. The two permitted regression cases ran together in one covered child, recorded as two ledger units: an induced-timeout corrected case and an ordinary corrected case that follows it, with cleanup observations. They preserve the original work/assertions. The command retained exit 1, one induced timeout failure, one passing case and nine assertions; no unhandled assertion error occurred. This is diagnostic proof, not a passing gate or a standalone aggregate replacement.

In the induced regression, afterEach removed only the module fixture at 5022.49 ms while the original body remained pending. After the next beforeEach changed globals, the pending body still observed its original local root at 5247.80 ms, with all five identical 8 MiB hashes and actual identities intact, total 41,943,055 bytes including the seed. The unmodified service returned truncated=true at 6797.92 ms. All original assertions completed; owned finally removed that root at 7001.20 ms before body settlement. The following corrected case independently created, checked and removed its own complete fixture, then verified the first root absent. The induced five-second timeout remains a recorded failure; it was not raised, caught or relabeled.

Ledger consumption is final: four original case executions, two diagnostic controls, two regression cases in one child, zero aggregates. All seven actual child processes have captured PID/start/cwd/parent identities and awaited exit/output. No hard child termination was needed; thirty-second parent bounds remained active for controls. Independent inspection verified all seven exact child identities gone, all eleven observed child fixtures absent, and observer handles/work settled. Both fresh parents retained their actual overlayfs 0x794c7630/device 70 and refused 0x6a656a63/device 41 identities and were empty before guarded rmdir. Their absence is recorded. The diagnostic window was childless and closed, leaving the original session. No HTTP/browser/executable service was invoked.

Evidence: tmp/read-gate-diagnosis/ledger.json, source-extraction.json, fixture-settings.json, A1–A4, B1, B2, R1-R2, scoped-lint.log/exit, scoped-types.log/exit, correction.patch and final-cleanup.json. The exact cases came from committed 9749dd4/c48a300 sources; the regression copies add disclosed event observation to the working correction. The final correction commit is distinct from the earlier full-tested c48a300 SHA and has not run a full gate. All 38 recorded historical artifact/log hashes were independently rechecked unchanged, including the original failed full log. Earlier retry0/1/2 remain exhausted.

The original forty-save aggregate timeout remains unexplained. Its finite baseline/candidate/control observations do not justify a timeout increase, claim aggregate reliability or authorize another diagnostic. READ-001 and PLAN-011 remain incomplete for review. Any one conditional extended full validation requires a separate reviewed follow-up; no such command ran in this phase. Combined update/native/live/prototype/final integration gates and applicationSafetyPassed=false remain unchanged.


## Explicitly extended validation proposal — 2026-09-08

The existing claim and incomplete status remain. The original day-level 2026-09-08 continuous correction authorization and explicit exhausted-budget disposition now permit one extended full verification after independent review of clean correction 8e171529ba734686b3de6e72ba5453be1fe587d0. This is not retry3 or a reset. Retry0/1/2 and diagnostic counts A4/B2/C2 remain exhausted. The unchanged historical forty-save timeout is unexplained; review of the causal fixture correction, rather than an assumed resolution of all failures, is the basis for this verification.

Commit this proposal first and record the actual new clean tested SHA. Prove every nontracking byte matches the reviewed correction, including hash-test blob 0f1b8a0c67e7afff96749c1f9a17374f706f67e5 and browser observer d49e013e89c21eeddbd9f60209700f2677d4ffdf. Archive relevant prior output before normal runner reuse. Create fresh exclusive canonical supported/refusal parents, measure actual filesystem/device, and export all four README settings. Reuse the existing pinned tools and run from the normal checkout in its prescribed tmux session.

Run exactly one frozen root/web install, check:ci and git diff --check AND-list. Preserve immediate exit/status/index, all actual stage counts and owned cleanup; do not run extra focused checks, diagnostics or corrections. Any failure ends this phase after cleanup and evidence handoff, with later stages explicitly absent. Only a complete passing aggregate plus independent artifact/resource/browser/trace/screenshot/cleanup review can justify task/plan completion. The final tracking-only child must stay distinct from the actual tested SHA. Local arm64/overlay results cannot grant new hosted x64/ext4, combined update, live HTTPS, prototype or final integration/release approval.


## Explicitly extended verification result — 2026-09-08

The one explicitly extended mandatory AND-list ran from 07:10:22 UTC to 07:13:43 UTC at **clean tested commit 52845cbf7e816dd3ea89bfdd874433c5e2b3f00c**. This is the tracking-only proposal child of reviewed correction 8e171529ba734686b3de6e72ba5453be1fe587d0; all nontracking bytes match that correction. **Immediate AND-list exit: 0; runner exit: 0.** Initial/immediate status were empty and the tracked index was unchanged. No extra focused test, diagnostic, correction or aggregate followed. The final completion record is a tracking-only child and is not the executable's tested SHA.

| Reached stage | Actual result |
|---|---|
| Frozen root/web installs | Passed; no changes |
| Workflow validation | 1 workflow passed; all action pins verified |
| Practical file acceptance | 136 passed, 0 failed, 951 assertions; direct domain smoke passed |
| Storage acceptance | 6 passed, 0 failed, 55 assertions |
| Root lint/types and isolated procfs refusal | Passed; procfs 1 test, 4 assertions |
| Backend coverage | 173 passed, 0 failed, 1459 assertions; functions 98.95%, lines 99.47% |
| Frontend lint/types/coverage | Passed; 135 tests across 10 files; statements 92.84%, branches 89.48%, functions 89.76%, lines 93.43% |
| Production build and release tests | Passed; release 18 tests, 97 assertions |
| Compiled executable browser acceptance | All 30 discovered cases passed, 30 zero-error audits |
| Embedded resource transport | All 93 resources passed original bytes/MIME/security checks |
| Lazy renderer families | Flowchart, sequence, class and state passed; zero unexpected errors or external requests |
| Strict process/filesystem traces | Both supported and refused service summaries passed |
| Trailing AND-list whitespace check | Reached and passed |

File/backend counts overlap and must not be pooled. The original hash-budget workload, forty saves, five-second limits, all source/security/byte/geometry assertions and strict malformed/unknown trace rejection remained active. The expected negative native probe still reported nativeSourceChecks=failed, nativeAcceptance=pending, deployedBinary=pending and browser=pending for the real mismatching refusal mount. Bun compatibility metadata 26.3.0 remains distinct from the actual Node v24.20.0 tooling pin.

### Executable and visual evidence

Independent audit exited 0. The current artifact is dist/release/diagramdock-0.0.0-ci.fixture-linux-arm64, 85,444,904 bytes, SHA-256 **1a371266e9720f2efcf29effc08d33e700f6799713112f1ec3d5ab419a47a3ec**. Manifest SHA-256: 824c7c836657e245d98dce93c203b0856bb4267cdb4bf727e702afb27d5b8569. Inventory, SHA256SUMS, actual ARM64 ELF header and independent empty-PATH build-info matched the tested commit, Bun 1.4.2, target bun-linux-arm64 and nonpublishing tag v0.0.0-ci.fixture. All 93 manifest assets independently matched current web/dist byte lengths and hashes.

The actual release result is retained in tmp/release-smoke-JiFDRh/result.json. Its literal scope is host=arm64, target=bun-linux-arm64, result=passed, cleanup=true, nativeAcceptance=pending, with loopback disposable roots only. The two original emitted trace summaries are:

| Service | Executions | Paired calls | File accesses | writes | Checkout accesses |
|---|---:|---:|---:|---:|---:|
| Refused | 1 | 12 | 391 | 0 | 0 |
| Supported | 1 | 903 | 28717 | 20 | 0 |

Both report runtimePath=empty and frontendExtraction=false. The writes field is the trace summary's value, not a count of application saves. Supported raw trace: 29,848 lines, SHA-256 fac7d0e844cb1f4db0808d9621cda6c292e1eeac42e3179dfeba39b4bc0af86d. Refused raw trace: 506 lines, SHA-256 00c7f8c47ed13d3f04b27abf32c6649bccfcc1eef731b01681e6167ed1ee28f5. No rejected trace was reinterpreted; these are the current unchanged gate's two accepted summaries.

All 22 current screenshots were identified as written during this run and hashed. Nine were actually inspected: desktop light/dark, saved newer draft, 360-pixel drawer, multiline labels, comparison and dashed styling, narrow full-graph preview and the final lazy state diagram. The visible source/tree/preview, contained drawer controls and rendered label/style output matched their tested states. No actionable new visual finding was observed in those inspected images. This is application evidence, not prototype approval.

### Cleanup, review and completion scope

Actual fresh parents were overlayfs 0x794c7630/device 70 and refused host-shared 0x6a656a63/device 41, measured before exporting all four README fixture settings. Independent cleanup exited 0: all 35 recorded nonpersistent process identities and 189 owned fixture/runtime/private paths were absent. Both exact loopback listeners were unreachable; both service stop markers were zero. Both parents retained their observed identity and were empty before canonical guarded rmdir; their absence is recorded. The check window was childless and closed, leaving the original session. The event monitor exited 0; its notifications were delivered in a batch, so contemporaneous manual source/browser snapshots are retained separately and used in the combined identity check.

Ignored evidence lives in tmp/read-extended1: invocation.json, tested-sha.txt, initial/immediate status/index, full.log, full.exit, provenance.json, audit.json, binary-build-info.json, browser-audits.json, screenshot-review.json, current-screenshots.json and cleanup.json. Full log SHA-256: **796818832f0722a24fff279ee274e64bf0b5cb638e309ed0682817396f6525b3**. Before normal output reuse, 48 prior files were archived with matching hashes; all 80 previous and diagnostic evidence hashes were rechecked unchanged.

Final scoped source/evidence review found no new actionable issue: tested source matches the reviewed correction; current artifact identity and original assertions are verified, with complete local cleanup. READ-001 and PLAN-011 are completed for the scoped implementation and local verification, returning for integration review. The old forty-save timeout remains unexplained; this run neither erases that failure nor proves a universal reliability rate. Retry0/1/2 and diagnostic A4/B2/C2 stay exhausted. Historical baseline 403/409, failed import/browser/coverage gates, induced timeout failures, FILE/SAVE/native/review records and applicationSafetyPassed=false remain unchanged. Combined update validation, fresh hosted Linux x64/ext4 and same-owner HTTPS acceptance, needs-review prototype and separate final main/first-release approval remain downstream.
