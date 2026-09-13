# 20260913-1802-directory-frontend Implement directory navigation and frontend acceptance

- **status**: in_progress
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
