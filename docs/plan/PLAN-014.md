# PLAN-014 Keep browser sessions across service restarts

- **status**: completed
- **createdAt**: 2026-09-10 18:10
- **approvedAt**: 2026-09-10 (explicit owner `proceed` on the signed-cookie option, implemented directly on the main checkout)
- **relatedTask**: SESSION-001

## Context

Sessions live only in the service process (`src/modules/auth/sessions.ts`), so every restart signs every browser out; the default one-hour TTL also signs the owner out regularly. The service is deliberately file-based with one configured project root and no database, and it must not write service state into that root.

## Proposal

1. Replace the in-memory session map with a signed session value in the existing `merdeck_session` cookie: a version, a random session id, the bound origin and the expiry, authenticated with HMAC-SHA-256 under a key derived from the configured access token. The same token after a restart verifies existing cookies; changing the token signs everyone out.
2. Derive the CSRF token from the session id with the same key instead of storing it, keep the `x-csrf-token` and origin checks for mutations, and keep the cookie attributes, TTL bounds and login rate limiting unchanged.
3. Logout clears the cookie and records the session id in a bounded in-memory revocation list until that session's expiry.
4. Optionally set a longer TTL for the owner's hosted instance through `MERDECK_SESSION_TTL_SECONDS` (up to the existing 24-hour maximum).
5. Update the backend unit and HTTP tests (signature tampering, expiry, origin mismatch, token change, CSRF, logout) and the documentation that currently says a restart invalidates sessions.

## Risks

A signed session cannot be revoked across a restart: a cookie copied before logout would verify again after a restart until it expires. `HttpOnly`, `SameSite=Strict`, `Secure`, origin binding and the TTL bound this window, and changing the access token revokes everything. The current per-process session count limit no longer applies because sessions no longer consume server memory.

## Scope

Backend authentication only: `src/modules/auth/sessions.ts`, `src/modules/auth/routes.ts`, their tests, `src/config.ts` only if key derivation needs a constant, README and SECURITY wording, and the owner-private hosted launcher for the optional TTL. Out of scope: user accounts, persistent storage of any kind, changes to the access-token login itself, and the frontend.

## Alternatives

Persisting the session map to an owner-only state file outside the project root would keep server-side revocation, but it adds a new configured writable location and file-integrity concerns to a service that otherwise writes only inside the project root. Keeping in-memory sessions and only raising the TTL does not solve restarts.

## Implementation record

Implemented as proposed in `src/modules/auth/sessions.ts` and `src/modules/auth/routes.ts`, with two adjustments. First, the per-process issuance count is kept: process memory tracks the ids issued by the running process, so `MERDECK_MAX_SESSIONS` keeps its documented 429 behaviour, while sessions carried over a restart are not counted; this supersedes the statement under Risks that the limit no longer applies. Second, cookies in the earlier unsigned 64-hex format read as signed out instead of failing as malformed, so browsers that still hold one can sign in after the upgrade. The signing key also covers the canonical project root, so pointing the service at another root signs every browser out. The owner's hosted launcher now sets `MERDECK_SESSION_TTL_SECONDS=86400` (step 4). [SESSION-001](../task/SESSION-001.md) records the verification evidence.
