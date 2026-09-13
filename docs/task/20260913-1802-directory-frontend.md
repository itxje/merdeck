# 20260913-1802-directory-frontend Implement directory navigation and frontend acceptance

- **status**: completed
- **priority**: P1
- **owner**: frontend-maintainer/20260913
- **createdAt**: 2026-09-13 18:02

## Description

Implement the completed [frontend proposal](../plan/20260913-1746-directory-frontend.md) and production acceptance for the [directory feature](../plan/20260913-1628-directory-navigation-pagination.md). Preserve independent document/draft protection and existing preview behavior.

## ActiveForm

Integrating directory navigation and verifying production behavior

## Dependencies

- **blocked by**: (none; reviewed backend and completed design integrated)
- **blocks**: final integrated acceptance

## Notes

The owner authorized implementation, routine defaults and repairs on 2026-09-13 and explicitly started production integration after reviewed backend integration. Reuse the completed investigation/proposal without a new design round. Overall feature status remains implementing; prototype remains needs-review. Backend source is read-only.

### Implementation findings and proposal

The integrated contracts and completed frontend design are present. Production still uses global tree membership for folder filtering, mutation versions and link authority. Implement the existing proposal: a bounded single-use directory run, independent route directory, deferred documents and validated asynchronous links. Reuse current controls and tokens; no dependencies or backend changes. The initial decoder/Retry-After tests establish missing behavior before executable edits. Required acceptance includes focused lifecycle/UI tests and the unchanged normal local aggregate; final native integrated acceptance remains pending.

## Implementation and verification

Implemented the existing directory design with the current base-nova/Base UI/Tailwind components and dependencies. Router search now separates browse directory from selected file. Directory runs consume cursors once, cap displayed and cached pages at five, close abandoned cursors and reject late/session-stale results. Current-window filters retain folders and drafts. Document APIs supply deferred Markdown choices, mutation versions and cross-directory link preflight; selected-file polling and save protections stay independent. Source/preview layout remains measurable when hidden on narrow screens. Source, bundle and executable browser acceptance use the same updated tests; authentication checks now include directory endpoints without dropping legacy coverage. No backend source, dependency, prototype or brand asset changed.

### Observed checks

- Bun 1.4.2 and Node 24.20.0 observed; root and web frozen installs passed. Documented Chromium, actionlint and tracing prerequisites installed/verified.
- Initial decoder/Retry-After RED: `tmp/directory-frontend/red.log`; lifecycle RED: `lifecycle-red.log`. Self-review exposed a session transition retaining old directory rows: `session-red.log`; the guarded scope/reset fix passed.
- Focused workspace/preview suites: 80 tests passed (`workspace-tests.log`). Full frontend lint, typecheck and coverage: 24 files / 458 tests passed (`frontend-check.log`, exit 0); functions 92.05%, lines 93.39%, branches 89.43%.
- Production build passed. Initial full browser run: 60 passed / 2 failed (`browser-all.log`), both old test assumptions (unentered nested directory and missing expected directory 401 allowlist). The targeted corrected production run passed all 12 cases (`browser-fixes.log`, exit 0), covering all five new directory scenarios, renderer families/large graph, and every save-observation race including auth loss. This is not a claim that the initial full browser run passed.
- Actual browser checks cover history/refresh/legacy links, independent selection/drafts, deep read/save, 621 siblings across seven pages and five-page eviction, unlisted links, excluded-only continuation, filtered folders, deferred/empty/unsupported Markdown, external removal and delayed responses. Existing mutation/browser cases retain create/move/delete, hidden-content refusal, exact-byte, auth, security and preview checks.
- Browser fixtures used measured `/tmp` overlay `0x794c7630` and separate `/dev/shm` tmpfs `0x1021994`; service shutdown and owned fixture cleanup succeeded. Evidence is under ignored `tmp/directory-frontend/`, with per-run service records under `tmp/e2e-*`.
- Original directory prototype returned HTTP 200 at `http://merdeck-design-ca1f91.localhost:3003/merdeck/Directory-navigation.html`. Production desktop/narrow screenshots are retained in `tmp/directory-frontend/`. Both original and directory prototype statuses remain needs-review; existing brand approval is unchanged.

### Implementation self-review

Reviewed the complete changed frontend call chains, route/preview consumers, cache/session lifecycle, mutation reconciliation, decoder boundaries and browser/release checks using the core review policy and TypeScript frontend pack. Repaired old-session row retention and guarded late mutation navigation; existing source projection and document conflict checks remain intact. No remaining high-confidence actionable finding in this scope. This is a self-review, not independent whole-feature acceptance.

| Severity | Count | Status |
| --- | --- | --- |
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | info |
| LOW | 0 | note |

Verdict: PASS within reviewed scope; aggregate and final native acceptance remain pending.

### Candidate gate and delivery boundary

The normal local gate runs from the clean candidate in the project tmux session: `bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run check:ci && git diff --check`. It uses the explicit measured fixture parents above and `PLAYWRIGHT_BROWSERS_PATH=$PWD/.cache/playwright`. Exact source SHA, start time, runtime/storage observations, log and exit are recorded in ignored `tmp/directory-frontend/candidate-gate.*`; no success is inferred before its exit/result is collected. This task remains in_progress while that acceptance is pending. The implementation candidate contains all feature tracking; no status-only follow-up commit is needed to describe gate output.

The owner-supplied backend native run 34772642752 completes only the backend task. Whole-feature plans remain implementing. Final direct integrated review, normal Linux x64/ext4 `check:ci --native` with separate refusal storage and publication remain pending with the integration owner. Local overlay results are not native acceptance; no release, tag, push or deployment was performed.

## Bounded acceptance repair

The owner requested a bounded repair after direct frontend review, with no additional high/critical finding: retry the current failed document on manual refresh without replaying directory cursors, and correct runtime/release wording. The original clean candidate's aggregate exited 1 at 2026-09-13T18:31:01Z with source/final commit `9b928528b177375e26094954706ea4e648158c2a` unchanged. Its complete log, metadata and browser failure contexts are preserved under ignored `tmp/directory-repair/original/`; the source evidence remains at `tmp/directory-frontend/candidate-gate.*`. The compiled browser summary was 57 passed, 4 failed and 1 skipped. Directory navigation reached a saved deep file but hit directory/revision 429; class notes rendered/saved but saw revision 409; a folder F2 action during refresh did not open its dialog; workspace block selection timed out after directory 409. These are acceptance failures, not passing rendering evidence or assumed flakiness.

Repair findings: a fresh page already supplies revision metadata, but the hook also dispatches a revision probe immediately and removes its live observer cache during restarts. Local writes do not suspend namespace reads. Inspect and test those concurrent paths, retain the unexpected-error audit, and correct only proven causes. Reuse this task and proposal. Run RED/GREEN and narrowly affected production browser checks, lint/types and self-review; do not repeat the aggregate. Final exact-candidate hosted/native acceptance remains with the integration owner.

### Repair results and final handoff

Manual Refresh invalidates the exact active document key as well as the selected revision; it never refetches consumed directory page keys. A failed document with an unchanged revision now loads and renders after Refresh. Initial directory pages seed revision polling instead of racing an immediate duplicate probe. Next cancels older revision observations. Affected local saves and entry mutations suspend/cancel namespace reads before entering the service, then start one fresh run after completion, including failure. Selected-file polling and draft protection remain active. Revision 429 now applies its bounded Retry-After to polling, focus/reconnect and explicit Restart as page 429 already does.

The F2 test attempted a mutation while refresh intentionally retained stale rows and disabled actions; it now waits for the refreshed mutation controls. External-file tests wait for the preceding namespace refresh before starting a separate deletion scenario. Disposable fixture teardown closes the page before removing/restoring its files. No global unexpected-error audit or backend cap changed. A dedicated real continuation conflict test asserts exactly one 409 with directory_changed, explicit Restart, no cursor replay and retained draft bytes; revision conflicts and 429 remain unexpected in that test.

- RED: `tmp/directory-repair/red.log` has two expected failures (manual document retry and duplicate initial revision); `mutation-red.log` proves the uncanceled probe at write dispatch; `revision-rate-red.log` proves the missing revision cooldown.
- GREEN: focused workspace suites passed 81 tests across 10 files (`green.log`), including rendered-source recovery, no replay, late revision rejection, canceled polling before writes, session/draft regressions and bounded revision cooldown. Scoped ESLint and full frontend typecheck passed (`lint.log`, `types.log`).
- Production browser repair: initial narrow run passed 12/13 but preserved an additional external-deletion namespace conflict in `browser.log`. After sequencing the independent scenarios and fixture teardown, all 14 targeted cases passed (`browser-green.log`, exit 0), including the original four failing scenarios and the deliberate namespace-conflict regression. This run precedes only the final revision-429 cooldown branch, which is separately RED/GREEN unit verified; its absence of unexpected 429 does not exercise that branch.
- Unchanged original executable reproduction: `baseline-smoke.log` / `.exit` records exit 1 for only the deep directory/history scenario, with the same two directory and two revision 429 responses. The executable remains bound to original candidate `9b928528b177375e26094954706ea4e648158c2a` in `tmp/checked-release-YFadJ4/manifest.json`. Its trace/result evidence is `tmp/release-smoke-vHTsSt/`, with cleanup true. This demonstrates an original frontend request-lifecycle failure under tracing, not an environment-only exemption. A matching focused compiled comparison is recorded after the clean repair commit in ignored `tmp/directory-repair/candidate-smoke.*`; it is not a full or native acceptance gate.
- Original aggregate remains FAILED, exit 1 at 2026-09-13T18:31:01Z, 57 browser passes / 4 failures / 1 skip. Earlier practical file checks, 458 frontend tests and physical adapter source/bundle/compiled checks completed successfully. The later release-smoke failure and SIGTERM do not establish separate source root causes. The original complete logs, metadata and failure contexts remain unchanged; no full aggregate was repeated.

README now states the exact candidate runtime boundary: Bun 1.4.2, Linux little-endian LP64 x64/arm64, dynamically linked glibc >= 2.30 and procfs. The published version is v0.8.4; expected v0.9.0 remains pending validation/publication. Historical acceptance text is labeled as historical. No runtime support or dependency changed.

PMA implementation self-review rechecked current-document query scope, namespace cancellation/resumption, generation guards, cooldown, teardown and strict error auditing. No remaining high-confidence actionable finding; no HIGH/CRITICAL finding. This is bounded repair completion, not acceptance of the failed original aggregate or independent whole-feature review. Final exact-candidate hosted/native validation remains with the integration owner. Overall plans stay implementing, prototypes needs-review and brand approval unchanged. No push, release or deployment.

- complete: Bounded repair and focused frontend acceptance complete. Original aggregate remains failed with preserved evidence; final exact-candidate hosted/native validation and publication remain with the integration owner.

- reopen: Owner authorized a bounded trace-validation repair after hosted run 34775581757. Preserve all acceptance history; final native gate remains failed pending verification.

## Trace validation investigation and proposal

The owner authorized this same task's bounded harness repair after exact candidate `17e50a4ac4d115d35b9f7ee81e767e31feae6a2b` failed hosted run 34775581757. The actual Linux x64/ext4 physical checks, 62 authenticated browser cases (one expected open-access skip), 94 assets and four lazy diagram families passed; the supported executable trace failed numeric-return completeness. Cleanup was true, but whole native acceptance failed and the bundle stage is not accepted. Sanitized hosted reports do not include the offending raw record, so its exact category is unknown.

The existing serializer has no reopen command. An ignored copy extends only its locked completed-to-in_progress transition, preserving the same owner, directory lock and atomic index/detail updates. Existing task history and indices are retained.

Inspect only trace completion parsing and the traced supervisor/stop callers. Reproduce signal/return formatting with local actual strace, then make the smallest evidence-supported harness correction and meaningful regression tests. Never accept unknown/incomplete returns, weaken source/write/extraction/execution assertions or export raw traces. If the hosted cause cannot be established, add only fixed safe diagnostic categories that preserve rejection and identify the next hosted failure. Reuse the existing feature plan; final whole-feature/native acceptance remains implementing.

## Trace diagnostic candidate and focused validation

The exact hosted offending record remains unavailable. Local actual strace 6.13 on Linux arm64 with Bun 1.4.2 reproduced a split `openat` restart return after controlled SIGSTOP/SIGCONT, followed by a later numeric completion. The audit still rejects that restart record. A separate tracer-only SIGINT attempt timed out after five seconds and required owned-process cleanup; its forced-cleanup record does not establish the hosted failure's cause. The verified normal fixture exited and passed the unchanged audit. The hosted environment used strace 6.8 on Linux x64, so these observations are diagnostic evidence, not an exact hosted reproduction.

Only the existing numeric-return error gained fixed syscall/return categories and observed SIGINT/SIGTERM flags. Restart, unavailable, unknown, nondecimal, malformed numeric and unrecognized returns remain rejected. The error contains no raw records, paths, descriptors, process identities or unvalidated values. Numeric completeness, split-call pairing, single execution, checkout isolation, write destinations and extraction checks are unchanged. Service shutdown, smoke lifecycle, redacted exporter, application runtime and dependencies are unchanged.

Focused evidence is retained under ignored `tmp/trace-repair/`:

- RED: `bun test ./tmp/trace-repair/red.test.ts` runs the new assertions against the unchanged baseline parser: 9 passed, 2 failed because bounded diagnostics were absent (`red-verified.log`). The initial non-explicit test path did not select the test and is not RED evidence.
- GREEN: `bun test --coverage ./tests/release/trace.test.ts`: 11 passed, 57 assertions, 100% function/line coverage for the trace module (`coverage.log`). Numeric and split-call acceptance/refusal regressions remain intact.
- Scoped ESLint and both root/release TypeScript checks passed (`lint.log`, `root-types.log`, `types.log`).
- Actual compiled FIFO/listener fixture: normal execution passed audit; controlled restart execution was rejected with `syscall=openat; return=restart; sigint=absent; sigterm=absent` (`reproduce-verified.log`, exit 0). Raw traces remain local and are not exported.
- Targeted actual executable lifecycle smoke passed (`actual-smoke.log`, exit 0; `tmp/release-smoke-xAe9Fm/result.json`): reused the unchanged compiled application candidate, authenticated read/save, a retained directory cursor at shutdown, 94/94 assets, both supported/refused service traces and cleanup. It retained the actual existing supervisor/stop/audit logic; broad browser checks were replaced only in the ignored local driver by these targeted actions. Identified local storage was overlay (device 55) and refusal tmpfs (device 99). Supported trace: one execution, 264 file accesses, one scoped write, zero checkout accesses, no extraction. This is local lifecycle verification, not native release acceptance.

PMA code self-review applied shared policy and the TypeScript backend pack to the complete scoped diff and callers. No high-confidence findings (CRITICAL/HIGH/MEDIUM/LOW: 0); verdict PASS for the diagnostic change. This does not certify the unknown hosted trace. Original hosted run 34775581757 remains failed, with its reports preserved under `/tmp/merdeck-directory-final-native/`. No aggregate or browser gate was rerun. Final exact-candidate hosted/native validation, bundle acceptance and publication remain pending with the integration owner; overall plans remain implementing and prototypes needs-review.

- complete: Bounded trace diagnostics and focused validation complete. Exact hosted offending record remains unknown; original native failure and final hosted acceptance remain pending.
