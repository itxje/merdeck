# 20260923-0114-agent-conversation-continuity Keep one conversation across messages and add a New control

- **status**: draft
- **createdAt**: 2026-09-23 01:14
- **relatedTask**: 20260923-0114-agent-conversation-continuity

## Context

The panel already reuses its conversation between messages. The client keeps the handle in per-tab storage
and creates one only when it holds none, or when the engine or model changes. What it does not survive:

- **Any failed turn.** The service terminates the conversation when a turn reports failure, which closes the
  provider session, and the client mirrors that by dropping its handle. A turn that ends in an error result
  is not a broken session: the provider is idle, healthy, and still holds the whole exchange.
- **A cancelled turn.** A turn that runs past its limit or exceeds the per-turn output budget is cancelled
  and terminated. Here the provider is left mid-stream, so its state really is unknown.
- **The provider process ending**, which is genuinely terminal.
- **One hour after creation.** The removal timer is set once, from the session lifetime, and never extended,
  so an hour of work ends mid-conversation regardless of activity.
- **A service restart.** The conversation is a live process; a deployment ends it.
- **A second tab**, because the handle is per tab by design.

There is no control that starts a fresh conversation. Today a failure is the only way to get one, which is
backwards: the case that should be deliberate is the only one that is automatic.

## Proposal

1. A failed turn keeps the conversation. Terminate only when the provider process is gone, or when a turn had
   to be cancelled and the provider was left mid-stream. A turn that merely ends in an error result stays
   usable, and the next message continues with the exchange behind it.
2. The client stops discarding its handle on a failed turn, and drops it only when the provider is reported
   unavailable or the service no longer holds the conversation.
3. Add a **New** control to the panel header: it ends the current conversation and clears the transcript, so
   starting fresh is a deliberate act rather than a side effect of something going wrong.
4. Extend the removal timer on each turn instead of only at creation, so an actively used conversation is not
   removed mid-work. The extension never reaches past the owner's own expiry, so it cannot outlive the
   sign-in it was created under.

## Risks

- Keeping a session after a failure holds a provider process longer than today. The existing limits still
  bound it: four conversations per owner, eight in total, and the removal timer.
- Item 4 changes when a conversation is collected. Capping each extension at the owner's expiry keeps
  authenticated use unchanged; open access recomputes its principal per request today, so its conversations
  become activity-bounded rather than creation-bounded.
- A conversation that survives failures will accumulate provider context, so the turn output budget and the
  replay window matter more than before. Neither changes here.

## Scope

`src/modules/agents/manager.ts` for the lifecycle, `web/src/features/agents/use-agent-chat.ts` for the
handle, `agent-chat.tsx` for the control, and both suites. No contract, storage or preview change.

## Alternatives

- **Resume a provider session after a restart.** Rejected: the provider is launched with session persistence
  off on purpose, and turning it on writes exchanges to disk outside this service's storage rules.
- **Share one conversation across tabs.** Rejected: two tabs would race for the same turn, and the service
  answers a second concurrent turn with a conflict.
- **Only add the New control.** It would leave the actual complaint unfixed: a failure still silently
  discards the exchange.

## Annotations

- Raised from a report that the panel had no record of the previous message.
