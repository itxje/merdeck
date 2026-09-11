# RENDER-002 Support ordinary flowchart labels, fan-out and bounded classes

- **status**: completed
- **owner**: Frontend maintainer
- **priority**: P1
- **createdAt**: 2026-09-08
- **relatedPlan**: PLAN-009

## Authorization and scope

The user's explicit 2026-09-08 ordinary-Mermaid regression continuation authorizes this bounded correction after investigation/proposal. No new approval time or final integration authorization is inferred. Baseline: `67cb4914bab62a005869cf36438fc0a99fc0284e`. Earlier implementation, failures and acceptance records remain historical; this new correction requires independent evidence.

## Acceptance

Support the exact original 24-node/four-group flowchart and nearby ordinary quoted comparison, fan-out and finite class styles while preserving strict preview security. Editor, draft, standalone and selected Markdown source bytes must remain unchanged. Verify real built-service and executable SVG labels, geometry and class presentation, hostile neighbors, existing regressions and the complete prescribed local gate. No unrelated backend, workspace, dependency, deployment or prototype changes.

## Notes

Claimed before substantive investigation. Existing task/plan owners and statuses remain unchanged. Results and original day-level authorization will be recorded in PLAN-009 before implementation.

## Implementation and focused verification

The context-aware preview helper validates complete class declarations before Mermaid initialization or DOM insertion, permits quoted numeric/spaced comparisons and fan-out, and retains the existing strict renderer, SVG sanitization and computed presentation extraction. No dependency, backend or workspace-state code changed. The original fixture was generated using Unicode escapes directly from the supplied bytes; decoded length/hash equality is asserted in the real browser regression.

The old guard failed the exact-source unit test (exit 1) and actual built-service browser regression (exit 1), with retained screenshots and zero unexpected browser errors. Both frozen baseline installs and the build passed. Preliminary lint runs failed on formatting/regexp rules (exit 1); an intermediate formatter diagnostic also exposed an invalid edit before subsequent checks. Those diagnostics remain separate from passing results. They were resolved without weakening rules. Initial corrected source smoke passed one case, then expanded geometry/persistence/security passed three cases.

The final focused AND-list `bun run --cwd web lint && bun run --cwd web typecheck && bun run --cwd web test && bun run build && bun run test:e2e renderer-flowchart.spec.ts renderer-breaks.spec.ts && git diff --check` passed (immediate exit 0). Frontend: 132 tests across 10 files; statements 92.84%, branches 89.23%, functions 89.76%, lines 93.43%; source-policy helper 100% statements/functions/lines and 98.18% branches. Thresholds remain 80%. Both production builds and five discovered source-browser cases passed. Existing large Mermaid chunk warnings remain informational.

Actual application SVG checks observed 24 nodes, four groups, 25 nondegenerate edges, all original node/group/branch labels, separated traditional-break rows, thick-arrow stroke geometry and exact fill/stroke/width/dash presentation for all 24 classified nodes. Desktop, narrow, comparison-detail and dashed-node screenshots were inspected. At fit scale the dense graph is small; zoom preserves readable detail. No literal break tokens, active/resource SVG, unexpected page/console/network effects or implicit PUTs occurred. One explicit standalone save and two individual Markdown saves preserved original source/draft/request/disk/reload bytes. Markdown tests use original LF source blocks in an unrelated BOM/CRLF envelope and assert the entire surrounding document and other blocks byte-for-byte after each save.

## Scoped implementation review

Reviewed correctness, source-to-CSS/DOM security, data integrity, queue lifecycle and test coverage using core/frontend review guidance. Entire identifiers, property names and values are validated before renderer-installed CSS; raw directives, resources, encodings, controls and malformed tags cannot be hidden by context masking. Unbalanced syntax still fails safely. The original source reaches Mermaid unchanged except the existing canonical bare-break variant normalization; strict configuration and both SVG sanitizers remain intact. Queue tests establish rejection before initialization/measurement-host append and byte-identical original input. Existing stale/recovery/zoom and the earlier original-break tests remain active. No actionable findings remain in the reviewed scope.

| Severity | Count | Status |
| --- | --- | --- |
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: PASS for the scoped local implementation review. Complete frozen/check:ci executable verification is pending at the implementation commit; hosted/native/live acceptance and final integration remain separate.

## Final review correction

The first complete local gate at `7356e9a42447e95122fc826243d542dcdc52ddfa` passed (AND-list exit 0, 30 executable browser cases, 93 assets, four lazy families, verified cleanup). During its run, a further concrete review probe found that the scanner dropped inline comment tails and could let an unvalidated class declaration tail pass the policy. The installed comment preprocessor only removes line-leading comments, so relying on removal of every inline tail was unsound. A validator-only rejection regression failed (exit 1), without invoking Mermaid or demonstrating resource execution. This supersedes the earlier no-remaining-findings statement for that intermediate commit.

Resolved by retaining comment-tail text for global security checks while keeping its quotes out of statement scanning. Added unit, queue-before-DOM and real browser refusal controls. Earlier failure and first full-gate evidence remain intact; the changed security path requires a new clean implementation commit and complete gate. No historical task status or acceptance was rewritten.

The resolved comment-boundary change passed the focused lint/types/coverage/build/source-browser/whitespace AND-list (immediate exit 0): 135 frontend tests, statements 92.84%, branches 89.48%, functions 89.76%, lines 93.43%, and all three new browser cases. The policy helper now has 100% statement/branch/function/line coverage. Scoped review of the correction found no remaining actionable findings; global checks retain comment tails, malformed declarations are refused before initialization/DOM insertion, and the ordinary original remains byte-identical. Verdict: PASS for the final scoped implementation; complete executable gate follows at the clean commit.

## Final acceptance and provenance

The complete prescribed AND-list `bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run check:ci && git diff --check` passed at clean implementation SHA `78e24e322392d91a371f05e5b2f46f0d31a68aa2`. Immediate status was captured as `0` before outer cleanup. The final evidence-only documentation commit does not claim a different binary was tested.

The gate retained all existing controls: 115 file tests, six storage tests, one procfs check, 152 backend tests, 135 frontend tests, 18 release/CI tests, and 30 actual executable browser cases (27 existing plus three new). Frontend coverage remains statements 92.84%, branches 89.48%, functions 89.76%, lines 93.43%; helper coverage is 100%. Workflow lint and strict type checks passed. The storage suite's intentional native-target refusal and historical final-window diagnostic remain failures of their respective unsupported/safety claims, not new native acceptance; the aggregate gate expected these refusal controls.

Actual standalone ARM64 execution verified every one of 93 embedded assets, exact build-info/manifest commit identity, all browser regressions and four lazy families (flowchart, sequence, class, state). Trace evidence shows one executable per service, empty runtime PATH, zero checkout access and no frontend extraction. No unexpected lazy-browser errors or external requests occurred. Artifact `diagramdock-0.0.0-ci.fixture-linux-arm64` SHA-256: `33fc0bb8b3c509285a1d3d713790727f5a579c77023b71c7c26b790d227035a4`; manifest SHA-256: `6de6cfa6df11c03eb1d1e863043b3f6efbb70eb07422c7dbbef3f9389d1da33c`; checksum-file SHA-256: `670ba7bb57e625007bb19cf48d66e8df2103eb2ebdaee8b2d7bf1a33ec9b907f`. The checksum verification passed.

Verified local tools: Bun 1.4.2, actual Node v24.20.0, Playwright 1.63.0 with Chromium 153.0.8010.12, actionlint 1.7.12 and strace 6.13. An optional browser-version command first used an absent platform directory (exit 127); the discovered ARM64 executable verified its version (exit 0). No global/dependency changes were made. Supported fixture parent was canonical overlay `0x794c7630`, device 70; refusal parent was actual host-shared `0x6a656a63`, device 41. Final binary services reported verified stop and complete root/token/runtime cleanup; independent connection probes returned refusal (curl exit 7 for each), and both empty owned fixture parents were removed. Only the idle owned tmux shell remains. Supplied evidence hashes still match.

Retained private evidence: `tmp/render-002/final-full.log`, `final-full.exit`, `final-evidence.json`, `recorded-exits.json`, `stopped.txt`, and `final-executable-screenshots/` (desktop, narrow, comparison and dashed-node details plus geometry). Actual binary trace/report directory: `tmp/release-smoke-B8Fu8O/`. Earlier old-guard failures, initial diagnostics, source-browser results and first full-gate evidence remain separate under `tmp/render-002/`. Final executable screenshots were inspected after this gate, including original comparison text, row separation, colors and dashes.

Implementation and local verification are complete and ready for integration review. No new native Linux x64/ext4, remote or live HTTPS acceptance is claimed. Combined integration, later hosted deployment, prototype review and final integration approval remain separate. All prior task/plan statuses and retry/failure history are preserved.

## Supplemental visual provenance and integration constraint

The user-supplied Mermaid Live screenshot (322,164 bytes, SHA-256 `62a0d50f84cf588700b34a58ffce8b5a9a1029815d778045e02218035806ae0e`) was personally inspected alongside the installed Mermaid 11.17.2 strict/htmlLabels=false control and the final executable screenshots. It qualitatively corroborates four groups, the node palette, stroke/dash distinctions, comparison text and fan-out. Different host themes, fonts and viewports are not evidence of changed source semantics. The external site's exact version/configuration and pixel identity are unverified; this is visual provenance, not electrical design validation. The original remains 2,614 UTF-8 bytes including its terminal newline with the previously recorded SHA-256. No source or reference image was modified.

When integrating the deployment-identity feature, preserve the exact same-origin `/api/build` allowance in the existing `renderer-breaks.spec.ts` original-source request list. The new `renderer-flowchart.spec.ts` `auditRequests` helper has the same explicit list and also needs that single path when the feature is present. This permits the legitimate application identity request only; all external-request, source/hash, active-DOM, implicit/explicit PUT and bytes/reload assertions remain required. No integration or API/test-code change was made from this progress supplement.

This evidence-only amendment preserves task/plan completion, retry history and the tested implementation SHA `78e24e322392d91a371f05e5b2f46f0d31a68aa2`. No quality gate was repeated and no new native/live acceptance, service action or integration approval is inferred. Private reference identities and the exact two-list integration constraint are retained in `tmp/render-002/visual-reference-supplement.json`.
