# 20261001-0618-discover-codex-on-path Discover Codex without an explicit executable setting

- **status**: in_progress
- **priority**: P1
- **owner**: config-worker/session-20261001-0618
- **createdAt**: 2026-10-01 06:18

## Description

Remove the requirement to set MERDECK_CODEX_PATH before an installed Codex CLI is available to the editor. Resolve Codex from the service's PATH when no override is provided, preserving explicit executable overrides and the existing executable/root boundary.

## ActiveForm

Implementing and verifying automatic Codex executable discovery.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

The owner explicitly requests removal of the MERDECK_CODEX_PATH prerequisite after the wmer/vmer capability endpoints returned no providers. This is Full-tier configuration work with approval granted up front. Only Codex discovery changes; Claude and Antigravity keep their existing explicit configuration. No provider installation, login, remote startup edits or live service restart is authorized by this source change.

## Implementation

Use Bun's executable lookup with the supplied service environment's PATH when the explicit Codex path is absent or empty. Canonical executable validation and project-root exclusion apply to both discovery and overrides. Explicit invalid overrides still fail rather than selecting another command. Missing PATH/commands leave Codex unavailable. Source browser fixtures use an empty PATH and their explicit fake executable, so acceptance never discovers the developer's logged-in Codex.

## Verification

Four new regressions first failed against the original behavior. All nineteen configuration/API cases now pass, including no-setting discovery, an empty setting, absent commands, canonical symlinks, non-executable PATH entries, explicit override precedence, project-owned command refusal and actual HTTP capability advertisement through a controlled CLI. No real provider login or request was used. Broader local/source/native and release acceptance remain pending.

The relevant configuration/agent-route/process suites pass 24 cases. Root lint and typecheck pass. Four configured-provider browser cases pass with the isolated fixture environment, including exact-byte edits and live rendering under token and open access. Fixture services and roots were cleaned up.

## Review and delivery

Shared and TypeScript backend review finds no actionable introduced issues. Discovery uses only the supplied service PATH and fixes the executable to its canonical absolute path before registration. Explicit override errors and project-owned candidates remain refused; request, session, Origin and provider process boundaries are unchanged.

The owner's earlier commit, push and release authorization covers v0.19.19 delivery. The clean candidate requires both frozen installs and complete local preparation plus matching source verification before tagging; its tag supplies complete normal Linux x64/ext4 artifact acceptance and publication. Public checksums and embedded version/tag/commit identity remain required. Remote deployment CLI availability is tracked separately by taskist #52.
