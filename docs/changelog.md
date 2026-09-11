# Changelog

## 2026-09-11 11:45 [progress]

The next workflow run passed the release manifest and embedded asset checks, then failed in the browser suite against the traced executable: the file management test read a folder before its deletion request had finished, because the open dialog hides the explorer from role queries. The test now waits for the dialog to close, as its file deletion step already did. See [CI-002](task/CI-002.md).

## 2026-09-11 11:25 [progress]

The `Verify and release` workflow failed on the published `main` because release manifests refused the root-level `/favicon.svg`. Manifests now admit exactly that icon beside the page shell and the asset directory, and compilation records the page shell with its build identity even when the build output lacks it, so the embedded inventory matches what the executable serves. See [CI-002](task/CI-002.md).

## 2026-09-11 10:18 [progress]

At the project owner's request, the hosted instance's hostnames and network addresses no longer appear in the repository. Documentation uses the reserved names `merdeck.example.test`, `diag.example.test` and `*.example.test` and documentation addresses in `192.0.2.0/24` instead, and the published history was reset to a single commit. Commit identifiers cited in earlier records refer to the previous history, which is kept privately. See [DOC-003](task/DOC-003.md).

## 2026-09-11 08:31 [progress]

As planned in [PLAN-010](plan/PLAN-010.md) and continued at the project owner's request, open pages now notice a new deployment. The build writes an identity of all frontend resources into the page shell, and GET `/api/build` reports the deployed one. A page from an older build shows **Application update available** with **Reload application**, which stays disabled while any draft, dialog or pending action would be lost, and **Dismiss update**. The full gate, the browser suite (41 of 41) and a real replacement between two builds passed, and the hosted instance now runs the build of `e5de951`. Pages opened before this deployment need one manual reload. See [UPDATE-001](task/UPDATE-001.md) and the [deployment record](deployment-domain.md).

## 2026-09-11 08:14 [progress]

Corrected outdated status statements at the project owner's request. `AGENTS.md` (also read as `CLAUDE.md`), README, SECURITY and the architecture now say that the reviewed implementation was integrated into `main` on 2026-09-09 instead of awaiting approval, and they describe the file explorer with optional access-token sign-in. Historical plan, task, changelog and deployment records keep their original wording. See [DOC-002](task/DOC-002.md).

## 2026-09-11 05:40 [progress]

As approved in [PLAN-016](plan/PLAN-016.md), the access token is now optional. Without one the service runs with open access: the workspace opens without a sign-in page, Log out is gone and the status bar says Open access. Anyone who can reach such a service can read, change, move and delete its Mermaid and Markdown files. Startup therefore accepts open access only when the bind address and every allowed origin are loopback, unless `MERDECK_OPEN_ACCESS=true` deliberately allows wider exposure. With a token, sign-in, sessions, CSRF protection and logout are unchanged, and writes always require the exact Origin. The browser gate now also runs a service without a token. The checkout moved to `/workspace/merdeck`, and the hosted instance was relaunched from it with open access and the build of `e52c150`. A real browser session then opened the live site without signing in and created and deleted a check folder, leaving nothing behind. See [AUTH-001](task/AUTH-001.md) and the [deployment record](deployment-domain.md).

## 2026-09-11 03:45 [progress]

As approved in [PLAN-015](plan/PLAN-015.md), the explorer now manages project files. New file and New folder in its heading create entries next to the open file, and each file and folder row has an actions menu (also on right-click, with F2 and Delete) to rename or move and delete entries through dialogs. Three authenticated POST routes back these actions. They reuse root containment, descriptor anchors and storage admission, never replace an existing file or folder, delete only empty folders and files at their expected version, and share one queue with saves. Drafts follow moved files and folders, a confirmed file deletion discards that file's drafts, and deletion is permanent. The explorer footer and status bar no longer repeat labels. After the hosted instance was relaunched with the build of `5fcbe55`, a real browser session against the live site created, renamed and deleted a uniquely named check folder and file, leaving nothing behind. See [FILE-002](task/FILE-002.md), [LAYOUT-005](task/LAYOUT-005.md) and the [deployment record](deployment-domain.md).

## 2026-09-11 03:11 [progress]

Relaunched the hosted instance from the main checkout with the build of `be74405`, then verified through a real browser session against the live site that the diagram tabs are gone, that exactly one clearly filled row marks the selected diagram in both colour schemes (contrast ratios of 1.352 in the light scheme and 1.302 in the dark scheme against the sidebar), and that diagrams can be chosen from the narrow file drawer. Evidence is recorded in [LAYOUT-004](task/LAYOUT-004.md) and the [deployment record](deployment-domain.md).

## 2026-09-11 03:10 [progress]

At the project owner's request, Markdown diagrams are now selected from the explorer only. The diagram tabs above the editor are gone, and only the selected file or diagram row is filled with a clearly visible neutral tone; an open Markdown file is marked by weight, and expanded folders stay unfilled. Each diagram row shows its own unsaved marker, and retained drafts of deleted Markdown files keep their diagram rows. The project owner also approved the file management proposal in [PLAN-015](plan/PLAN-015.md). See [LAYOUT-004](task/LAYOUT-004.md).

## 2026-09-11 02:24 [progress]

Relaunched the hosted instance from the main checkout with the build of `59e8a50`, then verified the redesigned header through a real browser session against the live site: the brand, a light/dark/system switch and Log out with tooltips, 16 px icons across icon buttons, a theme preference that survives a reload, 44 px touch targets without horizontal overflow at 390 px, and a file drawer that still focuses its filter and offers Refresh files. Evidence is recorded in [LAYOUT-003](task/LAYOUT-003.md) and the [deployment record](deployment-domain.md).

## 2026-09-11 02:23 [progress]

Redesigned the application header at the project owner's request. The static "Project files" label, which suggested file management the product does not offer, is gone. A compact light/dark/system switch replaces the text theme button, Log out stays as an icon button with a tooltip, and Refresh files now follows the explorer filter, next to the list it refreshes. Icons in base-nova buttons, toggles, selects, menus, alerts and tabs had rendered at 24 px because formatting escaped the quotes in their Tailwind size selectors; they now render at their intended sizes. Two statements left over from before SESSION-001 now say that sign-ins survive restarts. The prototype is unchanged and still needs review. See [LAYOUT-003](task/LAYOUT-003.md).

## 2026-09-10 19:05 [progress]

Relaunched the hosted instance from the main checkout with the build of `2e82365` and a 24-hour session lifetime, then verified through a real browser session that a sign-in survives a further restart of the service with the same CSRF token and expiry, and that logout still signs the browser out. Evidence is recorded in [SESSION-001](task/SESSION-001.md) and the [deployment record](deployment-domain.md).

## 2026-09-10 18:58 [progress]

Browser sessions now survive a service restart. The session cookie carries a random id, the absolute expiry and an HMAC-SHA-256 signature bound to the issuing origin, under a key derived from the access token and project root, and the CSRF token is derived from the session id. A restart with the same token and root keeps existing sign-ins until they expire; a new token or root signs every browser out. Logout still revokes a session, but revocations live only in process memory until expiry, and cookies from before this change read as signed out. The project owner approved the approach on 2026-09-10. See [SESSION-001](task/SESSION-001.md) and [PLAN-014](plan/PLAN-014.md).

## 2026-09-10 18:30 [progress]

Relaunched the hosted instance from the main checkout with the build of `acf180d` and `c135e5f`, then verified pane resizing, collapsing, layout restore and the narrow tab layout, plus readable labels for all 24 styled nodes of the original diagram in both colour schemes, through real browser sessions against the live site. Evidence is recorded in [LAYOUT-002](task/LAYOUT-002.md), [PREVIEW-003](task/PREVIEW-003.md) and the [deployment record](deployment-domain.md).

## 2026-09-10 18:20 [progress]

Flowchart node labels now stay readable when class definitions give nodes light or dark fills: label text below 4.5:1 contrast with its node fill switches to a dark or light neutral, which fixes the unreadable labels in the dark scheme that the project owner reported on 2026-09-10. Author fills, strokes and dashes, the source policy and the sanitizer are unchanged. See [PREVIEW-003](task/PREVIEW-003.md).

## 2026-09-10 18:15 [progress]

The divider between the source editor and the preview can now be dragged or moved with the keyboard, and the source pane can be collapsed to a narrow rail with **Hide source** and restored with **Show source**. The layout is remembered in the browser, and narrow screens keep the Source and Preview tabs. The panes use the shadcn `resizable` component with `react-resizable-panels` pinned at 4.12.4. The project owner requested this on 2026-09-10. See [LAYOUT-002](task/LAYOUT-002.md).

## 2026-09-10 17:55 [progress]

Relaunched the hosted instance from the main checkout with the build of `9c5d466` and verified flowchart label selection, on-diagram editing, refusal and cancellation through a real browser session against the live site, leaving the demo file unchanged. Evidence is recorded in [EDIT-001](task/EDIT-001.md) and the [deployment record](deployment-domain.md).

## 2026-09-10 17:50 [progress]

Flowchart node labels can now be edited on the diagram. Clicking a node selects its label in the source editor, and double-clicking opens an inline editor whose change is written back to the source as an ordinary unsaved draft; Enter applies and Escape cancels. Labels are located with Mermaid's own flowchart lexer, and an edit is accepted only if Mermaid reads the result as the same diagram with just that label changed; markdown labels and other diagram types stay source-only. Panning now starts after 4 px of pointer travel so clicks reach nodes. The project owner approved the scope on 2026-09-10. See [EDIT-001](task/EDIT-001.md) and [PLAN-013](plan/PLAN-013.md).

## 2026-09-10 17:00 [progress]

Relaunched the hosted instance from the main checkout with the build of `9be0477` and verified the sign-in mark, wheel zoom, pointer anchoring and drag panning through a real browser session against the live site. The launch now uses the checkout's own nsl binary instead of one inside a temporary worktree. Evidence is recorded in [BRAND-002](task/BRAND-002.md), [PREVIEW-002](task/PREVIEW-002.md) and the [deployment record](deployment-domain.md). On-diagram label editing for flowcharts is proposed in [PLAN-013](plan/PLAN-013.md) and awaits the owner's decision.

## 2026-09-10 16:58 [progress]

The preview canvas now zooms with the mouse wheel around the pointer and pans when dragged with the primary mouse button, within the existing 25–300% bounds; the zoom buttons, Fit, keyboard scrolling and touch scrolling are unchanged, and the footer hint reads "Drag to pan, scroll to zoom". The sign-in card now shows the Merdeck mark instead of the branch glyph left over from before the rename. The project owner reported both on 2026-09-10. See [PREVIEW-002](task/PREVIEW-002.md) and [BRAND-002](task/BRAND-002.md).

## 2026-09-10 14:20 [progress]

Restarted the hosted instance from the main checkout with the neutral subgraph background build and verified the tinted containers in both colour schemes through a real browser session against the live site. Evidence is recorded in [PREVIEW-001](task/PREVIEW-001.md) and the [deployment record](deployment-domain.md).

## 2026-09-10 13:55 [progress]

Gave flowchart subgraphs a visible neutral background. The renderer now maps Mermaid's `clusterBkg`, `clusterBorder` and `titleColor` to new dual-channel theme tokens instead of inheriting the page background through `tertiaryColor`; node colours, the sanitizer and the trusted renderer settings are unchanged. The project owner chose the neutral direction over Mermaid's default yellow on 2026-09-10. See [PREVIEW-001](task/PREVIEW-001.md) for the decision, values and verification evidence.

## 2026-09-08 05:52 [pitfall]

The single clean-commit READ-001 aggregate passed frozen installs, workflow, file and storage gates, then failed on two test import orders: Bun-backed focused lint and Node-backed repository lint classify bun:test differently. A finite runtime observation confirmed the distinction; only those imports were corrected and actual Node lint passed. The aggregate was not repeated, later build/browser/binary/trace stages were not reached, and required acceptance remains open. Owned fixture cleanup was verified. See [READ-001](task/READ-001.md) for exact tested/corrected commits and retained evidence.


## 2026-09-08 05:46 [progress]

Stabilized read-only document/revision snapshots during normal save or external-edit overlap using at most three fully validated attempts. Actual authenticated baseline races returned 403/409 before correction; new real-descriptor HTTP cases now return exact current content/version while existing auth, containment, deletion and write conflicts remain enforced. Focused file/API checks passed; the clean-commit aggregate is next. Original save diagnostics and native/live/final integration boundaries remain unchanged. See [READ-001](task/READ-001.md), [PLAN-011](plan/PLAN-011.md) and the [read consistency decision](decisions/2026-09-08-read-consistency.md).

## 2026-09-08 04:38 [completed]

Flowchart preview now supports quoted comparisons, fan-out and bounded class colors, widths and dashes while preserving original source bytes and strict SVG security. Final local checks at `78e24e3` passed 135 frontend tests, 30 actual executable browser cases and 93 embedded assets; original labels, all 24 styled nodes/four groups, separate Markdown/standalone saves and hostile neighbors passed. Review resolved a comment-tail validation gap; both its failing probe and the earlier full-gate result remain historical. Cleanup was verified. This ARM64/overlay result leaves combined integration and hosted/native/live acceptance separate. See [RENDER-002](task/RENDER-002.md) and [PLAN-009](plan/PLAN-009.md).

## 2026-09-08 04:13 [progress]

Recorded independently audited hosted Linux x64/ext4 and downloaded-package PASS for corrected candidate `a66276a`, run 34185410383 attempt 1. Exact binary/checksum/manifest/93-resource checks now resolve the prior pending package status; this evidence-only amendment did not rerun tests or alter the live deployment/user data. Historical results, prototype review and final integration/release boundaries remain unchanged. See [DOMAIN-001](task/DOMAIN-001.md).

## 2026-09-08 04:06 [completed]

Deployed the accepted renderer/drawer corrections through one controlled restart, preserving the existing demo root and token. Real HTTPS checks verified exact original-source labels/breaks/save bytes, both narrow drawer sizes, all 92 assets plus the shell, authentication/security controls and guarded cleanup. Existing users reauthenticate with the same token. A final logout helper selected the wrong draft-state label; its failure remains recorded, and a focused independent logout check passed. DOMAIN-001/PLAN-006 live acceptance is complete; new hosted x64/ext4 verification, prototype review and final integration remain separate. See [DOMAIN-001](task/DOMAIN-001.md).

## 2026-09-08 03:35 [progress]

Constrained the file drawer's grid column so long labels cannot widen navigation, search or help text beyond a narrow popup. A real built-service regression first failed with 492 px content inside a 300 px popup; the corrected source and executable keep 300/300 scroll/client widths at 390 and 360 px, with wrapped descriptions and working focus/filter/selection. The full local gate passed with 25 executable browser cases and 93 embedded assets. See LAYOUT-001 and PLAN-008; later combined-build HTTPS acceptance remains separate.

## 2026-09-08 03:25 [progress]

Verified recovered normal HTTPS access, all 92 emitted assets plus the shell, isolated-session security, exact Markdown saves/conflict/deletion and real browser rendering/saves using the unchanged retained build and service. Original user files, credentials and sessions were preserved. Visual inspection reproduced a narrow file-drawer overflow; a one-property grid correction was demonstrated only in an isolated browser and remains outside this deployment task's source scope. Domain acceptance stays partial pending that correction. Prior 502 evidence and all integration/design boundaries remain intact; see [DOMAIN-001](task/DOMAIN-001.md).

## 2026-09-08 02:14 [progress]

Prepared the scoped diag.example.test production route with exact HTTPS origin, secure sessions and an independent verified overlay demo. Frozen setup/build and local Host/auth/CSRF/save/conflict/deletion/asset checks passed. Actual normal-TLS curl and Chromium still return502 at the HTTPS ingress, so domain acceptance remains blocked; no public-reachability or browser-success claim is made. See [DOMAIN-001](task/DOMAIN-001.md) and [deployment ownership and recovery](deployment-domain.md). Application/dependency/design bytes and the final integration boundary are preserved.

## 2026-09-07 23:26 [progress]

Completed DOC-001 and PLAN-001's reviewed implementation deliverable after accepted final review a0f0f039: P2/P3 resolved, no remaining actionable findings, and verified native/x64 source/executable/package evidence preserved. Closed FILE-001 as superseded by completed SAVE-001 without relabeling its failed/exhausted history as passed. Final read-only preview and documentation/status/preservation checks passed; no application, browser, native or release gate was repeated. See [DOC-001](task/DOC-001.md). The prototype remains needs-review, first release version remains unchosen, and final main-integration approval is still pending; no merge, deployment, tag or release is implied.

## 2026-09-07 23:15 [progress]

Reconciled current documentation with verified hosted ext4/Linux x64 source and single-executable acceptance at 4ca471274d3ffa76469f8b2e87d4abd7055aa764, run 34168525432 attempt 1. Actual logs report all 22 source stages, 24 executable browser cases and 93 assets passed; the supplied package checksum, strict manifest and x86-64 ELF were independently checked. Raw syscall/probe files were not uploaded; no replay or local x64 execution is claimed. Source/prototype preview HTTP and lifecycle checks passed again. The first failed run, practical save/OS-actor limits, needs-review prototype and unchosen first release remain unchanged. Publication was skipped; final independent documentation review and main-integration approval remain. See [DOC-001](task/DOC-001.md) for exact evidence and scope.

## 2026-09-07 23:08 [progress]

Recorded supplied independent P2 review resolution and successful hosted run 34168525432 at candidate 4ca471274d3ffa76469f8b2e87d4abd7055aa764. Public metadata reports successful native source/executable verification and artifact retention, with publication skipped. Detailed native filesystem, test, binary, trace and cleanup evidence still needs review; no values are inferred from the successful job. The first failed run, historical local checks, needs-review prototype and final delivery boundary remain unchanged. See [DOC-001](task/DOC-001.md) for provenance.

## 2026-09-07 23:05 [progress]

Reconciled current editor, SPA routing, complete CI prerequisites and single-executable documentation with the implemented source. Documented private authentication setup, original-file external edits, Markdown/render limits, exact storage acceptance boundaries and temporary preview access. Fresh frozen installs/build, HTTP save/conflict smoke, four source browser cases and nine unchanged prototype groups passed; source, locks, samples and design metadata were preserved. See [DOC-001](task/DOC-001.md) for exact scoped evidence. Final corrected review and hosted ext4/Linux x64 acceptance remain pending; no release or design approval is implied.

## 2026-09-07 22:42 [progress]

Fixed an editor save/refresh race that incorrectly kept an external-change warning after observing its own committed save. Structured observations now clear only a matching save revision while preserving newer typing, sibling drafts and genuine external/deletion/session/error locks. Expiring query observers cannot restore evicted document data. The baseline failed deterministically in both a controlled hook and real browser; the corrected full gate passed with 54 frontend tests, 24 executable browser cases, 93 embedded assets and process/file tracing on explicitly verified local overlay/refusal storage. See UI-001 for exact commands, hashes, failures and cleanup. Native and remote delivery acceptance remain pending.

## 2026-09-07 22:41 [progress]

Prepared an ext4 write-admission candidate from the actual failed hosted run at c1078e302cfe43eeaa8fc5bf9286a09273a74ee5. Its twenty raw ext4 controls passed; full native acceptance did not. Eligibility now requires Linux, matching held descriptor/mount/statfs identity and root device, admitting only overlay or ext4 with their exact observed types. Ext2/ext3, tmpfs, host-shared and unknown types remain refused. Save/version/containment checks remain intact. Focused policy tests distinguish synthetic cases from local actual filesystem checks; native source and executable acceptance still require the next hosted run. Removed internal absolute scratch locations from selected historical records without changing their evidence or results.

## 2026-09-07 22:05 [progress]

Implemented immutable-action CI, a nonpublishing native candidate check and tag-gated draft release automation. The raw executable embeds the Bun runtime, Hono backend and all Vite assets with tag-derived version metadata. The complete frozen-install/check:ci/whitespace gate passed on Linux arm64 and explicitly observed overlay/refusal storage: 85 focused file, 6 storage, 1 procfs, 122 backend, 43 frontend and 11 CI/release tests; 93 exact assets, 19 real binary browser cases and four lazy rendering families passed. Actual process/file tracing and independent cleanup were verified. The initial trace-audit false positive and its correction remain recorded. Linux x64 cross-compilation passed separately; actual x64/native and hosted CI/release acceptance remain pending and publication is blocked by current native admission. See CI-001 and PLAN-002. No push, tag, release, main integration, storage-admission expansion or design approval occurred.

## 2026-09-07 21:28 [progress]

Prepared explicit-target native storage verification and its staged evidence contract. The runner rejects non-native/mismatched storage, preserves bounded raw diagnostics and separates source checks from deployed executable/browser acceptance. File checks now compare explicit expected storage with actual backend capability; unsupported-storage messages refer to the configured project without relocation advice. Production admission and save identity/version checks remain unchanged. Frozen installs, 85 file tests, 122 backend tests, 43 frontend tests, six focused storage tests and all nineteen browser cases passed on actual local overlay/host-shared storage. No native storage was available; nativeAcceptance remains pending. See NATIVE-001 and PLAN-005 for exact results and cleanup.

## 2026-09-07 21:14 [progress]

Added reproducible browser acceptance with explicit verified fixture storage, owned tmux production services, event-driven health readiness, private tokens and verified cleanup. Expanded real browser coverage to 19 passing cases covering original-file saves, external changes, draft/navigation races, source limits, tree states, rendering safety and settled responsive screenshots. The source gate additionally discovers an isolated missing-procfs failure test. Frozen installs, 85 focused file tests, 122 backend tests, 43 frontend tests, strict checks/build and actual production/development browser checks passed after recorded test-harness corrections; see [TEST-001](task/TEST-001.md) for exact commands, coverage and evidence. Ordinary native filesystems, executable-only delivery and remote CI remain pending. Lockfiles, production features and needs-review prototype status are unchanged.

## 2026-09-07 20:33 [progress]

Authenticated login and session inspection now return maxSourceBytes from the configured source byte limit. Anonymous, expired and logout responses retain only authenticated:false. Full-file and Markdown overhead remain subject to authoritative server size checks.

## 2026-09-07 20:24 [progress]

Implemented authenticated same-origin diagram HTTP access, bounded revision polling, session expiry/logout, Host/Origin/CSRF validation and safe built-SPA delivery. Storage eligibility is authenticated; file conflicts/deletion/unsupported writes preserve typed 409/410/503 behavior. The API bridge now executes the real integration suite through the root test gate. Frozen installs, file acceptance, 23 API tests, 122 full backend tests, 8 existing frontend tests, strict checks/build and production/nsl curl smoke passed; see [API-001](task/API-001.md). Browser editor and compiled delivery remain pending, and the prototype remains needs-review.

## 2026-09-07 20:09 [progress]

Completed practical file saving on a verified overlayfs deployment while explicitly refusing writes on unsupported filesystems. Reused the retained parser/file layer and historical evidence, added descriptor-based filesystem/device enforcement and safe storage errors, explicit fixture-parent configuration, consecutive-save acceptance and an independent domain smoke. Frozen root/web installs, the 85-test file gate, 99 backend tests, 8 existing frontend tests, coverage, lint/typecheck/build and whitespace passed. [SAVE-001](task/SAVE-001.md) records exact conditions and cleanup.

## 2026-09-07 20:09 [decision]

The explicit continuation preserves external direct editing and practical optimistic saves. The exact final comparison/rename overwrite was separately reproduced and remains applicationSafetyPassed=false; prior host-shared inode failures remain unresolved. PLAN-004 completes this restricted deployment contract without claiming universal no-loss or blanket Linux support. Downstream API/UI/browser/binary acceptance must use the same verified filesystem contract. Prototype status stays needs-review, and final integration remains separate.

## 2026-09-07 19:15 [progress]

Recorded a supplied direct acceptance control on overlayfs: unchanged source and Bun 1.4.2, 40 passed, 0 failed, 280 assertions. This provides a different-filesystem comparison with the retained 36-pass / 4-failure host-shared run, without proving causality or resolving acceptance. The completed local matrix was not restarted. Source, default fixture placement and safety checks remain unchanged; provenance and interpretation limits are in the [inode record](decisions/2026-09-07-inode-observations.md#supplied-independent-filesystem-control).

## 2026-09-07 19:12 [pitfall]

Completed a finite six-case investigation of the consecutive-save inode conflict. The failure reproduced in isolated acceptance processes and a raw Bun filesystem sequence, with matching content, timestamps and link counts but changed inode across reads. Node and additional synchronous-stat controls did not reproduce it; attribution remains unresolved. Added bounded TypeScript diagnostics, exact denominators, metadata and explicit evidence gaps in the [inode investigation](decisions/2026-09-07-inode-observations.md). Focused diagnostic typecheck/lint and whitespace checks passed. Production code and original assertions remain unchanged, no full gate was rerun, and FILE-001 remains in progress.

## 2026-09-07 19:01 [BUG-P1]

Corrected Mermaid discovery in ordinary CommonMark documents. A pinned block parser now selects only top-level Mermaid code nodes while preserving surrounding lists, quotes, links, references, HTML and literal/nested code. Multi-block real-save regressions retain exact BOM/CRLF/Unicode bytes outside the selected span. The final frozen-install/full-check command passed with 79 focused tests, 93 backend tests and 8 existing frontend tests; the runtime parser is the only root dependency change.

## 2026-09-07 19:01 [pitfall]

A deterministic isolated diagnostic proved that a real external write after the last version check can be overwritten by rename. This remains an open acceptance risk, with no production protocol changes or guarantee waiver. Repeated real-save regressions also exposed an unresolved inode-only conflict on the current host (36 passes / 4 failures), despite a later passing full check. The task remains in progress for disposition; reproduction, exact evidence and self-review findings are recorded in [FILE-001](task/FILE-001.md).

## 2026-09-07 18:46 [progress]

Implemented the contained diagram file service: bounded tree/revision snapshots, standalone Mermaid and conservative multi-block Markdown parsing, byte-preserving edits, full-file SHA-256 conflicts, serialized saves and synced atomic sibling replacement. Real filesystem tests cover traversal, symlink/root substitution, stale and concurrent saves, external changes, full-content observation and failure cleanup. The focused 61-test suite and full repository gate passed; exact coverage and reproduction evidence are recorded in [FILE-001](task/FILE-001.md).

## 2026-09-07 18:46 [decision]

The file domain uses built-in Linux descriptor anchors through procfs and fails closed on unsupported hosts. Documented the supported Markdown subset, bounded request-driven refresh, permissions/metadata policy and unavoidable external-process comparison/rename boundary in [architecture](architecture.md#files-polling-and-drafts). No dependencies or shared contracts changed. The local filesystem does not enforce the tested directory permission denial, so permission-error mapping uses explicit fault injection; no broader OS isolation or browser acceptance is claimed.

## 2026-09-07 18:31 [progress]

Delivered the standalone DiagramDock prototype with TypeScript/React source, reused base-nova controls and semantic theme tokens, real Mermaid previews, multi-block selection, retained drafts, simulated save/conflict recovery, zoom and responsive panes. The asset remains needs-review. Nine browser verification groups, offline export, scoped type checking and the full repository gate passed; screenshots and reproduction details are recorded in [DESIGN-001](task/DESIGN-001.md) and the [design README](../designs/diagramdock/README.md). Application source and dependency locks are unchanged.

## 2026-09-07 18:31 [pitfall]

The installed nsl 0.1.7 has no serve subcommand. The prototype preview uses supported nsl run with a fixed-route TypeScript server in the project tmux session; the verified .localhost URL is local-machine only. The renderer requires Mermaid's root-level htmlLabels setting and normalization of mounted SVG bounds under reduced motion. Prototype simulation does not establish production persistence or filesystem security.

## 2026-09-07 18:09 [progress]

Established the Bun + Hono API and sibling React + Vite toolchain with strict TypeScript, independent locks, CLI-sourced base-nova primitives, theme providers, explicit configuration, typed API contracts and sample diagrams. The exact frozen-install/check gate passed with real backend/frontend coverage, production build, browser starter-page verification and standalone health smoke. Full file/auth/editor/rendering/prototype implementation remains pending. See [STACK-001](task/STACK-001.md) for exact evidence and limitations.

## 2026-09-07 18:09 [decision]

Standardized DIAGRAMDOCK_ROOT, mandatory operator token with bounded browser sessions, revision polling and the diagrams module boundary under the original scope. Pinned TypeScript 6.0.3 because the current lint stack rejects the TypeScript 7 API transition; verified Bun 1.4.2 locally without changing system tools. The design remains needs-review.

## 2026-09-07 17:42 [decision]

Recorded the original 2026-09-07 MVP implementation authorization with day-level precision. Persisted investigation and proposal before repository hygiene implementation. Established the file-only architecture, root containment and save-conflict requirements, unreviewed design assumptions, acceptance stages and separate final main-integration boundary.

## 2026-09-07 17:42 [progress]

Established repository instructions, formatting/ignore configuration, an explicit All rights reserved license, placeholder-only environment documentation, a private runtime-only manifest and sequential task tracking. Application code, dependencies, scripts, sample project and prototype remain future work; there is no runnable app or verified preview at this stage. Bootstrap verification evidence is recorded in [BOOT-001](task/BOOT-001.md).

## 2026-09-07 20:45 [progress]

Implemented the project-file workspace from the existing needs-review prototype: authenticated login, responsive explorer/source/preview, independent Markdown drafts, byte-limited explicit saves, external-change review, deletion preservation and session recovery. Added serialized strict Mermaid rendering with constrained SVG sanitization, zoom/fit, themes and keyboard controls. Expanded automated state/auth/rendering checks and real browser flows on explicit supported and unsupported storage. Final verification evidence is recorded in UI-001; native storage and standalone executable acceptance remain separate delivery work.

## 2026-09-08 03:29 [progress]

Corrected ordinary Mermaid label breaks through narrowly recognized bare tags and private render-only canonicalization. Strict SVG security and original editor/draft/saved bytes are preserved. Added exact Unicode topology, row geometry, hostile-neighbor and persistence regressions; focused source checks passed. Fresh aggregate executable/browser verification and its local-versus-hosted limits are tracked in [RENDER-001](task/RENDER-001.md).

## 2026-09-09 08:43 [progress]

Renamed the product from DiagramDock to Merdeck (phase 1 of 3: mechanical text/identifier rename only, under the user's explicit 2026-09-09 naming/logo authorization). Every `DIAGRAMDOCK_*` environment variable, the health payload, the session cookie, package names and the repository slug now read `merdeck`/`MERDECK_`/`itxje/merdeck`. The design prototype moved from `designs/diagramdock/` to `designs/merdeck/` and was rebuilt from renamed source; the brand icon is intentionally unchanged pending the next phase. Historical task/plan/decision records, existing changelog entries and the recorded GitHub Actions run-link URLs stay byte-identical. The deployed hostname `diag.example.test` and its private launcher are unchanged. See [BRAND-001](task/BRAND-001.md) and [PLAN-012](plan/PLAN-012.md).

## 2026-09-09 08:58 [pitfall]

The mandatory `bun run check` initially failed 36 write-path tests in this checkout, refused with an unrecognized storage type. Root cause: this checkout's location mounts via virtiofs (`0x65735546`), which the write-admission policy correctly refuses; this is an environment property, not a rename defect. The existing `MERDECK_TEST_FIXTURE_PARENT`/`MERDECK_TEST_UNSUPPORTED_PARENT` fixture-redirection mechanism resolves it: pointed at canonical directories on this host's admitted overlayfs `/tmp` and refused tmpfs `/dev/shm`, `bun run check` passes 173/173 plus 135/135 frontend tests end to end. No production code, test or the write-admission policy itself changed. See [BRAND-001](task/BRAND-001.md).

## 2026-09-09 09:54 [progress]

Deployed the Merdeck rename's built service (`f1fe857e2`) behind a new owner-scoped `merdeck` nsl route (phase 4 of 4). A fresh disposable demo root and token were created since the prior demo root did not survive the 2026-09-08 host restart. The local Host-header probe against the nsl daemon passed in full: shell `200`, health reporting service `merdeck`/status `ok`, and an anonymous authenticated-path request returning `401`. The external HTTPS endpoint `https://merdeck.example.test` still returns `502 Bad Gateway` from peer `192.0.2.1` — the external ingress/DNS for the new hostname remains unconfigured, outside this repository and this work, and was not worked around. Domain acceptance is therefore recorded as verified locally only, not end-to-end. See [BRAND-001](task/BRAND-001.md) and [deployment ownership and recovery](deployment-domain.md).

## 2026-09-09 09:40 [progress]

Completed the Merdeck rename (phase 3 of 3: final verification and close). Merged phases 1 (mechanical rename) and 2 (brand mark: header icon, favicon, `designs/merdeck/brand.html`) and re-verified the whole tree end to end: `bun run check` passes 174/174 backend and 135/135 frontend tests (one added regression test for the `/favicon.svg` static route), `designs/merdeck/check.ts` passes 9/9, and `git diff --check` is clean. Under a scope addition requested by the user partway through on 2026-09-09, the documented hosted domain and nsl route also move from `diag.example.test`/`diag` to `merdeck.example.test`/`merdeck` throughout the living configuration/launch/ingress guidance in README.md and docs/deployment-domain.md; this is a documentation-only change, no redeployment was performed, and two specific timestamped 2026-09-08 verification records that factually tested `diag.example.test` were deliberately left referring to that hostname rather than rewritten, to avoid asserting a verification of the new hostname that never happened. See [BRAND-001](task/BRAND-001.md) for the exact grep evidence, the two resulting deviations from a fully literal reading of the added acceptance criteria, and the honestly-recorded, unresolved disagreement about the brand mark's legibility. The brand mark and prototype remain **needs-review**, not user-approved. See [BRAND-001](task/BRAND-001.md) and [PLAN-012](plan/PLAN-012.md).

## 2026-09-09 17:40 [decision]

The project owner reviewed the Merdeck brand sheet and approved the deck-without-wave direction as the product mark. `web/src/shared/components/brand/merdeck-mark.tsx`, `web/public/favicon.svg`, `designs/merdeck/brand.html` and the rebuilt `designs/merdeck/Merdeck.html` now carry that geometry byte-identically; the former primary (with a wave line beneath the deck) and a solid-node direction are both kept in the brand sheet, relabelled not chosen. The earlier crown-like reading recorded against the first primary mark is resolved by this choice, not by a redesign. `designs/merdeck/_d_meta.json` marks `brand.html` **approved**; `Merdeck.html` — the prototype layout as a whole — stays **needs-review**, and final main-integration approval remains separate. See [BRAND-001](task/BRAND-001.md) and [PLAN-012](plan/PLAN-012.md).

## 2026-09-09 18:02 [completed]

Rebuilt the running service from the merged head that carries the project owner's approved brand mark and restarted it in place, then verified the live site end to end over real HTTPS. The previous process was stopped and confirmed gone, along with its route, before an identical relaunch produced a new process under the same route; the unrelated preview route and the unrelated `invest` routes were left untouched. `https://merdeck.example.test/api/health` now returns `200` reporting the service healthy, `https://merdeck.example.test/favicon.svg` returns `200` carrying the approved mark's path data with no trace of the earlier wave path, and `https://merdeck.example.test/` returns `200` with the built shell. This supersedes the prior partial record: the external ingress gap has closed. See [BRAND-001](task/BRAND-001.md) and [deployment ownership and recovery](deployment-domain.md).
