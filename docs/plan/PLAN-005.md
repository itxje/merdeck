# PLAN-005 Prepare ordinary Linux filesystem verification

- **status**: completed
- **createdAt**: 2026-09-07
- **approvedAt**: 2026-09-07 (explicit bounded implementation authorization)
- **relatedTask**: NATIVE-001

## Context

Investigation completed after integrated browser acceptance. The worktree reports statfs 0x6a656a63, device 41, mount ID 331 (fakeowner checkout mount, mount device 0:44). The allowed /tmp parent reports overlayfs 0x794c7630, device 70, mount ID 318 (overlay, /, 0:70). Neither is native ext4/XFS. No other host paths or mounts are candidates in the authorized scope. No destructive native probe was run.

The current production policy admits verified Linux overlayfs and refuses the observed unstable host-shared filesystem. Prior identity failures and final-publication limitations remain evidence. The repository checks root, path, descriptor, inode, device and whole-file versions around publication; there is no causal correction justified here. The UI already uses backend writable status and generic draft-preserving storage copy. Only the shared error text advertises relocation to overlayfs. Existing practical and API smoke expectations contain overlay constants; browser expectations are already explicit.

## Proposal

1. Add a built-in TypeScript check:storage runner requiring a canonical fixture parent and --filesystem ext4. Match statfs 0xef53 and the held descriptor's actual ext4 mount identity, rejecting overlay/tmpfs/host-shared and unknown or missing mounts before fixtures. Ext4 is a proposed verification target, not admitted production storage.
2. On that native target only, reuse the unchanged raw diagnostic in twenty bounded sequential child processes, each using the explicit owned fixture working directory. Retain every result and trace, fail on any error, and remove only exclusive fixtures. No extra timing instrumentation or old matrix repeats.
3. Reuse check:files for repeated standalone/Markdown, byte-preservation, independent external conflicts and containment after checking actual production admission. Align its test expectations with explicit storage inputs, never with a write bypass. Keep separate real unsupported-root refusal coverage. Add focused runner failure controls and native HTTP checks within storage tests; browser checks reuse the existing nineteen-case entry.
4. Make the fixed filesystem_unsupported message generic. Keep error code/status, authentication, draft behavior and actual supported-policy diagnostic. No visual or design changes are needed.
5. Retain nativeAcceptance=pending. Deliver exact native raw/protocol/HTTP/browser/binary stages, output schema and remaining admission/evidence requirements. Hosted availability and an eventual candidate policy are future observations; this preparation does not authorize unverified admission.

## Risks

A filesystem name is not proof of stable identity. A refused negative control is not native acceptance. Final compare/rename races and local OS actor moves remain practical limits.

## Scope

Storage checks and test adapters, narrow unsupported-storage copy, operator documentation, and this task/plan tracking. No dependency changes, production admission expansion, binary build, or deployment workflow implementation without supporting evidence.

## Alternatives

Use available real native storage if present. If unavailable, prepare executable evidence collection without broad filesystem exploration or mounting filesystems.

## Annotations

- 2026-09-07: Explicit authorization covers investigation, proposal, and implementation of the bounded preparation. Direct external editing and the explicitly configured existing project directory remain product requirements. Design assumptions remain needs-review. Final integration and any new native admission require their applicable evidence and approval gates.
- Investigation and proposal were persisted before implementation under that existing authorization. Relevant API references: https://nodejs.org/api/fs.html (statfs and descriptor metadata) and https://docs.kernel.org/filesystems/proc.html (fdinfo mnt_id and mountinfo). No new application dependency is needed. The separate tmux rules file is absent; the supplied naming/lifecycle rules and installed delivery reference apply.

## Native verification contract

Preparation target: a real ext4 filesystem on a hosted Linux runner, with Bun 1.4.2 and the existing frozen root/web dependencies. An Ubuntu 24.04 hosted runner is a concrete environment candidate; its availability and actual storage must be observed, not assumed. Use the runner's supplied workspace/temp parent only after identifying it. Do not create or change host mounts to obtain a passing identity. A container overlay on ext4 fails native selection. The selected ordinary project root remains an operator input in the product.

`scripts/check-storage.ts` and `scripts/storage-support.ts` are the candidate check source. This preparation includes no ext4 write-admission implementation. Production remains fail-closed. The required first native run therefore collects real raw evidence and then reports the policy gate; it cannot pass the complete native source stage under the current overlay-only policy. A focused policy proposal/correction may follow actual evidence. Neither test expectation variables nor an environment bypass can implement that correction.

| Stage | Exact input / entry | Required evidence |
| --- | --- | --- |
| Provenance and identity | Clean reviewed candidate commit; project tmux session; Bun 1.4.2; explicit native parent with `--filesystem ext4` | Commit, dirty=false, runtime/version/architecture, actual descriptor mount ID/type/device plus statfs=0xef53 and stat device. Archive hosted run URL and runner image metadata. |
| Native raw control | `bun run check:storage -- /actual/native/fixture-parent --filesystem ext4` | Twenty child exits, unchanged raw traces, all succeeded=true, no temporary leftovers, every fixture removed. One bounded control only; no extra synchronous timing instrumentation. |
| Refusal fixture | Explicit `DIAGRAMDOCK_TEST_UNSUPPORTED_PARENT` and actual `DIAGRAMDOCK_TEST_UNSUPPORTED_FS` | Distinct real unsupported storage, actual production writable=false. Local host-shared 0x6a656a63 coverage stays separate; if absent remotely, report that fact and retain the local evidence rather than fabricate the mount. |
| Admission | Runner-produced admission.json after native raw stage | Actual writable capability. This revision reports false for ext4. Before any new policy is accepted, attach raw evidence and a narrow reviewable policy diff retaining every existing identity/version/path/descriptor check, then verify its native protocol. A probe cannot claim OS isolation. |
| Native file protocol | Same runner calls `bun run check:files` with explicit native parent and expected type | Fixed suites execute with no skipped/todo/no-tests result: 20 standalone saves, 20 multi-block pairs, independent in-place/atomic conflicts, stale/concurrent/deleted/containment/byte-preservation and refusal; domain smoke exit 0. |
| Native HTTP | Same runner calls `bun test ./tests/integration/storage/http.test.ts` | Authenticated capability agrees with backend, anonymous metadata remains absent, byte-exact Markdown save, in-place/atomic external conflicts, refusal 503, traversal/symlink rejection, logout invalidation. These use real files and in-process HTTP; live network/browser transport follows separately. |
| Source quality | Both frozen installs, focused storage tsc/tests, `check:files`, root `check`, whitespace | Local preparation runs the complete baseline on observed overlay and host-shared storage. The older full API suite and standalone `tests/integration/api/smoke.ts` still have explicit overlay-only assertions; they are baseline evidence and must not be presented as native runs. The focused storage HTTP suite supplies the native-independent expectation path without modifying those out-of-scope tests. |
| Browser and executable | Existing `bun run test:e2e` service mode described below | All nineteen browser cases on the deployed native root using the actual single executable, no runtime or external frontend assets, no unexpected browser errors, actual service stop and fixture/token removal. Source build evidence alone is insufficient. |

Before the binary browser stage, build the binary through the separately owned delivery implementation, record its SHA-256 and commit, and provision unique disposable native and actual unsupported roots. Copy only test samples into these explicitly selected test fixtures; production still opens the operator's original directory. Start both executable instances through the prescribed project tmux session, using private token files, explicit root/origin/port and compatible bounded test configuration: DIAGRAMDOCK_MAX_FILE_BYTES=8192, DIAGRAMDOCK_MAX_TREE_ENTRIES=100, DIAGRAMDOCK_POLL_INTERVAL_MS=1000. Preserve normal authentication, CSRF and containment. Verify that the executable can serve its frontend with source/runtime assets absent; do not assert embedding merely from build success.

```bash
export DIAGRAMDOCK_TEST_FIXTURE_PARENT=/actual/native/fixture-parent
export DIAGRAMDOCK_TEST_EXPECTED_FS=0xef53
export DIAGRAMDOCK_TEST_UNSUPPORTED_PARENT=/actual/unsupported/fixture-parent
export DIAGRAMDOCK_TEST_UNSUPPORTED_FS=0x6a656a63 # Replace only with actual separately observed unsupported type.
export DIAGRAMDOCK_SMOKE_ROOT=/actual/native/fixture-parent/exclusive-sample
export DIAGRAMDOCK_SMOKE_TOKEN_FILE=/private/owner-only/token-file
export DIAGRAMDOCK_TEST_URL=http://127.0.0.1:actual-supported-port
export DIAGRAMDOCK_UNSUPPORTED_URL=http://127.0.0.1:actual-unsupported-port
export DIAGRAMDOCK_TEST_DISPOSABLE=true
bun run test:e2e
```

The URLs above are placeholders for actually allocated listening ports. Existing-service mode verifies health and runs browser assertions, but does not own supplied services/roots/token cleanup. The binary check must own and verify that lifecycle. Native browse/render/edit/save, direct external edit/conflict preservation and containment must use the binary's actual configured native root. Existing domain containment covers path/descriptor protocol; browser transport checks are listed in TEST-001 and do not establish protection against a local OS actor moving ancestors.

Result schema version 1: `expected`, `provenance`, `observations[]`, `stages[{name,exit,signal}]`, `nativeSourceChecks`, `nativeAcceptance`, `deployedBinary`, `browser`, `historicalDiagnostic.applicationSafetyPassed`, `cleanup`, `failure`, `evidence`. Each command retains separate output and exit JSON. A rejected non-native target has empty stages and nativeSourceChecks=failed, not a passing acceptance. The native runner always leaves final nativeAcceptance/browser/deployedBinary pending; the delivery report must attach actual binary/browser evidence before independently declaring the complete gate passed. Failure or unavailable native evidence prevents standalone readiness claims. Remote result URL/commit/filesystem evidence are currently absent.

CI-001 retains ownership of PLAN-002, build/workflow implementation and packaging. REVIEW-001 and DOC-001 consume these gates without changing ownership or status. Independent green preparation can advance to CI construction while admission and final native readiness remain explicit pending gates.

## Verification and completion

Completed the preparation alternative on 2026-09-07 21:28. NATIVE-001 records exact local roots/mounts, runtime, passing frozen installs/typecheck/lint/file/full/browser checks, negative controls, retained first failures, independent cleanup verification and scoped review. All nineteen browser tests passed on overlay/source services. No native raw probe or native admission ran because authorized storage was not native; nativeAcceptance remains pending. The production write condition and all retained safety diagnostics remain unchanged. There is no remote run URL or executable evidence yet.

### Focused test-isolation correction

2026-09-07: Authorized a bounded correction to the negative-control test when its configured unsupported parent equals project tmp. Reproduce once, then use an exclusive child target on that filesystem so independent evidence creation cannot appear as a target write. Keep exact target-content checks and scoped verified cleanup. NATIVE-001 records the reproduction and focused verification. Native acceptance and production admission remain unchanged.

Completed at 21:34 after one real reproduction (3 pass / 1 fail) and the required corrected typecheck/storage-test/lint/whitespace chain (exit 0, 6 pass / 0 fail, 54 assertions) with the documented project-tmp parent. Exact child directory contents and binary sentinel bytes remain checked; all owned fixtures were verified removed. Original failure evidence is retained in tmp/native-rework-veGsw9. Native acceptance remains pending.

## Evidence-based ext4 candidate proposal

The earlier preparation contract above is historical. The user explicitly approved this bounded candidate correction after reviewing [hosted run 34166805672](https://github.com/itxje/diagramdock/actions/runs/34166805672), attempt 1, push at clean commit c1078e302cfe43eeaa8fc5bf9286a09273a74ee5. The run completed with FAILURE at production admission, not successful native acceptance. Supplied read-only provenance identifies Ubuntu image 20260831.293.1, Linux x64, Bun 1.4.2 and separately executed Node v24.20.0; native ext4 statfs 0xef53, device 2049, descriptor mount 27 / 8:1; refusal tmpfs 0x1021994, device 26, mount 32 / 0:26.

Independent inspection of all twenty supplied raw results and exit records confirmed exit 0, no signal, succeeded=true, temporaryEntriesRemaining=0, fixtureRemoved=true, filesystemType=0xef53 and boundarySnapshots=false in every child. Each has 150 recorded events. The overall result has dirty=false, cleanup=true, nativeSourceChecks=failed, nativeAcceptance/browser/deployedBinary=pending, and admission writable=false with linux-overlayfs. The exact failure was: Raw evidence collected; production policy does not admit this native filesystem. A reviewed evidence-based policy correction is still required. No probe was repeated locally. These observations justify evaluating an ext4 candidate; they do not prove full source/executable behavior or explain shared-mount instability.

### Implementation proposal and scope

1. Move the descriptor mount parser into a small diagrams mount helper without CLI side effects. Require a unique valid fdinfo mnt_id and its unique well-formed mountinfo record. Match the actual selected descriptor's statfs, mount filesystem name and encoded stat device; missing/malformed/unassociated/mismatched metadata refuses writes.
2. Admit only Linux overlay/0x794c7630 or ext4/0xef53 with matching root/held device. Ext2 and ext3 share the ext magic and remain refused when mounted under those types; XFS, tmpfs, fakeowner and other families remain refused. Pass held FileHandles from the three existing repository eligibility sites, preserving directory and regular-file checks and all save algorithm/identity/version conditions. Direct trusted script paths open and close their own read-only directory handle.
3. Reuse the same mount parsing boundary in storage check tooling, preserving raw/native stage semantics. Align the standalone API smoke's explicit expected storage assertion with actual production capability, without changing auth/save/HTTP assertions.
4. Add focused pure policy/parser tests for native candidates, shared magic, mismatched type/device/mount, missing/malformed metadata and error refusal; verify actual retained overlay/file/directory behavior and unsupported no-temp/no-byte-change behavior. Clearly label pure policy cases as synthetic, not native execution.
5. Apply only the specified documentation hygiene substitutions, preserving observed metadata, failures and relative evidence references. Update current storage capability wording with nativeAcceptance=pending. No dependencies, workflow/release code, frontend or unrelated task changes.

### Risks, references and verification

The ext4 admission candidate still requires a corrected real hosted full check:ci --native run, including source, Linux x64 binary, assets, browser, traces and cleanup. Local arm64/overlay acceptance is preparation only. Missing proc metadata must fail closed; the parser must support real regular-file and directory handles without relying on path labels or opening special files. No cache or environment bypass is introduced. Final compare/rename loss and local OS actor ancestor moves remain practical limits, with applicationSafetyPassed=false retained.

Checked primary sources: [Linux filesystem magic definitions](https://raw.githubusercontent.com/torvalds/linux/master/include/uapi/linux/magic.h), [proc fdinfo/mountinfo](https://docs.kernel.org/filesystems/proc.html), and [stat device encoding](https://raw.githubusercontent.com/bminor/glibc/master/bits/sysmacros.h). Verify focused strict types/policy/storage tests first, then exactly one complete local frozen-install/check:ci/whitespace chain through the existing tmux session. Provision only ignored actionlint/strace/browser tools with official integrity checks. Preserve all failure output and capture command status before cleanup. The existing authorization covers this proposal and implementation; final native acceptance remains a later actual hosted observation.

### Candidate preparation outcome

Completed the bounded correction on 2026-09-07 22:47. Implementation 1a65402ed63c1b0702ad1de3598d9d4b3f170397 passed focused strict types and 36 policy/storage tests, followed by one full frozen-install/check:ci/whitespace chain at a clean commit (exit 0). Actual local overlay/shared checks passed, including all 19 browser cases against the compiled arm64 executable and all 93 embedded assets. Independent checks confirmed binary hash, stopped services and removal of runtime credentials and all reported fixtures. NATIVE-001 records exact counts, coverage, artifact hash and relative evidence references. Scoped review found no remaining actionable introduced issues.

This completes candidate preparation, not native delivery acceptance. The failed hosted run above remains failed. The corrected candidate still requires the normal hosted check:ci --native gate on actual ext4, including source/HTTP, Linux x64 executable, browser/assets/traces and cleanup. No remote execution or publishing occurred here. NativeAcceptance=pending and applicationSafetyPassed=false remain; original authorization and practical publication/OS-actor limits are unchanged.
