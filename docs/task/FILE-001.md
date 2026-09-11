# FILE-001 Implement scoped file operations

- **status**: closed
- **priority**: P1
- **owner**: File service maintainer
- **createdAt**: 2026-09-07 17:42
- **previousCompletionAt**: 2026-09-07 18:46

## Description

Implement the single root-scoped file service, bounded tree discovery, `.mmd`/`.mermaid` reads and Markdown Mermaid fence extraction. Multiple blocks are independently selected and edits preserve every unrelated byte. Use full-file content versions, safe block identities, per-file save serialization and atomic sibling-file replacement with cleanup and appropriate permissions.

Reject traversal, encoded traversal, absolute paths, symlink targets/ancestors, non-regular files and unbounded input. Validate root/destination/parent identity around I/O and fail closed on containment failures. Handle stale versions, concurrent client saves, external edits, missing files and ambiguous fences with typed recoverable errors. Never recreate deleted files from a stale save.

## ActiveForm

Implementing scoped file operations

## Dependencies

- **blocked by**: DESIGN-001
- **blocks**: API-001

## Notes

- Claim before investigation, re-read index/detail, and record investigation/proposal here using [PLAN-001](../plan/PLAN-001.md) and the finalized contracts.
- Specify the supported Markdown fence grammar and offset semantics before coding. Fixtures cover multiple blocks, non-Mermaid fences, backticks/tildes, indentation, longer delimiters, BOM, CRLF/LF, missing final newline and fence-termination injection.
- Threat checks cover sibling-prefix escapes, malformed/encoded paths, symlink loops and replaced ancestors/targets. Demonstrate no outside reads or writes on rejected paths. Document the trusted operator/OS boundary and any unresolved race limitations before API exposure.
- Save tests must demonstrate one success plus one conflict for simultaneous same-version saves, external change detection during preparation, unchanged destination after injected write failure, and temporary-file cleanup. Atomic rename alone is not the conflict protocol.
- Required focused command: `bun test src/modules/diagrams tests/integration/files --coverage && bun run check && git diff --check`. Adversarial fixtures stay beneath ignored project `tmp/`; simulated outside-root targets stay within that scratch directory.

### Investigation

- The foundation supplies immutable canonical `projectRoot`, bounded limits, SHA-256 versions, Markdown byte selectors, tree/document/revision contracts and fixed safe `AppError` messages. There is no existing file implementation or parser dependency to extend.
- The configured test root is `src`; keep acceptance tests co-located so the full gate executes them, and verify the explicitly requested integration path independently. No manifest or lock changes are needed.
- Checked the official [filesystem API](https://nodejs.org/api/fs.html), [runtime compatibility](https://bun.sh/docs/runtime/nodejs-compat) and [CommonMark fence grammar](https://spec.commonmark.org/0.31.2/#fenced-code-blocks) on 2026-09-07. No-follow applies to the final component only; portable pathname revalidation does not eliminate ancestor substitution. Descriptor-relative directory traversal is required for the supported host implementation.

### Proposal

- Implement a pure byte-preserving parser, a contained filesystem repository, and an injectable service exposing document/read/save/revision/tree refresh methods. Keep HTTP and global timers outside the domain.
- Use built-in filesystem APIs and Linux `/proc/self/fd` directory anchors with no-follow component opens. Reject unsupported hosts rather than quietly downgrade containment. Revalidate root and directory identities before I/O and commit. Explicitly document that an OS actor able to rename open directories or race the last comparison/rename still requires OS isolation; no cross-process compare-and-swap primitive is available.
- Support top-level CommonMark backtick/tilde fences, zero to three spaces of indentation, first info word `mermaid`, longer matching closers and multiple blocks. Track all fences so nested-looking text inside other languages never becomes a diagram. Conservatively reject documents with container/HTML block syntax outside fences and unclosed Mermaid fences; document this subset. Replace only selected byte spans, retain BOM and unrelated line endings, reject closing-fence injection, and derive updated selectors from the saved bytes.
- Bound file size, traversal work, entries, depth, block count and total snapshot hashing; expose truncation. Polling uses explicit refresh with a bounded cache and injectable clock. Saves serialize per path and compare the full file again immediately before an exclusive sibling-temp, synced atomic replacement commits.
- Proceed under the original 2026-09-07 implementation authorization recorded in PLAN-001. These investigation/proposal notes precede implementation; no later approval or reviewed prototype is asserted.

### Implementation review

- Reviewed the local file-domain diff using the shared and TypeScript backend review policies, covering containment, selectors, byte preservation, error redaction, atomic replacement, lock release, bounded refresh and test inclusion.
- Corrected root deletion being mistaken for document deletion, cleanup of a substituted temporary name, stale cache retention after a concurrent save, and multiline reference-label/tab-indentation ambiguities. Added regressions for each behavior. No unresolved actionable in-scope findings remain; documented platform and external-process boundaries still apply.
- Real temporary directories exercise symlink/ancestor/root substitutions, stale and simultaneous saves, visible full-content replacement, external edits/deletions/renames, unchanged timestamps, multiple Markdown blocks, invalid input and cleanup. Partial-write ENOSPC and permission-denied EACCES paths use explicit fault injection while preserving real destination/temporary-file operations.
- Environment limitation: a local filesystem probe at uid 1000 reported mode 0500 on a directory but allowed both ordinary and descriptor-anchored writes. Consequently native permission denial is not verified on this host; EACCES handling is tested by fault injection. No ACL or hostile-host isolation claim is made.
- Review verdict: PASS within the documented Linux/procfs and trusted-operator boundary. Critical: 0; high: 0; medium: 0; low: 0 outstanding findings. This is a file-domain review, not full application or browser acceptance.

### Verification and delivery

- Runtime: project-local Bun 1.4.2 at `.cache/runtime/node_modules/.bin/bun`; Node 24.20.0 unchanged. Both `bun install --frozen-lockfile` and `bun install --cwd web --frozen-lockfile` completed successfully without manifest/lock changes. Long checks ran in the prescribed project tmux session.
- Exact acceptance command: `bun test src/modules/diagrams tests/integration/files --coverage && bun run check && git diff --check` with the pinned Bun directory prepended to PATH. Exit 0 on 2026-09-07 at 18:46 UTC. Evidence: ignored `tmp/file-tests.log`, `tmp/file-check.log`, `tmp/file-verified.exit` (0), and `tmp/file-setup.log`.
- Focused suite: **61 passed, 0 failed**, 465 assertions, including the imported integration suite. Reported aggregate coverage: **98.77% functions, 99.92% lines**. Parser: 100%/100%; repository: 97.14%/99.50%; service: 95.45%/100% (functions/lines). Coverage reports are instrumentation evidence, not proof against every filesystem race.
- Complete gate: backend lint/typecheck and **75 tests passed**, aggregate backend coverage **99.07% functions, 99.94% lines**; existing frontend lint/typecheck and **8 tests passed**, frontend covered starter modules reported 100%; frontend and backend production builds passed. `git diff --check` passed. Frontend coverage does not establish finished editor behavior.
- `src/modules/diagrams/acceptance.test.ts` imports the real `tests/integration/files/acceptance.test.ts` so the existing `src` test-root setting cannot silently omit integration acceptance in either command. The bridge introduces no new dependency or gate exclusion.
- Public exports and exact Markdown/filesystem/polling limitations are documented in [architecture](../architecture.md#files-polling-and-drafts). Shared contracts remain unchanged. No HTTP router, authentication, frontend, design, manifest, lockfile or other task was modified.
- Preview: not applicable to this file-domain task. No service/browser preview was launched or claimed, and no GUI acceptance was performed. The prototype remains needs-review. Application-wide integration and release checks remain with their respective tasks.

### Markdown context correction: investigation

- Reopened and reclaimed this task with the same owner after review. The prior commit and all original evidence remain intact. The global `unsupportedContext` rejection excludes ordinary README content and therefore fails the intended Markdown usability requirement; the previous parser policy and clean-review conclusion are superseded by this correction.
- The byte-span save protocol and whole-file selectors can remain unchanged. The missing capability is reliable CommonMark block context, including raw HTML, reference definitions, indented code and nested containers. Extending the line scanner would duplicate a full block parser and create avoidable ambiguity.
- Verified the official npm registry on 2026-09-07: `mdast-util-from-markdown` latest stable is 2.0.3, with ESM exports and included TypeScript declarations. Its maintained CommonMark parser provides AST block kinds, parent relationships and source positions. Registry metadata is preserved in ignored `tmp/markdown-registry.json`.
- The existing late version comparison and rename are separate operations. The external-writer race remains an OPEN acceptance risk, not an accepted exception. No documented built-in filesystem method combines expected-content comparison with atomic replacement.

### Markdown context correction: proposal

- Add only the exact runtime parser dependency `mdast-util-from-markdown@2.0.3` to the root manifest and generated root lockfile. Record compatibility/API details and frozen-install evidence in a focused Markdown decision. Leave the web dependency graph untouched.
- Use CommonMark root-child code nodes to identify top-level Mermaid fences amid arbitrary ordinary prose, lists, blockquotes, links, reference definitions and HTML sections. Do not traverse into container nodes or inspect HTML/indented/ordinary fenced-code text for candidate diagrams. Use source-line positions against original bytes to retain BOM, CRLF and exact unrelated content; do not serialize the AST or use normalized node values as file content.
- Keep the existing byte selector and full-file version contract, newline/indentation behavior and fence-injection protection. Unsupported individual candidate blocks must not exclude unrelated valid top-level blocks. Add parser and real service-save regressions covering each surrounding/nested context and multiple blocks with non-ASCII offsets.
- Reproduce the final-window race in an isolated diagnostic process: intercept only the last rename call, perform an actual external-process edit after version checks, then execute the real rename. Preserve hash-based evidence and label the expected overwritten result as an open risk. Do not change or weaken the production save protocol or suppress a safety failure.
- Implement under the existing 2026-09-07 authorization and this explicitly requested routine correction. The correction completes only after the required frozen installs, focused tests, full gate, self-review and evidence report; final external-writer acceptance remains open.

### Markdown correction: verification and open findings

- Replaced global surrounding-syntax rejection with CommonMark root-child selection. Added ordinary bullet/ordered lists, quotes, links/reference definitions, closed HTML, literal/nested exclusions, CRLF/BOM/non-ASCII byte offsets, independently saved multiple blocks and prior delimiter-injection regressions. The parser dependency is a direct root dependency only; no transitive versions or web dependency files changed. `repository.ts` and the production save protocol are unchanged from the prior commit.
- Final exact command with project-local Bun 1.4.2: `bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun test src/modules/diagrams tests/integration/files --coverage && bun run check && git diff --check`. Exit **0** at 2026-09-07 19:00 UTC. Evidence: `tmp/markdown-delivery-install-root.log`, `tmp/markdown-delivery-install-web.log`, `tmp/markdown-delivery-tests.log`, `tmp/markdown-delivery-check.log`, and `tmp/markdown-delivery-gate.exit`.
- That final run had **79 focused tests passed** (519 assertions; 98.77% functions / 99.92% lines), **93 backend tests passed** (605 assertions; 99.07% functions / 99.94% lines), and **8 existing frontend tests passed** (covered starter modules 100%). Root/web lint and typecheck, frontend/backend builds and whitespace checks passed. Parser coverage reported 100% functions/lines. These are the results of that run, not a stability guarantee.
- The isolated diagnostic `bun tests/integration/files/external-writer-window.ts` reproduced an actual external-process write after the last comparison that was overwritten by the real rename. It reported `serviceSaveSucceeded: true`, `externalChangeOverwritten: true`, one interception, and no remaining temp entries. Exit 0 establishes the counterexample, not a passing safety requirement. Exact hashes and output are in `tmp/markdown-external-window.json`; the diagnostic also passed a focused strict typecheck via `bunx tsc --project tmp/markdown-diagnostic.tsconfig.json`.
- **HIGH, OPEN acceptance risk:** no built-in expected-content atomic replacement primitive was identified. Stale-at-check rejection and service-save serialization work within their tested boundaries; neither protects arbitrary uncooperative writers in the final check/rename window. No protocol check was removed, no native layer was added, and this risk has not been accepted or waived. See [architecture](../architecture.md#open-external-writer-acceptance-risk).
- **MEDIUM, OPEN verification concern:** the new real second-save regression intermittently returned a conservative conflict. An earlier full command ended with 92 backend passes / 1 failure (`tmp/markdown-final-check.log`). A direct stress command, `bun test --rerun-each=20 ./tests/integration/files/acceptance.test.ts`, produced **36 passes / 4 failures** (`tmp/markdown-direct-regression.log`). Temporary comparison-site tracing showed inode 2728684 -> 2728685 on device 41 while size 286, mtime 1788807511430453904, ctime 1788807511431630038 and full content hash `08a741f1753f03d020d148ba66479dc4195a8db0d06a5d7b3b1ee0f63490dd1f` stayed equal. Other failures showed the same inode-only pattern. The host reports `UNKNOWN (0x6a656a63)` for `stat -f -c '%T' tmp`. Smaller raw filesystem probes did not reproduce it, so the cause is unresolved rather than attributed conclusively to the filesystem or runtime.
- Temporary tracing was removed before the final command; no debug logging, conflict retry, skipped test, weakened identity check or altered save expectation remains. The direct failing stress evidence is retained alongside the final passing run. This task stays **in_progress** pending disposition of the open acceptance/verification concerns; the Markdown implementation and its verified correction are committed for review without claiming overall file-service acceptance.
- Self-review used the shared and TypeScript backend review policies. No outstanding parser-specific defect was identified. Verdict: **WARNING** because the requested external-writer review confirms one high open risk and verification retains one medium open concern. Original findings-free review language above describes the earlier run and does not close these findings.
- Preview remains not applicable. No HTTP/auth/frontend/design work or GUI acceptance was performed; the prototype is still needs-review.

### Consecutive-save reliability: focused investigation

- Continued the existing in-progress claim under the same owner and original authorization. The Markdown correction and its evidence are retained; the unresolved 36-pass / 4-failure repeated second-save result prevents reliability acceptance despite the later passing gate.
- Source inspection places the observed conflict between two complete reads in `FileRepository.replace`. Their recorded content, size, mtime and ctime matched, while inode differed. Existing traces lack descriptor/path observations at intermediate operations, birthtime and link count. Neither the unrecognized filesystem type nor a smaller successful probe establishes a cause.
- This investigation concerns that intermittent identity observation only. The separate final comparison/publication safety investigation is outside this correction; the save protocol and conservative conflict checks remain intact.

### Consecutive-save reliability: bounded proposal

- Run at most six cases with at most twenty iterations each, recording exact denominators and a finite timeout for each owned child. Initial cases: (1) the unchanged README acceptance test repeated twenty times in one process; (2) the same unchanged test in twenty separate processes with isolated filesystem-call tracing; (3) a raw built-in filesystem equivalent in Bun; (4) the identical raw probe in Node. Reserve at most two further cases for a source/evidence-supported discrimination, documenting their choice before execution. Stop early if a causal explanation is established.
- Keep reusable TypeScript diagnostics in `tests/integration/files/` and all logs/fixtures under ignored `tmp/`. Trace only fixture paths and descriptors created by the diagnostic child. Record runtime/PID, filesystem type, operation sequence and descriptor/path dev, inode, size, mtime, ctime, birthtime and link count. Retain failures and cleanup evidence. Instrumentation changes scheduling and successful probes are negative observations only.
- Permit a production or assertion change only after a concrete causal explanation, with a regression retaining same-content external-replacement rejection. Otherwise commit diagnostics and honest findings, leave application code unchanged and the task in progress, identify the smallest missing independent control, and report partial completion without rerunning the full gate for a chance pass.
- Run focused strict TypeScript/lint checks for diagnostic additions and `git diff --check`. If a causal implementation correction becomes justified, run the required frozen-install and full quality command once after that correction. All longer commands use the established project tmux session.

### Consecutive-save reliability: adaptive case selection

- Case 1 completed the unchanged README test twenty times in one process: 19 passed, 1 failed at the final second-save comparison. Case 2 completed twenty isolated processes: 18 passed, 2 failed at the same comparison. The preload's process-exit listener did not persist its trace in these test runs; their exit codes/stacks/counts remain useful, but descriptor metadata and cleanup verification are missing for this case. This is an explicit diagnostic gap, not successful tracing.
- Reserve case 5 for twenty repeats of the unchanged test with tracing persisted through the documented test-runner `afterAll` lifecycle hook instead. This repairs diagnostic evidence collection without rerunning either earlier case or changing production/test assertions. Official lifecycle documentation checked on 2026-09-07: https://bun.sh/docs/test/lifecycle. Case 6 remains unselected until the raw-runtime observations are inspected.

- Raw case 3 (Bun, twenty isolated children) reproduced the identity conflict twice without application parsing or the test framework; raw case 4 (the identical source under Node, twenty children) did not reproduce it. Case 5 retained twenty complete traces and reproduced three failures, with twenty recorded fixture cleanups and no remaining tracked descriptors. These results narrow the context but do not identify the responsible implementation layer.
- Select the final case 6: the raw Bun probe with additional synchronous descriptor and direct/anchored path snapshots at temporary-file creation, write, chmod, sync and rename boundaries, twenty isolated children. This distinguishes the observation boundary and asynchronous-stat-only discrepancies without changing the service. Extra stat calls alter timing. No more cases or reruns will follow this finite matrix; absence of causal attribution will be reported as unresolved.

### Consecutive-save reliability: finite result and review

- Completed exactly six cases, twenty iterations each, with no retries, additional cases, child timeouts or signals. Results in case order: **19/1**, **18/2**, **18/2**, **20/0**, **17/3**, **20/0** (passed/failed). Distinct conditions must not be interpreted as a pooled reliability acceptance rate. The original regression is **not resolved**.
- Added manual TypeScript diagnostics for bounded child execution, fixture-only filesystem tracing and an equivalent raw sequence under Bun/Node. Raw Bun reproduced two inode-only conflicts without the parser or test framework. Complete metadata includes dev/inode/size/mtime/ctime/birthtime/nlink, child PIDs, operation boundaries and filesystem type. Case 6's extra synchronous snapshots produced 880 matching asynchronous/synchronous stat pairs and no failing iteration; it is a timing-sensitive negative control, not a fix.
- Evidence paths, exact commands/counts, representative descriptor/path metadata, instrumentation gaps and the smallest next independent control are recorded in [the inode investigation](../decisions/2026-09-07-inode-observations.md). Sixty raw children verified zero temporary files and removal of their fixtures; case 5 recorded twenty removals and no remaining tracked descriptors. Cases 1–2 have explicitly documented metadata/cleanup evidence gaps. Prior evidence is preserved.
- Causal conclusion: no unexpected target replacement by the test code was established, and no runtime/filesystem attribution is justified. The missing control is the same failing raw sequence on an independently identified Linux filesystem within authorized disposable project scratch. No tracer was available, installed or used. Stop at this matrix boundary; do not relax inode checks, retry conflicts, alter expected outcomes, or claim same-content replacement is harmless.
- Diagnostic-only command: `bun node_modules/typescript/bin/tsc --project tmp/inode-diagnostics.tsconfig.json && bun node_modules/eslint/bin/eslint.js tests/integration/files/inode-*.ts && git diff --check`. Exit **0** using project-local Bun 1.4.2 in the prescribed tmux session. Evidence: `tmp/inode-focused-check.log`, `tmp/inode-focused-check.exit`. Node remains 24.20.0. The focused strict configuration is reproduced in the decision record. No new dependency or frozen install was needed.
- The full application gate was **not rerun** for diagnostics. Retained results remain 79 focused passes, 93 backend passes and 8 frontend passes from the prior final command, alongside the earlier 36/4 repeated-test failure; none closes this reliability concern. Production code, parser, original tests, manifests and locks are unchanged from the retained Markdown correction.
- Applied the shared and TypeScript backend self-review policies to fixture ownership, scope, bounded child lifecycles, trace isolation, metadata capture, evidence denominators and unchanged assertions. No new actionable diagnostic defect remains. Verdict: **WARNING**; this correction retains one medium unresolved reliability finding. The separate high publication-window finding was neither re-investigated nor changed. FILE-001 remains **in_progress** with the same owner and index marker.
- Delivery is partial: diagnostics and bounded evidence are reviewable, but no causal production correction or reliability acceptance is claimed. No GUI, server preview or browser check applies.

### Supplied control: evidence reconciliation

- Investigation: the supplied report adds one direct acceptance control on overlayfs using the unchanged Markdown correction baseline and Bun 1.4.2. Its reported result is 40 passed, 0 failed, 280 assertions, exit 0. This is additional supplied evidence, not a test executed or independently inspected in this worktree. The six-case local matrix remains exhausted and unchanged.
- Proposal: update only the reliability record and its file-domain references to distinguish this supplied filesystem control from the raw probe and to remove the now-overbroad statement that no independent filesystem control exists. Preserve all failures, the unresolved attribution, existing identity checks and task status. No additional experiment, source change or acceptance waiver follows from this report.
- Reconciliation: recorded the supplied mount distinction and direct-test result in the decision without unrelated mount details. The control matches the original two-test repeated run, not the single-test matrix cases. It supplies the previously missing direct filesystem comparison but no raw-probe or failing-boundary syscall evidence. Attribution and reliability acceptance remain unresolved; the external publication risk is unaffected.
- Documentation review checked provenance, source baseline, denominators and preservation of the earlier failures. No code, diagnostics or tests ran or changed for this supplement. `git diff --check` passed. FILE-001 remains in_progress; this update does not create a new experiment or retry.

### 2026-09-07: Practical-save continuation

The previous correction sequence is exhausted and unresolved; this historical in_progress status and all original evidence are retained. It is not reopened as another successful retry. SAVE-001 reuses committed source fc0e41762adc44bfa9c390f03b3b6caa9157be33 and owns the new practical-save completion under the explicit continuation in PLAN-004. The original 36/4 direct result, raw 18/20 failures and final-window loss are not erased by supported-filesystem acceptance. See [SAVE-001](SAVE-001.md) for the new contract and its own verification.

### 2026-09-07: Superseded disposition

Closed as superseded by completed [SAVE-001](SAVE-001.md), which owns the accepted practical-save contract and verification. The prior in_progress result, neutral owner, previousCompletionAt, failed/exhausted correction history and unresolved shared-mount cause remain historical evidence. FILE-001 is not passed or completed; this administrative closure neither waives acceptance nor removes conservative checks, reruns an exhausted investigation or attributes the unresolved cause.
