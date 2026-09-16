# 20260916-0043-ai-editing-chat Add an AI editing chat

- **status**: implementing
- **createdAt**: 2026-09-16 00:43
- **approvedAt**: 2026-09-16 01:00
- **relatedTask**: 20260916-0040-ai-editing-chat

## Context

Merdeck currently has no agent process, streaming endpoint, conversation state or chat UI. The Bun service owns authentication and the bounded diagram API; the React workspace owns memory-only drafts. A selected document is polled by full-file SHA-256 revision, so a clean external edit loads and rerenders automatically while a dirty draft is retained and conflict-locked. Directory revisions independently detect namespace changes.

The installed host tools are Codex CLI 0.154.0 and Claude Code 2.1.269. Codex app-server exposes JSONL stdio threads, turns, incremental messages, file changes, cancellation and approval requests. Claude Code exposes multi-turn `stream-json` input/output, partial messages, session IDs, cancellation and host-routed permission prompts. Their event shapes and lifecycle differ and must stay behind provider adapters.

Running either tool from an HTTP service materially widens the trust boundary. A direct provider edit is an external OS-actor write: it does not use `DiagramService.mutate()`, expected-version replacement or Merdeck's filesystem admission checks. It can also send project content to the selected provider. The integration therefore cannot be enabled implicitly or under open access.

## Proposal

### 1. Add an opt-in agent gateway

- Keep AI disabled by default. Enable providers only through canonical absolute executable paths in validated runtime configuration; never discover an executable from request input or invoke a shell.
- Refuse AI enablement unless `MERDECK_TOKEN` is configured. Reuse the authenticated session, exact Origin and CSRF mutation boundary for every conversation, turn, approval and cancellation operation.
- Require the existing storage capability to be writable before a turn can edit. Report provider availability and safe diagnostic codes without returning executable paths, home paths, credentials or raw stderr.
- Spawn children with `cwd` fixed to the canonical `MERDECK_ROOT`, a bounded lifetime and output buffer, one active turn per conversation and a small global concurrency limit. Strip Merdeck credentials and unrelated secret environment variables. Reuse the providers' existing file-based login; do not accept provider API keys through the browser or Merdeck configuration.
- Own every child from an `AgentManager` injected into `createApp()`. Cancel and reap children on logout/session expiry, explicit stop and application shutdown.

### 2. Normalize Codex and Claude Code behind one adapter contract

- Codex adapter: use `codex app-server --listen stdio://`, initialize once, create ephemeral threads rooted at the project, use an explicit workspace-write sandbox with no model-command network access, route approvals to the user, and translate only the required stable subset of thread/turn/item events. Probe version and handshake compatibility and fail closed on an unsupported protocol.
- Claude adapter: use `claude -p --input-format stream-json --output-format stream-json --include-partial-messages --permission-prompts host`, restricted to the project working directory. Start with safe-mode customizations disabled and file/read tools only; command execution remains unavailable until a separately reviewed policy exists.
- Normalize both into bounded events such as `conversation.started`, `turn.started`, `assistant.delta`, `tool.started`, `file.changed`, `approval.requested`, `turn.completed`, `turn.failed` and `provider.unavailable`. Convert file paths to validated root-relative paths and discard provider payload fields that are not part of this contract.
- Keep conversation/event state in memory for the first release. Do not add a database or expose either provider's global history. A restart ends Merdeck chat sessions.

### 3. Expose a small same-origin API

- Add a capability endpoint plus authenticated endpoints to create a conversation, submit a turn, answer an approval and cancel a turn. Use strict schemas, body limits, safe fixed errors and the existing response envelope.
- Stream normalized downstream events with authenticated SSE. Commands remain ordinary CSRF-protected POST requests, avoiding a second bidirectional protocol at the browser boundary. Give events monotonically increasing IDs and retain only a bounded reconnect window.
- Never proxy raw terminal input/output. Approval responses refer to opaque server IDs; the browser cannot supply commands, paths, executable flags, environment variables or provider session IDs.

### 4. Add a responsive chat pane

- Add an existing-style resizable desktop pane and mobile sheet/tab with engine and model choices, transcript, composer, stop action, tool/file cards and explicit approve/deny controls. Preserve keyboard focus, accessible names, error/loading states and current semantic theme tokens.
- Discover bounded model choices through each configured CLI's initialized protocol rather than hard-coding a cloud catalogue. Codex uses `model/list`; Claude uses the `models` list returned by its initialize control response. Return only validated IDs, display labels, short descriptions and the default flag. Cache the result for the service lifetime, offer a provider-default fallback when discovery is unavailable, and accept only a model advertised for the chosen engine. Pass the chosen Codex model through structured app-server parameters and the chosen Claude model as one `--model=<id>` argv element; never interpolate it into a shell command.
- Disable Send while any source draft is dirty or saving. While an agent turn is active, disable application saves and entry mutations so Merdeck does not race its own external editor. Provider file-change events immediately invalidate the affected document and directory queries.
- Temporarily poll only the selected document revision at a short bounded interval during an active turn. This covers provider shell/tool writes that lack a structured file-change event. On turn completion, force one document and directory reconciliation before unlocking edits.
- Clean external changes rerender through the existing document/preview path. If another OS actor still changes a file, preserve the current dirty-draft conflict behavior; do not claim transactional isolation from external processes.

### 5. Verify the trust and rendering boundaries

- Backend tests use deterministic fake provider executables and cover argv construction, sanitized environment, authentication/CSRF, path normalization, malformed/oversized JSONL, approval ownership, capacity, timeout, cancellation, child reaping and shutdown.
- Frontend tests cover event reduction, reconnection, accessible approval UI, dirty-draft blocking, active-turn locks and precise query invalidation.
- Adapter, API and frontend tests cover model discovery redaction, strict engine/model pairing, locked selection within a conversation and exact structured provider parameters.
- Production browser acceptance proves an agent edit changes exact disk bytes and the selected Markdown/Mermaid preview rerenders without manual refresh; also cover a dirty-draft refusal, cancellation, provider failure, hostile event text/XSS, session expiry and unavailable providers.
- The standalone bundle remains provider-independent. With AI unconfigured, existing release checks and behavior stay byte-for-byte in scope; enabled-provider acceptance additionally runs on a host with the explicitly configured CLI.

## Risks

- The tools transmit selected project context to external model providers. Enabling the feature is an operator data-governance decision and must be documented prominently.
- Codex app-server is an evolving protocol. Exact handshake/event compatibility must be probed and the adapter must fail closed rather than forwarding unknown messages.
- Direct agent writes bypass Merdeck's optimistic write transaction. Blocking local drafts/mutations reduces application races but cannot remove the already documented external-actor comparison/rename window.
- Provider credentials and home configuration are sensitive. An overly broad inherited environment or raw log forwarding could leak them.
- Long turns and verbose streams can exhaust memory or leave child processes behind without strict quotas and shutdown tests.
- Claude and Codex permission models are not identical; the shared UI must not imply that one provider enforced a guarantee only the other provides.
- Model catalogues are account- and CLI-version-specific. Discovery can fail independently from the default provider path, so the UI retains a provider-default option and never accepts an unadvertised browser string.

## Scope

Expected cross-module work includes validated configuration, an agent domain and adapters, lifecycle injection, shared contracts/routes, React query/event state, the responsive chat UI, CSS, unit/integration/browser fixtures, deployment documentation and release verification. No database, remote model API integration, arbitrary browser terminal, persistent chat history, background autonomous runs or multi-user collaboration is included.

## Alternatives

1. **Recommended: direct local CLI adapters with strict sandboxing and browser approvals.** This uses the already authenticated tools, preserves their coding behavior and makes file changes visible through the existing external-edit contract. It carries the external-writer and provider protocol risks described above.
2. **Patch-only assistant.** Run providers read-only, return proposed edits, preview them as local drafts and write only through version-checked Merdeck APIs. This has the strongest conflict boundary but requires a new whole-document patch contract and does not behave like the installed coding agents. It is a good later safe mode.
3. **Call model APIs directly.** This gives the cleanest application protocol but requires new API-key handling, tool orchestration and billing configuration, duplicating capabilities already present on the host.
4. **Embed terminal sessions.** Rejected: exposing a PTY turns Merdeck into a remote shell, weakens the current HTTP security model and makes reliable structured refresh/approval behavior harder.

## Annotations

- Awaiting owner approval. Implementation must not begin until the owner explicitly approves this proposal and confirms that direct provider file edits, with the stated data-transfer and external-writer boundaries, are desired.
- 2026-09-16: The owner approved the direct-editing proposal and authorized implementation alongside the HTML document plan.
- 2026-09-16: The owner expanded the approved UI to require both engine and model selection. Local protocol investigation confirmed Codex `model/list` and Claude initialize-model metadata, and the owner authorized implementation and release after verification.
