# 20261001-0618-discover-codex-on-path Discover installed Codex through PATH

- **status**: implementing
- **createdAt**: 2026-10-01 06:18
- **approvedAt**: 2026-10-01 06:18 (owner explicitly requests removal of the executable-setting prerequisite)
- **relatedTask**: 20261001-0618-discover-codex-on-path

## Context

Configuration currently registers Codex only when MERDECK_CODEX_PATH is nonempty. The public wmer/vmer endpoints advertise no providers, while the local mmer deployment explicitly configures three engines. The owner requests removing that configuration prerequisite.

## Proposal

Resolve the standard codex command from the supplied service environment's PATH when no explicit executable override is provided. Keep canonical executable validation and reject project-owned executables. Retain explicit absolute overrides. Missing commands remain unavailable. Document default discovery, verify no-setting capability advertisement with a controlled executable, preserve deterministic fixture environments, and deliver a verified patch using the optimized source/tag workflow.

## Scope

Codex startup resolution, focused configuration/API regressions, relevant fixture environment isolation and configuration documentation. Claude and Antigravity discovery, authentication, provider protocols and deployment credentials are unchanged.

## Risks

Service PATH must determine discovery; tests cannot depend on installed tools or probe a real logged-in provider. PATH resolution must not introduce a project-owned executable. Existing explicit overrides remain authoritative. Native release acceptance still requires complete exact-commit Linux x64/ext4 and both artifact browser suites.
