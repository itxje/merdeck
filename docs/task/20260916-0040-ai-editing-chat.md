# 20260916-0040-ai-editing-chat Add an AI editing chat

- **status**: in_progress
- **priority**: P1
- **owner**: coordinator/20260916-0040
- **createdAt**: 2026-09-16 00:40

## Description

Investigate and propose a bounded in-product chat that can drive an installed coding agent to edit files beneath `MERDECK_ROOT`, stream progress to the browser, and let the existing document preview reflect external writes without weakening path, write-admission, authentication, or conflict guarantees. The first proposal must cover Codex and Claude Code adapters, session lifecycle, approvals, cancellation, concurrent editor conflicts, compiled deployment behavior, and browser acceptance.

## ActiveForm

Implementing the bounded AI editing chat, engine/model selection and live-rendering integration.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- The host currently exposes `codex` 0.154.0 and `claude` 2.1.269; no `code` executable is installed.
- Investigation: the selected document already polls its full-file SHA-256 revision and clean external changes reload automatically; dirty drafts are retained and conflict-locked. Provider file-change events can add an immediate invalidation boundary, while a temporary faster selected-file poll covers command-driven writes that produce no structured file event.
- Investigation: direct provider writes are external-actor writes and do not pass through `DiagramService.mutate()` or its expected-version publication boundary. The first implementation must block new turns while any browser draft is dirty, lock application saves while a turn is active, retain the existing conflict detector, and state the remaining OS-actor race honestly.
- Investigation: Codex app-server supplies threads, streamed items, file diffs, cancellation and browser-routable approval requests over JSONL stdio. Claude Code supplies multi-turn streaming JSON input/output and host-routed permission prompts. Both need a normalized server-side adapter rather than exposing provider events to the browser.
- Proposal: [20260916-0043-ai-editing-chat](../plan/20260916-0043-ai-editing-chat.md).
- The owner approved the direct-editing proposal on 2026-09-16; implementation is in progress.
- Scope update (2026-09-16): the owner requested engine and model selectors. Codex exposes its account catalogue through `model/list`; Claude exposes a bounded `models` array in the initialize control response. The approved implementation will cache only validated public model metadata, pair selection strictly with its engine and pass it without a shell.
- Implementation (2026-09-16): added validated opt-in provider configuration, direct no-shell child adapters, a principal-bound bounded manager, strict CSRF routes and authenticated SSE, model discovery and engine/model pairing, the responsive chat pane, inert transcripts and opaque approvals, active-turn mutation locks, structured invalidation and 500 ms selected-document polling. Codex requests one root-only workspace-write sandbox with tool networking disabled; Claude Code receives only file read/edit/search tools. Provider executables must resolve outside `MERDECK_ROOT`, and raw stderr, provider IDs, executable paths, credentials and unrelated environment secrets never cross the browser boundary.
- Verification (2026-09-16): the latest focused backend adapter/manager/route/process set passed 20 tests and 89 assertions after the final protocol-lifecycle corrections; strict root types and lint passed. Earlier complete source checks passed 280 backend and 548 frontend tests, coverage thresholds and the production build. The complete production browser suite passed 72 cases with two opt-in performance cases skipped, including exact selected `{ provider: 'codex', model: 'browser-model' }` transport, a hostile-text inertness check, explicit approval, exact direct-write bytes, live SVG rerender and Stop cleanup. Engine/model catalogue switching and exact Claude selection are also covered at component level. The clean aggregate and hosted native gates remain required before completion.
- Review (2026-09-16): shared/backend/frontend review corrected capacity accounting, failed-provider retry state, terminal SSE draining, slow-client/listener bounds, brief terminal replay before capacity release, child teardown on Stop/timeout/output/provider failure, strict model metadata, malformed/output bounds, missing/idle Claude file-path approvals and stale Codex turn attribution. The final correction retains completed/cancelled turn IDs so late provider events cannot enter the next turn's startup window. No remaining CRITICAL/HIGH finding is known; task stays in progress until the exact clean candidate passes hosted Linux x64/ext4 acceptance.
