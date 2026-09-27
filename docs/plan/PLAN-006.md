# PLAN-006 Configure verified HTTPS domain access

- **status**: completed
- **createdAt**: 2026-09-08 (creation minute not retained)
- **approvedAt**: 2026-09-08 (original explicit domain request; day-level precision)
- **relatedTask**: DOMAIN-001

## Context

The reviewed application foundation is `2ec26bd613efdc17ba23ffe821f5ae75f0e19acf`; DOC-001 and REVIEW-001 are completed. The initial clean checkout was synchronized with that exact local foundation, retaining history. DOMAIN-001 was claimed and its detail/index re-read before substantive investigation.

Fresh observations: `diag.example.test` has A `192.0.2.1` and no observed AAAA answer. Normal HTTPS certificate verification succeeds (`ssl_verify_result=0`) but `/api/health` returns 502. The existing independent loopback preview remains healthy. The retained shared nsl daemon listens on port 3003 with `proxy.domains=localhost,example.test`, HTTPS disabled internally and tunnel disabled. No exact `diag` route is registered; a local Host-header health probe returns nsl404. This identifies a missing scoped route, not proof of the external ingress implementation or general public reachability.

The production bootstrap loads the reviewed built SPA into a static asset map and serves it with Hono's prefixed `/api`. The boundary matches exact Host and Origin; forwarded headers are ignored. An HTTPS allowed origin enables Secure cookies and HSTS. No application changes are required by these observations.

System Bun is 1.3.12, so an ignored local Bun 1.4.2 was installed; Node is 24.20.0. Both existing frozen installs succeeded without dependency changes. Project-local nsl is pinned at 0.1.7; its supported run/route commands preserve Host by default. The supplied tmux convention file is absent; the explicit session naming convention and installed PMA delivery reference provide the applicable lifecycle procedure.

The explicitly inspected `/tmp` fixture parent is canonical Linux overlayfs `0x794c7630`, device `70`, mount `318`, device pair `0:70`, mount point `/`. A new unique child root must be independently inspected before serving samples. No operator project root was supplied.

## Proposal

1. Commit this investigation/proposal and authorization before route/service configuration.
2. Build unchanged source with pinned Bun in the dedicated project tmux session. Copy only committed examples into a new uniquely owned supported demo root; create a new mode-0600 token in ignored owner-only storage.
3. Launch one built production service on loopback with `NODE_ENV=production`, `DIAGRAMDOCK_API_MODE=prefixed`, exact `DIAGRAMDOCK_ALLOWED_ORIGINS=https://diag.example.test` and `DIAGRAMDOCK_COOKIE_SECURE=true`. Register only the absent `diag` route through existing nsl, preserving Host and paths. Prefer process-owned `nsl run`; inspect ownership-safe shutdown behavior before choosing a cleanup command. Do not use force, stripping or Host rewriting.
4. Verify normal HTTPS root/health/session/tree, authenticated reads, Secure/HttpOnly/SameSite cookies, Origin/CSRF refusal, precise Markdown save bytes, real external change/conflict, detected deletion, all built assets and logout revocation. Exercise the exact HTTPS hostname in headless Chromium, login/browse/render/save and desktop/narrow layout, audit errors and inspect credential-free screenshots. Restore owned samples and retain check exits before cleanup.
5. Document setup, owner-scoped restart/stop and current access limitations in a focused deployment guide linked from README. Keep the verified demo running at delivery. Record evidence only from actual execution.

## Risks

The ingress may not forward to the observed local proxy, certificate trust may differ in Chromium, or an intervening owner may register diag. Never replace an existing owner, change shared infrastructure or weaken checks. Report a finite concrete blocker if the existing path cannot be used. TLS/DNS from this environment does not establish independent external reachability. Credentials and sessions must remain in private files or memory; no trace/video or visible-token screenshots. Practical saves retain the final comparison/rename and local OS actor limitations. Restart revokes sessions and temporary demo storage is not durable operator storage.

## Scope

Only DOMAIN-001/PLAN-006 and their new index rows, focused deployment documentation, README link and concise changelog. A narrow TypeScript helper and focused tests may be added only if required for safe route ownership/lifecycle. Ignored runtime launchers and evidence remain local. Application/security/storage source, manifests/locks, existing tracking, workflows/releases, examples and design bytes are preserved.

## Alternatives

A scoped static route is acceptable if process ownership cannot safely manage lifecycle, with exact ownership verification before removal. Changing shared daemon configuration, generic tunnels, Vite exposure, a second writing service over the retained preview root or origin/auth workarounds are outside the authorized approach.

## Annotations

The user's explicit 2026-09-08 domain-access request authorizes routine implementation after this recorded proposal. No new approval timestamp, final integration, release/tag or design approval is inferred. The existing prototype remains needs-review.

### Implemented outcome and unresolved gate

The prepared route/service and verification are documented in [DOMAIN-001](../task/DOMAIN-001.md) and the [deployment guide](../deployment-domain.md). Frozen installs/build and complete local Host/auth/save/asset checks passed; normal HTTPS curl and Chromium still returned502 after local route registration and a controlled stop/restart. HTTPS login/render/save/layout acceptance is therefore incomplete. The prepared isolated demo remains running with owner-scoped records and private credentials. No application/source/dependency/design change or infrastructure workaround was introduced. Status remains implementing until the HTTPS ingress reaches the verified local route and actual domain acceptance passes. The original day-level authorization is unchanged.


### Published endpoint clarification (2026-09-08)

Independently supplied metadata identifies `http://192.0.2.5:33003` as the stable published endpoint for internal nsl port3003. A supplied **2026-09-08 02:12:52 UTC** request with Host `diag.example.test` returned HTTP200, the nsl marker and the expected DiagramDock health/security response from this environment. It was not repeated for this evidence amendment and does not prove reachability from the separate HTTPS ingress runtime.

The prepared tuple uses existing HTTPS termination for exact hostname `diag.example.test`, candidate upstream `http://192.0.2.5:33003`, original Host and complete `/api` paths. nsl retains ownership of the diag registration and tracks dynamic child ports; those ports and remote loopback are not external ingress upstreams. This clarifies the prior internal-port description without changing a route, service, container, network, shared daemon, policy or authorization.

No external ingress configuration has been applied. Its actual management location/access, upstream setting and connectivity remain unresolved; scoped negative observations do not establish a proxy technology or root cause. The next input is ingress management location/access, not another implementation proceed. Existing502/browser-failure evidence, live demo ownership, prior preview safety and prepared/blocked status remain intact. See [deployment tuple and evidence](../deployment-domain.md#configuration-and-startup) and [DOMAIN-001](../task/DOMAIN-001.md).

### Changed-state investigation and acceptance proposal (2026-09-08)

The independently supplied normal-TLS HTTPS health request now returns HTTP200 with the expected DiagramDock envelope. Its explicitly supplied nonsecret response was read and agrees. The external operator/configuration change is unknown; this task neither performed nor attributes it. This is changed external state under the original 2026-09-08 authorization, not a new attempt or approval. Prior502 and browser-failure evidence remains unchanged.

The retained build, service, demo root, private token and Deployment maintainer claim will be reused. Existing ignored HTTP/browser helpers were inspected: their unconditional restoration of committed examples is unsuitable now that a user may have edited the live demo. Create fresh ignored, timestamped acceptance helpers instead. Inspect current root and sample identities/bytes without changing existing data, and use exclusively created disposable Markdown files inside that same root. Guard direct test edits and cleanup with root/file identity and content-version checks; retain unexpected content instead of overwriting it. Use isolated test sessions and revoke only those sessions.

Verify current ownership/runtime/storage and retained-build equivalence to the checked source before private login. Exercise the exact HTTPS hostname with normal TLS: shell/current assets, health, anonymous session/tree refusal; cookie transport and flags; authenticated tree/document; missing/wrong Origin/CSRF with unchanged bytes; exact Markdown saves, external-change conflict and detected deletion; live Mermaid rendering, desktop/narrow usability, audit and screenshots; test-session logout/revocation and guarded fixture cleanup. Capture fresh command results before cleanup and preserve all historical evidence. Do not restart, rotate credentials, rebuild, reconfigure ingress or repeat unrelated gates. Unknown ingress management access is no longer a prerequisite if actual end-to-end acceptance succeeds.

Scope remains the seven existing domain-owned documents/index rows and ignored focused tooling. Run focused strict helper types/lint, document/link/Bash/scope preservation and diff checks; review the result and mark only DOMAIN-001/PLAN-006 completed if all actual HTTPS acceptance passes. Preserve the live service/root/token, other sessions, independent preview, prototype needs-review and existing practical-save limits. Record the published upstream as `http://192.0.2.5:33003` with original Host/full path, without claiming knowledge or control of the external ingress change.

### Recovered execution outcome (2026-09-08)

Actual normal-HTTPS shell/API/browser functional checks now pass for the retained service, including 92 assets plus the shell, isolated sessions, Cookie/Origin/CSRF behavior, exact Markdown saves, external conflict, detected deletion, flowchart/sequence rendering, safe-content rejection and desktop/narrow main panes. Current observed DNS/peer is `192.0.2.7`; no ingress change is attributed to this task and management access is no longer an end-to-end acceptance prerequisite.

The task remains implementing because personally inspected narrow drawer screenshots exposed a real overflow that the original outer-popup-width assertion missed. A focused unmodified-page check reproduces an approximately 397-pixel implicit grid column inside a 300-pixel popup at 390 viewport width. One browser-only diagnostic declaration, `.file-drawer { grid-template-columns: minmax(0, 1fr); }`, contains the children; removing it restores the failure. This candidate is not applied to source/build/service and does not constitute acceptance. The smallest scoped application correction is identified in [DOMAIN-001](../task/DOMAIN-001.md) for separate routing; existing completed review history is not reopened.

Retained runtime/build/root/token and existing user file bytes/identities are preserved; three exclusively owned test files and three isolated test sessions were cleaned without touching other sessions. Previous 502/failure evidence remains unchanged. The finite remaining gate is the narrow-drawer source correction and targeted regression, not an infrastructure blocker or renewed implementation approval.

### Supplied pending corrections and later deployment boundary (2026-09-08)

After this finite check round, supplied evidence identified a separate baseline renderer rejection of an ordinary 16-node Unicode flowchart containing six bare `<br/>` breaks. It is not covered by the passing fixtures above and was not re-investigated here. Separate renderer and narrow-drawer corrections are pending; neither has been applied to the retained build. Complete product readiness is not claimed.

Retain the current service/root/token and the existing partial acceptance report. A later bounded deployment continuation will use an exact accepted combined revision only after both corrections are reviewed and integrated, then verify the unchanged original diagram and corrected narrow layout through HTTPS. This supplied context does not authorize an immediate build/restart or session reset and does not reopen infrastructure investigation or alter the original authorization.

### Accepted correction deployment: investigation and proposal (2026-09-08)

The existing Deployment maintainer claim and both indexes were re-read. The clean deployment branch fast-forwarded only to the explicitly accepted local integration `a66276ade586cf4ce51d0b4c40aae91db7124fe2`, preserving prior delivery and ignored evidence. Application/test/build inputs are byte-identical to the tested combined merge `7ecb47d4f91b0b1a157379ac0bcc88fde53c18cb`; both manifests and lockfiles remain unchanged from the retained installation. Supplied combined local ARM64/overlay acceptance is recorded in the completed renderer/layout histories. New hosted Linux x64/ext4 verification remains separate and pending.

Read-only ownership inspection confirms the retained process/start identity, command record, checkout, domain tmux window, root device/inode and mode-0600 token. Bun 1.4.2 and Node 24.20.0 are present. Production loads the built asset map once at startup, so a complete new build can be prepared while the old service remains healthy. The current root may contain user edits; no committed-example restoration or user-file mutation is proposed.

The original explicit 2026-09-08 domain and bug-correction authorization, now naming the accepted combined revision and a bounded deployment, authorizes this continuation without another approval event. Preserve the old build for concrete recovery, snapshot existing root entries without following symlinks, build and validate all startup assets before stopping, then verify ownership again and perform one controlled stop/restart through the owned tmux window and non-force route registration. Preserve exact HTTPS origin, prefixed paths, secure cookies, storage/auth policies, root and token. The restart necessarily invalidates in-memory sessions; users reauthenticate with the unchanged token.

Use fresh ignored evidence and independent private API/browser sessions. Verify exact-hostname normal TLS, shell/health/anonymous refusals and 92 assets plus one shell before login; auth/cookies/Origin/CSRF, exact Markdown saves, external conflict/deletion and own-session revocation; exact 991-byte original flowchart source, 16 nodes, seven branch labels and six real line breaks with zero implicit writes and one deliberate owned-fixture save; accepted break variants, hostile/syntax refusal and recovery; actual drawer descendants/scroll extents at 390 and 360 pixels, nested long target selection/focus/Escape/draft/source-preview behavior, fit/zoom, screenshots and error audit. Guard all disposable child cleanup by identity and bytes, preserve existing user entries, and retain the corrected live service. Complete only DOMAIN-001/PLAN-006 after actual acceptance and scoped review; do not rerun the unchanged full CI/native gate, change application source, or claim independent-client reachability, new hosted acceptance, design approval or final integration.

### Corrected live deployment completed (2026-09-08)

Proposal/build commit `208973e4319ce654fc0dda3a2a3a4f9f8fbc04a4` preserves the accepted combined application inputs. The pinned build and all 93 startup resources passed before one controlled owner-verified stop/restart. The original root, token and existing entries remain unchanged; in-memory sessions require reauthentication. Exact-hostname HTTPS now serves the corrected build with normal TLS and all 92 asset files plus the page shell matching bytes, MIME and security headers.

Fresh API and browser evidence verifies the exact original 991-byte flowchart through editor/draft/request/disk/reload, all 16 labels, seven branch labels, six real breaks, one explicit save and no implicit saves. Actual built drawer descendants and scroll extents pass at both 390×844 and 360×844, including the awaited long nested target and focus/filter/Escape/draft behavior. Cookie/Origin/CSRF, byte-preserving Markdown saves, external conflict/deletion, safe rendering and cleanup passed. No application or security policy was changed for deployment.

The main browser command's final logout used the wrong label for its dirty draft and exited 1 after completing the preceding assertions. Its log, source snapshot and screenshot remain intact. A focused independent dirty-draft logout check passed with real DELETE 200, revoked-cookie 401 and zero writes; the full browser sequence was not rerun or relabeled. The ignored helper's locator/wait handling was corrected for future use, with strict typing/lint retained. Acceptance is supported by the explicitly separated functional and focused logout evidence.

Scoped review, helper checks, data/ownership preservation and inspected screenshots satisfy DOMAIN-001/PLAN-006. Four owned files and three directories were removed; three test sessions were revoked. The live corrected service remains available. [DOMAIN-001](../task/DOMAIN-001.md) records commands, actual exits, artifact hashes and evidence. Hosted Linux x64/ext4 verification was pending at this live handoff and is now resolved by the subsequently supplied exact-candidate log/package evidence below; historical results, practical-save limits, prototype needs-review and final integration/release approval remain separate.


### Supplied native/package evidence amendment (2026-09-08)

The completed domain task remains completed. Read-only supplied audit reports establish that run 34185410383 attempt 1 and its independently inspected downloaded package passed at exact accepted candidate `a66276ade586cf4ce51d0b4c40aae91db7124fe2`, with publication skipped. The current candidate's native/package status is now PASS; earlier pending states and historical candidates remain chronological records. [Deployment evidence](../deployment-domain.md#supplied-corrected-native-and-package-acceptance) records exact storage, package digest, scope and attribution.

This authorized documentation-only amendment inspects the supplied reports and updates the current status without another execution, download, validator, service/root/token change or task claim. It preserves the live acceptance results and user data; final main integration, prototype review and first real release remain separate.
