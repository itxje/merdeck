# Changelog

## 2026-09-16 13:30 [fix]

Safe HTML document preview now renders void elements such as `<hr>` and `<br>` without children, preventing React error #137. The application-owned tree, explicit element allowlist and strict DOM boundary remain unchanged. See [20260916-1328-fix-html-void-elements](task/20260916-1328-fix-html-void-elements.md).

## 2026-09-16 04:30 [feature]

Explicitly configured AI file-editor providers now work in open-access deployments without `MERDECK_TOKEN`. The UI entry, bounded conversation API, approvals, cancellation and SSE use the existing open authorization domain; every mutation still requires the exact configured Origin, non-loopback open access still requires deliberate acknowledgement, and executable-path, sandbox, environment, storage, output and process-lifecycle limits are unchanged. Open conversations are origin-bound, opaque and limited to the configured session lifetime. Anyone who can reach an open-access service can invoke its configured providers. See [20260916-0425-open-access-agents](task/20260916-0425-open-access-agents.md).

## 2026-09-16 03:51 [release]

Published [v0.13.0](https://github.com/itxje/merdeck/releases/tag/v0.13.0) with read-only safe HTML documents, the opt-in direct AI file editor with engine/model selection, and complete Markdown/HTML table-header frames. Exact commit `fb9f69809dff4f51210ea1323bcec8d46a7501d1` passed [native acceptance on main](https://github.com/itxje/merdeck/actions/runs/35051994698), and [the tag workflow](https://github.com/itxje/merdeck/actions/runs/35052722296) repeated acceptance and published exactly `merdeck.tar.gz` and `SHA256SUMS`. Downloaded checksum verification passed; the extracted 97-file bundle reports version 0.13.0 and the tagged commit. The release does not deploy or restart separately hosted services. See [20260916-0228-release-html-ai-editor](task/20260916-0228-release-html-ai-editor.md).

## 2026-09-16 02:58 [fix]

Document tables now give every header cell a complete theme-aware frame and retain a continuous table perimeter. Production-browser coverage checks computed top, right, bottom and left borders for both Markdown and safe HTML tables in light and dark themes. See [20260916-0227-table-header-borders](task/20260916-0227-table-header-borders.md).

## 2026-09-16 01:51 [feature]

Added an opt-in AI file editor backed by explicitly configured Codex or Claude Code executables outside the project root. Token-authenticated sessions can choose a configured engine and a validated model discovered from its CLI, stream a bounded normalized conversation, approve or deny opaque provider requests, stop a turn and see direct file edits refresh the selected preview. Children run without a shell from the canonical project root with a narrow environment; Codex requests a root-only workspace-write sandbox with tool networking disabled, while Claude Code exposes only file read/edit/search tools. Dirty drafts block Send, active turns lock Merdeck saves and entry mutations, and logout, expiry and shutdown reap conversations. Direct provider writes remain external-actor writes, are not guaranteed to request approval first and may send project context to the selected provider. See [20260916-0040-ai-editing-chat](task/20260916-0040-ai-editing-chat.md).

## 2026-09-16 01:50 [feature]

Added read-only `.html` and `.htm` documents across discovery, search, file operations and workspace navigation. A same-origin Worker parses exact same-read text with pinned `parse5` and projects only a bounded inert application tree; React creates the semantic allowlist without mounting file-derived HTML. Scripts, styles, forms, frames, custom/foreign elements and remote resources never execute or load, while guarded external, project and fragment links retain the existing navigation boundary. Production-browser evidence preserves exact disk bytes and reports no unexpected request or execution; a 1 MiB document and 10,000-element adversarial input produced no observed main-thread Long Task. See [20260916-0011-html-document-support](task/20260916-0011-html-document-support.md).

## 2026-09-16 00:18 [fix]

Restored the visual hierarchy of rendered Markdown headings after the Tailwind base reset left semantic `h1` through `h6` elements inheriting body typography. Every heading level now has an explicit, descending size and stronger weight while retaining the existing theme colour boundary. The production-browser regression verifies computed typography alongside the existing security, navigation, responsive, theme and byte-preservation path. The focused browser case and complete local repository check passed. See [20260916-0018-markdown-heading-hierarchy](task/20260916-0018-markdown-heading-hierarchy.md).

## 2026-09-15 09:32 [fix]

Restored narrowly admitted encoded angle placeholders when Mermaid splits their private marker across adjacent or nested SVG text nodes, as exposed by the Linux x64/native executable smoke. Restoration is confined to generated label `Text.data`, grouped per label and applied without creating markup or attributes; source-specific private markers also avoid collisions with marker-like source text. The original strict admission grammar, validation, sanitizer, persistence and mounting boundaries remain unchanged. Focused policy/renderer tests, frontend coverage, root checks and three production-browser repetitions passed locally; hosted Linux x64/native acceptance remains required. See [20260915-0924-split-angle-marker](task/20260915-0924-split-angle-marker.md).

## 2026-09-15 04:32 [release]

Published [v0.11.4](https://github.com/itxje/merdeck/releases/tag/v0.11.4), which compacts the mobile drawer header. Exact commit `ebebccdb384e8ddc04df720ba8a37d67a79c2354` passed [native acceptance on main](https://github.com/itxje/merdeck/actions/runs/34927937221), and [the tag workflow](https://github.com/itxje/merdeck/actions/runs/34928586559) repeated acceptance and published the release. Downloaded `merdeck.tar.gz` passed `SHA256SUMS`; its extracted bundle reports version 0.11.4 and the tagged commit. The release does not deploy or restart separately hosted services. See [20260915-0403-release-compact-mobile-drawer-header](task/20260915-0403-release-compact-mobile-drawer-header.md).

## 2026-09-15 05:26 [fix]

The preview now renders the narrowly accepted `&lt;board&gt;` placeholder as visible inert text without changing editor, draft, save-request or saved-file bytes. Only lowercase ASCII identifier placeholders that are already proven non-element text are admitted; Mermaid receives a private text marker and the generated SVG restores it only inside text nodes before the existing sanitizer. Mixed-case, numeric, malformed, nested, double-encoded, tag-like, resource and event-attribute forms remain refused. Focused browser coverage confirms the exact source, visible text, no outbound request or execution, and exact save/reload bytes. See [20260915-0516-encoded-angle-placeholder](task/20260915-0516-encoded-angle-placeholder.md).

## 2026-09-15 05:14 [fix]

Stabilized the desktop source-pane activation boundary. The workspace now starts in the source panel's collapsed state, derives later collapse from its actual 40px layout size, and makes **Show source** immediately represent the intended expanded state. Shared browser selection waits for the show control to leave the visible tree before using the Mermaid textarea; a regression selects a new file through that path while the source pane is collapsed. The affected browser set passed 63 pre-repair repetitions and 46 post-repair repetitions. The full aggregate passed every source-pane case; its only unrelated failure was a dirty external-rename directory 503, retained under [20260914-1150-directory-poll-save-race](task/20260914-1150-directory-poll-save-race.md). See [20260914-1559-source-pane-e2e-ordering](task/20260914-1559-source-pane-e2e-ordering.md).

## 2026-09-15 02:52 [fix]

The mobile file drawer no longer spends a visible row on `Project files` or its explanatory description. It opens directly into the explorer while retaining an assistive dialog name and the shared close control; the explorer action row reserves space so its file, folder, and refresh actions do not overlap that close target. Narrow-screen browser coverage exercises the reclaimed space, accessible name, close action, and 315px short viewport. The self-contained prototypes remain `needs-review`. See [20260915-0230-compact-mobile-drawer-header](task/20260915-0230-compact-mobile-drawer-header.md).

## 2026-09-15 02:18 [release]

Published [v0.11.3](https://github.com/itxje/merdeck/releases/tag/v0.11.3), which keeps the mobile Project files listing reachable on short screens. Exact commit `204271baa1471bb46da0358664e0dcc2ca28c035` passed [native acceptance on main](https://github.com/itxje/merdeck/actions/runs/34919340741), and [the tag workflow](https://github.com/itxje/merdeck/actions/runs/34920053087) repeated acceptance and published the release. Downloaded `merdeck.tar.gz` passed `SHA256SUMS`; its extracted bundle reports version 0.11.3 and the tagged commit. The release does not deploy or restart separately hosted services. See [20260915-0156-release-short-mobile-file-listing](task/20260915-0156-release-short-mobile-file-listing.md).

## 2026-09-15 01:53 [fix]

Short mobile Project files sheets now reserve a scrollable two-row region at 315 by 533 CSS pixels. The compact footer hides only an unavailable `Next page` control; enabled pagination remains reachable. Immediate directory rows and recursive file-type search results use the same minimum listing space. Browser coverage exercises 101 folders, later-row scrolling, pagination containment, and a nested Mermaid search result. The accompanying self-contained prototype remains `needs-review`. See [20260915-0119-investigate-mobile-project-files-listing](task/20260915-0119-investigate-mobile-project-files-listing.md).

## 2026-09-15 01:08 [release]

Published [v0.11.2](https://github.com/itxje/merdeck/releases/tag/v0.11.2), which fixes nested project-folder browsing after a recursive file-type search. Exact commit `55a2f0ba7ba6283b3a6d6f34d0772ebefbef9067` passed [native acceptance on main](https://github.com/itxje/merdeck/actions/runs/34914655846), and [the tag workflow](https://github.com/itxje/merdeck/actions/runs/34915373178) repeated acceptance and published the release. Downloaded `merdeck.tar.gz` passed `SHA256SUMS`; its extracted bundle reports version 0.11.2 and the tagged commit. See [20260915-0046-release-nested-folder-browsing](task/20260915-0046-release-nested-folder-browsing.md).

## 2026-09-14 23:42 [fix]

Fixed nested folder browsing after a recursive file-type search. Entering a folder now exits the recursive type search and restores the established immediate-child explorer view, so each folder level remains reachable and a nested supported file can be selected. The bounded server-side directory contract, project-root containment, depth limits, pagination, cursor recovery, drafts, and mobile drawer layout are unchanged. The focused browser regression, affected 10-case browser suite, frontend checks, full `bun run check`, and whitespace check passed. See [20260914-2342-fix-nested-folder-browsing](task/20260914-2342-fix-nested-folder-browsing.md).

## 2026-09-14 23:30 [release]

Published [v0.11.1](https://github.com/itxje/merdeck/releases/tag/v0.11.1), which fixes the mobile Project files drawer. Exact commit `9eab6c37605d2e2f7acc59d3b1aab04b970af1a6` passed [native acceptance on main](https://github.com/itxje/merdeck/actions/runs/34907616557), and [the tag workflow](https://github.com/itxje/merdeck/actions/runs/34908456433) repeated acceptance and published the release. Downloaded `merdeck.tar.gz` passed `SHA256SUMS`; its extracted bundle reports version 0.11.1 and the tagged commit. See [20260914-2308-release-mobile-drawer](task/20260914-2308-release-mobile-drawer.md).

## 2026-09-14 16:00 [fix]

The mobile Project files drawer is now a safe-area-aware bottom sheet instead of a vertically centred fixed-height popup. A settled empty folder uses only the space needed for its controls and status, while populated folders retain a bounded scrollable listing. Browser coverage verifies 360 px and 390 px sheet placement, containment, focus restoration, and populated-list scrolling. The accompanying self-contained prototype remains **needs-review**. Focused checks passed; the full clean-candidate aggregate still exposes an unrelated existing source-pane browser-sequencing failure, recorded separately in [20260914-1559-source-pane-e2e-ordering](task/20260914-1559-source-pane-e2e-ordering.md). See [20260914-1517-mobile-file-drawer](task/20260914-1517-mobile-file-drawer.md).

## 2026-09-14 11:50 [release]

Published [v0.11.0](https://github.com/itxje/merdeck/releases/tag/v0.11.0), which lists a chosen file type from subfolders. Exact commit `1f41a22ef26267877e13271b27875bc95e6659f7` passed [native acceptance on main](https://github.com/itxje/merdeck/actions/runs/34837535372). The first attempt of the [release run](https://github.com/itxje/merdeck/actions/runs/34838379897) failed one browser case because a directory revision poll met the page's own save and its HTTP 409 reached the browser audit; that job was rerun on the same tag and commit, passed, and published the release. The downloaded archive matched `SHA256SUMS` and reports version 0.11.0. The race is recorded in [20260914-1150-directory-poll-save-race](task/20260914-1150-directory-poll-save-race.md). v0.10.0, which added name search below a folder, was published on 2026-09-13 without its own entry.

## 2026-09-14 11:20 [fix]

Choosing **.mmd** or **.md** in the explorer lists the files of that type in the browsed folder and every subfolder, with or without search text, instead of filtering only the loaded page. `GET /diagrams/search` accepts a `kind` that the service applies before its 200-match budget, and unsaved drafts stay reachable beside search results. See [20260914-1105-search-file-types](task/20260914-1105-search-file-types.md).

## 2026-09-13 21:30 [progress]

The explorer searches below the browsed folder again, now through the service: typing looks through every subfolder by name, without reading file contents, and lists up to 200 matches with paths below the folder. The walk applies the same exclusions and path checks as a directory page, stops at 20,000 names or before the request deadline, and says so when it stops. See [20260913-2045-directory-search](task/20260913-2045-directory-search.md).

## 2026-09-13 20:35 [fix]

The explorer orders what it has loaded again: folders first, then names with numbers compared by value, whatever native order the directory page arrived in. See [20260913-2030-explorer-order](task/20260913-2030-explorer-order.md).

## 2026-09-13 20:09 [release]

Published [v0.9.1](https://github.com/itxje/merdeck/releases/tag/v0.9.1) with independent directory navigation, bounded pagination and deferred Markdown loading. Exact commit `390adabc00385997f6e49a6771c450be465cbfed` passed full native source/executable/bundle acceptance and release verification. Downloaded archive checksum and build metadata were verified. Completed the feature/correction plans and existing [delivery task](task/20260913-1802-directory-frontend.md); original failed checkpoints and the unpublished immutable v0.9.0 tag remain recorded. Prototypes remain needs-review and runtime/storage limitations remain unchanged.

## 2026-09-13 18:41 [fix]

Corrected selected-document refresh after transient failure and directory request lifetime around navigation and writes. The [bounded acceptance repair](task/20260913-1802-directory-frontend.md) preserves the original aggregate failure and reproduces its 429 on the unchanged executable. Focused unit checks passed 81 tests; targeted production browser checks passed 14 cases, including explicit namespace conflict recovery without cursor replay. README now states the exact candidate runtime and current v0.8.4 release; v0.9.0 and final hosted/native candidate acceptance remain pending. No full aggregate rerun or publication is claimed.

## 2026-09-13 18:22 [progress]

Implemented the [directory frontend candidate](task/20260913-1802-directory-frontend.md): independent browse history, bounded five-page navigation, deferred Markdown, retained drafts and validated unloaded file links. Frontend lint/types and 458 tests passed; corrected focused production browser coverage passed 12 cases after preserving two initial regression failures. The normal clean-candidate local gate and final integrated native acceptance remain pending. Recorded owner-confirmed backend native run 34772642752 and completed its task without replacing historical evidence. Overall feature plans stay implementing and prototypes stay needs-review.

## 2026-09-13 17:45 [progress]

Corrected the directory byte-boundary test to count excluded raw records independently of filesystem order. The regression now observes actual consumed names, verifies pending-entry delivery and complete unique traversal with and without hidden names, while retaining late cancellation and the exact descriptor check. Hosted run 34772385404 remains recorded as failed at this assertion; production code is unchanged and full hosted native retry is still required. See the [backend task](task/20260913-1637-directory-backend.md).

## 2026-09-13 17:40 [progress]

Corrected directory verification exports to retain raw traces locally and publish only bounded, sanitized, identity-checked summaries. Existing hosted reporting now retains safe evidence on success and failure without changing release payloads. The production backend is unchanged from the prior complete local PASS; authorized focused validation covers this verification-only correction, with full hosted x64/ext4 acceptance still required. See the [backend task](task/20260913-1637-directory-backend.md).

## 2026-09-13 17:22 [progress]

Implemented the reviewed fixed-buffer native directory candidate and shared it with bounded growing-prefix move audits. Actual adapter source/bundle/compiled physical checks passed locally on ARM64 overlay and virtiofs; full local and hosted native acceptance remain pending. Added parser/error/cleanup and HTTP lifecycle regressions plus the physical harness in existing check:ci/--native paths. The [backend task](task/20260913-1637-directory-backend.md) retains exact evidence and the corrected startup-test isolation defect; no frontend or production acceptance is implied.

## 2026-09-13 17:10 [decision]

The [streaming correction](plan/20260913-1657-streaming-directory-correction.md) is authorized for candidate implementation after concrete review. The original directory plan now carries the reviewed fixed-buffer getdents64 clauses, with no wire/schema changes. Experimental FFI and dynamic glibc remain material prerequisites; actual application physical-streaming and complete local/native gates are required before integration acceptance. The backend claim stays in_progress, overall feature implementing and prototype needs-review.

## 2026-09-13 17:05 [decision]

Completed the bounded [directory primitive investigation](plan/20260913-1657-streaming-directory-correction.md) and recorded a [proposed fixed-buffer correction](decisions/20260913-1705-bounded-directory-primitive.md). Actual ARM64/overlay source, bundle and compiled probes demonstrate 4 KiB getdents64 streaming, bounded first-page syscalls, resume/EOF and resource cleanup. Experimental FFI adoption, actual x64/ext4 evidence and feature acceptance remain pending; synchronous I/O cannot guarantee prompt cancellation. No executable feature changes were made. The inherited checkpoint and its introduced failing resource test remain unaccepted, the backend stays in_progress, the feature implementing and prototype needs-review.

## 2026-09-13 16:54 [pitfall]

The [directory backend implementation](task/20260913-1637-directory-backend.md) is blocked at runtime acceptance. Actual Bun 1.4.2 Dir.read uses a whole-directory readdir array despite bufferSize 1; a retained-descriptor assertion fails and the first-read syscall trace reaches EOF across 10,003 names. Logical page/depth/auth tests pass but do not prove bounded underlying work. The provisional contracts, path-depth and lifecycle changes are not ready for integration. The feature plan stays implementing; the prototype stays needs-review. A verified streaming primitive and contract correction are required before implementation acceptance.

## 2026-09-13 16:33 [decision]

Recorded the authorized [directory navigation and bounded pagination proposal](plan/20260913-1628-directory-navigation-pagination.md): per-directory metadata pages, single-use cursors with bounded resources and cleanup, independent path depth, deferred document blocks, and explicit mutation/restart semantics. The [scoped routing decision](decisions/20260913-1628-directory-contract-routing.md) preserves current compatibility and actual virtiofs admission. Investigation/proposal is complete; implementation and integrated acceptance remain pending, and the prototype stays needs-review. Existing PLAN-026 and PREVIEW-011 are unchanged.

## 2026-09-12 21:30 [decision]

The preview policy now refuses only its security boundary. The owner kept configuration directives and configuration beyond the bounded front matter, links and callbacks, HTML tags, entities and Mermaid escape codes, resource and style injection, `@{}` metadata and math, and released everything else. Ordinary syntax that used to collide with broad character and word refusals now renders in every family: class relations and `<<interface>>`, state `<<choice>>`, comparisons, `&`, addresses, backslashes, words such as `style` or `CSS`, lowercase placeholders, and `classDef` and `style` in state, class, ER, block, requirement and quadrant diagrams. Styling takes one bounded list everywhere, now including named colours, four- and eight-digit hex, `font-weight`, `font-style`, a bounded `font-size`, opacities and corner radii, and a class's font weight and style now reach its label text. Of the 67 valid constructs the policy used to refuse, 44 render and the 23 the owner kept stay refused. The preview limits rose from 32,000 characters and 500 edges to 100,000 and 1,000. See [PREVIEW-011](task/PREVIEW-011.md) and [PLAN-025](plan/PLAN-025.md).

## 2026-09-12 19:40 [progress]

Folders and files in the explorer are told apart at a glance. Every level now indents clear of the chevron column, so a file starts to the right of its folder instead of to its left, files and folders at one depth share an icon column, and a thin guide runs through each ancestor. A folder shows a closed or open folder by its state, with a filled icon and a medium-weight name, while files keep their outline icons. Selection, hover, row menus and the narrow drawer are unchanged. See [LAYOUT-009](task/LAYOUT-009.md) and [PLAN-026](plan/PLAN-026.md).

## 2026-09-12 16:20 [progress]

Plain flowchart node/group labels, sequence notes and reference comments can display HTTP(S) addresses without opening links or loading resources. The CSS resource check no longer mistakes `base64url(...)` for `url(...)`, and quoted class notes accept escaped newlines. Original source bytes and strict rendering remain intact. Generic regressions cover unsafe neighboring syntax, visible text, geometry and exact saves; supplied diagrams remain local evidence. See [PREVIEW-010](task/PREVIEW-010.md) and [PLAN-024](plan/PLAN-024.md) for verification and the existing backend gate limitation.

## 2026-09-12 14:35 [progress]

The preview accepts two more pieces of ordinary Mermaid. A sequence diagram may use the bidirectional messages `<<->>` and `<<-->>`, which get the carve-out flowchart arrows already had and are the only sequence arrows carrying an angle bracket; every other bracket and ampersand outside a flowchart stays refused. A leading front matter block may now carry a bounded `config` beside its title: one diagram section from a fixed list, then leaves valued `true`, `false` or a whole number up to 1,000. No configuration value may carry text, so no key can express CSS, a theme, a font, a layout, a colour or an address, and `themeCSS` in particular cannot be written at all — which matters because the host `secure` list does not cover it. A wholesale `config` stays refused for the reason recorded in PREVIEW-007, and every front matter refusal that task established still refuses. Measured against the eighteen sources that prompted the work, all eighteen are now accepted against twelve before. See [PREVIEW-009](task/PREVIEW-009.md) and [PLAN-022](plan/PLAN-022.md).

## 2026-09-12 14:50 [progress]

[Run 34698726205](https://github.com/itxje/merdeck/actions/runs/34698726205) at `9554caf` completed with success, closing both gaps the authoring environment left open: the full `check:ci` ran on Linux x64 with the pinned Node 24.20.0, and both new browser cases executed in a real browser against each executable instance. See [PREVIEW-009](task/PREVIEW-009.md).

## 2026-09-12 14:35 [pitfall]

The authoring environment cannot run the full delivery gate. `bun run check:ci` requires the repository Node 24.20.0 pin against an installed 24.21.0, and the installed Chromium headless shell cannot start without its system libraries, so the new browser case could not be executed there. `bun run check` with the documented fixture parents reaches 203 of 204 backend tests; the single failure reproduces identically on an unmodified worktree of the same commit and is the read-consistency failure already recorded against NAV-002. Frontend lint, typecheck, 282 of 282 tests and the build all pass locally, and the hosted run above supplies the rest. See [PREVIEW-009](task/PREVIEW-009.md).

## 2026-09-12 13:45 [progress]

The file bar is gone. The header now carries the open file, the save state and the Save button beside the brand, the theme switch and log out, so the panes gained the whole bar: the preview surface grew from 685 to 731 pixels at 1440 by 900. With no file open the header names none. See [LAYOUT-008](task/LAYOUT-008.md).

## 2026-09-12 13:20 [progress]

The file bar lost its second line and thirty pixels of height, which the panes gained. The file name, the save state and the Save button stay; the file kind moved into the heading's hover text and the instruction to choose a diagram remains in the empty state. See [LAYOUT-008](task/LAYOUT-008.md).

## 2026-09-12 13:00 [decision]

The default tree scan became wide and shallow: 8,000 entries across four complete levels, instead of 1,000 entries of a walk up to sixteen levels deep. A root that also holds unrelated directories now lists its diagrams instead of spending the budget inside the first large subtree; diagrams kept deeper than four levels need an explicit `MERDECK_MAX_TREE_DEPTH`. Both maximums are unchanged. See [CONFIG-001](task/CONFIG-001.md).

## 2026-09-12 12:45 [progress]

Relative file links preserve flowchart node and subgraph layout, including title-only front matter. A validated private render projection avoids Mermaid's positioning anchors while retaining the original source and application-owned navigation. Stale previews cannot activate file targets. Browser regressions cover geometry, pointer and keyboard navigation, draft retention and exact saved bytes. The normal quality gate remains blocked by an unchanged backend read-consistency test in the current environment; the source candidate and evidence are recorded in [NAV-002](task/NAV-002.md) and [PLAN-023](plan/PLAN-023.md).

## 2026-09-12 12:30 [progress]

Discovery now skips a Rust `target` and a Python `__pycache__` directory, like the other generated output it already ignored, so build artefacts no longer compete with diagrams for the entry budget. See [FILE-004](task/FILE-004.md).

## 2026-09-12 11:55 [progress]

An index diagram works: a flowchart node may name another diagram file with `click <node> "<file>"`, and selecting it with a pointer or the keyboard opens that file in the workspace. Only a project-relative diagram path is accepted; callbacks, addresses, extra arguments and every other form stay refused, the rendered SVG still carries no anchor or `href`, and a target outside the listed tree only explains itself. See [NAV-001](task/NAV-001.md) and [PLAN-021](plan/PLAN-021.md).

## 2026-09-12 11:35 [progress]

A colour declaration that ends with an ordinary statement separator, such as `classDef entry fill:#e0f2fe,color:#0c4a6e;`, is no longer read as a numeric character reference and no longer rejects the whole source; a reference in ordinary text stays refused. See [PREVIEW-008](task/PREVIEW-008.md).

## 2026-09-12 11:20 [progress]

The preview accepts a front matter block that carries only a diagram title, so a titled state diagram renders instead of being refused for its `---` lines; `config` and every other key stay refused. The explorer border became an ordinary window splitter: drag it, step it with the arrow keys or double click it back to the default, and the width is kept per browser between 180 and 520 pixels. See [PREVIEW-007](task/PREVIEW-007.md) and [LAYOUT-007](task/LAYOUT-007.md).

## 2026-09-12 10:45 [progress]

Gantt charts fit their bars. The preview already accepted the family and rendered it, but a chart whose tasks sit away from the current date was fitted around Mermaid's today marker and appeared at single-digit zoom; the marker is now measured out of the fitted size while staying in the diagram. A chart that includes today is unchanged. See [PREVIEW-006](task/PREVIEW-006.md).

## 2026-09-12 09:55 [progress]

Host-shared `virtiofs` storage is now writable. The measured mount selects an identity model: overlay and ext4 keep the inode comparison unchanged, and virtiofs is admitted under a content model that compares device, size, both timestamps and the complete-file hash, proves staged bytes by their own hash and reads the published name back. The one distinction it gives up is an external replacement whose bytes and both timestamps are identical. With fixtures on that storage the file, storage, API and acceptance tests passed 1,060 of 1,060 across twenty runs, against 5 failures in 80 runs before, and the browser suite passed 42 of 42 rooted there. See [STORAGE-002](task/STORAGE-002.md) and [PLAN-020](plan/PLAN-020.md).

## 2026-09-12 08:40 [decision]

Write admission keeps refusing host-shared `virtiofs` storage. The evaluation found every save primitive behaving as on an admitted filesystem, and a single publish cycle stable across 320 raw cycles, but consecutive publication reported a new inode number for unchanged bytes, size and timestamps in 7 of 400 cycles, against 0 of 400 on an overlay control; with admission temporarily extended, the real file tests failed 5 of 80 runs with false conflicts. Saving there stays refused and fail-closed; browsing and drafts are unaffected. See [STORAGE-001](task/STORAGE-001.md).

## 2026-09-12 08:35 [progress]

The preview now accepts bounded `style` statements. A node style and a class definition carry the same declarations in Mermaid, so they now share one validated property list: hex colours, positive widths up to ten pixels and bounded dash lengths. One `style` line no longer rejects a whole diagram, while `linkStyle`, configuration directives, entities and every other property stay refused. See [PREVIEW-005](task/PREVIEW-005.md).

## 2026-09-12 05:30 [progress]

Release [`v0.4.0`](https://github.com/itxje/merdeck/releases/tag/v0.4.0) was published from `9685258` as the first architecture-independent release: `merdeck.tar.gz` measures 1,213,428 bytes, against 37 MB for the previous executable archive. It was downloaded on an `aarch64` host, checked against SHA256SUMS, extracted and started with that host's own Bun; the service reported version `0.4.0`, served the interface, refused an anonymous API request, accepted the token, listed a real project tree and saved a real file against its revision. See [RELEASE-003](task/RELEASE-003.md).

## 2026-09-12 05:05 [progress]

At the project owner's request, releases now attach one architecture-independent `merdeck.tar.gz`: it holds `merdeck.js` and the built `web/` tree, and the host's Bun starts it with `bun merdeck.js`, so the same download runs on x64 and arm64 Linux. The compiled single-target executable stays a checked build output and is no longer published. See [RELEASE-003](task/RELEASE-003.md).

## 2026-09-12 03:30 [progress]

The status bar now names the running version, such as `Merdeck 0.3.1`, and reports `Merdeck development` for a service started from source. The version travels with the session status, so a service that requires a token does not disclose it before accepting a session. See [LAYOUT-006](task/LAYOUT-006.md).

## 2026-09-12 03:02 [progress]

Class definitions in the preview may now set a text colour: `color` takes the same three or six digit hex form as `fill` and `stroke`, so a diagram that styles its label colours no longer fails to render. Unreadable colours are still replaced automatically, and every other property stays refused. See [PREVIEW-004](task/PREVIEW-004.md).

## 2026-09-12 02:30 [progress]

Release [`v0.3.0`](https://github.com/itxje/merdeck/releases/tag/v0.3.0) was published from `7520517` as the first release with the stable archive, so `https://github.com/itxje/merdeck/releases/latest/download/merdeck.tar.gz` now always names the current build. See [RELEASE-002](task/RELEASE-002.md).

## 2026-09-12 02:15 [progress]

At the project owner's request, releases now attach `merdeck.tar.gz` and `SHA256SUMS` instead of the version-named executable, so one address keeps working across releases. The archive is reproducible and holds exactly one executable named `merdeck`; the release checks compare it with the checked executable, and the release smoke runs the extracted one. See [RELEASE-002](task/RELEASE-002.md).

## 2026-09-12 01:58 [progress]

At the project owner's request, release [`v0.2.0`](https://github.com/itxje/merdeck/releases/tag/v0.2.0) was published from `a2d2c87`, so the executable now carries the explorer file type filter. The tag workflow repeated all native checks on that commit before publishing `merdeck-0.2.0-linux-x64` with its `SHA256SUMS`. See [RELEASE-001](task/RELEASE-001.md).

## 2026-09-12 01:45 [progress]

At the project owner's request, the explorer lists only the file types you choose: every supported file, diagram files (`.mmd`, `.mermaid`) or Markdown files. The control sits under the search field, is remembered in this browser, applies to the file drawer as well, and is reflected in the file count and the empty-list hint. See [FILE-003](task/FILE-003.md).

## 2026-09-11 14:40 [progress]

At the project owner's request, the first version-tag release [`v0.1.0`](https://github.com/itxje/merdeck/releases/tag/v0.1.0) was published from `be42c59`. The tag workflow repeated all native checks before it published `merdeck-0.1.0-linux-x64` with its `SHA256SUMS`. See [RELEASE-001](task/RELEASE-001.md).

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

## 2026-09-13 17:47 [progress]

Delivered a separate needs-review directory navigation prototype and [frontend integration proposal](plan/20260913-1746-directory-frontend.md): independent browsing/editor state, five-page window, honest filtering, deferred Markdown states and retained drafts. Existing prototype/approved brand bytes and production code are unchanged. Scoped build/lint/types, four fixture tests and seven HTTP browser groups passed; nine original prototype groups also passed. Narrow theme/tab SVG bounds were repaired in the variant after a failing geometry assertion. Production integration and final feature acceptance remain pending.
## 2026-09-15 05:10 [progress]

Markdown document responses now include same-revision BOM-free text and the workspace renders read-only Markdown with inline selectable Mermaid diagrams. HTML remains literal text, images are inert, and document links are constrained to validated workspace navigation or safe external schemes. Existing per-block save selectors and Mermaid sanitization remain unchanged.

## 2026-09-15 08:10 [progress]

Recorded complete local acceptance evidence for whole Markdown documents: production Chromium browser coverage, exact source/security/byte-preservation behavior, Worker-backed 1 MiB and 100-diagram measurements, and a reproducible integration-base size comparison. A production Worker dependency condition had caused the parser to fall back synchronously because `document` was unavailable in the Worker; resolving the parser's non-DOM entry removes that path. Worker parse wall-clock time is reported separately from the zero measured main-thread Long Tasks. Linux x64/ext4 native acceptance remains a post-integration release gate; the tracked task and plan stay in progress until that environment runs `check:ci --native`.
