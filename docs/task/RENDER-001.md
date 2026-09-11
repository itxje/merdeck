# RENDER-001 Preserve ordinary Mermaid label line breaks

- **status**: completed
- **owner**: Frontend maintainer
- **priority**: P1
- **createdAt**: 2026-09-08
- **relatedPlan**: PLAN-007

## Scope and authorization

The user's explicit 2026-09-08 bug-correction authorization covers this bounded renderer correction and its verification. This records existing day-level authorization, not a new approval event. The accepted baseline is `881dbe259cc30a507dec2c43b75425e9df25d9aa`. Completed MVP/review/native results remain historical; this correction is open and requires fresh checks. Prototype status remains needs-review.

## Acceptance

- Render the exact supplied 16-node Unicode flowchart with all six intended label breaks and branch labels.
- Permit only bare break variants through a narrow render-only rule while preserving strict security, plain-source validation, sanitized SVG, limits and stale guards.
- Preserve editor, draft, request and saved source bytes; retain neighboring hostile-input refusal.
- Run focused regression and the complete prescribed local executable/browser gate; record actual scope and cleanup before review.

## Notes

Claimed before focused investigation; owner and index re-read. No unrelated implementation, dependency, storage, deployment or historical task changes are authorized. Final hosted validation and integration remain separate.

Investigation and proposal are recorded in PLAN-007 before implementation. The direct installed-renderer probe confirms actual SVG line separation; the application validator still rejects the original input. Original/control evidence hashes are retained in ignored local evidence. Next: failing regression, scoped correction, executable/browser verification and review.

## Focused implementation and verification

The renderer now masks only exact bare break tokens during global validation and canonicalizes them only in its private call. Other HTML and all prior restrictions remain rejected. Strict settings, both sanitizers, queue/stale guards, limits, draft handling and backend behavior are unchanged. The committed escaped fixture round-trips to the original 991 bytes / 613 characters / six break tokens and its recorded SHA-256.

Retained failure evidence:

- Baseline focused unit run: exit 1, 9 failed / 33 passed; permitted-break and exact-original assertions fail at the old global less-than rejection.
- Baseline original-source browser run: exit 1, 1 failed; no Live preview, actual plain-Mermaid error, zero unexpected browser errors. Owned services and fixtures were cleaned. The original failure screenshot is retained independently of later Playwright output.
- First focused formatting/lint attempt: exit 1, one new multi-statement try line; corrected in the test only.
- Next focused run: lint/types, all 83 frontend tests with unchanged coverage thresholds, and build passed; browser exit 1 because the first geometry assertion disallowed Mermaid's existing additional automatic wrap on one long label. The variant/hostile case passed. Test now verifies exact non-whitespace label content and requires every explicit break at an actual row boundary while allowing additional wrapping.
- Subsequent focused browser exit 1: unlabeled edges produce empty text placeholders, so branch comparison now counts all nonempty labels rather than treating empty placeholders as labels. The variant/hostile case passed. All earlier logs/exits are retained; no framework retries or skipped checks were introduced.

Final focused source run: frontend lint/types and both browser regressions passed (2 cases, 9.8 seconds), with 16 nodes, all 7 branch labels, six explicit two-row labels separated by approximately 15.4 SVG units, zero implicit PUTs and exactly one explicit save. Editor/draft/submitted/read/reloaded bytes equal the original hash. No unexpected page/console/network errors, literal tags or active SVG DOM. Desktop 1440x1000 and narrow 390x844 screenshots were inspected; source/preview tabs, fit and zoom remain usable. Independent source-fixture equality was rechecked after formatter changes. Frontend unit coverage: 83 tests across 9 files; 91.78% statements, 88.19% branches, 89.16% functions, 92.42% lines. Full executable/browser acceptance remains pending until the aggregate gate below runs.

## Scoped implementation review

Reviewed renderer.ts, renderer.test.ts, render-queue.test.ts, the focused browser spec and escaped fixture, plus the existing Preview/caller/draft and sanitizer context. Applied shared and TypeScript frontend review policy: exact matching, global validation, original-length limits, private-only normalization, trusted config, serialized/stale behavior, active/resource SVG removal, source identity and test discovery. No runtime dependency, public filesystem boundary, auth, deployment or design change. The browser spec is discovered by the existing test glob and therefore the unchanged executable gate; it adds two cases to the historical 24-case suite.

| Severity | Count | Status |
| --- | --- | --- |
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: PASS for the bounded implementation and focused source checks. Full local executable acceptance is still pending. Final hosted/live original-source verification and integration are outside this local review. Prototype remains needs-review.

## Complete local gate and executable evidence

The exact prescribed AND-list ran once on clean implementation commit `718757a5a4f427f00bb77a5c75354f70c220aa40` in the owned project tmux session:

`bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run check:ci && git diff --check`

Its exit **0** was captured immediately in `tmp/full-render.exit` before independent cleanup; `tmp/full-render.status` is empty. The final evidence-recording commit changes only task/plan status and documentation, retaining identical tested application, tests, manifests, locks and build inputs. No additional source change or repeated aggregate check was needed.

| Gate | Actual result |
| --- | --- |
| Frozen installs and runtime | Root/web exit 0, locks unchanged; local Bun 1.4.2 and separately executed Node v24.20.0, Linux ARM64 |
| Workflows | Verified actionlint 1.7.12, 1 workflow, unchanged action pins |
| File domain | Strict types; 115 tests / 0 failures / 714 assertions; independent domain smoke passed |
| Storage controls | Strict types; 6 tests / 0 failures / 55 assertions; actual shared-filesystem refusal remains effective; the intentional native mismatch control is not native acceptance |
| Source checks | Root/frontend lint and strict types; isolated missing-procfs 1/0; backend 152/0 with 1,222 assertions; frontend 83/0 across 9 files; both production builds passed |
| Coverage | Backend 98.94% functions / 99.47% lines; frontend 91.78% statements / 88.19% branches / 89.16% functions / 92.42% lines; thresholds unchanged |
| CI/release checks | Strict projects and 18 tests / 0 failures / 97 assertions, including intentional build-failure and interrupted-input controls |
| Executable | Actual matching `bun-linux-arm64` execution, nonpublishing fixture version `0.0.0-ci.fixture`, embedded Bun 1.4.2 and exact implementation commit; version/build-info checks passed with empty PATH |
| Embedded resources | 93/93 exact asset bodies, hashes, sizes, MIME types and security headers passed |
| Executable browser suite | **26/26 passed** in 1.5 minutes, original 24 cases plus both new regressions, retries 0; no unexpected page/console/network errors |
| Lazy render families | Real flowchart, sequence, class and state diagrams passed with zero external requests |
| Trace controls | Exactly one executable launch per service, empty runtime PATH, no checkout/frontend access or extraction. Supported trace: 22,172 file accesses / 17 scoped writes; refused trace: 391 / 0 writes |
| Cleanup | Both executable services stopped with verified exit 0 and unreachable URLs; synthetic roots, runtime directory, token, private configs and compile scratch removed; independently verified empty owned fixture parents removed; only the idle shell remains |

The focused file tests overlap backend coverage and are not additive unique counts. The existing Vite large-chunk advisory remains; no chunk policy or performance claim changed.

Artifact: `dist/release/diagramdock-0.0.0-ci.fixture-linux-arm64`, 85,444,904 bytes, SHA-256 `06045f2ca2be71ec490adb0a441202673fcac9ee0027f7aa423e62cbffc691eb`. This is a local verification fixture, not a release. Positive storage was canonical overlayfs `0x794c7630`, device `70`; refused storage was a separate canonical host-shared parent `0x6a656a63`, device `41`. The result is ARM64/overlay only; new x64/ext4, hosted and live HTTPS acceptance are pending.

The executable's original-input regression verified all 16 nodes, all 7 branch labels, all six explicit two-row labels (about 15.4 SVG units apart) and additional ordinary wrapping where needed. No literal break tokens, forbidden active DOM or unexpected requests occurred. Zero implicit PUTs, one deliberate save, and exact original source/draft/request/read/reload identity were asserted. The original supplied evidence was rehashed unchanged; its successful reproduction exit 0 means it observed original failure and the space-only control, not acceptance.

Evidence retained in ignored `tmp/`: `full-render.log`, `.exit`, `.sha`, `.status`; `release-smoke-2rdiOU/result.json` and both actual trace files; `e2e-9E2Mvy/`; `render-cleanup.json`; `original-input-identity.json`, `final-fixture-identity.json`, `tracking-preservation.json`; all baseline/focused logs and their actual exits. The two old index bodies are byte-identical to the accepted baseline with exactly one appended own row apiece. No prior task/plan status or retry history was rewritten.

Inspected credential-free executable screenshots: `tmp/render-original-desktop.png`, `tmp/render-original-detail.png` (actual zoomed UI), `tmp/render-original-svg.png`, `tmp/render-original-narrow-preview.png`, and `tmp/render-original-narrow-source.png`. Source-mode screenshots and the actual baseline failure are separately retained in `tmp/source-render-evidence/` and `tmp/baseline-browser-artifacts/`. These private evidence files are not bundled into a fresh checkout.

Final scoped review retains zero actionable findings. Bounded implementation and local verification are complete and ready for review. Final hosted/live unchanged-input and unchanged-saved-byte verification, integration and any normal candidate action remain separate; historical native results do not accept this revision. No shared service, deployment root/token, user file, dependency, release, tag or remote branch was changed. Prototype status remains needs-review.
