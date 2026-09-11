# HTTPS domain deployment

Hostnames and network addresses of the hosted instance are withheld from this repository: `merdeck.example.test`, `diag.example.test`, `*.example.test` and addresses in `192.0.2.0/24` stand in for the real ones. Commit identifiers below refer to the history before the repository was reset on 2026-09-11.

## Current status

**2026-09-11 update detection:** the instance in the same `domain` window was stopped and relaunched from the main checkout with a build of the sources committed as `e5de951`, which adds a build identity and update notices, keeping the `merdeck` nsl route, demo root and open access. Its service processes exited and its route disappeared before the relaunch. After the restart `https://merdeck.example.test/api/health` returned 200 with service `merdeck`, and `/` and `/favicon.svg` returned 200. GET `/api/build` returned the identity that the live shell and the local build carry. A real browser session confirmed that the current build shows no notice while a page carrying an older identity shows one; see [UPDATE-001](task/UPDATE-001.md). Earlier the same day, the `/design` prototype preview route was stopped at the owner's request.

**2026-09-11 open access and new checkout location:** at the owner's request the checkout moved from `/workspace/diagramdock` to `/workspace/merdeck`. The instance was relaunched from it in the `domain` window of the project tmux session for the new path, with a build of the sources committed as `e52c150`. The owner-private launcher now runs the service with open access (`MERDECK_OPEN_ACCESS=true` and no `MERDECK_TOKEN`), so the live site opens without signing in; the previous token is kept privately in case sign-in is required again. The demo root and the `merdeck` nsl route are unchanged. The previous service processes exited and the route disappeared before the relaunch, while the unrelated `/design` route stayed. After the restart `https://merdeck.example.test/api/health` returned 200 with service `merdeck`, and `/` and `/favicon.svg` returned 200. Session status reported open access without a cookie, and writes without the exact Origin were refused. A real browser session found no sign-in or Log out, then created and deleted a uniquely named check folder, leaving nothing behind; see [AUTH-001](task/AUTH-001.md). Anyone who can reach this hostname can now read, change, move and delete the demo root's diagram files.

**2026-09-11 explorer file management:** the instance in the same `domain` window was stopped and relaunched from the main checkout with a build of the sources committed as `5fcbe55`, keeping the `merdeck` nsl route, demo root and token. That build adds file and folder operations to the explorer and removes duplicated footer and status bar labels. Its service processes exited and its route disappeared before the relaunch, while the unrelated `/design` route stayed. After the restart `https://merdeck.example.test/api/health` returned 200 with service `merdeck`, and `/` and `/favicon.svg` returned 200. A real browser session then created, renamed and deleted a uniquely named check folder and file on the demo root through the explorer, and confirmed that nothing remained; see [FILE-002](task/FILE-002.md).

**2026-09-11 explorer selection:** the instance in the same `domain` window was stopped and relaunched from the main checkout with a build of the sources committed as `be74405`, which selects Markdown diagrams from the explorer only, keeping the `merdeck` nsl route, demo root and token. Its service processes exited and its route disappeared before the relaunch, while the unrelated `/design` route stayed. After the restart `https://merdeck.example.test/api/health` returned 200 with service `merdeck`, and `/` and `/favicon.svg` returned 200. A real browser session then verified that the diagram tabs are gone, that a single filled selection is visible in both colour schemes, and that diagrams can be chosen from the narrow drawer; see [LAYOUT-004](task/LAYOUT-004.md).

**2026-09-11 header redesign:** the instance in the same `domain` window was stopped and relaunched from the main checkout with a build of the sources committed as `59e8a50`, which redesigns the header controls and restores icon sizes, keeping the `merdeck` nsl route, demo root and token. Its service processes exited and its route disappeared before the relaunch, while the unrelated `/design` route stayed. After the restart `https://merdeck.example.test/api/health` returned 200 with service `merdeck`, and `/` and `/favicon.svg` returned 200. A real browser session then verified the new header, its tooltips and icon sizes, the theme preference across a reload, the narrow layout and the file drawer; see [LAYOUT-003](task/LAYOUT-003.md).

**2026-09-10 signed sessions:** the instance in the same `domain` window was relaunched from the main checkout with a build of the sources committed as `2e82365`, keeping the `merdeck` nsl route, demo root and token; the owner-private launcher now also sets `MERDECK_SESSION_TTL_SECONDS=86400`. HTTPS `/api/health`, `/` and `/favicon.svg` returned 200. A browser signed in after that relaunch stayed signed in across a further stop and start of the service, and logout still signed it out; see [SESSION-001](task/SESSION-001.md). Cookies issued before this relaunch were unsigned, so those browsers signed in once more.

**2026-09-10 resizable panes and readable node labels:** the instance in the same `domain` window was stopped and relaunched from the main checkout with a build of the sources committed as `acf180d` (resizable and collapsible panes) and `c135e5f` (readable node labels), keeping the `merdeck` nsl route, demo root and token. After the restart `https://merdeck.example.test/api/health` returned 200 with service `merdeck`, and `/` and `/favicon.svg` returned 200. Real-browser checks are recorded in [LAYOUT-002](task/LAYOUT-002.md) and [PREVIEW-003](task/PREVIEW-003.md). As before, the restart required signing in again; [PLAN-014](plan/PLAN-014.md) proposes keeping sessions across restarts.

**2026-09-10 flowchart label editing:** the instance in the same `domain` window was stopped and relaunched from the main checkout with a build of the sources committed as `9c5d466`, which adds on-diagram flowchart label editing, keeping the `merdeck` nsl route, demo root and token. After the restart `https://merdeck.example.test/api/health` returned 200 with service `merdeck`, and `/` and `/favicon.svg` returned 200. Real-browser checks are recorded in [EDIT-001](task/EDIT-001.md).

**2026-09-10 sign-in mark and preview gestures:** the instance in the same `domain` window was stopped and relaunched from the main checkout with a build of `9be0477`, which adds the sign-in brand mark and mouse wheel zoom and drag panning in the preview, keeping the `merdeck` nsl route, demo root and token. The launch command now uses the checkout's own `node_modules/.bin/nsl` (the same v0.1.7) instead of a binary inside a temporary worktree. After the restart `https://merdeck.example.test/api/health` returned 200 with service `merdeck`, and `/` and `/favicon.svg` returned 200. Real-browser checks are recorded in [BRAND-002](task/BRAND-002.md) and [PREVIEW-002](task/PREVIEW-002.md).

**2026-09-10 relocation:** the running instance was restarted from the repository's main checkout (built from `e8ef8e5`, which adds the neutral subgraph background) instead of a temporary worktree, using the same `merdeck` nsl route, demo root and token. The launcher now lives in the checkout's ignored `tmp/domain/`, and the service runs in the `domain` window of the project tmux session. HTTPS health and page checks passed after the restart. Earlier entries below remain historical.

As of the corrected 2026-09-08 deployment, **https://diag.example.test passes the scoped live HTTPS acceptance**. The accepted renderer and drawer corrections are deployed. The unchanged original diagram renders with its real label breaks, saves exactly, and the narrow drawer contains its descendants at both 390 and 360 pixels. Normal TLS, authentication, security controls, assets and guarded data preservation are verified below. Access was tested from this environment; no independently external client was tested.

Build source: `208973e4319ce654fc0dda3a2a3a4f9f8fbc04a4`, based on accepted integration `a66276ade586cf4ce51d0b4c40aae91db7124fe2`. Application/test/build inputs match the tested combined merge `7ecb47d4f91b0b1a157379ac0bcc88fde53c18cb`. Deployment introduces no application, dependency, security/storage or prototype edits. The matching corrected candidate now has independently audited hosted Linux x64/ext4 and downloaded-package acceptance, recorded below. Historical native passes remain separate results.

One authorized controlled restart activated the prepared build. The same demo root and token were preserved, but in-memory sessions were invalidated: **sign in again using the existing token**. Earlier valid-TLS 502 responses, recovered functional checks, actual drawer failure, diagnostic-only style and supplied renderer failure remain historical evidence. The external ingress change that restored HTTPS is still unknown and was not performed by this task.

**Rename scope note:** the repository documentation now targets `merdeck.example.test` and the `merdeck` nsl route in the configuration, launch and ingress guidance below. The external ingress/DNS for that hostname is outside this repository and outside this work; the user is configuring it separately. The 2026-09-08 acceptance recorded above and the probe below were performed against the live deployment's actual hostname at that time, `diag.example.test`; that record remains historical evidence and is not a claim about the new hostname.

**2026-09-09 nsl deployment (a fourth step in the rename work):** a fresh instance was deployed behind a new owner-scoped `merdeck` nsl route, built from commit `f1fe857e26760975a62f30cf6faa9017647d1ec6`. The prior demo root recorded elsewhere in this document did not survive the 2026-09-08 host restart and no longer exists, so this deployment uses a newly created, equally disposable demo root (populated fresh from committed `examples/project` on verified overlay storage) and a freshly generated token — not a resumption of the earlier root or token. The local Host-header probe against the nsl daemon (`Host: merdeck.example.test`, port 3003) passed all three required checks: `/` returned `200` with the built shell, `/api/health` returned `{"success":true,"data":{"status":"ok","service":"merdeck"}}`, and an anonymous request to the authenticated `/api/diagrams/tree` path returned `401`. The external HTTPS endpoint still does not reach this service: both `https://merdeck.example.test/` and `https://merdeck.example.test/api/health` returned **HTTP 502 "Bad Gateway"** from peer `192.0.2.1`, observed 2026-09-09 09:54 UTC. This is the same external ingress/DNS gap already described above; it is outside this repository and this work and was not configured by this task, and no tunnel, `/etc/hosts` edit, DNS change or daemon reconfiguration was attempted to work around it. **The domain is therefore verified only at the local nsl-daemon level, not end-to-end over HTTPS.** The service remains running under the `merdeck` route in the deployment tmux session (`domain` window) for the ingress owner to test once external routing is configured; see [BRAND-001](task/BRAND-001.md) for the full evidence trail.

**2026-09-09 rebuild and HTTPS verification (a fifth step, superseding the 502 result above):** the project owner approved the deck-without-wave brand mark the same day; that decision merged locally to `16cf11ce06409ac3299824e8743654b83d497069`. The deployment checkout was fast-forwarded to that commit (clean tree before and after), rebuilt with the same pinned Bun 1.4.2 and the same two frozen installs (both lockfiles unchanged), and `web/dist/favicon.svg` was confirmed to carry the approved path data and no trace of the earlier wave path. The running process was stopped in the same tmux session and `domain` window; its route and its process (previously pid 176424) were both confirmed gone before an identical relaunch of the same command produced a new process (pid 212906) under the same `merdeck` route, still on the same demo root and token. The unrelated design-preview route and the unrelated `invest` routes were left untouched throughout. External HTTPS now succeeds end to end, observed 2026-09-09 ~18:02 UTC: `https://merdeck.example.test/api/health` returned `200` with `{"success":true,"data":{"status":"ok","service":"merdeck"}}`; `https://merdeck.example.test/favicon.svg` returned `200` with the approved path data (`M4.6 8.6V17.6...`) and no wave path; `https://merdeck.example.test/` returned `200` with the built shell titled Merdeck. **The external ingress/DNS gap recorded immediately above has closed; the domain is now verified end-to-end over real HTTPS**, observed only from this environment. See [BRAND-001](task/BRAND-001.md) for the full evidence trail.

## Configuration and startup

Complete [the pinned setup and build](../README.md#setup) with Bun 1.4.2 and both frozen installs, then `bun run build`. Serve `dist/index.js` together with its sibling `web/dist`. Use one service instance per explicit root. The current deployment retains the independent demo root originally created from committed examples on verified overlay storage. Treat its current contents as user data; do not recopy examples over them. Never share this writing root with a second service. Retain the [practical-save limitations](../README.md#file-storage-and-practical-acceptance).

The private service launcher exports exactly:

```bash
export NODE_ENV=production
export MERDECK_API_MODE=prefixed
export MERDECK_HOST=127.0.0.1
export MERDECK_ALLOWED_ORIGINS=https://merdeck.example.test
export MERDECK_COOKIE_SECURE=true
# Set MERDECK_ROOT from the privately recorded canonical demo path.
# Load MERDECK_TOKEN privately from its mode-0600 file, without printing it.
# PORT is assigned by nsl run.
exec .cache/runtime/node_modules/.bin/bun dist/index.js
```

The domain launcher runs from the deployment checkout in a dedicated `domain` window of the prescribed tmux session:

```bash
session_name="$(basename "$PWD" | tr '.' '-')-$(echo -n "$PWD" | md5sum | cut -c1-6)"
tmux has-session -t "$session_name"
# Inspect only the selected route; do not replace another owner.
node_modules/.bin/nsl list | awk '/http:\/\/merdeck\.localhost:3003([ /]|$)/'
# After confirming the shared proxy is running and merdeck is absent:
node_modules/.bin/nsl run -n merdeck -- bash tmp/domain/service.sh
```

The deployed owner-specific entry point is `bash tmp/domain/launch.sh` in that checkout. It checks the running proxy and refuses an existing merdeck route before launching. Local runtime files are intentionally ignored and are not supplied by a clone. For another deployment, create equivalent owner-only launchers using the configuration above and record the chosen root/token location privately. Do not start a second instance against the retained root.

The route is mounted at `/`, with `change_origin=false` and `strip_prefix=false`. The browser API remains same-origin `/api`. The prepared ingress routing tuple is:

| Setting | Required value |
| --- | --- |
| Exact hostname | `merdeck.example.test` |
| HTTPS termination | Existing ingress; management location/access is still unavailable |
| Candidate upstream | `http://192.0.2.5:33003` |
| Upstream Host | Preserve `merdeck.example.test` |
| Request path | Preserve the complete path, including `/api` |

The containing runtime publishes its internal nsl port 3003 through the stable endpoint `192.0.2.5:33003`. That published endpoint is the candidate external ingress upstream; host port3003, remote loopback and nsl's transient child ports are not substitutes. The owner-scoped merdeck registration tracks its dynamic child port, so a service restart can change that child port without changing this published upstream.

Independently supplied deployment metadata and a request recorded at **2026-09-08 02:12:52 UTC** establish a successful probe from the current environment:

```bash
curl --noproxy '*' --connect-timeout 3 --max-time 10 \
  -H 'Host: diag.example.test' \
  http://192.0.2.5:33003/api/health
```

The supplied result was HTTP 200, the nsl response marker, Merdeck success/status ok and the expected security headers. This evidence was incorporated without repeating that request. It establishes published-endpoint connectivity only from the current environment. Later real HTTPS API/browser requests now succeed, while the ingress management location and actual upstream setting remain unknown. **This task has not applied or changed the external ingress configuration.** Retain the published upstream tuple as the prepared configuration, without treating it as an independently inspected ingress setting. Preserve Host, paths and the exact allowed origin without authentication/CSRF bypasses or generic tunnels.

## Ownership and lifecycle

Deployment owner: **Deployment maintainer**. Retained records, relative to the deployment checkout:

| Record | Location |
| --- | --- |
| Session identity | `tmp/domain/session.txt` |
| Domain launcher and private service configuration | `tmp/domain/launch.sh`, `tmp/domain/service.sh` |
| Current route process, port and start identity | `tmp/domain/route-owner.json` |
| Canonical demo root and observed storage | `tmp/domain/root.txt`, `tmp/domain/storage.json` |
| New private token, mode 0600 | `tmp/domain/token` |
| Production process output | `tmp/domain/service.log` |

The token must be opened only in a private editor and entered into the **Access token** field on the HTTPS application login screen. Do not print it, pass it as a CLI argument or URL, copy it into public notes, or capture it in a screenshot. Cookies, CSRF values and authenticated request evidence remain private. Sign-ins survive a restart with the same token and root until they expire; a new token signs every browser out. The demo lives on temporary storage and is not a durable deployment.

To stop, first verify the recorded route owner still identifies this deployment's command, working directory, process/start identity and port. Confirm the `domain` window still runs the owned launcher, then:

```bash
session_name="$(basename "$PWD" | tr '.' '-')-$(echo -n "$PWD" | md5sum | cut -c1-6)"
tmux send-keys -t "$session_name:domain" C-c
```

Check that the recorded process and listener stopped and that its route disappeared before cleanup or restart. The inspected pinned nsl run implementation removes routes conditional on its child PID under the route-store lock, so it does not delete a later replacement owner's registration. Do not use `nsl route merdeck --remove`, `--force`, daemon stop/reload or port killing as a cleanup shortcut. Leave unrelated windows/routes and the previously retained independent preview intact.

To restart, confirm the former listener is stopped and merdeck remains unclaimed, then run `bash tmp/domain/launch.sh` in the same `domain` window. nsl may assign a different port: record the new route/PID/start identity and verify health again. A controlled stop/restart was actually checked; process and route disappearance plus connection refusal were observed before restart. Group Ctrl+C did not retain a normal launcher exit code; the evidence records this limitation rather than treating it as exit 0.

For permanent cleanup, stop and verify first, then remove only the exact recorded uniquely owned demo directory and credential files. Preserve failed evidence or remove its private request material separately with explicit ownership checks. Never derive a broad deletion command from a port or delete an unrelated replacement route. The live service, demo root and private token are intentionally retained for access and the remaining acceptance correction.

## Earlier verification and retained evidence

Frozen installs, build and HTTP/browser checks ran in the deployment tmux session using the pinned local runtime; short read-only probes and documentation checks ran from the same checkout. Evidence is ignored under `tmp/domain/`; it is retained locally, not embedded in this document. [DOMAIN-001](task/DOMAIN-001.md) records commands, exits and provenance.

- Both frozen installs and `bun run build` exited 0. Chromium 153.0.8010.12 installation succeeded.
- Normal curl and Chromium HTTPS checks failed on page-shell 502. TLS 1.3 and the matching `*.example.test` certificate SAN were verified. Desktop 1440×920 and narrow 390×844 failure screenshots were inspected; both show only “Bad Gateway”. No credential was entered in that browser, and no HTTPS login/render/save/layout success is claimed.
- The separate **local HTTP Host probe** passed shell/health, anonymous session=false, anonymous tree401, login/tree/document, Secure/HttpOnly/SameSite=Strict/Path=/api cookie attributes and HSTS, missing/wrong Origin and CSRF rejection with unchanged files, exact Markdown block save, real external-change 409, deletion410, logout/revoked-session rejection, and all 92 current built assets plus the shell matching build bytes. This raw HTTP check establishes configuration behavior; it does not establish browser Secure-cookie transport or HTTPS access.
- All three copied sample files were restored byte-for-byte. Root inspection verified overlay `0x794c7630`, device70, mount318 and matching `0:70` descriptor mount metadata. It grants no general filesystem or arbitrary server-file access.
- The retained service was stopped through its own tmux window, its route/PID/listener disappearance checked, then restarted. The shared daemon and old independent preview remained healthy.

The earlier ignored helpers and `tests/integration/api/smoke.ts` restore their supplied sample bytes and must not run unchanged against a demo that may now contain user edits. The recovered acceptance uses fresh exclusively owned temporary files inside the same root and guards mutation/cleanup by root/file identity and content version. It leaves existing sample files and other browser sessions intact.

## Earlier recovered acceptance and drawer defect

Fresh evidence is retained under `tmp/domain/acceptance-20260908T031549Z/`. The original build from `d107cbd` was reused, with its input bytes verified against checked source `ebcd8a85387d66bcdc3882519f5952b4f88a5234`; nothing was rebuilt or restarted. The same Bun 1.4.2 process, owner-scoped route, supported overlay demo root and private token remain in use.

- Normal HTTPS shell/health/session checks passed. All **92 asset files plus one page shell** matched retained build bytes, including lazy Mermaid chunks. Anonymous tree 401 and unknown asset/config/source paths 404 were verified. DNS/peer was `192.0.2.7`; Chromium 153.0.8010.12 reported TLS 1.3 with the current YR1-issued certificate. This differs from the historical peer/certificate observations.
- A separate API test session passed exact-origin authentication, cookie attributes, missing/wrong Origin and CSRF 403 with unchanged fixture bytes, full-revision Markdown saves preserving BOM/CRLF/prose/the other block, actual external-edit conflict 409, detected deletion 410 and test-session revocation. A separate browser session verified actual Secure/HttpOnly/SameSite=Strict/Path=/api cookie transport, file browsing, flowchart and sequence rendering, rejection of active Mermaid content, three real byte-checked saves, Source/Preview tabs, desktop 1440×920 and narrow 390×844 panes, and confirmed logout. Its network/runtime/console audit had no unexpected errors.
- Visual inspection identified a remaining file-drawer defect despite the original browser assertions passing: with a supported long filename at 390 pixels, the 300-pixel popup's implicit grid column expands to about 397 pixels. Description/tree/search contents extend to x458/x446 beyond the viewport. A focused unmodified-page measurement reproduces the failure (`drawer-acceptance.exit=1`). Therefore the full narrow-layout acceptance is **not passed**.
- The smallest demonstrated correction is adding `grid-template-columns: minmax(0, 1fr)` to `.file-drawer` in `web/src/index.css`. An isolated browser-only diagnostic reduced the column to 268 pixels and contained all children within the popup; removing the temporary style reproduced the original overflow. No application stylesheet, build or running service was changed. The diagnostic's exit 0 proves reproduction/candidate behavior, not deployed acceptance. Route the scoped UI correction and regression separately before completing DOMAIN-001/PLAN-006.
- Five actual application screenshots and the two unmodified/candidate drawer diagnostic screenshots were personally inspected. The candidate image is explicitly diagnostic. All captures exclude credentials; traces/video were disabled. Three separate test sessions were revoked, their three exclusively created fixture files were removed with identity/version checks, and original samples retained exactly the same bytes and inode/device identities. Token identity/mode/mtime and the retained process/route were unchanged; the independent previous preview stayed healthy.

The new `preflight.ts`, `api.ts`, `browser.ts`, `drawer-probe.ts` and `postflight.ts` helpers retain per-command exit files, safe result summaries and owner-only raw request data in that evidence directory. Main HTTPS/browser behavior is verified; the remaining gate is the uncorrected narrow drawer. No infrastructure investigation, user-session invalidation, general filesystem access, source-policy change or broader build/native/release gate was needed. Practical save comparison/rename and local OS actor limits, the historical `applicationSafetyPassed=false` diagnostic, prototype needs-review and final integration/release boundaries are unchanged.

## Earlier pending correction and update boundary

Separately supplied HTTPS browser evidence reports that the retained renderer rejects an ordinary 16-node Unicode flowchart with six bare `<br/>` breaks; replacing only those breaks with spaces renders the nodes without saving. This deployment check did not repeat that reproduction or verify the unchanged original source. The successful functional checks above apply to their recorded fixtures and do not establish complete product readiness.

Renderer and narrow-drawer corrections are pending separately. Neither the reported line-break correction nor the diagnostic drawer style is applied to the live build. Keep the existing service, root, token and user edits intact. A later bounded deployment update must use the exact reviewed combined revision, minimize session disruption, and verify the unchanged original source and actual narrow drawer containment through HTTPS. No current rebuild, restart or ingress change follows from this status update.


## Corrected deployment acceptance

Fresh ignored records are in `tmp/domain/corrected-20260908T035741Z/`. The original build and old launcher/owner records remain in its `previous-build/` directory for recovery. Build preparation verified the still-running owner and copied only trusted build artifacts; it did not copy or restore user files. The complete build and 93 startup resources passed before the old service was stopped. Exact old PID/runtime disappearance, route removal and connection refusal were checked before non-force registration of the new service. Current ownership remains in `tmp/domain/route-owner.json`; lifecycle commands above still apply.

- Current DNS A and actual HTTPS peer: `192.0.2.7`, no AAAA answer. Normal curl certificate/hostname verification returned zero; Chromium 153.0.8010.12 reported TLS 1.3 and issuer YR1. The exact shell and all **92 asset files plus one shell** matched new build bytes, MIME and security headers, including lazy Mermaid chunks. Health/session/anonymous tree and unknown asset/config/source path controls passed.
- Independent private API checks passed login/session/tree/document, Secure/HttpOnly/SameSite=Strict/Path=/api attributes, missing/wrong Origin and CSRF rejection without writes, exact BOM/CRLF/unrelated-block preservation, external-edit conflict, detected deletion and session revocation. Real browser requests verified automatic secure-cookie transport and HttpOnly isolation.
- The exact 991-byte original source retains SHA-256 `0d95ee02341f7fa2e0b80abcf76bc5654ef7662d248c0e6cb30ac1ff73d3aeec` through editor, retained draft, request, disk and reload. All 16 node labels, seven branch labels and six explicit breaks were checked against the original; text rows are visibly separated by about 15.4 SVG units. There were zero implicit PUTs and one deliberate save of the exclusively owned original-source fixture. Seven bare-break spellings rendered; eight hostile neighboring forms remained rejected. Syntax errors retained the last valid preview, recovery worked, and no active SVG or unexpected outbound request was observed.
- At 390×844 and 360×844, the actual built drawer has a 268-pixel grid and 300/300 client/scroll width. All measured containers and descendants have zero horizontal scroll excess. Long nested target presence was awaited before both unfiltered measurements, then filtering, selection, focus cycling, Escape restoration, drafts and Source/Preview interactions were exercised. Description lines and close controls remain inside the popup. No diagnostic style was injected.
- The main browser process exited 1 at its final logout because the helper sought the clean-state button while its own draft was dirty. Its earlier render/save/layout assertions passed and remain recorded separately. The failure log and screenshot were retained; a focused independent browser check used the actual **Discard drafts and log out** action, observed DELETE 200 and revoked-cookie tree 401, and exited 0. No broad functional rerun or application correction followed this test-helper mistake. The combined evidence, rather than a relabeled browser exit, establishes acceptance.
- All three pre-existing files and their directory retained exactly the same bytes/identities. Four exclusively owned test files and three child directories were removed with identity/content guards; three isolated sessions were revoked. Root and token inode/device/owner/mode metadata remain unchanged. The corrected service stays live, and the previous independent preview remains healthy. Thirteen screenshots, including the retained logout failure and focused confirmation, were inspected; no credentials, traces or video were captured.

The backend SHA-256 remains `99d1a355d87a866a78eabea55861e2177de833c0af73d9952cf418f9000a8c9a`; the new shell SHA-256 is `33a1ea5619f6e35d193c5421ae0167d7c78362de8b7f9fc32eb07302811c57d5`. `built-assets.json`, `browser-transport.json`, `original-source-result.json`, `drawer-*-unfiltered.json`, `drawer-*-filtered.json`, `logout-result.json` and `postflight-result.json` retain precise observations. [DOMAIN-001](task/DOMAIN-001.md) records all immediate exits and the scoped review. Practical final-compare/rename and local OS actor limits, direct external editing, the historical `applicationSafetyPassed=false` diagnostic, prototype needs-review and final integration/release boundaries remain unchanged.


## Supplied corrected native and package acceptance

Independent verification of [hosted run 34185410383, attempt 1](https://github.com/itxje/diagramdock/actions/runs/34185410383) now establishes native and downloaded-package acceptance at exact candidate `a66276ade586cf4ce51d0b4c40aae91db7124fe2`; publication was skipped. This deployment task inspected the supplied log/package audit reports, retained locally as `tmp/domain/native-supplied-a662/log-audit.json`, `package-audit.json` and `package-cross-check.json`. The independent reviewers inspected the actual emitted log and downloaded bytes. This documentation amendment did not repeat their run, download, binary execution or validator.

The hosted run used Linux x64/Bun 1.4.2 and separately executed Node 24.20.0. Positive storage was ext4 `0xef53`, device `66305`, mount `27` / `259:1`; refusal storage was tmpfs `0x1021994`, device `26`, mount `32` / `0:26`. All 22 source stages exited 0, followed by the completed executable aggregate: 27 browser cases, 93 resources, four lazy diagram families, zero unexpected errors/external requests and successful cleanup. The earlier source-only `nativeAcceptance=pending` precedes the final aggregate `passed`; it is not an unresolved gate. Trace figures are emitted summaries, not a replay of unavailable raw hosted traces.

The independently inspected executable is `merdeck-0.0.0-ci.fixture-linux-x64`, **85,485,024 bytes**, SHA-256 **`2d26b672babfa80b14f802f5a051e46c96ea738fbe1c4f76d55b66d168952010`**. Its checksum, strict three-regular-file inventory, manifest schema, exact candidate/version/tag/runtime/target, 93 unique resources and ELF64 little-endian machine 62 all passed. A separate supplied comparison matched all 93 resource sizes/hashes to the current deployment build. The binary uses `/lib64/ld-linux-x86-64.so.2` and normal system libraries; it is not a static or all-OS executable. No local ARM64 execution of x64, real Git tag or release is implied by the fixture metadata.

This completes the previously pending native/package evidence for this corrected candidate only. It supplements the actual HTTPS/save/security/cleanup checks above and preserves the older failed run, older successful candidate, practical-save limits and `applicationSafetyPassed=false` history. Prototype needs-review and final main/release approval remain unchanged.
