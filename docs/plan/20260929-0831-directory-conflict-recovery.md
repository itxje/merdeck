# 20260929-0831-directory-conflict-recovery Recover a listing when its first page or revision probe races a change

- **status**: completed
- **createdAt**: 2026-09-29 08:32
- **approvedAt**: 2026-09-29 08:35
- **relatedTask**: 20260929-0831-directory-conflict-recovery

## Context

- The service answers 409 `directory_changed` from `/api/diagrams/directory` and `/directory/revision` when a folder's metadata changes while it is read, or when a local file operation invalidates an in-flight listing (`DirectoryPager.mutationStarted`). This is correct: no consistent answer exists for that moment.
- `useDirectory` (`web/src/features/workspace/use-directory.ts`): a failing page stops its run and, for `directory_changed`, discards the pages. For a continuation the explorer then shows "Listing is not current" and the Restart control; `directory.spec.ts` asserts that contract. A failing first page follows the same path, but with no pages the revision probe is disabled, so nothing restarts the listing until the user presses Restart. A failing revision probe marks the listing stale and retries after up to 4x the poll interval.
- Observed on 2026-09-29: an external write into the listed folder produced a first-page 409 and the explorer no longer offered the new file, so `choose()` timed out; the audit reported "Unexpected HTTP 409 /api/diagrams/directory". The 2026-09-27 overlay gate also reported a revision 409.
- The browser audit (`web/src/test/e2e/support.ts`) counts any 4xx/5xx response and the matching console message as unexpected unless a spec admits its status and path.

## Proposal

- `useDirectory`: when a first page (no cursor) or a revision probe fails with `directory_changed`, treat it like an observed revision change: stop the run and restart from page one with the existing notice ("Directory changed. Listing restarted from page one."). To avoid a tight loop against a folder that keeps changing, the restart waits one poll interval. Continuation conflicts keep the manual Restart.
- Browser audit: admit a 409 from `/api/diagrams/directory` or `/api/diagrams/directory/revision` only when its body code is `directory_changed` (and its matching console message); `cursor_stale`, `rate_limited` and every other error stay unexpected. `directory.spec.ts` keeps its explicit count of the one induced continuation conflict.

RED: `use-directory.test.tsx` cases for a first-page and a revision-probe `directory_changed` that expect a new first-page request after the poll interval and no discarded draft, and a continuation case that still waits for Restart. Then web lint/typecheck/coverage and the full browser acceptance run.

## Risks

- A folder that changes more often than the poll interval keeps restarting its first page; the listing shows the restart notice and remains usable once changes pause. The interval bounds request volume to the existing polling rate.
- Admitting `directory_changed` in the audit could hide a regression that produces spurious conflicts; the body-code check and the explicit count in `directory.spec.ts` limit that.

## Scope

`web/src/features/workspace/use-directory.ts`, `web/src/features/workspace/use-directory.test.tsx`, `web/src/test/e2e/support.ts`, task, plan and changelog records.

## Alternatives

- Admit the 409s per spec instead of in the audit: every spec that writes into an open workspace would need it, and unrelated specs would keep failing at random.
- Retry the page on the server: hides the race from the client but contradicts the no-retry rule and can livelock under churn.

## Annotations

(none)
