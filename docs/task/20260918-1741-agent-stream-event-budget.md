# 20260918-1741-agent-stream-event-budget Count streamed text once against the turn budget

- **status**: completed
- **priority**: P1
- **owner**: l1/session-20260918-1627
- **createdAt**: 2026-09-18 17:41

## Description

The owner hit "The provider output limit was exceeded." on ordinary turns. `AgentManager.receive` incremented
`turnEventCount` for every adapter event, and Claude Code runs with `--include-partial-messages`, so each token
fragment arrived as its own `assistant.delta`. A few paragraphs of answer passed the 256-event budget while the
1 MiB byte bound stayed almost untouched, and the manager stopped and terminated the conversation.

Count a run of consecutive `assistant.delta` events once, matching the browser reducer that merges them into a
single assistant message. Every other event type keeps costing one, and the byte bound is unchanged, so it
becomes the real limit on assistant output.

Acceptance: `bun run check` passes, with coverage for a long streamed run that completes and for a streamed run
that still trips the byte bound.

## ActiveForm

Counting streamed text once against the turn budget.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Owner chose this over simply raising `maximumEvents`, which would only move the threshold.
- `turnLastEvent` needs an explicit `| undefined` because the root `tsconfig` sets
  `exactOptionalPropertyTypes`, and the turn reset assigns `undefined`.
- Local `bun run check` passed with Bun 1.4.2: 289 backend tests, 564 web tests, lint (one pre-existing
  `dangerouslySetInnerHTML` warning), strict type checks, coverage and both production builds.

- complete: Streamed runs now cost one event; bun run check passed.
