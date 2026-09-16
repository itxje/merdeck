# 20260916-0555-configure-deployed-agent-providers Configure deployed agent providers

- **status**: in_progress
- **priority**: P1
- **owner**: coordinator/20260916-0555
- **createdAt**: 2026-09-16 05:55

## Description

Configure the already published and running `v0.13.1` service with canonical local Codex and Claude Code executable paths so the open-access workspace exposes the AI editor. Acceptance: the supervised child restarts without a token, reports both engines through the live capabilities endpoint, and the deployed browser UI exposes the AI entry plus engine and model controls.

## ActiveForm

Configuring deployed agent providers.

## Dependencies

- **blocked by**: 20260916-0425-open-access-agents (completed), 20260916-0457-release-open-access-agents (in progress)
- **blocks**: (none)

## Notes

- Current state: the live `0.13.1` child has `MERDECK_OPEN_ACCESS=true` but no `MERDECK_CODEX_PATH` or `MERDECK_CLAUDE_PATH`, so the server correctly advertises no providers and the UI hides the AI entry.
- Proposal: add only the two canonical executable paths to the existing Lode `[env]` block, request a supervised child restart, and verify the live API and browser UI. The owner's earlier direct implementation and deployment authorization satisfies the standard-tier proposal gate.
- Risks: open access intentionally lets every client that can reach this internal service invoke either configured provider. The existing exact-Origin, executable-path, root, process and approval boundaries remain unchanged.
- Scope: deployment configuration and live verification only. No repository runtime logic, provider protocol, token, public binding, provider installation or unrelated deployment is changed.
- Alternative: leaving providers unconfigured keeps the UI hidden and does not meet the approved AI-editor deployment goal.
