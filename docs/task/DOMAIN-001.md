# DOMAIN-001 Configure verified HTTPS domain access

- **status**: completed
- **priority**: P1
- **owner**: Deployment maintainer
- **createdAt**: 2026-09-08 02:04

## Description

Configure and verify the reviewed production application at https://diag.example.test using the existing routing infrastructure and a separate disposable demo root. Preserve application, authentication, storage and design behavior.

## ActiveForm

Configuring and verifying HTTPS domain access

## Dependencies

- **blocked by**: DOC-001, REVIEW-001 (completed)
- **blocks**: (none)

## Notes

### Claim and authorization

- Claimed before deployment investigation, with the detail and index re-read before substantive work.
- Reviewed application foundation: `2ec26bd613efdc17ba23ffe821f5ae75f0e19acf`; clean initial state, exact expected origin verified, local foundation synchronized with commit history preserved.
- The user's explicit 2026-09-08 request authorizes this bounded domain configuration and verification. It does not approve final integration, release or design. No additional approval time is inferred.
- Preserve completed MVP records and the prototype's needs-review status. Investigation and proposal will be recorded in PLAN-006 and committed before route or service configuration.

### Investigation and proposal

The focused investigation and proposed checks are recorded in [PLAN-006](../plan/PLAN-006.md). Existing routing supports the hostname suffix but has no exact diag registration; HTTPS currently returns 502. The proposal preserves exact same-origin security and uses a separate supported demo root. Original authorization is recorded above; the proposal/claim is committed before configuration.

### Implementation and verification (2026-09-08)

**Status: prepared, blocked by the external HTTPS ingress path; domain acceptance is incomplete.** This task remains in_progress and PLAN-006 remains implementing. No existing completed task or plan is reopened.

- Claim/proposal commit: `d107cbd`; synchronization commit: `955d7fc`; reviewed application foundation: `2ec26bd613efdc17ba23ffe821f5ae75f0e19acf`. Build source is `d107cbd`, whose application bytes match the reviewed foundation. No source/dependency change was required.
- Fresh DNS A: `192.0.2.1`; AAAA query completed with no answer. Actual peer is `192.0.2.1:443`. Normal curl and Chromium TLS verification succeeded with TLS1.3 and a certificate matching `*.example.test` (valid 2026-07-21 through 2026-10-19). HTTP redirects to the same HTTPS hostname; HTTPS `/` and `/api/health` still return 502. No independently external client was tested. Optional additional DNS diagnostics timed out and establish nothing further about public DNS or ingress ownership.
- The shared proxy was already running on 3003 with domains `localhost,example.test`, internal HTTPS=false and tunnel=false. An absent diag route was registered using project-local `nsl run -n diag -- bash tmp/domain/service.sh`, without force, path stripping or Host rewriting. The production service binds loopback, uses `/api`, exact `https://diag.example.test`, and `DIAGRAMDOCK_COOKIE_SECURE=true`. Neither shared daemon nor unrelated routes/configurations were changed.
- The current process-owned route is `diag.localhost` at `/`, port21349, route PID62453, runtime PID62454. Only the deployment owner's local identity lives in ignored `tmp/domain/route-owner.json`; exact session and canonical root/token locations are recorded through `tmp/domain/session.txt`, `root.txt`, `storage.json` and the private deployment handoff. The new demo root contains only copied committed examples. Actual root metadata: overlay/`0x794c7630`, device70, mount318, device pair `0:70`, mount point `/`; production storage admission passed. The prior independent preview remains healthy and untouched.
- Local Host probes through the nsl proxy and directly to the service returned 200. The focused local HTTP harness verified anonymous session=false, tree401, authenticated login/tree/document, secure cookie attributes and HSTS, missing/wrong Origin and CSRF403 with unchanged files, exact Markdown block save/unrelated-byte preservation, an actual external edit with stale409, detected deletion410, logout/revoked-session401, and all 92 asset files plus the shell matching current build bytes. Explicit unknown asset/config/source paths returned404. This is local HTTP configuration evidence, not browser HTTPS cookie transport or successful domain acceptance.
- Real headless Chromium `153.0.8010.12` used the exact HTTPS URL with normal TLS verification. The page response was502; the audit recorded one HTTP502 and its console error. Login, Mermaid rendering, editing/saving and usable-layout acceptance could not run. No token was entered, and trace/video were disabled. Personally inspected `tmp/domain/https-desktop-failure.png` (1440×920) and `tmp/domain/https-narrow-failure.png` (390×844): both contain only the Bad Gateway response. Browser/context were closed and copied Markdown bytes restored.
- All three demo sample files were compared byte-for-byte against committed examples after checks. A controlled tmux stop removed the first healthy process's route; its PID was absent and a direct listener probe failed with curl exit7 before restart. The first empty failed fixture was removed only after confirming its service/route were gone. The healthy sample root, fresh token and restarted scoped route remain available for ingress correction; no temporary check service or browser remains.

| Actual command/check | Exit/result | Relative evidence |
| --- | --- | --- |
| `npm install --prefix .cache/runtime --no-save --package-lock=false bun@1.4.2` | 0; runtime1.4.2, Node24.20.0 | `tmp/domain/runtime-install.log`, `runtime-install.exit`, `runtime-version.txt` |
| `bun install --frozen-lockfile` | 0 | `tmp/domain/install-root.log`, `install-root.exit` |
| `bun install --cwd web --frozen-lockfile` | 0 | `tmp/domain/install-web.log`, `install-web.exit` |
| `bun run build` | 0 | `tmp/domain/build.log`, `build.exit`, `build-commit.txt` |
| `web/node_modules/.bin/playwright install chromium` | 0 | `tmp/domain/browser-install.log`, `browser-install.exit` |
| Initial ignored demo preparation | 1: mkdir followed by cp errorOnExist rejected the pre-created destination | `tmp/domain/prepare-attempt1.log`, `prepare-attempt1.exit` |
| Corrected ignored demo preparation | 0: cp creates its own absent destination | `tmp/domain/prepare.log`, `prepare.exit`, `storage.json` |
| `bun tmp/domain/http-check.ts` | 1: HTTPS shell502; curl transport0/TLS0 | `tmp/domain/https-check.log`, `https-check.exit`, `https-http-observations.json` |
| `bun tmp/domain/http-check.ts --local-host-probe` | 0; all scoped local assertions passed | `tmp/domain/local-check.log`, `local-check.exit`, `local-http-observations.json` |
| `bun tmp/domain/browser-check.ts` | 1: actual HTTPS shell502, no credential entry | `tmp/domain/browser-check.log`, `browser-check.exit`, `browser-audit.json` |
| Owned stop/restart | Route/PID absent, listener curl7, restarted Host health0/200 | `tmp/domain/stop-check.txt`, `stopped-probe.exit`, `restarted-health.exit`, `route-owner.json` |
| Final HTTPS health probe after restart | curl0/TLS0, HTTP502 | `tmp/domain/https-final.txt`, `https-final.exit` |
| All copied sample bytes restored | 0 | `tmp/domain/samples-restored.txt`, `samples-restored.exit` |

All Bun commands above used the pinned local PATH or absolute local runtime. Frozen installs, build and HTTP/browser checks ran in the owned tmux session; short preparation and read-only probes ran from the same checkout. The first service attempt failed because preparation had failed; its log reports child exit1, and nsl removed its route. An immediate launcher exit was not captured because the original shell used set-e. The controlled Ctrl+C also did not retain a launcher exit code; separate PID/route/listener checks prove stopping. These two omissions are explicitly retained in `service-attempt1-status.txt` and `stop-exit-limit.txt`, not reported as successful exits. Initial failures were preserved before the bounded preparation correction. Authenticated request/config/header/body material remains mode0600 under owner-only local evidence directories; it must not be published.

### Scoped review and handoff

Applied the shared, TypeScript backend and frontend-boundary review packs to the narrow configuration/docs and exercised behavior. The exact origin, secure cookie setting, prefixed same-origin routes, bounded static map and independent supported root preserve existing protections. Reviewed pinned nsl run source: non-force registration refuses a live competing route, and stop cleanup uses lock-protected child-PID matching rather than unconditional removal. The observed controlled stop/restart supports current ownership/lifecycle behavior; no forced replacement test against another owner was performed. No new application defect or security weakening was found. Initial setup/lifecycle evidence limitations are explicit above.

The required next step is infrastructure-owner verification/correction of the HTTPS ingress upstream mapping or connectivity to the published endpoint `http://192.0.2.5:33003`, which forwards to the environment's internal nsl port3003. Its actual external upstream configuration was not available in scope; the evidence does not identify a narrower cause. No daemon/global DNS/hosts/mount/account change or generic tunnel is authorized by this task. After the ingress changes, rerun the retained normal-HTTPS HTTP and browser checks before marking DOMAIN-001/PLAN-006 completed. [Deployment instructions](../deployment-domain.md) explain startup, private token entry, restart/stop and cleanup. Prototype needs-review, practical save/OS-actor limitations, and final integration/release boundaries remain unchanged.

### Final scoped quality record

- The ignored focused preparation/HTTP/browser TypeScript harnesses passed strict `tsc -p tmp/domain/tsconfig.json --noEmit` and ESLint with `--no-ignore --max-warnings 0`, both exit0. The initial ESLint invocation exited0 but only warned that scratch files were ignored; it was not counted as lint coverage. The explicit invocation then found four formatting/Buffer-import issues, which were corrected without changing check semantics. Initial logs and final logs/exits are retained under `tmp/domain/tooling-*`. No new tracked helper, dependency or application code was added.
- `bun tmp/domain/verify-docs.ts` exited0: out-of-scope tracked bytes preserved against the reviewed foundation, existing index bytes preserved with only the new rows appended, 45 relative link targets and 21 Bash fences checked, private token mode0600 and safe logs checked, `git diff --check` passed. Evidence: `tmp/domain/docs-verification.json`, `.log`, `.exit`. The same checks cover manifests/locks, application/security/storage source, examples, workflows, prior tracking and prototype preservation. Short verification ran from the owned checkout, not another deployment.
- Build hashes: `dist/index.js` SHA-256 `99d1a355d87a866a78eabea55861e2177de833c0af73d9952cf418f9000a8c9a`; `web/dist/index.html` SHA-256 `8c0f4b689e8d318bc099be1240eddcca17300cee99ecc18df15cf781f4e3f9e6`. Full served-asset transport was checked against the remaining build bytes by the local harness.
- Scoped configuration/documentation review found no remaining high-confidence introduced defect. Infrastructure acceptance remains blocked, with the exact failing checks above. No unchanged aggregate CI/native/binary/release suite was repeated, and no source or design review status is expanded by these checks.

| Severity | Count | Status |
| --- | --- | --- |
| CRITICAL | 0 | No introduced finding |
| HIGH | 0 | No introduced finding |
| MEDIUM | 0 | No introduced finding |
| LOW | 0 | No remaining introduced finding |

**Review verdict: prepared configuration passes scoped review; HTTPS delivery is blocked and incomplete.**


### Supplied published-endpoint evidence (2026-09-08)

- Incorporated independently supplied deployment metadata: the containing runtime's internal nsl port3003 is published at `http://192.0.2.5:33003`. Raw resource identity and attribution remain only in ignored `tmp/domain/topology-supplied.txt`; no new infrastructure inspection or process/configuration change was performed for this amendment.
- The supplied request at **2026-09-08 02:12:52 UTC** used `curl --noproxy '*' --connect-timeout 3 --max-time 10 -H 'Host: diag.example.test' http://192.0.2.5:33003/api/health` and observed HTTP200, the nsl response marker, DiagramDock success/status ok and expected security headers. This request was not personally repeated here, and no new local command exit is claimed. Reachability is established only from the current environment, not from the separate HTTPS ingress runtime.
- The prepared tuple is exact hostname `diag.example.test`, existing HTTPS termination, candidate upstream `http://192.0.2.5:33003`, original Host preserved and full path including `/api` retained. The published endpoint is stable across nsl child-port changes. Do not configure external ingress with host port3003, remote loopback or transient child ports. No strip, Host rewrite, arbitrary origin, auth/CSRF bypass or generic tunnel is introduced.
- Supplied scoped negative observations found no local ingress listener/configuration or accessible ingress management path. They do not identify the proxy technology, actual configured upstream or root cause. A supplied text-status parsing/broken-pipe CLI error was followed by a successful real proxy request and is not evidence of daemon failure or an application defect.
- The candidate tuple has not been applied to the external ingress. The missing input is existing ingress management location/access; no renewed implementation approval is requested. Actual ingress-to-published-upstream connectivity and normal-TLS exact-hostname HTTP/browser/save acceptance remain pending. Prior502/browser failure evidence and the live owned demo/old independent preview remain unchanged. DOMAIN-001 stays in_progress and PLAN-006 implementing with the prepared/blocked disposition.
- Amendment verification: only the deployment guide, PLAN-006 and DOMAIN-001 changed; their relative links exist, all four deployment Bash fences parse, private resource identity is excluded from public text, every other tracked byte remains unchanged, and `git diff --check` passed. The focused documentation check exited0; evidence is `tmp/domain/topology-amendment-check.json` and `.exit`. No HTTP/browser/build/lifecycle checks were repeated for this supplied-evidence update.

### Changed-state continuation: investigation and proposal (2026-09-08)

The existing in_progress claim remains owned by Deployment maintainer and was re-read with both indexes before work. The clean retained branch was synchronized only with the exact specified local reviewed deployment revision `881dbe259cc30a507dec2c43b75425e9df25d9aa`, preserving `82584a8` and ignored runtime/evidence. The supplied nonsecret normal-TLS health response now indicates HTTP200; this is health-only evidence of an unknown external state change, not an ingress change performed here. Prior failures remain history and no correction-attempt count is increased.

The focused changed-state investigation/proposal is appended to [PLAN-006](../plan/PLAN-006.md). Original day-level 2026-09-08 authorization covers the remaining acceptance. Existing helpers were inspected and will not be run with their unconditional sample restoration. Fresh ignored checks will use exclusive disposable files in the retained demo root, preserve existing user bytes with identity/version guards, use separate test sessions, revoke only those sessions, and leave the live service/token unchanged. Complete only the domain task/plan after actual normal-HTTPS API/browser/save/security/assets/layout checks and scoped review pass.

### Recovered HTTPS checks and precise remaining gate (2026-09-08)

**Result: HTTPS access and authenticated behavior verified; complete domain acceptance remains partial because of a reproduced narrow-screen drawer defect.** DOMAIN-001 remains in_progress and PLAN-006 implementing. The remaining gate has changed from external ingress failure to an application layout correction outside this task's permitted source edits. No previous failure or completed MVP task is relabeled.

- Synchronization commit `e470ca3` preserved the prior delivery and exact specified local foundation. Changed-state proposal/check-source commit: `ebcd8a85387d66bcdc3882519f5952b4f88a5234`. The retained build from `d107cbd` was reused; app/config/manifest/lock/build-input bytes match and the two previously recorded build hashes are unchanged. No install, build, service restart or credential rotation occurred.
- Fresh normal-TLS HTTPS probes and real Chromium 153.0.8010.12 requests reached `192.0.2.7:443`. The current DNS A answer is `192.0.2.7`, with no AAAA answer. Browser security details report TLS 1.3 and issuer YR1; prior `192.0.2.1`/YR2/502 records remain historical. The unknown external state change was not performed here. Actual end-to-end success no longer requires acquiring ingress management access; its actual configuration/owner remains unknown. The prepared stable upstream remains `http://192.0.2.5:33003` with original Host/full path.
- Verified the exact HTTPS page equals retained `web/dist/index.html`, health matches the expected nonsecret envelope, anonymous session=false and tree 401. All 92 current emitted asset files, including lazy Mermaid chunks, match the build; the shell is an additional separate item. Unknown asset/.env/package/source/arbitrary-path requests returned 404. This is real HTTPS evidence, not a substituted Host probe.
- The independent API session passed exact-origin login/session/tree/document, Secure/HttpOnly/SameSite=Strict/Path=/api flags and HSTS; missing/wrong Origin and CSRF each returned 403 while the fixture's identity/bytes stayed unchanged. A BOM/CRLF multi-block Markdown file saved with expected full-file SHA and exact unrelated prose/block bytes; a direct external edit changed revision and stale save returned typed 409 without overwriting external bytes; guarded local deletion led to typed 410. Logout revoked only that test session and subsequent use was rejected.
- An independent real browser session passed normal HTTPS login and automatic Secure-cookie transport. HttpOnly hid the cookie from document.cookie; authenticated same-origin fetch restored session state. Browsed/rendered flowchart and sequence families; three desktop/narrow source saves returned 200 and matched exact persisted bytes/full-file revisions. An active-content Mermaid directive/link was rejected with a labeled last-valid preview and no outbound request/unsafe SVG element. Desktop 1440×920 and narrow 390×844 Source/Preview panes worked; UI logout confirmation and old-cookie rejection passed with zero unexpected runtime/console/network/resource errors. Its initial outer-popup-width assertion did not check inner drawer containment, so browser exit 0 alone is not full layout acceptance.
- Personally inspected `desktop-flowchart.png`, `desktop-sequence.png`, `narrow-source.png`, `narrow-preview.png`, `narrow-files.png`, `drawer-unmodified.png` and `drawer-candidate-diagnostic.png` in the fresh evidence directory. The first four show working source/preview states; the narrow drawer shows contents spilling past the popup/viewport. The last image is only an isolated candidate diagnosis, not the deployed UI. No screenshot includes credentials, and trace/video were disabled.

#### Narrow drawer finding and minimal correction

**MEDIUM: drawer contents overflow a narrow viewport with a supported long filename.** `web/src/index.css:215` fixes `.file-drawer` width at 300 pixels but inherits an implicit grid column from the shared dialog. At390 viewport width, the popup spans x45–345 while its 397.406-pixel column puts description/tree/nav right edges at 458.406 and the search input at 446.406; popup scrollWidth is 413. This is a real visible clipping/usability issue, not an ingress or auth defect.

A new independent diagnostic session reproduced those bounds on the unmodified application. Temporarily adding `grid-template-columns: minmax(0, 1fr)` to `.file-drawer` in that browser reduced the column to 268 pixels, popup scrollWidth to 300, and children right edges to 329 or less. Removing the temporary style restored the same failure. The proposed smallest correction is that single property in the existing `.file-drawer` rule plus a focused long-filename/narrow child-containment regression. Application source/build/service was not modified. The exact correction and evidence were reported before any source-scope expansion. Route this bounded fix before completing the domain task; final integration/design approval is not implied.

#### Fresh evidence and lifecycle

All new records are in ignored `tmp/domain/acceptance-20260908T031549Z/`; original failed logs/statuses/screenshots are untouched. Long acceptance and helper checks ran in the retained project tmux checks window, preserving the domain window and shared daemon. Raw authenticated request/config/body/header data is owner-only; publish only the safe summaries below.

| Command or gate | Actual status | Evidence in the fresh directory |
| --- | --- | --- |
| `bun preflight.ts` | 0: normal HTTPS shell/health/anonymous/92 assets; retained owner/root/runtime/build checks | `preflight.log`, `preflight.exit`, `preflight-result.json`, `assets.json`, `public-observations.json` |
| `bun api.ts` | 0: auth/security/BOM-CRLF save/conflict/deletion/revocation | `api.log`, `api.exit`, `api-primary.exit`, `api-result.json`, `api-observations.json` |
| `bun browser.ts` | 0 for recorded functional assertions; later visual drawer finding remains open | `browser.log`, `browser.exit`, `browser-primary.exit`, `browser-result.json`, `browser-audit.json`, `browser-transport.json` |
| Actual unmodified drawer containment | 1: content overflow confirmed | `drawer-acceptance.exit`, `drawer-before.json`, `drawer-unmodified.png` |
| `bun drawer-probe.ts` | 0: reproduced failure and demonstrated candidate in isolated browser only | `drawer.log`, `drawer.exit`, `drawer-primary.exit`, `drawer-result.json`, `drawer-candidate.json` |
| `bun postflight.ts` | 0: original sample identities/bytes, token metadata and live route/process preserved; test cleanup confirmed | `postflight.log`, `postflight.exit`, `postflight-result.json` |

The retained root is still actual supported overlay/`0x794c7630`, device 70, mount 318 with matched descriptor device `0:70`. The same owner route/process start identity and Bun 1.4.2 process remain live. Exact private ownership/root/token paths remain in existing deployment records and private handoff. All three existing sample files matched their initial bytes and inode/device identities after acceptance. No committed-example recopy or blind restoration occurred. Three fresh uniquely named files were created exclusively inside the same root; only owned content was edited, with root/file identity plus hash checks before direct edits/deletion/cleanup. All three files were removed after checks, and only the three isolated test sessions were revoked. Token inode/size/mtime/mode 0600 was unchanged. The independent previous preview remained healthy; no other user session was queried or invalidated.

Check statuses were written before cleanup and final process statuses captured immediately by the outer shell. The diagnosis stored its failing acceptance status separately from its successful reproduction status. Source snapshots of executed helpers are retained in `executed-source/`; subsequent helper changes are limited to strict typing and lint formatting. Practical final-compare/rename and local OS actor limits, the historical `applicationSafetyPassed=false` diagnostic, direct external editing and prototype needs-review remain unchanged.

#### Recovered scoped review and quality

Applied the shared/backend review guidance and relevant frontend boundary review to the retained configuration, guarded test lifecycle, actual screenshots and scoped documentation. The exact HTTPS origin, Host/path handling, authentication/storage policies and application bytes remain unchanged. One MEDIUM existing application finding remains open: narrow drawer child overflow, reproduced above. No CRITICAL/HIGH finding or introduced configuration/documentation defect was found. This is a finite partial handoff for the identified correction, not completed HTTPS acceptance or a reopened historical MVP review.

- Focused strict TypeScript and explicit ESLint checks passed with exit 0: `node node_modules/typescript/bin/tsc -p tmp/domain/acceptance-20260908T031549Z/tsconfig.json --noEmit` and `node node_modules/eslint/bin/eslint.js --no-ignore --max-warnings 0 --config tmp/domain/eslint.config.ts tmp/domain/acceptance-20260908T031549Z/*.ts`. Final evidence: `typecheck.log`/`.exit` and `lint.log`/`.exit` in the fresh directory. Initial Buffer/DOM typing and import/format lint findings were corrected only in ignored helpers; their original failing logs/statuses remain in the same directory. No functional HTTPS/browser test was relabeled or rerun to conceal the drawer failure.
- `bun tmp/domain/acceptance-20260908T031549Z/verify-final.ts` exited 0: all tracked bytes outside the five changed domain documents are preserved against the synchronized foundation, both indexes are unchanged, 70 relative link targets exist, 22 Bash fences and nine runtime/check shell scripts parse, and 391 private request files have mode 0600. The token remains mode 0600 under an owner-only directory. Evidence: `final-docs-result.json`, `final-docs.log`, `final-docs.exit`. `git diff --check` passed. The new verification helper's initial import-order lint finding was retained and corrected before the final successful lint.
- No redundant aggregate CI/native/binary/release gate ran, because application, dependency, security/storage and design bytes are unchanged. The current live HTTPS endpoint has actual functional browser evidence from this environment; independent-client public reachability remains untested.

**Review verdict: scoped deployment/evidence documentation is reviewable; full domain acceptance remains incomplete solely on the reproduced narrow drawer gate.** The retained service stays available, with no test-session or disposable-file cleanup pending. DOMAIN-001/PLAN-006 and only their existing incomplete markers remain unchanged.

#### Supplied correction context after the finite check round (2026-09-08)

The recorded HTTPS/API/browser results describe the retained `d107cbd` build and the exact fixtures exercised above. Separately supplied browser evidence reports that an ordinary 16-node Unicode flowchart with six bare `<br/>` breaks is rejected by the current renderer's global `<` restriction; replacing only those breaks with spaces renders 16 nodes, with no save requests. This report was not independently repeated by this deployment task. The original source has not been shown to render successfully in the current deployment, so the earlier functional results do not establish complete product readiness.

Separate renderer and layout corrections are pending. The supplied layout review confirms the recorded child overflow and that the browser-only grid declaration is diagnostic, not an applied fix. This documentation amendment does not change either correction's implementation or evidence. No compatibility or ingress investigation, source edit, build, restart, root/token change or user-session reset is performed.

A later bounded deployment continuation requires the exact accepted combined source revision after both corrections have been reviewed and integrated. That continuation must preserve the existing root, token and user edits, minimize unavoidable session disruption, and verify both the unchanged original diagram source and actual narrow drawer containment through HTTPS. This round ends with its precise partial result and no wait for those corrections. Historical failures, successful scoped checks and the two pending corrections remain distinct.

Amendment review verified the supplied-evidence attribution and the deferred deployment boundary. Only these three domain documents changed; all other tracked bytes and both index markers remain unchanged. The focused scope-preservation check and `git diff --check` exited 0, recorded in `tmp/domain/acceptance-20260908T031549Z/pending-corrections-scope.*` and `pending-corrections-diff.*`. No runtime/browser/application check was repeated for this documentation-only amendment.

#### Accepted corrected deployment claim and proposal (2026-09-08)

Deployment maintainer retains the existing in_progress claim, re-read with both indexes. The explicitly accepted local integration `a66276ade586cf4ce51d0b4c40aae91db7124fe2` was synchronized by fast-forward from the clean prior delivery; no remote fetch or other branch integration occurred. Original 2026-09-08 domain/bug authorization now concretely covers the corrected deployment. The focused investigation/proposal is appended to PLAN-006 and committed before build or lifecycle mutation.

The retained owner/process/root/token was inspected without disclosing credentials. Application inputs match the supplied tested combined merge, dependencies remain unchanged and the pinned runtime is present. Prepare and validate the full build before one controlled restart; retain the old build for recovery and the same root/token, with an honest reauthentication requirement. Fresh exact HTTPS original-source, descendant-containment, security/save and guarded-cleanup acceptance will determine completion. All historical failures and partial successes remain intact; new hosted x64/ext4 acceptance is independently pending.

#### Corrected live HTTPS deployment completed (2026-09-08)

**Result: scoped corrected HTTPS acceptance is complete.** The accepted renderer and layout corrections now run at `https://diag.example.test`; no independent-client public reachability is claimed. The subsequently supplied native/package result is recorded separately below. Earlier 502 responses, initial recovered functional passes, actual drawer failure, browser-only style and supplied original renderer failure remain historical, with no record overwritten.

Provenance: the clean local synchronization fast-forwarded to accepted `a66276ade586cf4ce51d0b4c40aae91db7124fe2`; investigation/proposal and original authorization were committed as `208973e4319ce654fc0dda3a2a3a4f9f8fbc04a4` before building or deployment. Application, tests and build inputs are byte-identical to the supplied tested combined merge `7ecb47d4f91b0b1a157379ac0bcc88fde53c18cb`. Manifests/locks did not change, so the validated existing installation was reused. Fresh Bun 1.4.2 production build succeeded with Node 24.20.0 present; the existing large-chunk advisory remains visible. No application, dependency, workflow, auth/storage or prototype change was authored by this task.

##### Build and controlled lifecycle

Fresh records are in ignored `tmp/domain/corrected-20260908T035741Z/`. The `previous-build/` subdirectory preserves the old backend/frontend assets and launcher/service/owner records. The current process loads the asset map once, allowing the new build to be prepared while the old service stays healthy. All 93 trusted startup resources were validated before stopping; no user-root contents were copied into a build or restored from examples.

Immediately before stopping, the recorded process PID/start/command/cwd, runtime executable, root and token metadata matched the retained owner. Only the owned domain tmux window received Ctrl+C. Both old processes disappeared, the selected route was absent and the former listener returned curl exit 7 before non-force startup. The group interrupt did not yield a normal launcher exit code; the explicit process/route/listener checks establish stopping without calling that missing exit successful. The new route keeps `/`, unchanged Host and path, production/prefixed mode, exact HTTPS origin and secure cookies. Its private PID/start/runtime/port records are in `new-owner-private.json` and the current `tmp/domain/route-owner.json`.

Exactly one restart was necessary. It invalidated existing in-memory sessions; users sign in again using the unchanged token. Root device/inode/owner/mode and token inode/device/owner/mode/size/mtime were preserved. The root remains verified overlay `0x794c7630`, device 70, mount 318 with device pair `0:70`; it is still a disposable demo on temporary storage. The independent prior preview remained healthy. Shared daemon/routes, ingress/DNS/Docker configuration and accounts were not changed.

Build SHA-256 values:

- Backend `dist/index.js`: `99d1a355d87a866a78eabea55861e2177de833c0af73d9952cf418f9000a8c9a` (unchanged backend).
- Corrected `web/dist/index.html`: `33a1ea5619f6e35d193c5421ae0167d7c78362de8b7f9fc32eb07302811c57d5`.
- Original source fixture: `0d95ee02341f7fa2e0b80abcf76bc5654ef7662d248c0e6cb30ac1ff73d3aeec`, exactly 991 UTF-8 bytes.

##### Actual HTTPS acceptance

Normal curl and Chromium 153.0.8010.12 requests used the exact hostname and reached `192.0.2.7:443`. DNS A is `192.0.2.7`; AAAA returned no answer. Curl certificate/hostname verification was zero; browser TLS was 1.3 with issuer YR1. The ingress operator/configuration change remains unknown. The stable prepared upstream remains `http://192.0.2.5:33003` with original Host/full paths, without claiming that its external setting was inspected or changed.

Before login, the page and health returned 200, anonymous session was false, anonymous tree returned 401, and all **92 asset files plus one page shell** matched current build bytes, lengths, MIME and security headers. Lazy Mermaid chunks were included. Unknown asset/config/source/arbitrary-file paths returned 404. This is exact HTTPS transport evidence, not a local Host substitution.

The private API session passed exact-origin login/session/tree/document, secure cookie flags, missing/wrong Origin and CSRF 403 with unchanged fixture identity/bytes, real Markdown save preserving BOM/CRLF/prose/the other block and full-file revision, direct external-edit typed 409 without overwriting external bytes, detected deletion 410 and session revocation. Explicit rejection controls remain separate from unexpected-error auditing.

The independent main browser session checked automatic Secure/HttpOnly/SameSite=Strict/Path=/api cookie transport before rendering. The unchanged original source was inserted into an exclusively owned fixture, retained as a draft across selection, saved once deliberately and reloaded. Editor/draft/request/disk/reload preserve all 991 bytes. All 16 node labels and seven nonempty branch labels match the original; six explicit line breaks end actual SVG text rows separated by about 15.4 units, with additional ordinary wrapping allowed. Geometry proves positive visible text bounds; no literal break tags or active/resource SVG survived. Zero implicit PUTs and exactly one explicit original-source PUT were recorded.

Seven permitted bare-break spellings render actual node/edge rows. Eight hostile neighboring forms remain rejected with a last-valid preview, no active DOM or external request. A real syntax error is visible in the inspected source/preview screenshot; recovery, Fit and zoom work. Actual desktop and narrow source/preview captures were inspected.

At 390×844 and 360×844, the actual CSS contains the grid correction without injected styles. Popup clientWidth/scrollWidth is 300/300, column width 268, and every measured container/descendant has zero horizontal scroll delta. Popup/content right bounds are 345/329 and 330/314 respectively; the wrapped description has height/scrollHeight 40/40 and two visible lines. The real owned long nested target was awaited before the unfiltered measurements, then filtered and selected with repeated containment checks. Focus cycling, Escape restoration, retained drafts, Source/Preview tabs and desktop interaction pass. Evidence measures 25 descendants unfiltered and 10 filtered at both widths.

##### Retained browser-helper failure and focused completion

The main browser process exited **1**, after the above assertions, at its final UI logout. Its own draft was dirty, so the application correctly showed **Discard drafts and log out**; the helper incorrectly requested **Confirm log out** and timed out. The screenshot and actual workspace branch establish this as a test-helper state assumption, not an application defect. Its fallback revoked that isolated session and guarded cleanup removed the owned child tree. The raw result's aggregate `passed=false` and cookie flag derived from that aggregate remain untouched; they are not a fresh cookie failure or a successful process exit.

A separate focused browser session then exercised the dirty-draft confirmation using the actual label, with concurrent click/response waiting. It verified secure cookie transport again, DELETE 200, old-cookie tree 401, anonymous session=false, zero PUTs and unchanged fixture bytes. It exited **0**, revoked only its own session and removed its own fixture. No full functional or aggregate CI/browser suite was repeated. `executed-source/browser.ts` retains the failing helper; the current ignored helper has the corrected locator/wait for future use, without claiming a new full-sequence run. All browser audits recorded zero unexpected application console/runtime/network errors.

##### Commands, exits and inspected evidence

All commands below used the pinned local Bun or the verified Node runtime. Long build/check/browser processes ran in the existing tmux checks window; the domain window retained the service. Each outer shell wrote its immediate exit, and test primary statuses were captured before cleanup.

| Actual command/check | Exit/result | Relative evidence within the fresh directory |
| --- | --- | --- |
| `bun prepare.ts` | 0; live ownership, existing entries, token metadata and previous build preserved | `prepare.log`, `prepare.exit`, `prepare-result.json`, `before-private.json` |
| `bun run build` | 0; complete corrected SPA and API | `build.log`, `build.exit` |
| `bun build-verify.ts` | 0; 93 startup resources and corrected CSS, old service still owned | `build-verify.log`, `build-verify.exit`, `build-result.json`, `built-assets.json` |
| `bun stop-prepare.ts`, owned tmux stop/start commands | 0 command exits; missing normal interrupted-launcher exit explicitly retained | `stop-prepare.exit`, `tmux-stop-command.exit`, `tmux-start-command.exit`, `stop-intent-private.json` |
| `bun stopped.ts` | 0; exact old PIDs/route absent, old listener curl 7 | `stopped.log`, `stopped.exit`, `stopped-result.json` |
| A/AAAA DNS queries and `bun preflight.ts` | 0 each; normal HTTPS bytes/MIME/security and new ownership | `dns-A.*`, `dns-AAAA.*`, `preflight.exit`, `preflight-result.json`, `public-observations.json`, `new-owner-private.json` |
| `bun api.ts` | 0, primary 0; all authentication/save/conflict/deletion/logout controls | `api.log`, `api.exit`, `api-primary.exit`, `api-result.json`, `api-observations.json` |
| `bun browser.ts` | 1, primary 1; original/render/save/layout assertions completed before wrong logout-label timeout | `browser.log`, `browser.exit`, `browser-primary.exit`, `browser-result.json`, `browser-audit.json`, `browser-transport.json`, `original-source-result.json`, `break-security-result.json` |
| `bun logout.ts` | 0, primary 0; focused actual dirty-draft UI logout and revocation | `logout.log`, `logout.exit`, `logout-primary.exit`, `logout-result.json` |
| `bun postflight.ts` | 0; combines the explicit checks and verifies original entries, credential/root, cleanup and retained service | `postflight.log`, `postflight.exit`, `postflight-result.json` |

Personally inspected all 13 fresh screenshots: `original-desktop.png`, `original-detail.png`, `original-svg.png`, `original-narrow-preview.png`, `original-narrow-source.png`, `drawer-390.png`, `drawer-390-filtered.png`, `drawer-360.png`, `drawer-360-filtered.png`, `drawer-desktop.png`, `syntax-last-valid.png`, `browser-stage-failure.png` and `logout-dirty-confirmation.png`. The last two distinguish the failed helper assumption from the correct draft-discard UI. Captures exclude credentials; trace/video are disabled. Detailed descendant measurements remain in `drawer-390-unfiltered.json`, `drawer-390-filtered.json`, `drawer-360-unfiltered.json` and `drawer-360-filtered.json`.

##### Preservation and scoped review

Postflight compared every original root entry: all three existing files and their directory retain exact bytes, inode/device and ownership/mode metadata. Four exclusive test files and three child directories were removed only after content/identity checks; no examples were recopied and no existing user edit was restored or overwritten. Three independent test sessions were revoked. The corrected service, original root/token and useful evidence remain; no temporary browser or test service remains. Token values and raw authenticated request/session data stay in owner-only ignored files and are excluded from public documentation/metadata.

Applied the shared/backend/frontend-boundary review guidance to build preparation, exact route ownership, graceful stop/start evidence, strict origin/cookie/storage behavior, guarded fixtures, screenshot findings and separated command outcomes. No high-confidence introduced application/configuration/documentation defect remains. The original renderer/layout findings are resolved by the accepted source corrections and fresh live evidence, not by relabeling old failures. Hosted x64/ext4 validation was separately pending at this handoff; the subsequent supplied evidence below resolves that status for the exact corrected candidate. No unchanged full CI/native/binary/release gate ran here. Practical final-compare/rename and local OS actor limits, direct external editing, historical `applicationSafetyPassed=false`, prototype needs-review and final integration/release boundaries remain unchanged.

Final focused quality:

- `node node_modules/typescript/bin/tsc -p tmp/domain/corrected-20260908T035741Z/tsconfig.json --noEmit` and the corresponding `tsconfig.runtime.json` command exited 0. Browser DOM helpers and the Bun-only startup asset helper use separate strict environment configurations, preserving the repository's strict options. The initial combined configuration exited 2 because of DOM/Bun response typing and a local `document` shadow; these helper-only issues were corrected without application edits. Initial logs/statuses remain `typecheck-initial.*`.
- Explicit `node node_modules/eslint/bin/eslint.js --no-ignore --max-warnings 0 --config tmp/domain/eslint.config.ts tmp/domain/corrected-20260908T035741Z/*.ts` exited 0. Initial formatting/import/member-spacing findings exited 1 and remain in `lint-initial.*`; formatting exited 0. Final `typecheck.*`, `runtime-typecheck.*`, `lint.*` and `quality.exit` retain actual successful exits, including the corrected unused-in-this-round full-browser logout helper.
- `bun tmp/domain/corrected-20260908T035741Z/verify-docs.ts` exited 0: all tracked application/security/storage/dependency/workflow/design and other tracking bytes preserved against the accepted integration; only the DOMAIN/PLAN-006 index markers changed; 78 relative links, 22 Bash fences and 10 runtime/check scripts verified. All 394 private request files checked have mode 0600. `git diff --check` passed. Evidence: `docs-result.json`, `docs.log`, `docs.exit`.

| Severity | Remaining introduced findings |
| --- | --- |
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 0 |

**Review verdict: PASS for this corrected live domain deployment and its explicitly combined acceptance evidence.** DOMAIN-001 and PLAN-006 are completed, with only their own index markers changed. The corrected service remains running for access; final integration, release and prototype approval are not implied. The subsequently supplied exact-candidate native/package evidence is distinct from this live deployment verdict.


#### Supplied final corrected native/package evidence (2026-09-08)

Inspected the explicitly supplied read-only log and package audit reports after the completed live handoff. Independent reviewers had checked the actual hosted log and downloaded executable, including a second strict package validation; this deployment task inspected those reports and did not rerun or redownload the artifact. Copies are retained under `tmp/domain/native-supplied-a662/` as `log-audit.json`, `package-audit.json` and `package-cross-check.json`. No live service, token, root or user file was touched for this amendment.

[Run 34185410383, attempt 1](https://github.com/itxje/diagramdock/actions/runs/34185410383) completed successfully at clean exact candidate `a66276ade586cf4ce51d0b4c40aae91db7124fe2`, with publication skipped. Supplied log SHA-256 is `5c9fbb7deee34317441b313f977a2e301933c6e546e59d9f4e0f3ecace28be09`. Actual Linux x64/Bun 1.4.2 used ext4 `0xef53`, device `66305`, mount `27` / `259:1`, plus actual tmpfs refusal `0x1021994`, device `26`, mount `32` / `0:26`. The separately executed Node version was 24.20.0; Bun's `nodeCompatibility=26.3.0` is a different diagnostic. All 20 raw stages plus files/http (22 stages) exited 0 with null signals, no failure and cleanup true. Source-only pending native acceptance preceded the final executable aggregate `result=passed`, `nativeAcceptance=passed`, `cleanup=true`.

The actual emitted log records 152 backend, 83 frontend and 18 release tests, plus 27 executable browser cases, 93/93 resources and four lazy families with zero unexpected errors/external requests. Counts overlap. Refusal/supported trace summaries respectively record one execution, 8/333 paired calls, 404/23,916 file accesses and 0/17 writes; both report empty PATH, zero checkout access and no frontend extraction. Successful raw child JSON and raw syscall traces were not uploaded or replayed. Hosted loopback listeners were disposable tests, not the domain preview.

Downloaded artifact 10040368867 contains exactly three regular nonsymlink files. The independently hashed executable `diagramdock-0.0.0-ci.fixture-linux-x64` is 85,485,024 bytes, SHA-256 `2d26b672babfa80b14f802f5a051e46c96ea738fbe1c4f76d55b66d168952010`, matching SHA256SUMS and the real package log. Strict manifest/candidate/version `0.0.0-ci.fixture`/tag `v0.0.0-ci.fixture`/Bun 1.4.2/target `bun-linux-x64`/93-unique-resource/ELF64 little-endian machine-62 checks passed. Supplied independent resource comparison matched all 93 sizes/hashes to the current build; this task did not repeat it. The actual executable requires the dynamic Linux loader `/lib64/ld-linux-x86-64.so.2` and normal system libraries. No x64 execution on local ARM64, static/all-OS claim or real tag/release follows.

The exact corrected candidate's native and downloaded-package acceptance is now **PASS**, replacing the prior pending status while retaining its chronology. Old failed run 34166805672, older successful run 34168525432 at `4ca471274d3ffa76469f8b2e87d4abd7055aa764`, local overlay results and the historical `applicationSafetyPassed=false` diagnostic are unchanged. This supplements, rather than replaces, this task's actual HTTPS/save/security/guarded-cleanup evidence. A separately supplied read-only browser check also verified the later user-modified 993-byte overview block without saving; that user content and any newer edits must never be overwritten with examples or the 991-byte disposable fixture. No cause is asserted for an unobserved client-specific rendering failure.

Scope review retains completed DOMAIN-001/PLAN-006 and unchanged index markers, source, service and credentials. Prototype needs-review, practical final-write-window/OS-actor limits, final main approval and first real release remain separate.

Amendment verification: only the five domain documentation paths changed; source and both indexes remain byte-identical to the prior live handoff. Scope preservation and `git diff --check` exited 0, 56 relative link targets exist, and public text excludes private coordination paths/identities. Evidence is `tmp/domain/native-supplied-a662/docs-review.json`, `docs-scope.*` and `docs-diff.*`. No application/runtime/native/package gate was repeated.
