# 20260920-1837-agent-sheet-and-approvals AI file editor: a readable phone sheet, and no approval step

- **status**: completed
- **priority**: P1
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-20 18:37

## Description

On a phone the AI file editor showed a sliver of conversation between its own chrome, with a command
approval clipped inside it. Two changes: the sheet gives the conversation room, and the approval step is
removed, so a turn never stops to ask.

## ActiveForm

Reshaping the phone sheet and removing the approval step.

## Dependencies

- **blocked by**: 20260920-0100-phone-layout
- **blocks**: (none)

## Notes

### The sliver (2026-09-20)

- Measured against a built service: at 390x844 the sheet is 464px, of which the title row (65px), the engine
  row (65px) and the composer (183px) took 313px, leaving 150px of conversation. A phone browser's own
  toolbars leave a shorter visual viewport: at 390x640 the same chrome left 38px, about one clipped line,
  which is what the owner saw with an approval card in it.
- The chrome, not the share, was the problem: it is fixed, so it takes a larger part of every smaller sheet.
  Below the phone breakpoint the title and its status line now share one row, the engine row keeps its 44px
  targets on tighter padding, and the composer opens one line tall and grows with what is typed instead of
  reserving three empty lines. Chrome falls to 255px.
- A share alone still cannot hold a conversation on a short viewport, so the panel opens at whichever is
  taller: the design's 55%, or the height that leaves a readable conversation (420px). At 844px the first
  wins and nothing changes; at 640px the second gives 420px. The drag handle and its stated range are
  untouched, and the height remains session-only, never stored.
- After: 208px of conversation at 390x844 and 165px at 390x640.
- The phone bar showed the project-files control as a lone icon beside an empty strip when no diagram was
  open. In the bar it now carries the word `Files`; in the header, among other icon controls, it does not.

### Removing approvals (2026-09-20)

- Only Codex ever raised one, and only for a command; file changes inside the project were already accepted
  by the adapter. Turns now start with an approval policy of `never`, so the provider asks nothing. A
  provider that asks anyway is answered without anyone watching: an in-project file change proceeds, and a
  command asking to step outside the turn's sandbox is refused rather than shown.
- What this removes is a confirmation that used to stand between the assistant and a command outside the
  sandbox; such a command is now refused instead of offered. Nothing widens: the writable root, the disabled
  network, the excluded temporary directories and Claude Code's tool allow-list are unchanged, and they were
  already the enforced boundary.
- The route `POST /agents/conversations/:id/approvals/:approvalId`, the `approval.requested` event, the
  request schema, the adapter `approve` method and the panel's Deny/Approve card are all gone. A transcript
  a tab stored before this change holds an entry of an unknown kind, so that tab starts with an empty
  transcript rather than a partly restored one.

### Checks

- Browser expectations: a new case measures the four regions of the panel at 390x844 and 390x640 against a
  control — the phone header's own 58px height and the regions tiling the panel's content box — and requires
  at least 140px of conversation and more than a third of the panel. The agent acceptance keeps its 55%
  assertion at 390x844 and its check that no approval region appears.
- Component and service expectations updated where they asserted approvals: the Codex adapter now proves the
  policy it sends and the two answers it gives, the manager and HTTP boundary no longer carry an approval
  path, and the panel test asserts the absence of the card.
- `bun run typecheck`, `bun test src/modules/agents` (25 passed), the web suite for the panel (20 passed) and
  the full browser suite against a built service.

- complete: the conversation has room on a phone, and no turn stops for an approval.
