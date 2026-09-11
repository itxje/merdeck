# PLAN-016 Open the workspace without an access token by default

- **status**: completed
- **createdAt**: 2026-09-11 04:55
- **approvedAt**: 2026-09-11 (explicit owner `proceed` on the proposal as written, including open access on the hosted instance; implemented directly on the main checkout in the proposed slices)
- **relatedTask**: AUTH-001

## Context

The project owner asked on 2026-09-11 to turn the access token sign-in page off by default, so that the workspace opens without a token.

Authentication is mandatory today. `src/config.ts` refuses to start without a 32–256 character `MERDECK_TOKEN`. `src/modules/auth/sessions.ts` signs session cookies with a key derived from that token and the project root, and `src/modules/auth/routes.ts` exchanges the token for a session at POST `/api/session`. `src/modules/diagrams/routes.ts` requires a session for every `/api/diagrams/*` request, and saves and entry operations also need the exact configured Origin and a CSRF token derived from the session. The web workspace shows the sign-in card whenever GET `/api/session` reports no session and offers Log out otherwise. The stack decision recorded this mandatory token in place of an earlier optional-loopback proposal, and README and SECURITY state that the token always applies.

Independently of sessions, `src/shared/middleware/boundary.ts` admits only requests whose Host matches a configured allowed origin, rejects a supplied Origin that differs from that origin and rejects `Sec-Fetch-Site` values other than `same-origin` and `none`. The service sends no CORS headers, and mutations additionally require the Origin header to be present. These checks already stop cross-site browser requests and DNS rebinding, with or without a token.

Without a token, every client that can reach the service gets what a signed-in browser gets today: it can list the tree, read every `.mmd`, `.mermaid` and `.md` file under the root outside hidden and ignored directories, save those files, create files and folders, rename or move them, and delete files and empty folders. Root containment, file kind admission, size limits and storage admission still apply, so other file types, paths outside the root and code execution stay out of reach. On a shared machine, other local users could use a loopback-only service to read and change those files with the operator's permissions.

The hosted instance binds 127.0.0.1 but is reachable through the nsl route at `https://merdeck.example.test`. Its DNS answer is a private network address, and the ingress access controls cannot be inspected from this environment. It serves a disposable demo copy under `/tmp`, not an original project. A loopback bind therefore does not by itself mean that only the operator can connect.

## Proposal

1. **Configuration.** `MERDECK_TOKEN` becomes optional, and an empty value counts as unset.
   - With a token, sign-in, signed sessions, CSRF tokens, logout, rate limiting and all existing limits behave exactly as today.
   - Without a token the service runs with open access, but only when it is loopback-only: `MERDECK_HOST` is a loopback address or `localhost`, and every allowed origin names a loopback host. Any other configuration refuses to start, asking to set `MERDECK_TOKEN` or to acknowledge open access with a new `MERDECK_OPEN_ACCESS=true`. Setting `MERDECK_OPEN_ACCESS=true` together with a token is a configuration error.
2. **API in open access.** GET `/api/session` reports `{ authenticated: true, access: 'open', pollIntervalMs, maxSourceBytes, storage }` without a cookie, CSRF token or expiry; with a token, the authenticated status adds `access: 'token'` to today's fields. POST and DELETE `/api/session` answer 405 with `Allow: GET`. Reads under `/api/diagrams/*` need no session. Saves and entry operations still require the exact configured Origin header together with the existing Host, Origin and fetch metadata checks, but no CSRF token, because no ambient credential exists for a forged request to borrow. Errors, limits and the mutation queue are unchanged.
3. **Web workspace.** When the session status reports open access, the workspace opens directly: no sign-in card, no Log out button or dialog and no expiry timer, and saves and entry operations send no `X-CSRF-Token` header. The status bar says `Open access` instead of `Connected` while connected, so the mode stays visible. If the service restarts in the other mode while a tab is open, the existing session-change handling applies: unsaved drafts stay in the tab and are locked for review, the sign-in card appears when a token becomes required, and the workspace reopens by itself when a token is no longer required.
4. **Hosted instance.** Relaunch the owner-private hosted launcher without `MERDECK_TOKEN` and with `MERDECK_OPEN_ACCESS=true`, so that the live site opens without signing in. This is a separate owner decision (see Risks); if the owner prefers, the hosted instance keeps its token and only the product default changes.
5. **Tests.** Backend: configuration cases (optional and empty token; loopback hosts and origins including `localhost`, `127.0.0.2` and `[::1]`; refusal for non-loopback hosts or origins; the acknowledgement and its conflict with a token) and HTTP tests for open access (session status without a cookie, 405 for POST and DELETE session, reads without a cookie, and mutations refused without the Origin header, with a different Origin or with a cross-site fetch metadata value, but accepted with the exact Origin). The existing token-mode tests stay unchanged. Web: session decoding for both modes, the workspace without a sign-in card or Log out, the status label, requests without a CSRF header and both mode switches. Browser gate: start one more built service without a token on its own disposable sample copy, and add a spec that opens the workspace without signing in, saves an edit and finds no Log out; the token-mode suite keeps running unchanged.
6. **Documentation.** README configuration, remote access and API sections, `.env.example`, SECURITY, architecture (configuration, session contract and route authorization), an addendum to the stack decision that records this owner decision in place of the mandatory token, the deployment record and the changelog.

Delivery follows PLAN-015: backend and contracts first, then the web workspace and browser spec, then documentation, relaunch and live verification, each committed on the main checkout after the full gate passes.

## Risks

- Open access means no authentication: anyone who can connect can read, overwrite, move and delete the Mermaid and Markdown files under the root, and deletion is permanent. The loopback-only rule prevents accidental exposure through `MERDECK_HOST` or allowed origins, but not through a tunnel or reverse proxy that forwards to a loopback-only service while rewriting Host to its loopback origin. The documentation must say that any forwarding needs a token or a deliberate acknowledgement, and it will recommend a token on shared machines, where other local users can reach a loopback-only service.
- On the hosted instance, open access lets anyone who can reach `https://merdeck.example.test` change or delete the demo files without signing in. The root is a disposable copy, but edits the owner makes there are exposed the same way. Pointing that instance at an original project later must re-enable the token.
- Cross-site protection in open access rests on exact Host and Origin validation and fetch metadata instead of a CSRF token. Current browsers send Origin with every non-GET request, and a client that can forge headers can already reach the service directly.
- Deployments that set a token are unaffected. A loopback-only deployment that relied on startup failing without a token now starts with open access.

## Scope

Backend: `src/config.ts`, `src/app.ts`, `src/modules/auth/`, `src/modules/diagrams/routes.ts`, `src/shared/contracts.ts` and their tests. Web: `web/src/features/workspace/` (API decoding and requests, workspace rendering and status bar) and its tests. The browser gate runner and service starter with one new spec, the documentation listed above, and the owner-private hosted launcher. Out of scope: user accounts or roles, read-only open access, changes to token-mode behaviour, and any change to root containment, file admission or storage checks.

## Alternatives

- **Open by default everywhere, without the loopback rule.** The smallest change, but setting a network host or a public origin would silently publish editable project files.
- **An explicit `MERDECK_AUTH=token|none` switch.** The same capability with one more required setting; an optional token keeps existing configurations meaningful without a new variable in the common case.
- **Keep the token mandatory and sign in less often**, for example with longer session lifetimes. Authentication stays, but the sign-in page still appears once per browser and after each expiry, which is what the owner asked to remove.

## Implementation record

Implemented as proposed and committed as `e52c150`. The session status carries `access: 'token' | 'open'`; with open access it has the same capabilities without a CSRF token or expiry, and the web client sends the CSRF header only for token sessions. One detail goes beyond the proposal: the sign-in card no longer asks for a token while the session check is pending, so a service with open access does not briefly show that request. In existing-service mode the browser runner treats the open-access service as optional and skips its spec without one, so separately started release services need no change. The full source gate and the browser suite (39 of 39) passed before deployment. The hosted instance was relaunched from the main checkout with open access; the live checks are recorded in [AUTH-001](../task/AUTH-001.md) and the [deployment record](../deployment-domain.md).
