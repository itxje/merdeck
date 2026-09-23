# 20260923-0114-agent-conversation-continuity Keep one conversation across messages and add a New control

- **status**: pending
- **priority**: P1
- **owner**: (unassigned)
- **createdAt**: 2026-09-23 01:14

## Description

The panel loses the exchange behind it. A message arrives with no record of the previous one, so work has to
be restated. The panel does reuse its conversation between messages, but a turn that ends in failure
terminates it on both sides, and a failure is common enough that the exchange rarely survives. There is also
no way to start a fresh conversation deliberately.

Keep the conversation across a failed turn, drop it only when the provider is actually gone or a turn had to
be cancelled mid-stream, extend its lifetime with use rather than only from creation, and add a New control
that ends it on purpose.

Acceptance: a failed turn leaves the conversation usable and the next message continues with the exchange
behind it; the New control ends the conversation and clears the transcript; a conversation in active use is
not removed while it is being used; `bun run check` and the browser suite pass.

## ActiveForm

Keeping one conversation across messages.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Proposal: [20260923-0114-agent-conversation-continuity](../plan/20260923-0114-agent-conversation-continuity.md).
- A conversation cannot outlive the service, because it is a live provider process launched with session
  persistence off. A restart still ends it, and that is out of scope here.
