# 20260919-0136-agent-selection-persistence-and-html-width Keep the chosen engine and model across a reload, widen the HTML reading measure

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-19 01:36

## Description

The owner reported that after a reload, the AI file editor did not keep the last used engine and model. Root
cause: `useAgentChat` seeded the `provider`/`model` state only from `AgentConversationHandle`, which
`persistence.ts` only stores once a conversation has actually started; choosing an engine and model without
sending a turn was lost on refresh, back to the Codex/`default` defaults.

`StoredAgentSession` now carries an independent `selection: { provider, model } | null`, written whenever either
value changes regardless of whether a conversation exists, and validated the same way as the conversation
handle (advertised provider, bounded model string). Restore order is `selection` first, then the started
conversation's own provider/model, then the Codex/default fallback.

The owner also asked to widen the sanitized HTML preview's content column; `--html-doc-measure` in
`.html-document-view` moved from `52rem` to `64rem`.

Acceptance: the selection survives a reload before any conversation starts; existing conversation-restore
behavior, malformed/foreign-session refusal and the transcript are unaffected.

## ActiveForm

Persisting the agent engine/model selection and widening the HTML reading measure.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Fast path: an internal state-persistence bug fix and a CSS width tweak, no contract or interface change.
- `web/src/features/agents/persistence.ts` and `persistence.test.ts`, `web/src/features/agents/use-agent-chat.ts`,
  `web/src/index.css`.
- Local verification (2026-09-19, Bun 1.4.2): web lint, `tsc --noEmit`, full web `test:coverage` (352 tests) and
  both production builds passed. Root `bun run check` could not run to completion in this checkout: the
  `tests/integration/acceptance/procfs.test.ts` isolated-runtime case and 164 backend write-path tests fail
  identically on a clean `main` checkout before this change, an existing environment limitation unrelated to
  this fix (see STORAGE-00x history). Native verification on `main` after pushing this commit passed as
  [run 35413195618](https://github.com/itxje/merdeck/actions/runs/35413195618).
- Committed directly to `main` at `4eb7898` (small, low-risk change; no campaign).

- complete: Pushed to `main` and native verification passed.
