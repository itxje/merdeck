# SESSION-001 Keep browser sessions across service restarts

- **status**: completed
- **priority**: P2
- **owner**: Backend maintainer
- **createdAt**: 2026-09-10 18:10

## Description

The project owner reported on 2026-09-10 that every rebuild and restart of the service asks for the access token again. Acceptance for the proposed change: a signed-in browser stays signed in after a restart of the same service with the same access token until its session expires; logging out, an expired session, a different origin or a changed access token still require signing in; CSRF protection, `HttpOnly`/`SameSite=Strict`/`Secure` cookie attributes and login rate limiting are unchanged.

## ActiveForm

Proposing sessions that survive service restarts.

## Dependencies

- **blocked by**: (none; PLAN-014 approved 2026-09-10)
- **blocks**: (none)

## Notes

- Investigation: `src/modules/auth/sessions.ts` keeps sessions in an in-memory `Map` keyed by a random 64-hex id stored in the `merdeck_session` cookie; each session carries its origin, a random CSRF token and an expiry of `MERDECK_SESSION_TTL_SECONDS` (default 3600, maximum 86400, `src/config.ts`). `src/modules/auth/routes.ts` sets the cookie with `Path=/api; HttpOnly; SameSite=Strict; Max-Age=<ttl>` plus `Secure` for HTTPS origins, requires the CSRF header and origin for mutations, and deletes the session on logout. A restart therefore discards every session, which README already documents ("restart invalidates sessions"). The hosted launcher does not set a TTL, so the owner is also signed out after an hour even without a restart.
- Proposal: recorded in [PLAN-014](../plan/PLAN-014.md) and presented to the owner on 2026-09-10; the owner chose the signed-cookie option with `proceed` the same day.
- Implementation: `sessions.ts` no longer stores sessions. The cookie value is `<64-hex id>.<expiry ms>.<64-hex signature>`, where the signature is HMAC-SHA-256 over the id, the expiry and the verifying request's origin under a key derived from the access token and the canonical project root, and the CSRF token is HMAC-SHA-256 of the id under the same key. Verification uses a constant-time comparison and checks expiry and in-memory revocations. Process memory keeps only the ids issued by the running process, preserving the documented `MERDECK_MAX_SESSIONS` 429 behaviour, and logout or login rotation revokes a session until its expiry. A cookie in the previous unsigned 64-hex format is treated as signed out rather than malformed, so browsers holding one can still sign in; other malformed or duplicate cookies still fail with `invalid_request`. `close()` zeroes the token digest and key. `routes.ts` writes the signed value with unchanged cookie attributes. Two HTTP tests were added: a session survives a new app instance with the same configuration and can still be logged out there, and tampered signature, expiry or id, the unsigned format, another origin, a rotated token and another root all read as signed out.
- Verification (2026-09-10, main checkout, pinned Bun 1.4.2): root `bun run lint` and `typecheck` clean; `bun run check` passed inside the project tmux session with the supported overlay fixture parent under `/tmp` (`0x794c7630`) and the checkout `tmp/` as the refused parent (`0x65735546`): 176 backend tests across 8 files (functions 98.95%, lines 99.47%) including the two new HTTP tests, 173 frontend tests across 12 files, and the production build. `git diff --check` clean. The full browser suite then passed 34 of 34 on that build, including the login, logout, lost-authentication and authentication-change save cases, with services stopped and fixtures removed.
- Deployment and live evidence (2026-09-10): the hosted instance was relaunched from the main checkout with a build of the sources committed as `2e82365`, and the owner-private launcher now sets `MERDECK_SESSION_TTL_SECONDS=86400`; HTTPS `/api/health` returned 200 with service `merdeck`, and `/` and `/favicon.svg` returned 200. A real Chromium session signed in on https://merdeck.example.test/ and received a signed `merdeck_session` cookie (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api`) expiring 24 hours later. The service was then stopped and started again in the same tmux window, as a new process on a new port. Reopening the site with that browser's saved state showed the workspace without the login form, and `/api/session` reported the same CSRF token and expiry as before the restart. Logging out returned `authenticated: false` and cleared the cookie, with no page errors, and the saved browser state was deleted afterwards. Browsers holding a cookie issued before this deployment had to sign in once more.
