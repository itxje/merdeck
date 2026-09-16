# 20260916-1346-support-agy-agent-provider Add Antigravity (agy) AI agent provider

- **status**: completed
- **priority**: P1
- **owner**: agent-provider/20260916-1346
- **createdAt**: 2026-09-16 13:46
- **completedAt**: 2026-09-16 14:00

## Description

Add support for the Antigravity (`agy`) CLI engine as an AI file-editor provider alongside `codex` and `claude`. Acceptance:
1. `agy` is recognized in `agentProviderSchema`, `MERDECK_AGY_PATH` configuration, manager discovery, capabilities, and frontend validation.
2. `agyAdapter` models probe lists models using `agy models` (or configured models fallback).
3. `agyAdapter` session interacts with `agy -p= --input-format stream-json --output-format stream-json --dangerously-skip-permissions` using NDJSON streaming:
   - Starts turns with `{"event": "user", "message": {"content": prompt}}`
   - Maps streaming `agent_response` deltas to `assistant.delta`
   - Maps `tool` step updates to `tool.started` and detected file mutations to `file.changed`
   - Maps completion `result` events to `turn.completed` or `turn.failed`
4. Strict validation, process containment, error handling, adapter unit tests, and frontend integration tests pass.

## ActiveForm

Added Antigravity (agy) agent provider.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-16): Antigravity CLI (`agy`) is available at `/home/alan/.local/bin/agy`. It supports `agy models` returning tab-separated available models (`id\tlabel`), and streaming print mode via `--input-format stream-json --output-format stream-json -p=`. In stream-json mode, `agy` expects NDJSON objects `{"event": "user", "message": {"content": string}}` on stdin and emits NDJSON events on stdout (`init`, `step_update`, `result`).
- Proposal: [20260916-1346-support-agy-agent-provider](../plan/20260916-1346-support-agy-agent-provider.md).
- Verification:
  - Adapter test: `src/modules/agents/adapters.test.ts` verifies `agyAdapter` stream-json protocol, model discovery, agent delta streaming, tool events, file mutation notifications and arguments (`--input-format stream-json --output-format stream-json --dangerously-skip-permissions`).
  - Manager test: `src/modules/agents/manager.test.ts` verifies `createAgentManager` registers configured `agy` provider alongside `codex` and `claude` with label 'Antigravity'.
  - Config test: `src/config.test.ts` tests `MERDECK_AGY_PATH` loading, freezing, open-access, and invalid path rejection.
  - Contracts test: `src/shared/contracts.test.ts` tests `'agy'` provider parsing.
  - Web client test: `web/src/features/agents/api.test.ts` tests decoding `'agy'` conversations.
  - Quality gates: `bun test`, `bun run check:files`, `bun run lint`, `bun run typecheck`, `bun run --cwd web lint`, `bun run --cwd web typecheck`, `bun run --cwd web test` all pass.
