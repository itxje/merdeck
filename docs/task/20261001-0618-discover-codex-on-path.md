# 20261001-0618-discover-codex-on-path Discover Codex without an explicit executable setting

- **status**: completed
- **priority**: P1
- **owner**: config-worker/session-20261001-0618
- **createdAt**: 2026-10-01 06:18

## Description

Remove the requirement to set MERDECK_CODEX_PATH before an installed Codex CLI is available to the editor. Resolve Codex from the service's PATH when no override is provided, preserving explicit executable overrides and the existing executable/root boundary.

## ActiveForm

Automatic Codex discovery is verified and released.

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

## Acceptance correction

The first full local gate on `57776a4` failed only the workspace browser audit during explicit logout: one suite passed 106 cases and the other passed 105, with a revoked-session 401 for an outstanding revision poll. Both completed cleanup; no tag or release was created. This is an expected server response after revocation, already admitted by the separate authentication-loss scenario. Preserve the failed record and make that server/browser ordering deterministic by holding only delivery of a successful real logout response until a genuine background poll is refused. Declare the authenticated-read/cleanup 401 responses only in the final logout phase. Runtime authentication behavior and earlier audit assertions stay unchanged.

The deterministic real-server ordering first failed on the undeclared directory revision 401, then passed with the phase-scoped declaration. It explicitly verifies successful server logout, refusal of a real background poll and final cleared login state; no runtime behavior, retries, skips or timeouts changed. Frontend lint/typecheck pass with four existing warnings. Shared and frontend review finds no actionable introduced issue. The initial exact source run [36824513175](https://github.com/itxje/merdeck/actions/runs/36824513175) passed on `57776a4`; the corrected browser acceptance candidate requires fresh exact-commit preparation.

## Menu focus acceptance correction

The complete local gate on `9633b1a` passed logout and one 106-case artifact suite, but the executable suite failed its file-actions test when its page-level Escape could run before the menu acquired focus, leaving the popup open while the test tried to focus a directory row. Both artifact services and fixtures were cleaned up. The installed menu focus manager remains active until popup unmount and queues return focus. The first focused reproduction with only closure assertions failed because the menu remained open. Send Escape to the actual menu in both refresh phases, then await popup removal and the existing More file actions trigger focus before focusing the row and asserting F2 behavior. Preserve this failed record; runtime UI behavior, assertion strength, retries and timeouts are unchanged. The resulting candidate requires fresh exact-commit acceptance.

The focused file-actions case now passes (8.3 seconds), including disabled actions during a genuinely held refresh, enabled actions after its response, actual menu Escape, popup teardown, trigger focus return, directory focus and the F2 rename. Fixture services and roots were cleaned up. Frontend lint and typecheck pass; shared/frontend review finds no actionable introduced issue.

## Final acceptance and release

Clean source `416dda47a0650bf33c39c93ec656c000be5f83e0` passed both frozen installs, complete local ARM64/overlayfs `check:ci` with separate tmpfs refusal storage, and `git diff --check` in 6m47s. Frontend 597, backend 300, file 209, storage 6 and release/CI 52 cases passed. Both full artifact browser suites passed 106 cases with 17 configuration-dependent skips and clean service/fixture teardown. Four additional controlled-provider source browser cases passed separately.

[The exact source run](https://github.com/itxje/merdeck/actions/runs/36826507191) passed in 3m37s. [The v0.19.19 tag workflow](https://github.com/itxje/merdeck/actions/runs/36827179734) passed the complete normal Linux x64/ext4 gate with distinct tmpfs refusal storage and published on attempt 1; verification took 7m30s. Downloaded sanitized records confirm all twenty raw storage controls, file/HTTP checks, physical source/bundle/compiled directory adapters, both artifact browser suites and cleanup. Native acceptance is explicitly passed; no earlier run artifact was used.

[v0.19.19](https://github.com/itxje/merdeck/releases/tag/v0.19.19) contains the no-setting Codex discovery change. Both public assets match GitHub digests and publisher provenance, and SHA256SUMS validates the archive. Its 97-file bundle reports version 0.19.19, tag v0.19.19, the exact commit and Bun 1.4.2. The annotated remote tag resolves to the same source. Archive SHA-256: `9e9196d120c4c1d1cdd94bcce963a31d3aedabf7d11df3326e1670fdb74d5a82`. Public verification records are under `/home/alan/warehouse/merdeck-codex-discovery-20261001/`.

Taskist #53 is complete. Taskist #52 remains remote deployment verification: this release removes the explicit Codex setting requirement, while each service still needs its own installed CLI in PATH and existing CLI login. Remote provider installation/configuration and live restarts were not performed.

- complete: Delivered automatic Codex discovery in v0.19.19 from 416dda47a0650bf33c39c93ec656c000be5f83e0; complete local, source, native and public asset verification passed.
