# SAVE-001 Complete practical file saves on a verified filesystem

- **status**: completed
- **priority**: P1
- **owner**: File service maintainer
- **createdAt**: 2026-09-07 20:02

## Description

Reuse the retained file implementation and complete bounded practical acceptance on an explicitly supported filesystem. Refuse unsupported writes while preserving optimistic conflict detection and the documented final compare/rename limitation.

## ActiveForm

Completing practical file-save verification and recording the reviewable handoff.

## Dependencies

- **blocked by**: STACK-001 (completed)
- **blocks**: API-001, UI-001, TEST-001, REVIEW-001, DOC-001

## Notes

- 2026-09-07: Claimed before source investigation. PLAN-004 tracks investigation, proposal, implementation and verification.
- Authorization: the original MVP implementation authorization and the explicit 2026-09-07 continuation authorize this scope and routine corrections. External editors must retain direct access to original files. No further routine implementation approval is required. Prototype status remains needs-review.
- Preserve historical FILE-001 failures and the separate applicationSafetyPassed=false diagnostic. Completion belongs to SAVE-001, not a successful retry of FILE-001.

- 2026-09-07: Investigation and concrete proposal recorded in PLAN-004 before source materialization. Implementing under the existing explicit continuation. No causal runtime fix is asserted.

## Source reuse and implementation

- Reused fc0e41762adc44bfa9c390f03b3b6caa9157be33 relative to 686a36615e64c6833a040e72155cc999b082e553 by scoped source materialization after the recorded investigation/proposal. Imported `src/modules/diagrams/**`, `tests/integration/files/**`, the two 2026-09-07 Markdown/inode decisions, FILE-001 history, focused architecture/changelog history, and only the mdast-util-from-markdown 2.0.3 root manifest/lock promotion. Current safety research, claims and original dates remain intact.
- The retained parser, parser tests, raw probe, raw matrix, metadata helper, exact external-window diagnostic and both decision files are byte-identical to the pinned source. Original service/acceptance assertions are unchanged; only explicit fixture creation/cleanup is routed through the new helper. The diagnostic preload has one import-order-only lint correction. No diagnostic was deleted, weakened or relabeled.
- Added descriptor-based overlayfs/type/device write enforcement and root `storageStatus()`. Extended the shared error union/map only with `filesystem_unsupported` (503), using a fixed safe message. Reads still enforce all existing identity/path limits. Saves retain full-file hashes, per-path serialization, same-directory atomic replacement, late identity/version checks and fail-closed behavior.
- Added `scripts/check-files.ts`, explicit canonical fixture-parent helpers, practical save regressions, a focused strict TypeScript configuration and an independent-process domain smoke. No extra raw control was run: the supplied overlayfs result was sufficient to select the supported candidate. The closed six-case investigation was not repeated.

## Verification

Runtime: project-local Bun 1.4.2; actual Node 24.20.0. Root and web frozen installs passed. The parser registry was rechecked at https://registry.npmjs.org/mdast-util-from-markdown/latest and remained 2.0.3 with the retained integrity. No other application dependency or frontend file changed.

Actual supported fixture parent: the exclusive disposable directory recorded in `tmp/fixture-cleanup.json`, canonical, overlayfs `0x794c7630`, device 70. Actual unsupported parent: this checkout's `tmp/`, `0x6a656a63`, device 41. Each created fixture prints its type/device and confirmed removal. `tmp/fixture-cleanup.json` additionally confirms all owned fixtures removed; the exclusive supported parent and its empty `tmp/` remain retained. Logs stay in this checkout's ignored `tmp/`.

The complete required command ran in the prescribed path-hash tmux session with:

```bash
export PATH="$PWD/.cache/runtime/node_modules/.bin:$PATH"
export BUN_INSTALL_CACHE_DIR="$PWD/.cache/bun-install"
export DIAGRAMDOCK_TEST_FIXTURE_PARENT="$(cat tmp/supported-parent.txt)"
export DIAGRAMDOCK_TEST_UNSUPPORTED_PARENT="$PWD/tmp"
bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run check:files && bun run check && git diff --check
```

Exit **0**. Evidence: `tmp/final-runtimes.log`, `tmp/final-install-root.log`, `tmp/final-install-web.log`, `tmp/final-files.log`, `tmp/final-check.log`, `tmp/final-whitespace.log`, `tmp/final-check.exit`.

| Condition | Result |
| --- | --- |
| Practical file gate | 85 passed, 0 failed, 664 assertions; strict integration/diagnostic typecheck passed; all child exits 0 without signals |
| Consecutive standalone flow | 20/20 consecutive saves on one supported-root file; exact BOM/CRLF bytes and revision invalidation |
| Consecutive multi-block flow | 20/20 consecutive pairs (40 saves) on one supported-root file; refreshed selectors and byte-exact surrounding content |
| Before-final-validation external writers | Independent real Bun processes performing in-place and atomic replacement edits both produce conflict; external bytes and caller draft remain intact |
| Retained file boundaries | Stale/concurrent service saves, detected deletion, same-content replacement, BOM/CRLF/multi-block preservation, complete old/new observations, traversal/symlinks/root substitutions, temporary failure cleanup and refresh/invalidation passed |
| Unsupported root | Real host-shared files remain readable; current and stale requests both refuse before temp creation with filesystem_unsupported; original bytes unchanged |
| Default parent behavior | `env -u DIAGRAMDOCK_TEST_FIXTURE_PARENT -u DIAGRAMDOCK_TEST_UNSUPPORTED_PARENT bun run check:files` exits 1 visibly on checkout tmp; no relocation or passing no-tests result (`tmp/default-refusal.log`, `.exit`) |
| Independent domain smoke | Real Bun process read/select/save/read and external replacement/revision refresh passed; no renderer, HTTP or GUI involved |
| Full backend gate | 99 passed, 0 failed, 750 assertions; 99.32% functions / 99.10% lines; root lint/typecheck/build passed |
| Existing frontend gate | 8 passed; covered starter boundaries 100%; frontend lint/typecheck/build passed |

These are separate conditions, not a pooled reliability rate. The first local verification also passed all file tests and typecheck but lint returned three import-order errors (including the retained diagnostic preload); those were corrected before the complete command above. Its `tmp/first-*.log` / `.exit` evidence is retained. No runtime reliability failure was blindly retried or tolerated.

### Separate limitation diagnostic

From the exclusive supported parent, ran the unchanged absolute `tests/integration/files/external-writer-window.ts` with project-local Bun and a 20-second outer timeout in tmux. `tmp/final-window-storage.json` records overlayfs/device 70 for its fixture parent. `tmp/final-window.exit` is 0 because the counterexample was reproduced: one rename interception, `serviceSaveSucceeded=true`, `externalChangeOverwritten=true`, no remaining temporary entries. `tmp/final-window.json` retains expected, external, returned and final SHA-256 hashes. `tmp/final-window-interpretation.json` explicitly records **applicationSafetyPassed=false**. This is not included in passing application acceptance.

The original host-shared 36-pass/4-failure direct result and raw Bun 18/20, actual Node 20/20 and extra-stat 20/20 conditions remain unresolved historical evidence. No causal fix or blanket overlayfs/Linux reliability guarantee is claimed. The implementation deliberately excludes the observed unsupported storage rather than explaining away its failures. External writes/deletions in the final comparison/rename window and local OS actors with root/ancestor mutation rights remain outside the practical guarantee.

## Implementation review

Applied the shared and TypeScript backend review policies to the full reused parser/repository/service and their tests, diagnostics, new filesystem enforcement, safe error contract, fixture ownership, bounded child lifecycles and documentation. Checked the retained-source delta explicitly: identity/hash conditions and original test assertions were not relaxed. Reviewed typed error propagation, temporary cleanup, selector byte offsets, complete-content replacement, save queue release and cache generation invalidation. Fixed the three import-order findings before final verification.

| Severity | Actionable in-scope findings remaining |
| --- | ---: |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

Verdict: PASS for the bounded practical-save contract and documented supported deployment. The separate final-window counterexample and excluded-mount attribution remain open limitations, not newly solved findings. This result does not certify GUI safety, end-to-end application acceptance, crash durability, adversarial OS isolation or final integration.

## Downstream contract and handoff

Use `createDiagramService(config)` once per configured root. Exported `FileConfig` accepts validated `projectRoot` and `limits`; `FileStorageStatus` describes root eligibility/type/device. Methods: `storageStatus()`, `readDocument(path)`, `documentRevision(path)`, `treeSnapshot({ refresh?: boolean })`, `saveDiagram({ path, selector, expectedVersion, source })`. Saves return refreshed complete-file versions/selectors; safe errors include filesystem_unsupported (503), conflict (409), deleted (410), forbidden, unsupported and unavailable. Never expose lifecycle hooks or filesystem selection through request input.

API-001 waits for this accepted/integrated change. UI/browser/binary checks must create their own explicitly authorized disposable project roots on the verified deployment filesystem and pass the same printed type/device checks; checkout storage must still prove write refusal. README provides repeatable configuration, fixture and smoke commands. Preserve dirty UI drafts and expose unsupported saving; their real UI behavior remains for downstream acceptance. CI/single-executable release remains the authorized stage between TEST and REVIEW, with its own tracking creation. Prototype remains needs-review. No HTTP/UI/design work, browser preview, remote publication or final integration was performed here.

- 2026-09-07 20:09: Completed scoped implementation, verification and review; ready for integration review.
