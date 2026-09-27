# 20260918-1524-agent-panel-dock-and-model-switch Keep the agent panel usable after a turn and enlarge document type

- **status**: completed
- **priority**: P1
- **owner**: agent-panel/20260918-1524
- **createdAt**: 2026-09-18 15:24

## Description

Three reports against the AI file editor and the HTML document preview:

1. The engine and model selects lock permanently once a conversation exists, so no other model can be
   chosen after the first turn, and the header stays on "Reconnecting…".
2. The panel should stay docked on the right by default (exact intent to confirm with the owner).
3. HTML document previews read too small; enlarge the document type scale.

Owner decision on point 2: dock the panel open by default.

Acceptance: after a completed or expired turn the engine and model selects are operable again and the
header reports a settled state; the panel keeps its intended right-hand placement; document previews use a
larger base type without regressing the measure, contents sidebar, or narrow-viewport stacking.

## ActiveForm

Restoring engine/model switching after a turn, confirming the panel dock, and enlarging document type.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation: `use-agent-chat.ts` exposes `providerLocked: conversation !== null`, and `conversation`
  survives `turn.completed`, so both selects in `agent-chat.tsx` stay disabled for the rest of the session
  even though `send()` already rebuilds the conversation when the provider or model changes.
- The manager expires an idle conversation (`remove()` notifies listeners with `null`), the SSE route ends
  the stream, and the browser `EventSource` reconnects into a removed conversation. The client only sets
  `connection = 'reconnecting'` on `error` and never abandons the conversation, so the header sticks and the
  lock never clears.
- Seeding the e2e preference after login was not enough. The panel had already requested agent capabilities,
  which four renderer specs count as an unexpected request path, and the reload that applied the preference
  replaced the older application shell `update.spec.ts` installs. Seeding with `addInitScript` from the shared
  fixture, before the first navigation, settles both.
