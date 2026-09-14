# 20260914-1150-directory-poll-save-race Keep directory polls out of a save's change window

- **status**: pending
- **priority**: P2
- **owner**: (unassigned)
- **createdAt**: 2026-09-14 11:50

## Description

The first attempt of the v0.11.0 release run failed its native browser acceptance in `workspace.spec.ts` (real files, independent Markdown drafts, save snapshots, conflicts, responsive preview and safe rendering). The case's own steps passed, and the browser audit recorded `Unexpected HTTP 409 /api/diagrams/directory/revision` with the matching console error. A rerun of the same job on the same commit passed, and the same commit had passed on `main`. Acceptance: a save or entry change started by the page never lets a directory revision probe for the affected folder reach the service inside the change window, with a regression case, and without hiding real directory conflicts from the audit.

## ActiveForm

Keeping directory polls out of a save's change window.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-14): `DiagramService.mutate` marks the parent folder of a saved file as changing, and `DirectoryPager.check` refuses any directory operation on that folder with `directory_changed` until the mutation finishes. Before saving a file in the browsed folder, `useWorkspace` awaits `listing.suspend()`, which increments a pause counter, sets the `paused` state and cancels in-flight page and revision queries. Page requests check the synchronous pause counter, but the revision query is disabled only through the `paused` state, so a poll interval that fires after the cancellation and before React commits that state can send a revision probe that lands inside the save's window. This is the likely path; it has not been reproduced deterministically. It predates the v0.11.0 change, which does not touch directory polling or saves.
