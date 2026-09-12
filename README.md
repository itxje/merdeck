# Merdeck

Merdeck is a lightweight file-based Mermaid workspace built with TypeScript, Bun + Hono, and a sibling React + Vite SPA. The MVP implementation was independently reviewed and integrated into `main` on 2026-09-09, and later owner-approved changes are delivered on `main`. This revision provides the file editor with file management and optional access-token sign-in, bounded external-change polling, a direct file service, sample files and a same-origin built interface. The self-contained prototype remains **needs-review**. Single-executable implementation, historical ARM64/overlay checks and actual hosted ext4/Linux x64 source/executable acceptance are verified. Final independent implementation review passed with no remaining actionable findings. No first release version, tag or published release is claimed. Runtime needs no database, external account or remote repository; GitHub hosts source and optional release automation.

## Setup

Use Bun **1.4.2** and Node **24.20.0**. Pins are in `.bun-version`, `.node-version` and both private manifests. If the system Bun differs, install a project-local copy without changing the global runtime:

```bash
git clone git@github.com:itxje/merdeck.git
cd merdeck
mkdir -p .cache/runtime
npm install --prefix .cache/runtime --no-save --package-lock=false bun@1.4.2
export PATH="$PWD/.cache/runtime/node_modules/.bin:$PATH"
bun --version
node --version
bun install --frozen-lockfile
bun install --cwd web --frozen-lockfile
```

[Compatibility decisions](docs/decisions/2026-09-07-stack-compatibility.md) record exact dependency pins, checked official sources and the TypeScript 6.0.3 lint-compatibility exception. Root and `web/` have independent frozen locks; there is no workspace or database setup. Obtain source through the URL above or an already supplied checkout; source execution needs no GitHub account or network service after installation. The SSH clone itself requires authorized repository access.

Configure the **existing original project directory** directly. It remains writable by external tools; the service does not copy, upload or relocate it. Select a supported storage instance using [the storage contract](#file-storage-and-practical-acceptance). A missing root fails startup; the access token is optional. To create local configuration without printing a token:

```bash
umask 077
# Run once; preserve an existing .env.
cp -n .env.example .env
chmod 600 .env
# Edit .env privately: set MERDECK_ROOT to your absolute existing project path.
# Optionally set MERDECK_TOKEN to 32–256 random printable non-space ASCII characters to require sign-in.
# Set MERDECK_ALLOWED_ORIGINS=http://127.0.0.1:8787 for default production.
```

Bun source startup loads root `.env`; explicitly exported environment values also work and take precedence. Use a private editor or a password manager to enter the token; never print it or put it in shell history, URLs, browser storage, `VITE_*`, screenshots or logs. With a token, loopback also requires sign-in, and login exchanges the token for a bounded HttpOnly/SameSite session cookie. Without one the service runs with **open access**: the workspace opens without signing in, and anyone who can reach the service can read, change, move and delete the project's Mermaid and Markdown files. Open access starts only when `MERDECK_HOST` and every allowed origin are loopback (127.0.0.0/8, `::1` or `localhost`); `MERDECK_OPEN_ACCESS=true` deliberately allows it beyond loopback and cannot be combined with a token. Other local users and connections forwarded by tunnels or proxies can reach a loopback service too, so set a token on shared machines. Only the theme preference and pane layout persist in browser storage.

For a disposable demonstration only, copy `examples/project` into a uniquely owned directory on identified supported storage, then explicitly configure that copy as the root. `welcome.mmd`, `sequence.mermaid` and `docs/overview.md` demonstrate standalone extensions and two independent Markdown blocks. This optional sample is not the operator workflow. Automated checks always use their own copies and preserve committed examples.

## Development

Use tmux for servers/watchers. Derive and reuse the session from the project root:

```bash
session_name="$(basename "$PWD" | tr '.' '-')-$(echo -n "$PWD" | md5sum | cut -c1-6)"
tmux has-session -t "$session_name" 2>/dev/null || tmux new-session -d -s "$session_name" -c "$PWD" /bin/bash
```

Create or reuse two named windows, then run each command in its own shell from the repository root:

```bash
# Create only missing windows; attach to select the appropriate shell.
tmux list-windows -t "$session_name"
# If absent:
# tmux new-window -t "$session_name" -n api -c "$PWD" /bin/bash
# tmux new-window -t "$session_name" -n web -c "$PWD" /bin/bash
tmux attach-session -t "$session_name"
```

In both windows prepend `$PWD/.cache/runtime/node_modules/.bin` to PATH. For development, leave `MERDECK_ALLOWED_ORIGINS` empty in `.env` so the launcher discovers nsl's actual origin, or explicitly set that same origin in both windows. In the API window run `bun run dev`; in the frontend window run `bun run --cwd web dev`. Each process registers independently through supported project-local `nsl run` (there is no `nsl serve` command in pinned 0.1.7). The default name is `merdeck-<six-character-path-hash>`; set the same `MERDECK_DEV_NAME` in both shells to override it. The launcher discovers the actual nsl port, so it does not assume 3355. The existing daemon is reused and must not be stopped if other projects use it.

```bash
node_modules/.bin/nsl get "merdeck-$(echo -n "$PWD" | md5sum | cut -c1-6)"
node_modules/.bin/nsl list
```

The resulting origin serves Vite at `/` and the API at `/api/health`. nsl strips `/api` upstream; the launcher enables `MERDECK_API_MODE=stripped` only with `NODE_ENV=development`. Browser requests remain relative to `/api`. There is no Vite proxy or Vite embedded in Hono. A `.localhost` URL is local-machine access only; no public access is claimed. Stop only these windows/processes through tmux; do not kill shared ports or the shared daemon.

If nsl is unavailable, `bun run dev:bare` starts the API with `/api`, and `bun run --cwd web dev:bare` starts Vite independently on loopback. They use different origins; this fallback does not claim same-origin integration and commits no proxy/CORS workaround. Route changes regenerate `web/src/app/routeTree.gen.ts` during Vite development; commit that generated file. Production build does not rewrite it.

## Checks and production build

Install the [complete CI prerequisites](#contributor-ci-and-executable-checks), select explicit supported/refused fixture parents and their observed types below, then run the aggregate gate in the project tmux session:

```bash
bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run check:ci && git diff --check
```

`check` runs backend ESLint, strict type checking and bun:test coverage, then frontend ESLint, strict type checking and Vitest coverage, followed by the production build. Backend discovery is restricted to `src/` so it cannot execute frontend Vitest or Playwright files. Coverage measures the implemented file/auth/HTTP boundaries and frontend state, auth, renderer, theme and HTTP logic, with 80% thresholds. Sourced UI primitives and presentational route/layout composition are excluded from frontend unit coverage; real browser checks exercise the assembled interface. The source-rooted API test bridge includes tests/integration/api in both the root gate and the explicit bun test tests/integration/api --coverage command. Passing source checks alone does not establish native storage or standalone executable acceptance.

`bun run test:e2e` starts three built production services (supported storage, refused storage and open access without a token) in owned windows of the project tmux session, copies samples into unique child fixtures, runs the real browser suite, stops its services and removes its fixtures and token. It does not require nsl. Run `bun run check` first to build both outputs. Install Chromium in project-owned storage:

```bash
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/playwright"
web/node_modules/.bin/playwright install chromium
# Set both explicit fixture parents as documented below, inside the project tmux session.
bun run test:e2e
```

The runner checks canonical paths, actual filesystem type/device and Bun 1.4.2 before creating fixtures. `MERDECK_TEST_EXPECTED_FS` defaults to `0x794c7630`; `MERDECK_TEST_UNSUPPORTED_FS` defaults to the observed `0x6a656a63`. Override these only to identify the actual test storage; they are test expectations and never alter production write admission. Missing parents, wrong storage, missing built assets/browser, failed startup or failed assertions fail the gate. Readiness subscribes to a service event before startup and requires an actual healthy HTTP response within 15 seconds; it has no fixed startup sleep or blind retry loop. A port allocation race fails explicitly.

Token files are owner-only, traces/video/automatic failure screenshots are disabled, and credentials never enter test URLs or command lines. Explicit screenshots after login and settled dialogs go to ignored root `tmp/`; per-run identity/startup evidence also stays there. Browser fixtures preserve their original bytes and report cleanup. Do not run these tests against operator originals.

For an independently started source service or executable, supply all of `MERDECK_TEST_URL`, `MERDECK_UNSUPPORTED_URL`, `MERDECK_SMOKE_ROOT`, `MERDECK_SMOKE_TOKEN_FILE` and `MERDECK_TEST_DISPOSABLE=true`, plus both fixture-parent/type settings. Both services must use that private token and expose the same API; the sample root must contain copies of `examples/project`. Optionally also supply `MERDECK_OPEN_URL` and its disposable sample root `MERDECK_OPEN_ROOT` for a service without a token; without them the open-access check is skipped. In this explicit mode, the runner verifies health/storage and runs browser checks without starting/stopping supplied services or removing the supplied root/token. The caller owns their tmux lifecycle. This entry point prepares executable/native acceptance; it does not establish either gate by itself.

For production source startup, use a named tmux window at the repository root, with the pinned PATH and private `.env` or exported runtime configuration described above. Confirm the explicit origin matches the chosen listener:

```bash
bun run build
NODE_ENV=production MERDECK_API_MODE=prefixed bun run start
# From another shell, for the configured default origin:
# curl -fsS http://127.0.0.1:8787/api/health
```

Stop that window with Ctrl+C (or `tmux send-keys -t "$session_name:production" C-c` when it is named production). Verify its listener stopped before deleting disposable project data or credentials.

The build emits `dist/index.js` and `web/dist/`. Start the server through tmux as above. With the default port, `curl -fsS http://127.0.0.1:8787/api/health` returns a non-sensitive successful health envelope. Production serves the built workspace SPA at `/` and its local assets; missing assets and unknown API routes return safe JSON 404. Start from the built repository containing both dist/index.js and web/dist; no Vite process or nsl is required. Single-executable embedding is implemented and locally verified on ARM64/overlay; its downloaded runtime needs neither Bun nor separate frontend assets. Actual hosted ext4/Linux x64 source and executable acceptance is verified at the exact candidate recorded below. The browser supports original-file edits and independent Markdown block saves. The direct file domain is independently exercisable as described below.

See [architecture and API contracts](docs/architecture.md), [task evidence](docs/task/STACK-001.md), [task sequence](docs/task/index.md) and [authorized plan](docs/plan/PLAN-001.md).

## Using the workspace

Open the service URL. If the operator set an access token, enter it; with open access the workspace opens directly and the status bar shows **Open access**. The status bar also names the running version, such as `Merdeck 0.3.1`; a service started from source reports `Merdeck development`. Select a `.mmd`, `.mermaid` or individual top-level Mermaid block in a `.md` file. Edit the source, inspect the live preview, and use **Save** or Ctrl/Cmd+S. Fit, the zoom buttons, the mouse wheel (zooming around the pointer), dragging and scrolling navigate larger diagrams. In a flowchart, click a node to select its label in the source, or double-click it to edit the label on the diagram; Enter applies the change as an ordinary unsaved draft and Escape cancels it. Drag the divider between the source and the preview to resize them, or use **Hide source** and **Show source** to collapse the source pane; the layout is remembered in this browser. On narrow screens, **Open project files** and the Source/Preview tabs keep each pane usable. The header switch chooses a light, dark or system theme. When the service is redeployed with a different interface, an open page shows **Application update available**. **Reload application** is enabled only once no draft, dialog or pending action would be lost, and **Dismiss update** hides that update.

Below the explorer's search field, **All**, **.mmd** and **.md** choose which file types it lists: every supported file, diagram files (`.mmd` and `.mermaid`) or Markdown files. The search field narrows the remaining rows by name, folders without a listed file disappear, and the footer names the listed extensions. The choice is remembered in this browser and applies to the file drawer as well.

The explorer also manages project files:
- **New file** and **New folder** in its heading create an entry next to the open file; the path is editable. New files start with a small example diagram.
- Each file and folder row has an actions menu, also opened by right-click, with **Rename or move** and **Delete**. F2 and Delete work on a focused row, and folders also offer **New file here** and **New folder here**.
- A rename can change folders but keeps the file type. A move never replaces an existing file or folder.
- Only empty folders can be deleted; hidden files count as contents. Deletion is permanent after confirmation.
- Unsaved drafts follow a moved file or folder, and deleting a file discards its drafts.
- File changes are unavailable on read-only storage.

Drafts stay separate for each file/block when navigating. External tools may edit the original files directly: clean source refreshes automatically, while dirty source is retained with a warning. **Review current file** compares your draft with the current source. Loading it explicitly discards every draft for that file. A retained draft can resume only against an identical full-file revision after explicit confirmation; there is no force-save. An external rename appears as deletion plus a new file. Missing-file drafts remain selectable in the explorer.

Session expiry keeps unsaved work in the current tab and requires sign-in and review before saving. Confirmed logout clears it. Open access has no sign-in, expiry or logout; if the service restarts with or without a token, unsaved work is locked for review in the same way. Closing or refreshing prompts for unsaved work, but drafts are not persistent recovery storage. Keep the tab open until changes are saved or deliberately discarded.

The preview accepts a constrained Mermaid subset (strict host settings plus sanitized SVG). Bare `<br>`, `<br/>` and `<br />` label breaks are supported case-insensitively as SVG text rows; this render-only normalization preserves editor, draft and saved bytes. Flowcharts also support numeric or spaced comparisons inside double-quoted text, `&` fan-out, and bounded `classDef`/`class`/`style` styling: ASCII identifiers; three/six-digit hex fill, stroke and text colors; positive widths up to 10 pixels; and one to eight space-separated dash lengths up to 100 pixels (at least one positive). A source may open with a front matter block carrying exactly one `title` key, which takes the same checks as any label; any other key, a second block and every other `---` line stay refused. A flowchart node may name another diagram file in the same project with `click <node> "<file>"`, which opens that file in the workspace; callbacks, addresses, extra arguments and every other click form stay refused, and the rendered diagram still carries no link of its own. Other diagram families, such as Gantt charts and sequence diagrams, are accepted whenever their source avoids the disabled constructs below; a Gantt chart's today marker is measured out of the fitted size so a chart whose tasks are far from today still fits its bars. Other HTML, entities, attribute-bearing tags, configuration directives, links/resources, arbitrary CSS and math are disabled. Preview is limited to 32,000 characters and 500 edges; larger source remains editable and savable within the configured API byte limit. Syntax errors keep the last valid diagram with an explicit stale label. Read-only storage leaves browsing and draft editing available while disabling saves; ask the operator to verify write support for the configured project.

Relative flowchart node targets work inside and outside subgraphs, including diagrams with title-only front matter. Rendering preserves node positions and source bytes. Pointer clicks, Enter and Space use the workspace's existing file navigation and retain unsaved drafts; pending or rejected previews do not activate stale targets.

### Files and Markdown limits

Only case-sensitive `.mmd`, `.mermaid` and `.md` regular UTF-8 files are supported, with optional BOM and LF/CRLF. Hidden paths, dependency/build/secret directories, symlinks, hardlinked files and unsupported path characters (including `%`) are excluded or rejected. The default tree is bounded to 8,000 entries and depth 4, so a root that also holds unrelated directories lists four complete levels rather than part of a deeper walk; raise `MERDECK_MAX_TREE_DEPTH` for diagrams kept deeper than that. A truncated scan cannot prove deletion. File size defaults to 1 MiB; see `.env.example` and [architecture](docs/architecture.md) for configurable limits and exact excluded paths.

Markdown selection includes closed **top-level** backtick or tilde fences with case-sensitive `mermaid` language (additional info words are allowed). Openers/closers allow zero to three spaces; a matching closer is at least as long as the opener. Nested list/blockquote, unclosed and ambiguous tab-indented fences are omitted. Prose, other fenced code, raw HTML and ordinary Markdown context stay untouched and are never rendered. Each supported block is independently selectable; Markdown without one has an empty state.

Saves replace only the selected content byte span, retaining surrounding prose, other blocks, delimiters, BOM and newline conventions. A replacement that could close its own fence is rejected. Block selectors belong to the **full-file** revision and are refreshed after saving; an external edit anywhere in the document can cause a conflict. Invalid diagram syntax remains editable and savable within file limits. See [the full Markdown contract](docs/architecture.md#supported-markdown-and-lossless-editing).

## HTTP API and deployment

Public URLs are `/api/health`, `/api/build`, `/api/session`, `/api/diagrams/tree`, `/api/diagrams/document?path=...`, `/api/diagrams/revision?path=...`, `/api/diagrams/source`, `/api/diagrams/entries`, `/api/diagrams/entries/move` and `/api/diagrams/entries/delete`. JSON responses use `{ success, data }` or `{ success: false, error: { code, message, currentVersion? } }`. Health, GET build (the served interface's build identity and check interval) and unauthenticated GET session disclose no project information. With a token, every diagram endpoint requires a valid session. With open access, GET session reports `{ authenticated: true, access: 'open' }` with the same capabilities and no cookie, CSRF token or expiry, and diagram endpoints need no session.

POST session accepts `{ token }` as application/json with an exact configured Origin and returns a signed HttpOnly SameSite=Strict session cookie scoped to `/api`, plus `access: 'token'`, a CSRF token, expiry, polling interval and root write eligibility. Keep the CSRF token in memory. GET session restores that state while the cookie is valid. PUT source, the POST entry routes and DELETE session require both Origin and `X-CSRF-Token`. Logout revokes the session. No bearer or URL-token authentication is supported. The login limit is 10 attempts per minute for the entire process; excess attempts or session capacity return 429 with Retry-After. Sessions expire after one hour by default and survive a restart with the same token and root; a new token signs every browser out. With open access, POST and DELETE session return 405, and PUT source and the POST entry routes require the exact Origin but no CSRF token.

GET tree returns bounded relative entries and a revision, cached for at most the advertised poll interval (3 seconds by default). GET document returns independent diagram sources and a complete-file SHA-256 version. GET revision performs a fresh selected-file check and returns present/version or deleted. PUT source accepts `{ path, selector, expectedVersion, source }` and returns the updated document, version and selectors. Never reuse old Markdown selectors after a successful save. Stale saves return 409, detected deletion 410 and unsupported storage writes 503 with `filesystem_unsupported`. No force-save exists. A truncated tree cannot establish deletion; preserve dirty drafts and check the selected revision explicitly.

The entry routes are:
- **POST entries** accepts `{ kind: 'file' | 'directory', path }` and creates a file from a fixed example template or an empty folder.
- **POST entries/move** accepts `{ kind: 'file', from, to, expectedVersion }` or `{ kind: 'directory', from, to }`.
- **POST entries/delete** accepts `{ kind: 'file', path, expectedVersion }` or `{ kind: 'directory', path }`.

Each route returns `{ kind, path }` for the resulting entry. Bodies are strict JSON of at most 8 KiB and never carry file content. Entries follow the same path rules and depth limit as reads, parent folders must already exist, a rename keeps the file kind, and a folder cannot move into itself.

Outcomes:
- 409 `exists` for an existing destination.
- 409 `not_empty` for a folder that still has contents.
- 404 `not_found` for a missing destination folder.
- 409 `conflict` for a changed file.
- 410 `deleted` for a missing source.
- 403 for excluded names, links or another mount.
- 503 `filesystem_unsupported` on unsupported storage.

For access from another machine, keep loopback binding and use an SSH tunnel such as `ssh -N -L 8787:127.0.0.1:8787 server`, then open `http://127.0.0.1:8787` locally with that exact allowed origin. Alternatively configure a TLS reverse proxy and an actual resolvable hostname; no public DNS is supplied by this repository. An operator may explicitly set `MERDECK_HOST=0.0.0.0` (or a chosen interface) and exact public `MERDECK_ALLOWED_ORIGINS`; network access restrictions still apply, and a service without a token then starts only with `MERDECK_OPEN_ACCESS=true`; prefer a token. The bind address is not the browser origin. No public bind, proxy, tunnel or deployment is performed by these instructions. These are deployment instructions, not claims of verified remote reachability.

Same-origin Host/Origin validation is active even on loopback. Set `MERDECK_ALLOWED_ORIGINS` to exact public origins for remote access; default binding remains 127.0.0.1. TLS reverse proxies must preserve the original Host and restrict upstream access. Forwarded headers are ignored. HTTPS origins enable Secure cookies and HSTS; `MERDECK_COOKIE_SECURE=true` requires HTTPS, while `auto` is the default. Do not mix HTTP and HTTPS origins in one service. Production CSP blocks remote script/image pulls and allows only the built local resources and required inline styles. A public page shell does not grant access to project data.

The scoped [HTTPS domain deployment](docs/deployment-domain.md) documents verified access to the owner's hosted instance (its hostname is withheld and shown as `merdeck.example.test`), private startup/stop ownership and actual evidence. Corrected live checks on 2026-09-08 passed exact original-source rendering/saving and narrow drawer containment at 390 and 360 pixels. The controlled deployment restart preserves the root. Since AUTH-001 that instance runs with open access at the owner's request, so it asks for no token. Access is verified from the current environment. The matching corrected candidate now also has independently audited hosted x64/ext4 and downloaded-package acceptance, and it is part of the implementation integrated into `main` on 2026-09-09. Earlier failures are retained.

For a reproducible real HTTP check, copy examples/project into an explicitly verified disposable root and set MERDECK_TEST_EXPECTED_FS to its actual filesystem type, start the built service in tmux, and create an owner-readable private token file. Set `MERDECK_SMOKE_URL` to the actual origin, `MERDECK_SMOKE_ROOT` to that sample root and `MERDECK_SMOKE_TOKEN_FILE` to the token file, then run `bun tests/integration/api/smoke.ts`. It uses curl with private request files, validates login/tree/multiple-block load/save, exact surrounding bytes, an external edit, 409 conflict and logout, and restores the disposable Markdown bytes. It checks the built page/asset transport by default; set `MERDECK_SMOKE_STATIC=false` only for a separately served development API. It does not claim browser rendering or full UI acceptance. Never target operator originals with this smoke.

## File storage and practical acceptance

Write admission requires Linux, procfs, and an actual descriptor mount identified as **overlay** (`statfs.type = 0x794c7630`), **ext4** (`statfs.type = 0xef53`) or **virtiofs** (`statfs.type = 0x65735546`). Each admitted family carries the identity model it was measured to support, reported as `storage.identity`: overlay and ext4 answer "still the same file" with the inode (`stable`), and virtiofs answers it with the file's bytes (`content`), because it can report a new inode for a file whose bytes, size and both timestamps are unchanged. On the content model a save compares device, size, both timestamps and the complete-file hash, proves its staged bytes by their own hash and reads the published name back; it gives up exactly one distinction, an external replacement whose bytes and both timestamps are identical. The root, held destination directory and target must share the root device, and each admitted mount record must match the held descriptor device. Missing, malformed or unassociated mount metadata refuses writes. Ext2/ext3 share the ext magic but their mounted types are not admitted. The service checks actual filesystem metadata through descriptor anchors; it does not infer support from a pathname or expose an override. Other Linux filesystems can be read subject to the same containment checks, but saves return safe `filesystem_unsupported` / HTTP 503 before creating a temporary file. The observed host-shared `fakeowner` mount (`0x6a656a63`, device 41) stays unsupported for writes. The admitted virtiofs measurement is recorded in [STORAGE-001](docs/task/STORAGE-001.md) and [STORAGE-002](docs/task/STORAGE-002.md). The tested overlayfs instance was device 70; device numbers are deployment observations, not constants in the implementation. Other overlay configurations still require their own acceptance run. No blanket Linux support is claimed.

Inspect the intended storage with the pinned runtime:

```bash
bun -e 'import {stat,statfs,realpath} from "node:fs/promises"; const p=await realpath(process.argv[1]); console.log({root:p,device:String((await stat(p,{bigint:true})).dev),filesystemType:"0x"+(await statfs(p,{bigint:true})).type.toString(16)})' /absolute/chosen/root
```

The file suite creates and removes only its own unique child fixtures. `MERDECK_TEST_FIXTURE_PARENT` must name an existing canonical absolute directory on the verified supported storage. `MERDECK_TEST_UNSUPPORTED_PARENT` names a real unsupported filesystem for refusal checks, such as a tmpfs directory. A checkout on `virtiofs` no longer qualifies, because that family is admitted under the content identity model. Both choices and all fixture type/device observations are printed. Without explicit settings, each parent defaults visibly to checkout `tmp/`, which cannot serve as the refused parent on admitted storage. There is no silent relocation, test-only production bypass, skip or conflict retry. A deployment with only supported storage needs a separately supplied unsupported fixture mount to run this full contract suite; the test does not fake one.

For this host, create a dedicated disposable directory under its verified `/tmp` overlayfs, set the variables to its canonical path and checkout scratch, and run through tmux:

```bash
mkdir -p tmp
# /tmp was verified on this host; inspect your chosen storage first.
file_fixture_parent="$(mktemp -d /tmp/merdeck-file-check-XXXXXX)"
export MERDECK_TEST_FIXTURE_PARENT="$file_fixture_parent"
export MERDECK_TEST_EXPECTED_FS=0x794c7630
export MERDECK_TEST_UNSUPPORTED_PARENT=/dev/shm
export MERDECK_TEST_UNSUPPORTED_FS=0x1021994
bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile
bun run check:files
bun run check
git diff --check
```

`check:files` performs focused strict type checking, all file-domain tests, 20 consecutive standalone saves, 20 consecutive multi-block save pairs, and a direct service smoke in a separate real Bun process. Tests cover stale/concurrent requests, external in-place edits and atomic replacements before final validation, deletion, exact BOM/CRLF/Unicode/unrelated bytes, complete-content observation, traversal/symlinks/root substitutions, revisions/cache invalidation and actual unsupported writes. `check` includes the same file tests through the source-rooted entry and keeps the existing root/web lint, strict type checks, coverage and production builds. Set both parents for either command. Logs report each condition separately; no combined reliability rate is claimed. Run `bun tests/integration/files/domain-smoke.ts` with the same parents for the render-independent read/select/save/external-refresh smoke.

HTTP, UI, browser and compiled-binary acceptance must configure `MERDECK_ROOT` on this same verified storage contract and inspect type/device, rather than place writable sample data on the excluded checkout mount. Development nsl routing and production packaging do not change filesystem eligibility. Copy the committed samples only into a chosen disposable supported directory for these checks; external editors may edit those files directly. Delete only your own fixtures after checks, and retain logs separately. The suite verifies child fixture removal; operators own removal of their explicitly chosen empty parent.

Import `createDiagramService`, `FileConfig` and `FileStorageStatus` from `src/modules/diagrams`. Create one instance per root using validated config. `storageStatus()` returns root eligibility, filesystem type and device without paths. `readDocument(path)`, `documentRevision(path)`, `treeSnapshot({refresh:true})` and `saveDiagram({path, selector, expectedVersion, source})` return the shared typed contracts. Refresh selectors and full-file SHA-256 versions from every successful save. Transport must map `AppError` through the existing safe mapper and expose unsupported storage; hooks are trusted test seams, never request configuration. No timers or permanent descriptors require disposal.

Practical saves preserve direct external editing, use complete-file versions, serialize service writes and atomically replace via a synced sibling file. Changes detected before publication conflict; detected deletion returns `deleted` without recreating it. Dirty drafts must remain local across refresh/errors. **An external writer can still change/delete the target after final validation and before rename, and that change can be overwritten.** This is an explicit limitation, not a universal no-loss promise. HTTP traversal/symlink controls do not isolate an OS actor able to move the root or its ancestors. Post-rename sync errors can leave a visible save with an error response; reload/reconcile before another attempt. ACLs/xattrs and special mode bits are not retained.

The unchanged manual `tests/integration/files/external-writer-window.ts` schedules the exact final-window counterexample. To reproduce on supported storage, run that absolute script path from an exclusively owned scratch directory on verified overlayfs (it creates its own `tmp/` there), in a separate process. Exit zero means the overwrite was reproduced; its interpretation remains **`applicationSafetyPassed=false`**. It is excluded from passing acceptance. The original raw probe and six-case history remain available under `tests/integration/files/inode-*.ts` and [the inode record](docs/decisions/2026-09-07-inode-observations.md); the original failures remain part of that record.

## Ordinary Linux verification preparation

The intended deployment edits the operator's explicitly configured existing project directory. It does not require copying/uploading the project, exclusive directory ownership, or stopping direct external tools. The current policy admits descriptor-verified ext4 and overlayfs with exact mount/type/device checks. **Actual ext4/Linux x64 source and single-executable acceptance passed at candidate 4ca471274d3ffa76469f8b2e87d4abd7055aa764.** The successful hosted run and downloaded package were independently inspected; final implementation review is accepted. This evidence identifies one actual ext4 deployment, not every Linux filesystem or mount configuration. Local overlay scratch and the host-shared checkout remain distinct from that hosted ext4 evidence.

An operator or hosted verification job can run the following from the project tmux session with Bun 1.4.2. Supply actual existing canonical fixture parents; do not substitute an overlay or tmpfs backed by ext4. All destructive checks create exclusive children and leave existing files alone.

```bash
export MERDECK_TEST_UNSUPPORTED_PARENT=/absolute/actual/unsupported/fixture-parent
export MERDECK_TEST_UNSUPPORTED_FS=0x6a656a63 # Example observed locally; identify the actual mount.
bun run check:storage -- /absolute/native/fixture-parent --filesystem ext4
```

The runner requires both ext4 mount type and statfs `0xef53`, identified through the held directory descriptor. A mismatch, missing target, missing refusal mount, wrong runtime/session, failed assertion or cleanup failure exits nonzero. It never changes production admission. On a real matching native target it runs the unchanged raw identity diagnostic in exactly twenty bounded child processes, retaining every trace. If raw evidence passes but production still refuses ext4, it exits nonzero with that precise remaining gate. The first hosted run failed at that gate under the old overlay-only policy. The candidate correction uses its actual raw evidence. The subsequent hosted run passed the source stages and complete executable/browser aggregate, as recorded below. Do not repeat failed probes unchanged or erase earlier failures.

After actual candidate admission succeeds, the same entry runs `check:files` and focused storage HTTP tests against its native child fixtures. `check:files` now checks the explicit `MERDECK_TEST_EXPECTED_FS` and `MERDECK_TEST_UNSUPPORTED_FS` against actual storage and production capability. These variables are assertions, never application settings or overrides. Repeated standalone and multi-block saves, independent external conflicts, byte preservation, deletion, containment and real unsupported write refusal remain required.

Each native run writes `tmp/storage-check-*/result.json`, stage `.stdout`/`.stderr`/`.exit.json`, raw traces and `admission.json` when reached. The versioned result records expected/observed type, device and mount identity, candidate commit and dirty state, actual Bun runtime/architecture, individual exits, cleanup and failure. `nativeSourceChecks` is `passed` only after the actual raw/file/HTTP stages pass; `nativeAcceptance`, `browser` and `deployedBinary` remain `pending` because this entry does not certify a deployed executable. Runtime `nodeCompatibility` is Bun's compatibility version, not a separately executed Node version. No credentials or project contents are exposed through anonymous status endpoints.

To verify the preparation on locally available supported/unsupported storage, set the same explicit fixture parents/types used for the full gate, then run `bun node_modules/typescript/bin/tsc --project tests/integration/storage/tsconfig.json && bun test ./tests/integration/storage` inside the project tmux session. These tests include an actual non-native CLI rejection and real file-backed HTTP checks; passing them is preparation evidence only.

The complete hosted evidence contract is in [PLAN-005](docs/plan/PLAN-005.md). It reuses the current browser suite (24 cases after the save-observation correction) through the existing-service mode described above, on an actual deployed native root and an actual standalone executable with local frontend assets. A future job or workflow file is preparation only; final readiness requires its real run URL, exact commit, identified native filesystem, binary identity and successful results. The historical final-window diagnostic remains `applicationSafetyPassed=false`.

## License

[All rights reserved](LICENSE).

## Contributor CI and executable checks

Clone the authorized repository with `git clone git@github.com:itxje/merdeck.git`. Source development requires the pinned Bun 1.4.2 and Node 24.20.0 and both frozen installs above. Downloaded executables do not require Bun, Node, npm, node_modules, a source checkout or frontend files.

Install `tmux` and `strace` as development verification prerequisites; on a hosted Ubuntu runner the workflow explicitly installs them. Local operators may provide a project-local tracer through an absolute `MERDECK_STRACE`. Install verified actionlint and project-local Chromium:

```bash
bun scripts/setup-ci-tools.ts
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/playwright"
web/node_modules/.bin/playwright install chromium
# On a fresh supported Linux runner, install the browser's system libraries as well:
# web/node_modules/.bin/playwright install --with-deps chromium
```

From the prescribed project tmux session, configure the actual supported and refusal fixture parents/types from the storage instructions, then run:

```bash
bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run check:ci && git diff --check
```

`check:ci` runs file checks, focused storage tsc/tests, the full source `check` (including procfs/backend/frontend coverage/build), `lint:workflows`, `test:release`, compilation and binary-only smoke. The smoke invokes `test:e2e` once against the two actual executable instances, then separately checks lazy Mermaid families. It also verifies every emitted resource byte/MIME/security header, versions, checksums, ELF target, empty-runtime-PATH process/file tracing and cleanup. This replaces a redundant source/browser pass inside the aggregate; `test:e2e` remains independently available for source or existing-service checks. `test:release` requires built web/dist and tmux because its induced real compile failure tests use those inputs. It tests strict version/package/refusal rules, safe draft reruns and cleanup without network publication. Reports and screenshots stay under ignored tmp/. Local ARM64/overlay success explicitly leaves native acceptance pending. The current suite has 24 browser cases; earlier 19-case results below remain historical.

Historical local result from CI-001: the complete gate passed on Linux arm64 with actual overlay 0x794c7630 / device 70 and separate host-shared refusal 0x6a656a63 / device 41. All 93 embedded assets, 19 binary browser cases and four lazy Mermaid families passed; strace verified an empty runtime PATH, one executable per service and no source/frontend dependency or extraction. Linux x64 cross-compilation passed; this historical local run did not execute x64 or establish native storage acceptance. The subsequent verified hosted execution is recorded below. Exact commit, checksums, coverage, stopped URLs and cleanup are in [CI-001](docs/task/CI-001.md).

The normal native gate additionally requires an actual **Linux x64** host, procfs, an admitted ext4 fixture parent identified through its held descriptor (not overlay-on-ext4), and a separately identified refusal parent such as tmpfs. Set all four fixture settings above to the actual parents/types, and then:

```bash
export MERDECK_NATIVE_PARENT=/absolute/actual/ext4/fixture-parent
export MERDECK_TEST_FIXTURE_PARENT="$MERDECK_NATIVE_PARENT"
export MERDECK_TEST_EXPECTED_FS=0xef53
# Set the separate refusal parent and its actual type, e.g. tmpfs 0x1021994.
bun run check:ci --native
```

This invokes the real storage runner, source gates and matching executable/browser/asset/tracing checks. Raw-only diagnostics, synthetic mount-policy tests or a successful cross-build cannot satisfy it. The hosted workflow creates exclusive children under the runner's actual temporary storage and separate `/dev/shm` refusal storage, records both identities and fails if they do not meet the contract. It does not create mounts or bypass application admission.

The raw build command requires an explicit tag/target; this example uses a nonpublishing fixture and creates no Git tag:

```bash
bun run compile --tag v0.0.0-ci.fixture --target bun-linux-arm64
bun scripts/package-release.ts --tag v0.0.0-ci.fixture --target bun-linux-arm64
bun scripts/check-release.ts --tag v0.0.0-ci.fixture --target bun-linux-arm64
```

Select `bun-linux-x64` for the required release target; cross-compilation alone is not execution proof. Use an empty dist/release directory for standalone compile commands; prior output is retained rather than silently overwritten. `check:ci` owns a unique staging directory and retains prior complete results under tmp/. Public attachments are `merdeck.tar.gz` and SHA256SUMS. That archive is architecture-independent: it holds `merdeck.js` and the built `web/` tree, and the host's Bun runs it. The version-named executable stays a checked build output and workflow artifact, and is not published.

## Verified preparation and preview

The documentation preparation used source `4ca471274d3ffa76469f8b2e87d4abd7055aa764` with Bun 1.4.2 and actual Node 24.20.0 on Linux ARM64. Both frozen installs and `bun run build` passed. The documented source production command passed the real HTTP smoke and four existing workspace browser cases (21.6 seconds), including desktop/390 px layouts, independent block saves, byte preservation, clean external refresh, dirty conflicts/deletion, auth recovery and real unsupported-write refusal. The unchanged prototype passed nine HTTP/offline verification groups. No new full coverage or binary gate was run for these documentation-only changes.

Earlier checks remain separate: the ext4-candidate implementation `1a65402ed63c1b0702ad1de3598d9d4b3f170397` passed local ARM64/overlay source and 19 executable browser cases; the frontend correction `4fa0938cd262ea151a9b14efb0b04d669eb28137` passed its own full gate and 24 executable browser cases. These are not a combined ext4/x64 result. Exact coverage, binary checksums, original failures and cleanup remain in [NATIVE-001](docs/task/NATIVE-001.md), [UI-001](docs/task/UI-001.md), [CI-001](docs/task/CI-001.md) and [REVIEW-001](docs/task/REVIEW-001.md).

The preparation preview is the built source application at `http://127.0.0.1:42927`, using a disposable sample on actual overlayfs `0x794c7630`, device 70. Login uses the owner-readable ignored `tmp/doc/token`; never include its contents in messages or logs. The standalone **simulated** prototype is served at `http://merdeck-design-4984b3.localhost:3003/merdeck/Merdeck.html`. Both were inspected in a real browser, and their desktop/tree/editor/preview hierarchy and narrow tabs match; prototype status stays **needs-review**, with `designSystems: []`.

These are temporary development-machine previews, not published application URLs. Only local-machine access was verified. The app binds loopback; the prototype's loopback server uses an existing nsl proxy whose configured bind is `0.0.0.0:3003`. That proxy bind and a `.localhost` name do not prove LAN/public reachability. No tunnel, reverse proxy deployment or remote access was tested. [DOC-001](docs/task/DOC-001.md) records exact commands, local screenshots, retained credentials/fixtures and service stop instructions. Ignored evidence paths exist in the verification checkout and are not bundled with a fresh clone.

## Candidate verification before integration

[Hosted run 34166805672](https://github.com/itxje/diagramdock/actions/runs/34166805672), attempt 1 at clean commit c1078e302cfe43eeaa8fc5bf9286a09273a74ee5, completed with **failure** at the old production admission gate. All twenty raw ext4 controls passed with cleanup, on Linux x64 / Ubuntu image 20260831.293.1 / Bun 1.4.2 / Node v24.20.0; actual ext4 was 0xef53, device 2049, descriptor mount 27 / 8:1, with separate tmpfs refusal 0x1021994, device 26, mount 32 / 0:26. This evidence supports the bounded candidate correction, not native source or executable acceptance. This failed result remains unchanged. The corrected run below supplies separate successful native/source/executable evidence; no release has been published.

The supplied actual run log, structured stage/audit summaries and downloaded package for [run 34168525432, attempt 1](https://github.com/itxje/diagramdock/actions/runs/34168525432) were read and independently validated. The run completed with **success** at clean candidate `4ca471274d3ffa76469f8b2e87d4abd7055aa764`; **native/Linux x64 acceptance is satisfied** and **publication was skipped**. Artifact `10034988497`, named `checked-linux-x64-4ca471274d3ffa76469f8b2e87d4abd7055aa764`, was present and unexpired in the inspected snapshot.

| Actual successful-run evidence | Observed result |
| --- | --- |
| Runtime and positive storage | Linux x64, Bun 1.4.2; ext4 `0xef53`, device `2049`, descriptor mount `27` / `8:1`. |
| Refusal storage | tmpfs `0x1021994`, device `26`, mount `32` / `0:26`; write rejection is the expected negative case. |
| Native source | Twenty ordered raw stages plus file and HTTP stages: all 22 exits zero, no signals, cleanup true. |
| Full gates | 152 backend passes, 54 frontend passes and 18 release passes; lint, types, build and workflow gates passed. These suites overlap other checks; do not sum them. |
| Executable outside checkout | 24 browser cases passed in 1.2 minutes, all 93 assets checked, flowchart/sequence/class/state lazy rendering passed, zero unexpected errors or external requests. |
| Emitted syscall audit | One execution per service, empty runtime PATH, zero checkout accesses and no frontend extraction. Refused: 3 paired calls / 404 file accesses / 0 writes. Supported: 251 paired calls / 19,833 accesses / 16 scoped writes. |
| Complete aggregate | `result=passed`, `nativeAcceptance=passed`, `cleanup=true`. Hosted loopback listeners were disposable tests, not public or retained previews. |

The checked executable is `merdeck-0.0.0-ci.fixture-linux-x64`, 85,485,024 bytes, SHA-256 `9be56bbd7551bdd27806571a133112947aee2deb27b6dbdce3f030c71337f354`. Its matching SHA256SUMS, strict manifest, exact commit/tag/version/target, 93-asset inventory and x86-64 ELF header were validated from the supplied download without local x64 execution. The fixture tag/version is build metadata, not an actual published Git tag or selected first release. The artifact archive (85,506,772 bytes, digest `dc0b9dd49f04f5bdb86fb8156ac4d9252627378eff9f7ba2c059d3339f402b5e`) is distinct from the executable checksum. It contains the executable, checksum and internal manifest.

Successful individual raw probe JSON and raw syscall traces were not uploaded. The statements above come from actual emitted stage/audit summaries and the inspected runner/auditor semantics; they do not claim local replay of missing raw files or queries of hosted listeners. The source-stage `nativeAcceptance=pending` correctly described that stage alone and is superseded by the complete executable aggregate, without rewriting its record. The historical `applicationSafetyPassed=false` diagnostic remains unchanged. [DOC-001](docs/task/DOC-001.md) records focused verification and coverage values.

Final independent review `a0f0f039ed20fd3289717898a8f8d4a349db0555` is accepted: P2 resolved at `e70dd9c`, P3 resolved at documentation `7d6d720`, with native policy/execution/artifact checks passed and no remaining actionable findings. [REVIEW-001](docs/task/REVIEW-001.md) records the assessment. The reviewed implementation and documentation are complete on the delivery branch; final main integration still requires its separate approval. No first version/tag/release is recorded.

A maintainer can push a concrete reviewed candidate commit to the dedicated nonpublishing branch without merging main. Replace REVIEWED_COMMIT with that exact full SHA; do not use a fixture tag:

```bash
git push origin REVIEWED_COMMIT:refs/heads/verify/native-readiness
# Observe the exact pushed SHA in the resulting "Verify and release" Actions run.
gh run list --repo itxje/merdeck --branch verify/native-readiness --workflow verify.yml
gh run view RUN_ID --repo itxje/merdeck --log-failed
gh run download RUN_ID --repo itxje/merdeck --name verification-failure-1
```

These commands describe future reviewed candidate updates and failed-run diagnostics; do not rerun the successful candidate solely to update documentation. The two observed run outcomes are recorded above. The exact origin remains `git@github.com:itxje/merdeck.git`. `workflow_dispatch` becomes an additional nonpublishing entry after its default-branch availability requirements are met; the initially empty repository must use the candidate push trigger first. The workflow observes the actual native candidate and separate tmpfs refusal mount; it never infers ext4 from Ubuntu or modifies mounts. Its first real ext4 run retained twenty raw controls and the old admission failure. Attach run URL, exact commit, runner/runtime and filesystem/type/device to the bounded storage correction review. The corrected candidate's actual native/source/binary/browser evidence is verified above; final documentation review is accepted and the separate main-integration approval boundary remains. Do not treat a refused target as native acceptance.

## Version-tag releases and running the executable

**The first release is [`v0.1.0`](https://github.com/itxje/merdeck/releases/tag/v0.1.0), tagged at `be42c59` on 2026-09-11.** For each later release, once a reviewed commit has actually passed the matching Linux x64/native gates, a maintainer selects a version and pushes a tag `vMAJOR.MINOR.PATCH` at that commit. SemVer prerelease suffixes such as `-rc.1` are supported and set the GitHub prerelease flag; leading-zero numeric identifiers, build metadata and malformed versions are rejected. A tag is immutable release identity: do not move it to different bytes. Main commits, candidate branches and manual runs do not publish.

Before 1.0, the maintainer chooses the position to raise by what an operator has to notice. The **patch** position covers ordinary work: fixed defects, interface adjustments, a widened preview policy, documentation. The **minor** position is for a release that changes what a deployment must account for: the published artifact's form, a default configuration value, storage admission, or the API and session contracts. The major position stays at zero until 1.0. An earlier release that used the wrong position is left as published, because a tag is not moved.

After selecting the real version and reviewed commit, the maintainer process is:

```bash
# Replace both placeholders only after actual native/x64 acceptance and review.
release_tag=vMAJOR.MINOR.PATCH
reviewed_release_commit=REVIEWED_COMMIT
bun scripts/release-version.ts "$release_tag" && \
git tag -a "$release_tag" "$reviewed_release_commit" -m "Release $release_tag" && \
git push origin "refs/tags/$release_tag"
```

The placeholders are deliberately invalid until a version and commit are chosen. The first release, `v0.1.0`, was tagged and pushed with these commands.

The tag workflow repeats all required checks on that exact commit. Only successful native source and binary/browser acceptance permits draft creation, complete attachment upload/checksum verification and final publication. An identical rerun reuses existing matching outputs; conflicts fail without deleting or replacing unrelated assets. A failed upload leaves a draft and can resume with identical artifacts. Only the automated publisher uses the standard GITHUB_TOKEN; no new credentials or registry are required. Local tests and fixture versions never publish.

After a real release exists, download its `merdeck.tar.gz` and `SHA256SUMS`. Both names stay the same for every release, so `https://github.com/itxje/merdeck/releases/latest/download/merdeck.tar.gz` always names the current one. The archive runs on any Linux architecture with [Bun](https://bun.sh) 1.4.2 or newer installed. In an empty download directory, use an owned tmux session for persistent execution:

```bash
sha256sum --check SHA256SUMS
tar -xzf merdeck.tar.gz
bun merdeck.js --version
export MERDECK_ROOT=/absolute/path/to/your/existing/project
# Read a private random token without putting it in command history:
read -r -s -p 'Access token: ' MERDECK_TOKEN
export MERDECK_TOKEN
export MERDECK_ALLOWED_ORIGINS=http://127.0.0.1:8787
NODE_ENV=production bun merdeck.js
```

The archive holds `merdeck.js` and the `web/` tree it serves, with fixed metadata and no stored timestamp, so the same build always produces the same archive bytes. Keep the extraction directory free of a `.env` file: Bun reads one from the working directory, while the configuration above stays explicit. Supply 32–256 printable non-space random token characters. Confirm that the reported `Merdeck VERSION` matches the downloaded release tag without its leading `v`; `--build-info` reports the matching commit/target/runtime. Keep the root and credentials as runtime inputs, never build inputs. Bun reads the exported runtime configuration; keep credentials and the root as runtime inputs, never build inputs. Default listener is `http://127.0.0.1:8787`, accessible on that machine only. Use the existing explicit Host/Origin/TLS guidance for reviewed remote access. Browser login establishes a bounded, signed session in an HttpOnly SameSite cookie with CSRF validation; it survives a restart with the same token and root until it expires, and changing the token signs every browser out. Run one service per original project root and keep external tools editing those original files directly.

The bundle carries the backend and every interface resource, but still requires Bun on a Linux/glibc host with mounted procfs and actually admitted project storage. It is not a portable filesystem admission bypass. The verified hosted target is Linux x64/ext4; historical ARM64/overlay checks are separate. The archive carries no machine code of its own; the host's Bun supplies the runtime, so the usual system libraries come from that installation. The unpublished checked executable still needs `/lib64/ld-linux-x86-64.so.2` and the normal `libc`, `libpthread`, `libdl` and `libm`. Bundling the backend and resources is not an all-OS promise; no unverified OS is advertised. Known stale revisions and detected deletion are rejected; the final comparison/rename window and local OS root/ancestor movement limitations remain as documented above. Public repository/release automation does not change the [All rights reserved license](LICENSE).
