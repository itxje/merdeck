# 20260918-1627-agent-current-file-context Attach the previewed file to agent turns

- **status**: completed
- **priority**: P1
- **owner**: l1/session-20260918-1627
- **createdAt**: 2026-09-18 16:27

## Description

The AI file editor works across the whole project root but receives no information about what the operator is
looking at: `agentTurnRequestSchema` accepts a bare prompt, and the panel never sees the open document path.
Every instruction therefore has to name its target file, and each file tool call stops for an approval the
operator has to click through.

Deliver:
1. Every turn carries the currently previewed file path, composed into the prompt by the service so the
   provider starts from the open document.
2. The panel shows which file the next message will be attached to.
3. File access and file changes inside the project root proceed without an approval prompt. Command approvals
   keep asking, and the tool allow-list plus the project-root path boundary stay in force.

Follow-up items the owner reported against the deployed panel, delivered in the same change:
4. A reload restores that tab's transcript and resumes the same conversation instead of opening an empty one.
5. Each file tool names its target in the transcript.
6. The engine and model selectors share one row and the provider notice above them is removed.

Acceptance: `bun run check:ci` passes, including the agent e2e coverage.

## ActiveForm

Attaching the previewed file to agent turns.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Proposal: [20260918-1627-agent-current-file-context](../plan/20260918-1627-agent-current-file-context.md).
- Claude Code keeps its host permission prompts and its `Read,Edit,Write,Glob,Grep` allow-list; the adapter
  answers them instead of the operator, so an unknown tool, a missing required path or a path outside the
  project root is still denied. Codex keeps forwarding command approvals, so the approval UI stays.
- Local `bun run check` passed with Bun 1.4.2: 288 backend tests, 559 web tests, lint (one pre-existing
  `dangerouslySetInnerHTML` warning in `document-view.tsx`), strict type checks, coverage and both production
  builds. Fixture parents were `/tmp/merdeck-fixture` (overlay `0x794c7630`) and `/dev/shm/merdeck-unsupported`
  (tmpfs `0x1021994`).
- The browser suite passed 73 of 73 with 2 skipped by design, including both fake-provider agent cases, which
  now assert the attached file, the composed turn body, the absence of an approval request and the transcript
  surviving a reload. The shared browser fixture forces the panel closed on every load, so the reload check
  reopens it before reading the transcript.

- complete: Delivered on main; bun run check and the 73-case browser suite passed.
