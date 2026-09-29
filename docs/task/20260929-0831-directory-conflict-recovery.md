# 20260929-0831-directory-conflict-recovery Recover a listing when its first page or revision probe races a change

- **status**: completed
- **priority**: P2
- **owner**: frontend-maintainer-0929
- **createdAt**: 2026-09-29 08:31

## Description

`/api/diagrams/directory` and `/directory/revision` answer 409 `directory_changed` when the folder changes while it is being read, or while a local file operation runs. For a continuation the workspace shows "Listing is not current" with a Restart control, as designed. For a first page it discards the listing and waits for the same manual Restart, and for a revision probe it marks the listing stale and backs off, so an external change can leave the explorer without its files. The browser audit also counts these handled 409s as unexpected errors, which fails unrelated acceptance cases. Acceptance: a first-page or revision `directory_changed` restarts the listing from page one on its own; continuations keep the manual Restart; the audit admits only `directory_changed` from these two endpoints.

## ActiveForm

Recovering directory listings from change conflicts.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Tracked earlier as tk merdeck #60. Plan: [20260929-0831-directory-conflict-recovery](../plan/20260929-0831-directory-conflict-recovery.md).
- Approval: the owner approved the plan on 2026-09-29.
- Implementation (`web/src/features/workspace/use-directory.ts`): a first page that fails with `directory_changed` shows "Directory changed. Refreshing its files…" and restarts from page one after one polling interval; a revision probe that fails with `directory_changed` restarts at once, like an observed revision change, since probes are already paced by the interval (a refinement of the plan, which delayed both). Continuation conflicts keep the manual Restart. The browser audit (`web/src/test/e2e/support.ts`) admits a 409 from the two directory endpoints only when its body code is `directory_changed`, with its console message.
- RED: two new `use-directory.test.tsx` cases (first page, revision probe) failed on the original hook; the continuation guard case passes on both. GREEN: 16/16 in the file; web lint (existing warning only), typecheck and 590 tests pass.
- Gate: see the settled-change-detection task; both browser suites passed 99 cases each with the new audit.

- complete: Listings recover from first-page and revision conflicts; see Notes.
