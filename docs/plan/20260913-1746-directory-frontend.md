# 20260913-1746-directory-frontend Directory navigation design and frontend integration

- **status**: completed
- **createdAt**: 2026-09-13 17:39
- **approvedAt**: 2026-09-13 (existing owner authorization, applied after investigation and proposal)
- **relatedTask**: 20260913-1737-directory-navigation-design

## Context and authorization

The owner authorized the directory feature's proposal, implementation, routine visual defaults and repairs on 2026-09-13. This bounded unit delivers a focused design and actionable integration proposal; production implementation and acceptance remain pending. The overall [directory plan](20260913-1628-directory-navigation-pagination.md) remains implementing and will arrive through later integration. Its stable shared contracts and the referenced native-stream correction were inspected read-only from the supplied local reference. They are authoritative; this document adds no wire schema.

Original `Merdeck.html` remains needs-review and `brand.html` remains approved. No design system is bound. The existing base-nova controls, Base UI primitives, neutral light/dark/system tokens and filled folder styling govern the variant. Visual density and fixtures remain assumptions, not user approval.

## Findings

- `web/src/app/routes/index.tsx` validates only path/block and replaces the complete search object on selection. Add independent directory search, distinguishing omitted directory (derive selected parent) from explicit root. Root is empty string, not slash; invalid paths never normalize traversal away. Browser history restores selection and browsing separately; refresh starts a new traversal without stored cursors.
- `workspace.tsx` derives disconnected/unsupported from the global tree, resolves preview targets relative to the selected file, and rejects unlisted links. It also remaps only selection after moves. Split directory health from document/save health and route callbacks into browse/select. Keep the source/preview mounted during browsing and retain the complete root-relative selected path in the header.
- `use-workspace.ts` polls `['tree', epoch]`, invalidates all trees on entry changes, and refreshes every query indiscriminately. Existing document/revision/save generation and draft protections are reusable; directory lifecycle must be isolated from these protections.
- `file-tree.tsx` uses descendant membership to hide folders and disable deletion, reads versions/block summaries from all rows, derives create parent from selected file, and groups absent dirty drafts. These are incompatible with metadata-only immediate directory pages. `entries.ts` already accepts an explicit parent and `entry-dialog.tsx` supplies server-confirmed operations. Its excluded-name feedback must match current exclusions including target and __pycache__, without becoming authorization.
- `api.ts` already centralizes bounded decoding and `AbortSignal` transport; `shared/lib/http.ts` owns envelopes and CSRF. Add type-only imports of the authoritative directory contracts after integration, never server runtime schemas. No dependency is needed. Directory decoding must verify parent/path relationships, immediate-child entries, bounds and discriminants, revision/cursor token syntax, complete/stoppedBy/nextCursor/expiry consistency and the echoed effective limit before caching. Reject malformed, duplicate or foreign-path entries without partial merge. Existing HttpError drops Retry-After; preserve only that bounded retry hint in the transport when implementing 429 feedback.
- Global-tree assumptions also exist in `file-tree.test.tsx`, `api.test.ts`, `use-workspace*.test.tsx`, `workspace.test.tsx`, and browser `tree`, `header`, `workspace`, `save-race`, `renderer-breaks`, `renderer-flowchart`, `drawer`, and `explorer` tests. Update expectations/request allowlists narrowly; retain legacy API tests and every security/source-byte assertion.

## Proposal and implementation boundaries

1. Build `directory-app.tsx` plus fixture data and CSS into separate `Directory-navigation.html` with the existing Vite IIFE/Tailwind approach. Reuse actual production Preview (0.8.4 policy), ThemeProvider/ThemeToggle, brand and shared controls. Preserve original prototype source/build/output. The fixture models UI behavior only, with no network service or counterfeit cursor API.
2. Show folder entry, ancestors/Up/Root, next/restart, a rolling five-page window with eviction notice, loaded-window file search/kind scope, independently visible folders, selected-file/draft retention, deferred Markdown loading and empty/error/stale/depth states. Use the established narrow Dialog drawer, source/preview tabs, focus treatment and theme controls.
3. Register with the asset helper as needs-review. Verify HTTP load, real interactions, screenshots, browser errors and resource closure; scoped lint/typecheck/build and diff checks only. No production/native gate in this unit.

## Production integration sequence

### Route and page lifetime

Extend route search to path/block/directory, preserving empty root distinctly. Folder/breadcrumb/Up/Root change only directory; file selection sets path/block and its parent. Use TanStack Router navigation rather than direct history calls in production. Keep cursors out of URLs, storage, query keys and logs.

Introduce `use-directory.ts` with page keys `['directory-page', epoch, directory, limit, runId, pageNumber]` and separate revision keys `['directory-revision', epoch, directory]`. A run owns one transient next cursor and one in-flight page request. Consume it before dispatch. Disable retry, mount/focus/reconnect refetch and page polling; never invalidate/refetch consumed page keys. Use Query cache for page results with explicit next actions rather than generic replaying infinite queries. Close a known next cursor best-effort through CSRF-aware transport on navigation/restart/session change; cancel signals and increment run generation before clearing. A late result must match epoch, directory, run, requested sequence and response path/revision before append; close any late known cursor where authorized. Unknown orphan cursors expire server-side.

Keep at most five pages, evict both displayed rows and their Query entries immediately; report absolute page range and lost earlier pages. Restart obtains page one with a new run. No previous-page cursor, global sort, total count, exhaustive search, or document prefetch. Directory revision polling may mark rows stale and restart once with a notice; preserve stale rows until replacement succeeds. Empty nonfinal visit/byte pages retain Next. Depth is an explicit boundary, never an empty folder. Cursor-stale/network/decode ambiguity stops and offers explicit Restart; rate-limit keeps rows and respects Retry-After. Avoid automatic continuation retry even when the failure could have occurred before consumption. Generic refresh restarts active directory and refreshes selected revision only.

### Documents, mutations and links

Deferred file rows say unopened, not unsupported or zero diagrams. Load only the selected document; reveal Markdown block rows after actual success. A loaded zero-block document has an explicit empty state. Error rows remain selectable. Keep dirty/locked/saving baseline selectors; never trim drafts because of filtering, directory changes or page eviction. Retained drafts remain reachable by full path.

Create defaults use browsed directory, with at-depth child creation disabled. File move/delete explicitly obtains a bounded document version when none is loaded; no empty expectedVersion. Folder delete confirmation always delegates emptiness to the server, including unlisted/hidden content. Existing not_empty error copy is reusable. Local move remaps selected path, drafts, and browsed descendants separately; local deletion of browsed directory navigates to parent. External disappearance reports directory unavailable with Up/Root and preserves editor. Invalidate/restart only affected active directory and revision scopes from the overall plan, including both parents for moves and descendants for folder moves; do not replay old page queries.

Remove tree membership as link authority. Preserve NAV-001/NAV-002 target syntax, selected-file-relative resolution, title/frontmatter handling, stale-render refusal and exact original/saved bytes. For missing/unreadable link targets, preserve the current selection/draft and show a preview note: perform a bounded API document validation before committing navigation, guarded by the current source/path/session generation. Successful unlisted/cross-directory targets navigate to the validated file and its parent. `Preview.onOpenFile` currently returns synchronously; extend its result handling for asynchronous validation and clear/ignore late notes after source/selection changes. Backend root/path validation remains final authority. This resolves the overall plan's suggested navigate-first flow against NAV-001's unchanged-selection failure guarantee without changing its wire contract. Do not alter renderer projection or sanitizer.

Selected-file revision polling and save conflict review remain independent: directory revision is never a file expectedVersion, document deletion, block version or authorization signal. Expiry locks existing drafts and drops directory state; successful explicit logout clears drafts per current behavior. Save races and external changes retain current snapshot comparison semantics.

## RED -> GREEN acceptance map

| Area | Failing assertion before implementation | Required green evidence |
| --- | --- | --- |
| Route | Directory navigation erases path or fails Back/refresh | independent path/block/directory, explicit root and old deep links; unsafe search rejected |
| Page lifecycle | Focus/reconnect reuses cursor or double-click sends twice | one dispatch, no replay, cancellation/late-generation rejection, TTL and session restart |
| Window | Sixth page retains older Query payload or search claims completeness | five-page cache/DOM cap, evicted range notice, explicit fresh restart, empty nonfinal Next |
| Explorer | Kind/search hides folder with unloaded children | folder always reachable; deferred file, zero/error blocks and retained drafts |
| Mutations | Create uses selected parent; folder deletion inferred empty | browse defaults, depth refusal, server not_empty, move/delete route and draft reconciliation |
| Links | Unlisted target rejected or failed target loses selection | nested/title links via pointer/Enter/Space, API refusal, stale async result ignored, exact bytes |
| Editor | Directory error disables an otherwise healthy save | document-specific state, dirty/locked/saving retention, revision conflict and save race |
| Browser | Drawer clips controls or loses focus/theme | 390px and desktop screenshots, keyboard trap/restore, theme/system, no load errors |

## Risks and limits

The backend schema is stable but backend acceptance is pending. This branch does not merge or modify backend or production frontend. Metadata fingerprints are not full snapshots; continuous churn can require restart. Single-use cursor loss deliberately costs a fresh traversal. Browser evidence for the fixture cannot establish production pagination/security or deployment acceptance. The original renderer remains unchanged; the variant consumes the existing 0.8.4 implementation. Browser screenshot review found that theme rendering while the narrow preview is display:none can measure incomplete SVG bounds. The variant keeps inactive panes laid out but invisible; production integration must cover theme changes while Source is selected and assert all fitted nodes remain inside the SVG after returning to Preview. This is demonstrated in the fixture, not a claim of a verified production repair.

## Verification

Focused design/proposal delivery is complete. Both frozen installs, the standalone build, scoped TypeScript/ESLint checks, four fixture tests (100% function/line coverage), seven actual HTTP browser groups and git diff --check passed. Original prototype checks passed nine groups in standalone-export mode. Existing HTML asset hashes remain unchanged. Browser evidence is `tmp/directory-design/check-results.json`, `focused.log` and desktop/narrow screenshots; initial narrow geometry RED is `geometry-red.log`, followed by the passing node-containment assertion. Local diff review found no remaining actionable issue in this scope. The served URL is http://merdeck-design-ca1f91.localhost:3003/merdeck/Directory-navigation.html (local machine only); served bytes match the generated artifact. New asset status remains needs-review. Production integration remains pending regardless of this design task's completion. The creation timestamp above follows the observed file creation time; the already allocated document identifier is retained.
