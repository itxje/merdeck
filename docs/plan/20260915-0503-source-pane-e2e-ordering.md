# 20260915-0503-source-pane-e2e-ordering Stabilize source-pane browser ordering

- **status**: completed
- **createdAt**: 2026-09-15 05:03
- **approvedAt**: 2026-09-15 05:03
- **relatedTask**: 20260914-1559-source-pane-e2e-ordering

## Context

`choose()` selects a file, waits for the mounted Mermaid textarea, activates the desktop `Show source` control when it is visible, and then requires the textarea to be visible. The workspace derives the source rail and CSS `data-collapsed` state from `react-resizable-panels` resize measurements while the panel group restores `merdeck-panes` from local storage. Desktop collapse/expansion, narrow Source/Preview tabs, and persisted layouts share this component.

The reported aggregate browser sequence can click `Show source` and still observe the mounted textarea as hidden. The existing test boundary confirms only that the click was dispatched; it does not confirm that the panel transition settled before using the editor. A repeated focused aggregate run is in progress on disposable overlayfs/tmpsfs fixtures. The repair must make the activation transition observable without sleeps or relaxed source assertions.

## Proposal

Add a deterministic browser regression covering a collapsed persisted source pane and the shared `choose()` activation path. Make the `Show source` action synchronously express the intended expanded UI state and keep that state reconciled with panel measurements, so the DOM does not retain `data-collapsed` after expansion. Update `choose()` to wait for the application-visible expansion boundary before interacting with the textarea.

## Risks

The panel library restores layouts asynchronously and uses the same source panel for desktop and narrow layouts. The change must not alter the saved panel sizes, collapse threshold, keyboard focus, tab semantics, or narrow-screen source visibility. The test must exercise the actual button and panel state rather than browser storage or component state directly.

## Scope

- `web/src/features/workspace/workspace.tsx`
- Shared browser support and focused pane regression under `web/src/test/e2e/`
- This task record, plan, and changelog

No dependencies, server contracts, storage policy, release state, or remote state will change.

## Alternatives

- Wait longer after clicking. Rejected: it hides an ordering race and violates the requested synchronization boundary.
- Remove the visible-source assertion or bypass the UI with stored state. Rejected: both weaken the acceptance signal.
- Change only the test helper. Rejected unless the application state is demonstrably already reliable; current state derivation can lag the imperative panel call.

## Annotations

- The user explicitly authorized this repair on 2026-09-15; this Full-tier escalation is required because the expected implementation spans the workspace, shared E2E support, and a regression specification.
- The original-order set (`acceptance.spec.ts`, `directory.spec.ts`, and `renderer-resource-notes.spec.ts`) passed 63/63 across three repetitions without reproducing the intermittent failure. The deterministic regression selects a second file through shared `choose()` while the source pane is collapsed.
- The focused post-repair browser set passed 46/46 across two repetitions. The full browser aggregate passed every source-pane-related case and 67/68 cases overall; its sole unrelated failure was `acceptance.spec.ts` dirty external rename observing an unexpected 503 from `/api/diagrams/directory`, which is tracked by 20260914-1150-directory-poll-save-race.
