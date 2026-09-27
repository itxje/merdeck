# 20260916-0425-open-access-agents Allow agent providers with open access

- **status**: completed
- **createdAt**: 2026-09-16 04:25
- **approvedAt**: 2026-09-16 04:25
- **relatedTask**: 20260916-0425-open-access-agents

## Context

The AI file editor is already opt-in through canonical absolute `MERDECK_CODEX_PATH` and `MERDECK_CLAUDE_PATH` values outside `MERDECK_ROOT`, but `loadConfig()` rejects those values unless `MERDECK_TOKEN` is set. The HTTP layer then requires a token session for every agent route, and the React workspace hides the AI control and pane from an authenticated `access: 'open'` session. This is why the released open-access interface has no AI entry even when a provider executable is configured.

Open-access diagram mutations already require the request's exact configured Origin and the shared boundary rejects an unapproved Host, mismatched Origin, cross-site fetch metadata and Authorization headers. A service reachable beyond loopback still requires the operator to set `MERDECK_OPEN_ACCESS=true`. Agent providers add a second explicit opt-in because their executable paths must be configured, canonicalized, execute-checked and outside the project root.

Agent conversations are in-memory, have unguessable identifiers and are bound by the manager to a principal and configured origin. Token sessions supply their session ID and absolute expiry. Open-access directory operations already use the shared `open` principal; agent routes can use the same identity model with a bounded expiry derived from the configured session TTL. All open-access clients at one origin share that authorization domain, which matches their existing unrestricted ability to read and mutate the configured project.

## Proposal

1. Remove only the provider-versus-token startup rejection. Keep token/open-access mutual exclusion, the explicit non-loopback open-access acknowledgement, executable canonicalization, execute permission checks and project-root exclusion unchanged.
2. Let agent routes construct an `open` principal when sessions are disabled. Give each newly created open conversation the configured session-TTL lifetime, retain origin binding and opaque IDs, and continue to require the exact Origin on every POST. Token mode keeps its existing session and CSRF behavior unchanged.
3. Generalize the frontend agent API and chat hook to accept either authenticated session shape. Send `X-CSRF-Token` only for token sessions, render the header entry and chat pane in both modes, and keep logout token-only.
4. Add RED/GREEN coverage at the configuration, HTTP, hook/component/workspace and production-browser boundaries. Prove open access can configure a provider, rejects a missing or mismatched mutation Origin, exposes the UI without a token or browser cookie, performs an exact fake-provider edit and rerenders it, while token-session isolation and CSRF tests continue to pass.
5. Update the operator, architecture and environment documentation to state that provider paths—not a token—enable the feature, and warn that anyone who can reach an open-access service can invoke the provider and approve direct project edits.

## Risks

- Open access deliberately has no user authentication. Every client that can reach the service may invoke configured providers and mutate the project, and clients at one configured origin share the same logical open principal and capacity budget. Opaque conversation IDs prevent enumeration but are not an authorization substitute; the documentation must state this plainly.
- Removing the token guard must not accidentally remove exact-Origin checks from POST routes or relax Host, fetch-metadata, provider-path, argv, environment, sandbox, storage or output limits.
- Open conversations no longer have logout as a cleanup signal. A fixed TTL, existing global/per-principal limits, terminal retention, explicit Stop and application shutdown keep their lifecycle bounded.
- The frontend must not manufacture a CSRF value in open mode, and token mode must continue sending the session-bound value.

## Scope

Validated configuration and tests; agent route principal construction and HTTP tests; frontend API/chat/workspace typing, behavior and tests; production browser fixture/acceptance; `.env.example`, README, architecture and changelog. No provider protocol, process sandbox, file-write semantics, token authentication behavior, public binding defaults or unrelated UI changes are included.

## Alternatives

1. Keep token authentication for agents. Rejected by the owner for this internal-network deployment.
2. Add a second agent-only shared secret. This adds another credential and sign-in surface without improving the explicitly open deployment model.
3. Issue anonymous per-browser cookies solely for conversation ownership. This offers client separation but creates a new ambient credential, CSRF/lifecycle contract and persistence surface. It is unnecessary for the current single open authorization domain and can be proposed separately if multi-user isolation becomes a requirement.

## Annotations

- 2026-09-16: The owner explicitly requested that agent providers no longer require `MERDECK_TOKEN` because the service is used on an internal network. This request authorizes implementation of the bounded open-access design above.

## Outcome

Configured providers now operate in token or open-access mode. Open conversations remain origin-bound, opaque, capacity-limited and absolutely bounded by the configured session lifetime; every mutation retains the exact-Origin check, while token mode additionally retains its session CSRF requirement. The interface exposes the existing engine/model chat in open mode without creating a cookie or CSRF value. Configuration, manager, HTTP, component and production-browser regressions passed, including exact file bytes and live rendering through a deterministic provider. Shared, backend and frontend review found no critical or high findings.
