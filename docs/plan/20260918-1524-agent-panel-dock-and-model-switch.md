# 20260918-1524-agent-panel-dock-and-model-switch Keep the agent panel usable after a turn and enlarge document type

- **status**: completed
- **author**: agent-panel/20260918-1524
- **created**: 2026-09-18 15:24

## Purpose

Let the engine and model be chosen again once a turn settles, stop the header from sticking on
"Reconnecting…" after the service drops a conversation, open the AI file editor on the right by default, and
give HTML document previews a larger base type.

## Background & Analysis

1. `web/src/features/agents/use-agent-chat.ts` returns `providerLocked: conversation !== null`, and
   `agent-chat.tsx` folds that into the `disabled` expression of both selects. `conversation` survives
   `turn.completed` — only `turn.failed`, `provider.unavailable`, an unrecoverable request error and `cancel`
   call `abandonConversation` — so after one successful turn neither select can be operated again for the
   rest of the session. The lock is redundant: `send` already compares `target.provider`/`target.model`
   against the selection and creates a replacement conversation when either differs, and the real constraint
   (no edits mid-turn) is already covered by `active || pending`.
2. The service expires an idle conversation: `AgentManager.remove` notifies listeners with `null`, the SSE
   route sets `ended` and leaves the stream, and the browser reconnects by design. That reconnect addresses a
   conversation the manager has dropped, so it fails, and the client's `error` listener only sets
   `connection = 'reconnecting'`. Nothing ever clears it, so the header stays on "Reconnecting…" while the
   stale conversation keeps both selects disabled. `EventSource` marks an unrecoverable stream `CLOSED`, which
   distinguishes it from an ordinary retry.
3. The panel is already the last flex child of `.workspace-body`, but `agentOpen` starts `false`, so it has to
   be opened from the header on every load.
4. `.html-document-view` sets `font-size: 15px`, with `13px` for the contents sidebar and `pre`.

## Changes

1. `web/src/features/agents/use-agent-chat.ts`: drop `providerLocked`; abandon the conversation when the
   event stream reports an unrecoverable `CLOSED` state and keep `reconnecting` for ordinary retries.
2. `web/src/features/agents/agent-chat.tsx`: disable both selects on `active || pending || unavailable` only.
3. `web/src/features/agents/agent-chat.test.tsx`: cover re-selecting a model after `turn.completed`, the
   replacement conversation it creates, and the closed-stream recovery.
4. `web/src/features/workspace/workspace.tsx`: default `agentOpen` to open and persist the operator's choice
   in `merdeck-agent-open`, matching the existing `merdeck-agent-width` treatment.
5. `web/src/index.css`: raise the document base type to `17px`, the contents sidebar and `pre` to `14px`.
6. `web/src/features/workspace/workspace.test.tsx`: cover the open-by-default value, the stored dismissal and
   the preference surviving a remount.
7. `web/src/test/e2e/support.ts`: seed the closed preference from the shared fixture with `addInitScript`, so
   it applies before the first navigation of every spec. Seeding after login was not enough: the panel had
   already asked the service for agent capabilities, which broke four renderer specs that assert no
   unexpected request paths, and the reload needed to apply it replaced the deliberately older application
   shell that `update.spec.ts` installs.
8. `web/src/test/e2e/header.spec.ts`: assert the toggle's pressed state around opening and closing the panel.
   The shipped default cannot be observed here, because the seed applies to every navigation in the suite.

## Verification

- `bun run check`: lint, typecheck, 286 service tests, 569 web tests with coverage, and the production build.
- `bun run test:e2e`: 71 passed, including the four renderer specs and `update.spec.ts` that the first seeding
  attempt broke.
- `git diff --check`.
- Sandbox note: both gates need `MERDECK_TEST_FIXTURE_PARENT=/tmp` and
  `MERDECK_TEST_UNSUPPORTED_PARENT=/dev/shm MERDECK_TEST_UNSUPPORTED_FS=0x1021994`. The repository default
  fixture parent (`tmp/`) is a bind mount reporting `0x65735546`, which fails the storage identity checks for
  reasons unrelated to this change. `check:ci` additionally packages a release and was not run here.

## Notes

- Persisting the open state is required for two reasons: an operator who closes the panel should not have it
  reappear on every reload, and the e2e layout specs need a deterministic width for the editor pane. The
  default with no stored value is open, which is the requested behaviour.
- A docked-open panel also means every load asks for agent capabilities. That is intended for operators, and
  the service answers `{ enabled: false, providers: [] }` when nothing is configured, but any future spec that
  asserts an exact set of request paths has to account for it.
