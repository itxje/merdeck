# 20260929-0725-directory-abort-isolation Keep one aborted directory request from failing the others

- **status**: completed
- **priority**: P1
- **owner**: backend-maintainer-0929
- **createdAt**: 2026-09-29 07:25

## Description

Browser acceptance intermittently receives HTTP 503 from `/api/diagrams/directory`, most recently in tag run 36485037665 (v0.19.12, `acceptance.spec.ts:80`, external atomic replacement with a dirty selection), and in earlier release and local runs, usually in cases that change the listed folder externally. Find the root cause in the directory service and fix it without a retry. Acceptance: a request aborted by its client, or refused by its own deadline, fails alone; other traversals and in-flight pages are unaffected; a genuinely unavailable project root still invalidates every traversal.

## ActiveForm

Isolating aborted directory requests.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Tracked earlier as tk merdeck #50.
- Investigation: `DirectoryPager.check()` refuses an operation with `unavailable` when its request signal is aborted, its 5 s deadline passes or the service closes. `root()` treated any `unavailable` from `repository.assertAvailable()` as a root failure and invalidated every traversal with that reason, so one client's aborted request made other in-flight pages fail their next `check()` (`state.reason`) with HTTP 503 and closed idle cursors. The web directory hook cancels its in-flight page and revision queries whenever the listed folder changes and restarts the listing, which is why the 503 followed external renames, deletions and creations. The failed attempt of run 36485037665 took 1.5 s, well inside the deadline.
- Reproduction (`tmp/tk50/http-stress.test.ts`, real `Bun.serve` over `createApp`, 8 s): with one client aborting root listings and one never aborting while the root is atomically replaced, the never-aborting client received 276 HTTP 503 responses; the service layer alone, without aborts, produced 9,500 results and only 409s.
- Proposal: let `root()` re-run the operation's own `check()` before broadcasting, so an abort, deadline or closed service refuses only that operation and only a root failure the operation did not cause ends every traversal. Regression test first in `directory.test.ts`.
- Approval: the owner replied to implement on 2026-09-29.
- Implementation: one `check()` call in `root()`'s failure path (`src/modules/diagrams/directory.ts`). The new `directory.test.ts` case (aborted page and revision requests leave another cursor usable; a replaced and then restored root still ends that cursor) failed first (`cursor_stale` after the aborts) and passes 5/5 after the change. The HTTP reproducer then shows no 503 for the never-aborting client (1,568 pages and 25,825 revisions answered with 200 or 409).
- Verification (2026-09-29, Bun 1.4.2, local ext4 fixture parent with `/dev/shm` refusal parent): root `lint` and `typecheck` clean; `src/modules/diagrams/` suite shows the same pre-existing, intermittent churn-test failures on this container's ext4 mount with and without the change (tracked as tk merdeck #61). A separate follow-up covers directory 409s in the browser audit (tk merdeck #60).
- Gate (2026-09-29, this container, local ext4 fixture parent and `/dev/shm` refusal parent): frozen installs and `lint:workflows` passed; `check:ci` stops at `check:files` on the five pre-existing churn-test failures that also occur at HEAD and with an overlayfs fixture here (tk merdeck #61), so the aggregate gate is not green locally and hosted Linux x64/ext4 CI remains the authority. The full browser acceptance run (`bun run test:e2e`, built source service) passed 109 cases with 7 configured skips and no failure. `git diff --check` passed. Nothing was committed.

- complete: Aborted requests fail alone; regression test and HTTP reproducer pass; see Notes for gate status.
