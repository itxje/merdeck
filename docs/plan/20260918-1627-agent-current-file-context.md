# 20260918-1627-agent-current-file-context Attach the previewed file to agent turns

- **status**: completed
- **createdAt**: 2026-09-18 16:27
- **approvedAt**: 2026-09-18 16:27 UTC
- **relatedTask**: 20260918-1627-agent-current-file-context

## Context

- `agentTurnRequestSchema` (`src/shared/contracts.ts`) is a strict object holding only `prompt`, so the panel
  cannot pass any document context; `routes.ts` forwards `request.prompt` to `AgentManager.startTurn`.
- Sessions run with `cwd` set to the configured project root (`manager.ts`), and `providerPath` only rejects
  paths that escape that root. The provider therefore already reaches every project file; it simply has no
  idea which one the operator is previewing.
- `workspace.tsx` knows the open `path`, but `AgentChat` receives only `session`, `open`, `blockedReason` and
  the change callbacks.
- Approvals: `claude.ts` forwards every `can_use_tool` request for its allow-listed tools
  (`Read,Edit,Write,Glob,Grep`) to the operator; `codex.ts` forwards both `item/fileChange/requestApproval`
  and `item/commandExecution/requestApproval`; `agy.ts` already runs with `--dangerously-skip-permissions`.

## Proposal

1. Contract: add an optional `context: { path: RelativePath }` to `agentTurnRequestSchema`, reusing
   `relativePathSchema` so a client cannot inject arbitrary text into the prompt.
2. Service: `AgentManager.startTurn` takes the optional context and prefixes the prompt with a single
   `Current file: <path>` line before handing it to the provider session.
3. Claude adapter: answer allow-listed tool permission requests with `allow` instead of emitting
   `approval.requested`. Unknown tools, missing paths and paths outside the project root keep being denied.
4. Codex adapter: auto-accept `item/fileChange/requestApproval`; `item/commandExecution/requestApproval` keeps
   asking the operator.
5. Web: thread the open document path from `workspace.tsx` through `AgentChat` into `useAgentChat.send`, send
   it as `context`, and show the attached file above the composer.

## Risks

- Every allow-listed file read and write inside the project root now happens without confirmation. The
  remaining boundaries are the tool allow-list, the `providerPath` root check and Codex's `workspaceWrite`
  sandbox. This is the owner's explicit request; command execution still requires approval.
- The prompt prefix is service-composed, so a provider cannot be steered by a client-supplied sentence; the
  path is schema-validated before it is interpolated.
- The approval UI stays in place for Codex command approvals.

## Scope

`src/shared/contracts.ts`, `src/modules/agents/{routes,manager,claude,codex}.ts`,
`web/src/features/agents/{api,use-agent-chat,agent-chat}.tsx|ts`, `web/src/features/workspace/workspace.tsx`,
plus the matching unit, component and e2e tests.

## Alternatives

- Compose the context in the browser and keep the contract unchanged: smaller diff, but the service could not
  validate the path and the prompt shown to the operator would differ from the one sent.
- Skip approvals by switching Claude to `--permission-mode acceptEdits`: this would drop the service-side tool
  allow-list and path check as well, which is a larger loosening than requested.

## Annotations

- Owner approved the attachment plus skipping approvals for edits on 2026-09-18.
- Delivered as proposed. Claude Code's approvals were dropped for file access as well as file changes, because
  a per-read confirmation would have left the panel unusable; the tool allow-list and root check still gate
  every call.
