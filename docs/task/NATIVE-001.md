# NATIVE-001 Prepare ordinary Linux filesystem verification

- **status**: completed
- **priority**: P1
- **owner**: Filesystem compatibility maintainer
- **createdAt**: 2026-09-07

## Description

Verify ordinary Linux storage when available, or deliver bounded native verification preparation with native acceptance explicitly pending. Preserve existing save checks and unsupported storage refusal.

## ActiveForm

Prepared the evidenced ext4 candidate for review; full hosted native acceptance remains pending.

## Dependencies

- **blocked by**: TEST-001 (completed)
- **blocks**: native deployment acceptance, REVIEW-001, DOC-001

## Notes

- Claimed before investigation. Related plan: PLAN-005.
- The user authorized the MVP implementation on 2026-09-07, clarified that direct external file editing remains supported, and authorized this bounded delivery applicability correction. Ordinary Linux storage is the intended deployment; overlay-only evidence is interim. No new approval is inferred for native write admission without evidence or final integration.
- Investigation/proposal recorded before implementation: no native storage available in the allowed locations. Proceeding with check tooling and evidence contract only; nativeAcceptance=pending. Production admission remains unchanged.

## Delivery outcome

Preparation completed on 2026-09-07 21:28. **nativeAcceptance=pending**. No native ext4/XFS filesystem was available within the allowed locations, so no native raw control, native save, native browser or executable acceptance ran. This completes the bounded preparation alternative, not ordinary Linux write admission or standalone deployment readiness.

- Added `scripts/check-storage.ts`, `scripts/storage-support.ts`, focused `tests/integration/storage/` and the root check:storage command. The explicit candidate is ext4; both descriptor mount type and statfs magic must match before any native fixture is created. Runtime/session, actual storage, commit/dirty provenance, per-child outputs, retained raw traces and cleanup are recorded. On a future native target, exactly twenty unchanged raw child probes precede production admission and real file/HTTP gates. This code does not change admission and currently cannot pass native source acceptance on ext4.
- Aligned `scripts/check-files.ts` and practical tests with explicit expected types and actual backend capability. Separate real unsupported refusal remains mandatory. Added two file-backed HTTP storage cases with auth/status, exact Markdown bytes, external in-place/atomic conflict preservation, safe refusal and containment checks.
- Replaced the overlay relocation advice in the fixed filesystem_unsupported message with generic verification of the configured project. Preserved 503/code and current UI behavior. The supportedFilesystem diagnostic is typed as a string; its current value remains linux-overlayfs. The UI already uses writable capability and retains drafts, so no frontend source or design changes were needed.
- Production eligibility expression, root-device equality and all repository/parser save checks are unchanged. Raw/final-window sources, historical FILE/SAVE/safety evidence, locks and design artifacts are unchanged. No new dependency, global mount, ownership change, runtime bypass, retry or extra diagnostic matrix was introduced.

## Actual local verification

Runtime: integrity-checked project-local `.cache/runtime/bun-1.4.2/bun`, Bun 1.4.2 on Linux arm64; actual separate Node v24.20.0. System Bun 1.3.12 was not changed. Runtime metadata is retained in `tmp/runtime-metadata.json`; frozen application lockfiles were preserved.

Supported fixture parent: the exclusive disposable directory recorded in `tmp/native-cleanup.json`, overlayfs 0x794c7630, stat device 70, descriptor mount ID 318 / mount device 0:70. Unsupported fixture parent: this checkout's `tmp/native-unsupported`, host-shared 0x6a656a63, stat device 41, descriptor mount ID 331 / mount device 0:44 (fakeowner). These are observations of these exact mounts, not native evidence or causal explanations.

| Check | Actual result and evidence |
| --- | --- |
| Frozen root/web installation | Both exit 0; tmp/install-root.log, tmp/install-web.log, tmp/setup-native.exit |
| Root and focused storage typecheck, ESLint | Exit 0; tmp/native-typecheck.log, tmp/native-lint.log |
| Focused storage tests | 6 passed, 0 failed, 52 assertions; tmp/native-tests.log. Includes real unsupported CLI rejection plus two real file-backed HTTP cases. Synthetic mount-parser assertions are preparation tests only. |
| check:files | 85 passed, 0 failed, 664 assertions; independent domain smoke exit 0; tmp/native-files.log |
| Full root check | Exit 0: isolated procfs 1, backend 122, frontend 43; backend coverage 99.57% functions / 99.44% lines, frontend 88.79% functions / 92.68% lines; build succeeded. tmp/native-check.log, tmp/check-native.exit |
| Existing browser entry | 19 passed in 47.6s, zero unexpected browser errors; tmp/browser-native.log, tmp/browser-native.exit, tmp/e2e-JqpfWg/. Both instances used built source service outputs with local assets, not an executable. |
| Real unsupported native-entry control | Exit 1, stages empty, cleanup=true, nativeSourceChecks=failed, nativeAcceptance=pending; tmp/storage-check-oBthYt/result.json |
| Overlay supplied as ext4 | Exit 1, actual overlay identity printed, zero raw children; tmp/native-overlay-refusal.log, tmp/native-overlay-refusal.exit, tmp/storage-check-YfKrbJ/result.json |
| Missing native parent | Exit 1, no fixture creation or stages; tmp/native-missing-refusal.log, tmp/native-missing-refusal.exit, tmp/storage-check-IgwZZR/result.json |
| Whitespace / preservation | git diff --check passed; retained repository/parser/raw/final-window, safety diagnostics, both locks and frontend/design source have no diff from the integrated baseline. |

Negative controls were run against the proposal commit with dirty=true recorded for the implementation working copy. They are not clean-candidate native acceptance. Actual native and remote evidence remains absent.

The first focused typecheck found one test generic inference error; the next lint found import ordering and finally-block style/control-flow errors. These were corrected before the complete passing gate. Original outputs remain in tmp/native-typecheck-first.log, tmp/check-native-first.exit, tmp/native-lint-first.log and tmp/check-native-lint.exit. No filesystem reliability failure was retried or relabeled.

Cleanup was independently verified in `tmp/native-cleanup.json`: 130 logged child fixture removals checked absent, both service stop markers are 0, both exact origins no longer listen, owner-only token/config files are absent, both empty fixture parents removed. Only the idle project tmux shell remains. Retained logs, screenshots and result JSON contain evidence rather than live service credentials or test roots.

## Scoped implementation review

Applied the shared and TypeScript backend review policies to the full change and surrounding save/auth/test call chains. Checked production write admission is unchanged, test expectations cannot alter it, explicit native target identity is validated before destructive fixtures, child execution is bounded, failed traces remain visible, native success is not synthesized, cleanup is scoped, unauthenticated status discloses no paths/devices, and HTTP/UI draft/error contracts remain intact. Reviewed the API type change against the existing frontend decoder; its writable-driven behavior remains unchanged and all nineteen browser cases passed.

Remaining actionable introduced findings: Critical 0, High 0, Medium 0, Low 0. Verdict: PASS for preparation only. The unexecuted native branch is an explicit evidence gap, not a native-readiness pass. Native identity/admission, final deployed executable and actual hosted run evidence remain gates; final compare/rename loss and OS-actor ancestor movement limits remain documented with applicationSafetyPassed=false.

## Handoff

PLAN-005 contains the concrete source/runner/environment contract, stage commands, result schema and binary browser inputs. CI-001 may construct its workflow/compile artifacts independently; it retains PLAN-002 ownership. Before any native admission change is accepted, obtain actual native raw evidence and review a focused policy correction, then run source/HTTP and deployed executable browser checks on that filesystem. Final delivery must include exact remote run URL, commit and observed filesystem/binary evidence. No remote run, binary, push, release or final integration was performed here. The design remains needs-review.

## Focused test-isolation correction

Reclaimed by Filesystem compatibility maintainer on 2026-09-07 before investigation. Existing implementation and evidence remain preserved. The authorized correction is limited to the native runner negative-control test and its own tracking; it does not reopen native storage research or production admission.

Investigation/proposal: the negative-control test snapshots its configured unsupported parent, while the check runner independently writes evidence under project tmp. If the documented unsupported parent is project tmp, the legitimate evidence directory changes that snapshot. Reproduce the retained test once using that exact configuration, then target an exclusive child on the same actual unsupported filesystem. Preserve exact unchanged target-entry/content assertions and verify removal in finally. Do not filter entries, change global defaults, weaken refusal assertions or modify the runner. The existing explicit authorization covers this bounded test correction after the reproduction is recorded.

Reproduction completed before test edits: the unchanged runner.test.ts from 56ed099 returned exit 1 with 3 passing tests and 1 failure. The exact failed assertion was the parent directory comparison; the only added entry was storage-check-pLhZet. Evidence: tmp/native-rework-veGsw9/before.log and before.exit; the runner's original result remains tmp/storage-check-pLhZet/result.json. Actual configured unsupported parent was this checkout's tmp (0x6a656a63, device 41, mount 331); the newly owned supported parent was the exclusive overlay directory recorded in `tmp/native-rework-veGsw9/identity.log` (overlay 0x794c7630, device 70, mount 318). Runtime and identity logs are retained alongside the failure. Proceeding with the recorded exclusive-child proposal under the existing authorization.

Correction completed on 2026-09-07 21:34. The negative control now creates a unique files-native-refusal child using the existing fixture helper, validates that its actual device/mount matches the configured parent, and checks its complete directory listing plus a fixed binary sentinel's exact bytes after the rejected command. Independent evidence remains outside this target. No entry filtering or refusal assertion was removed. The existing verified fixture-removal helper runs in finally.

The required tmux verification used Bun 1.4.2, actual Node v24.20.0, the explicitly recorded overlay parent, DIAGRAMDOCK_TEST_UNSUPPORTED_PARENT=$PWD/tmp, DIAGRAMDOCK_TEST_EXPECTED_FS=0x794c7630 and DIAGRAMDOCK_TEST_UNSUPPORTED_FS=0x6a656a63. The exact chain `bun node_modules/typescript/bin/tsc --project tests/integration/storage/tsconfig.json && bun test ./tests/integration/storage && bun run lint && git diff --check` exited 0. All six tests passed with 54 assertions, including the real filesystem refusal and both HTTP cases. Evidence: tmp/native-rework-veGsw9/{typecheck.log,after.log,lint.log,diff.log,check.exit}. The repaired CLI result is tmp/storage-check-oSoMyU/result.json: expected exit 1, nativeSourceChecks=failed, nativeAcceptance=pending, cleanup=true and zero native stages.

Independent cleanup in tmp/native-rework-veGsw9/cleanup.json verifies all three test fixture roots absent and the empty owned overlay parent removed. No server or credential file was created in this correction; HTTP credentials were held in process memory and both applications closed. Original failure and all prior preparation/diagnostic evidence remain retained. No full browser/file gate, native/raw control or historical matrix was repeated.

Scoped review confirmed that independent evidence cannot collide with the owned test target, exact no-target-write assertions remain, and cleanup covers assertion failures. The confirmed test-isolation finding is resolved; no actionable introduced findings remain. Changed tracked scope is only runner.test.ts, this task record and the concise PLAN-005 note. Production admission, scripts, HTTP/frontend implementation, diagnostics, dependencies and locks are unchanged. This is a test-only preparation correction; nativeAcceptance=pending and applicationSafetyPassed=false remain unchanged.

## Evidence-based ext4 candidate continuation

Reclaimed before investigation by Filesystem compatibility maintainer under the existing 2026-09-07 authorization and explicit approval for a bounded ext4 candidate correction. Validate the supplied failed hosted run and all twenty raw records before recording the proposal and changing code. Prior test-isolation correction and historical failures remain recorded. Native delivery remains pending until a corrected hosted source and executable run passes.

Investigation completed and proposal persisted in PLAN-005 before code edits. Independently verified all twenty supplied raw records from run 34166805672 at clean c1078e302cfe43eeaa8fc5bf9286a09273a74ee5: all child exits 0 with no signals, unchanged raw mode, ext4 0xef53 and confirmed cleanup. Overall run remains failed at old admission; no native source/binary/browser pass is claimed. The correction will require actual descriptor mount association and matching statfs/type/device, retaining all existing root/target/path/inode/version checks. Existing explicit approval authorizes the bounded candidate; nativeAcceptance remains pending until the next actual hosted full gate.

Candidate implementation prepared: actual held FileHandles feed the shared mount parser and exact Linux/type/device admission policy. The only repository edits are its three eligibility arguments; the save algorithm is unchanged. The API smoke now compares explicit expected storage and production capability. Focused root/storage/API strict types, 36 policy/storage tests (105 assertions) and lint passed. Synthetic policy/parser/error cases do not claim ext4 execution; actual local handles remain overlay/shared. Four initial lint formatting findings were fixed before the passing focused gate; original output remains in tmp/native-ext4/focused-first-lint.log and focused-first.exit. No native/raw control was rerun.

Selected historical scratch-path hygiene is a neutral description/relative evidence substitution only; original filesystem/device/mount observations, failure outcomes and task owners/statuses remain intact. Local tooling is project-owned: actionlint 1.7.12 archive digest checked by the existing installer, strace 6.13+ds-1 arm64 package SHA-256 d793af70a104eb0bd5be466c3043b512f549e7cb27971320a7c9b8f4c6165e55 verified against distribution metadata, and existing pinned local Chromium. No global installation or runtime change was made. Full local check:ci verification follows at the committed candidate.

### Candidate verification and review

Completed the bounded candidate preparation on 2026-09-07 22:47. Proposal commit a743acb72fb64c599d64f9b9887198270bdf3626 preceded implementation commit 1a65402ed63c1b0702ad1de3598d9d4b3f170397. Exactly one full command ran against that clean implementation commit in the prescribed project tmux session:

`bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run check:ci && git diff --check`

The command exited 0, captured immediately before cleanup. Runtimes were project-local Bun 1.4.2 and separately executed Node v24.20.0 on Linux arm64. The exclusive positive parent recorded in `tmp/native-ext4/identity.log` was overlay 0x794c7630, device 70, descriptor mount 318 / 0:70; the explicit refusal parent was this checkout's tmp, shared 0x6a656a63, device 41, mount 331 / 0:44. These are local observations, not ext4 evidence. No native/raw controls or historical matrix were rerun.

| Check | Actual result |
| --- | --- |
| Frozen root/web installs, actionlint, strict types, lint and build | Passed, no dependency or lock changes |
| File protocol and domain smoke | 115 pass, 0 fail, 714 assertions; standalone/Markdown repetition, external conflicts, containment and byte preservation retained |
| Storage and isolated procfs checks | 6 pass / 55 assertions and 1 pass / 4 assertions; real refusal and both HTTP cases retained |
| Backend | 152 pass, 0 fail, 1,222 assertions; 98.94% function / 99.47% line coverage |
| Frontend | 43 pass across nine files; 91.97% statements, 88.66% branches, 88.79% functions, 92.68% lines |
| CI/release tests | 18 pass, 0 fail, 97 assertions |
| Actual Linux arm64 executable browser flow | All 19 cases passed in 48.6 seconds |

File counts overlap backend counts. The 30 new co-located tests include synthetic ext4/type/mount/device policy cases and injected metadata errors, alongside actual local directory/regular-file checks. They do not establish native execution. The real rejected storage CLI control exited 1 with empty native stages, cleanup=true and nativeAcceptance=pending. Its failure is expected refusal coverage, not native acceptance. The standalone API smoke adapter passed strict types; this run's live HTTP/browser evidence comes from the existing binary checks, not a separate invocation of that adapter.

The executed `dist/release/diagramdock-0.0.0-ci.fixture-linux-arm64` is 85,444,904 bytes, SHA-256 `9452f9e0c0817ad00d677b412dab3dfffda43b5ccf4d70e8861f6a1ea19f2a41`; independent hashing matches SHA256SUMS and the manifest identifies the implementation commit. All 93 embedded asset bodies, hashes, MIME and security headers matched. Flowchart, sequence, class and state lazy rendering produced zero unexpected errors and zero external requests. Traces record one execution per service, no checkout access, empty runtime PATH and no frontend extraction; supported storage had nine writes, refused storage had zero. This is an executed arm64 fixture artifact, not an x64 or native deployment result.

Both loopback-only services, supported http://127.0.0.1:35261 and refused http://127.0.0.1:34195, produced successful stopped markers and independently refused connections afterward. Independent cleanup verified all 147 reported focused/full fixture directories absent, the binary runtime directory and its tokens/configuration absent, and the empty owned positive parent removed. Only the idle tmux shell remains. Evidence is retained in `tmp/native-ext4/{full-check.log,full-check.exit,full-check.commit,full-check.status,cleanup.json}`, `tmp/release-smoke-oTZl9B/` and `tmp/e2e-mTLCPy/`. Original focused lint failure output remains retained. The first independent post-check hash verifier assumed a nonexistent manifest hash field; it was corrected to use the actual SHA256SUMS contract without changing the artifact or rerunning the gate.

Core/backend review confirmed that production uses existing held descriptors; native eligibility requires matching mount association, filesystem name, magic and device before temporary creation. Ext2/ext3 shared magic, unsupported families, missing/malformed metadata and device mismatches fail closed. All three repository changes only pass the existing handle; save, parser, version, inode, path and publication checks remain unchanged. The tooling imports a side-effect-free production helper, and expectation variables cannot grant production eligibility. No actionable introduced findings remain (Critical 0, High 0, Medium 0, Low 0). Verdict: PASS for the reviewed candidate and local preparation only.

The next gate is the unchanged nonpublishing hosted `check:ci --native` workflow on the reviewed integrated candidate, with actual ext4 identity/admission, twenty retained raw controls, file/HTTP/source checks, Linux x64 executable, all browser/asset/trace assertions and verified cleanup. Attach the actual new run URL, exact commit and observed filesystem evidence before accepting native delivery. The only supplied hosted run remains failed; no remote action occurred here. NativeAcceptance=pending, historical applicationSafetyPassed=false, final compare/rename and local OS actor ancestor-move limits remain. Original design status remains needs-review.

### Accepted-update synchronization

The Filesystem compatibility maintainer continues the existing claim for a finite synchronization under the existing authorization. Candidate preparation remains completed; this operation does not reopen implementation or reset the historical isolation correction. Investigation confirmed a clean retained 84e6a904be1a9e4be9a6213c3567d404db5620cb and the authorized local integration commit e70dd9c5779d8c1893c624f59480b9ab0832f316. The merge produced exactly one conflict, in changelog entries inserted at the same location; architecture merged automatically.

Proposal recorded before conflict editing: retain both changelog entries verbatim in descending timestamp order (UI 22:42, storage 22:41), preserve all automatic changes, and verify storage/backend/API-smoke paths against the retained candidate and frontend/review records against the accepted integration commit. No source edits or repeated full checks are needed for this documentation resolution. Earlier candidate, UI and integration test results remain separate historical observations; nativeAcceptance remains pending.

Synchronization verification passed: both changelog entries are byte-for-byte preserved in date order; all three added architecture paragraphs from the two inputs remain intact. Backend, admission, scripts, integration tests, API smoke, manifests, locks, configuration and workflows match the retained candidate. Frontend source/tests, REVIEW-001, UI-001 and the task index match the accepted integration commit. No conflict markers or unmerged entries remain; staged and working whitespace checks pass. Only the known changelog conflict and this task note were authored during synchronization. Exact comparison results and original merge output are retained in `tmp/native-sync/`.

No new combined runtime gate was executed. The 19 binary browser cases at 1a65402 remain historical candidate evidence; the separately supplied 24 binary cases at 4fa0938 and 54 frontend plus five real-service cases at e70dd9c remain their own observations. Combined integration checks and the corrected hosted ext4/x64 gate are still required. Run 34166805672 remains failed, nativeAcceptance=pending, and applicationSafetyPassed=false is unchanged. The bounded synchronization is complete for review.
