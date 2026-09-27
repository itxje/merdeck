# 20260916-1346-support-agy-agent-provider Add Antigravity (agy) AI agent provider

- **status**: completed
- **createdAt**: 2026-09-16 13:46
- **approvedAt**: 2026-09-16 13:42 UTC
- **completedAt**: 2026-09-16 14:00
- **relatedTask**: 20260916-1346-support-agy-agent-provider

## Context

The user requested adding support for the `agy` (Antigravity) engine in AI chat. The AI chat feature currently supports `codex` and `claude`. Antigravity provides the `agy` CLI binary, which supports listing models (`agy models`) and interactive print streaming (`--input-format stream-json --output-format stream-json`).

## Proposal

1. Contracts and Config:
   - Add `'agy'` to `agentProviderSchema` in `src/shared/contracts.ts` and `web/src/features/agents/api.ts`.
   - Add `MERDECK_AGY_PATH` environment variable in `src/config.ts` using `canonicalExecutable`.
   - Register `agyAdapter` in `src/modules/agents/manager.ts`.
2. Adapter Implementation (`src/modules/agents/agy.ts`):
   - `models(context)`: Spawns `${executable} models` and parses `id\tlabel` output into `AgentModel[]`.
   - `open(context)`: Spawns `agy -p= --input-format stream-json --output-format stream-json --dangerously-skip-permissions` with `--model=${model}` if specified, setting `context.projectRoot` as working directory.
   - Translates stdin writes to `{"event": "user", "message": {"content": prompt}}`.
   - Reads stdout NDJSON lines:
     - `init`: verifies initialization.
     - `step_update`: parses `step_type === 'agent_response'` deltas into `assistant.delta`, `step_type === 'tool'` with `state === 'ACTIVE'` into `tool.started`.
     - Detects file modification tool calls (`write_to_file`, `replace_file_content`, `multi_replace_file_content`) and emits `file.changed`.
     - `result`: maps `SUCCESS` to `turn.completed` and `ERROR` to `turn.failed`.
   - `cancel()`: terminates current turn or kills process on cancel.
   - `close()`: closes stdin and terminates process cleanly.
3. Tests & Verification:
   - Unit tests for `agyAdapter` in `src/modules/agents/adapters.test.ts`.
   - Manager tests in `src/modules/agents/manager.test.ts`.
   - Frontend validation tests in `web/src/features/agents/api.test.ts` and `agent-chat.test.tsx`.
   - Clean types, lint, and full tests.

## Risks

- `agy` process runs with `--dangerously-skip-permissions`, letting it write files directly to the project directory just like other providers. External writes remain within project root.
