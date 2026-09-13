# 20260913-1628-directory-navigation-pagination Directory navigation and bounded pagination

- **status**: implementing
- **createdAt**: 2026-09-13 16:28
- **approvedAt**: 2026-09-13 16:33 (existing 2026-09-13 owner authorization applied after proposal completion)
- **relatedTask**: 20260913-1626-directory-browsing-contract

## Context

This is the full feature plan for the existing Merdeck application, investigated at commit `0967b736ffa2c892ae1191cecea8249593ef985a`. It is not a new application build. The bounded [contract task](../task/20260913-1626-directory-browsing-contract.md) delivers investigation and proposal only. Implementation and integrated acceptance remain separate.

### Authorization and provenance

On 2026-09-13 the owner requested proposal, implementation, necessary fixes, commit, push and release for UI subdirectory switching to avoid whole-root file limits. Implementation and the initial division of work were explicitly authorized. This day-level authorization satisfies the implementation gate after investigation and the concrete proposal are recorded; it does not assert an exact original approval time. Final main integration and publication remain with the integration owner and their applicable approval and acceptance gates. The timestamp in `approvedAt` records application of that existing authorization, not a new user decision.

The prototype remains **needs-review**. Existing neutral surfaces, compact explorer, source editor, preview, responsive drawer, and folder/file distinction are design assumptions to preserve. [PLAN-026](PLAN-026.md), [PREVIEW-011](../task/PREVIEW-011.md), and the 0.8.4 preview changes remain intact. No preview grammar, renderer, style policy, source projection, or brand approval changes belong to this feature.

### Findings from actual call chains

- [DiagramService](../../src/modules/diagrams/service.ts) `treeSnapshot -> scanTree` shares one root snapshot, one refresh promise, and one generation. Breadth-first scanning spends `maxTreeEntries`, eight times that many dirents, and 32 MiB of content reads across all folders. It parses every eligible document before returning block summaries. Excluded entries and content exhaustion can leave later files undiscovered; the old endpoint has no continuation.
- [FileRepository](../../src/modules/diagrams/repository.ts) `entries` already uses `opendir` with `bufferSize: 1`, but closes the iterator on return. Reopening it for each page and skipping an offset would repeatedly visit the prefix. `Dirent` types currently classify legacy entries; the new API must use anchored `lstat` instead of treating those hints as authority.
- `read` and `replace` reject file paths beyond `maxTreeDepth`; `split` applies the same limit to file operations and reserves one level for directories. `withDirectory` walks descriptor-anchored ancestors but has no independent depth guard. Changing only the tree endpoint cannot fix deep reads or mutations.
- [Routes](../../src/modules/diagrams/routes.ts) strictly reject every tree query parameter. [Shared contracts](../../src/shared/contracts.ts) use nonempty root-relative paths, a 1,024 JavaScript-code-unit limit, full-file SHA-256 versions, and discriminated mutation bodies. The global [boundary](../../src/shared/middleware/boundary.ts) caps URL length at 8,192 and headers at 16,384, validates Host/Origin/fetch metadata, and sets `no-store`.
- [use-workspace](../../web/src/features/workspace/use-workspace.ts) polls `['tree', epoch]`, invalidates `['tree']`, and separately obtains selected-file revision/document data. [Workspace](../../web/src/features/workspace/workspace.tsx) rejects links not found in the loaded tree and derives unsupported state from a tree row. [FileTree](../../web/src/features/workspace/file-tree.tsx) infers folder visibility/deletion affordance from loaded descendants and assumes every file row has parsed blocks. All three assumptions must change for partial directory pages.
- [Configuration](../../src/config.ts) defaults to 8,000 tree entries, scan depth 4, 1 MiB per file, 100 blocks, and polling every 3 seconds. Hard maxima are respectively 10,000, 32, 8 MiB, 1,000, and 30 seconds. Existing [tests](../../src/modules/diagrams/service.test.ts) explicitly couple shallow scans to read/save refusal; these assertions must move to the new path policy while retaining legacy scan tests.
- [Filesystem admission](../../src/modules/diagrams/filesystem.ts) actually admits Linux overlay/ext4 with stable identity and measured virtiofs with content identity. The older summaries in AGENTS and `.env.example` are not the current policy. [PLAN-020](PLAN-020.md) and its implementation correction govern virtiofs; no configuration selects or overrides that identity model.
- [Application close](../../src/app.ts) currently closes sessions only; [service shutdown](../../src/service.ts) calls it before graceful server stop. Persistent pagination descriptors require explicit disposal, including direct service consumers and failed startup. Existing documentation's statement that no timer or persistent descriptor requires disposal will need a targeted update during implementation.

## Proposal

### 1. Smallest architecture

Add one metadata-only directory page endpoint, one metadata revision endpoint, and one best-effort explicit cursor-close endpoint. Keep the existing file document/revision/save and entry endpoints. Use a held nonrecursive directory stream backed by the exported glibc getdents64 function through the pinned runtime's experimental TypeScript FFI, one fixed 4096-byte raw buffer per stream, a bounded in-process continuation table, and forward-only single-use opaque cursors. This narrowly scoped FFI exception requires reviewed ABI, loading, error and native-host evidence before adoption. Do not add a package dependency, database, filesystem index, watcher, offset scan, separately compiled/deployed helper, runtime upgrade or whole-directory sort. Use one directory/page request at a time in the UI and retain a bounded page window.

Service methods should expose `directoryPage(request, context)`, `directoryRevision(path, context)`, `closeDirectory(request, context)`, and idempotent async `close()`. Request context carries the verified origin, authenticated session identity/expiry (or the open principal), and AbortSignal; none is accepted from the JSON/query payload. HTTP routes supply that context, while trusted direct consumers provide an explicit equivalent.

The authoritative wire contract below is to be implemented in `src/shared/contracts.ts` and strict route validation, with type-only frontend imports and runtime response decoding in `web/src/features/workspace/api.ts`. This plan specifies future behavior; no new endpoint is implemented by this document.

### 2. Paths and operation depth

`DirectoryPath` is `''` for the configured root or an existing `RelativePath`. Root has `parent: null`; `a` has parent `''`; `a/b` has parent `a`. Entry `path` is always the full canonical root-relative path, never just a name or a server absolute path. Derive names and breadcrumbs by splitting `/`; the service does not send the configured absolute root or accept changing it.

Retain the existing 1,024-code-unit nonempty path schema and single HTTP decode. Reject leading/trailing slash, empty components, `.`, `..`, backslash, colon, percent, controls and DEL. Do not normalize traversal away. Hidden components and the repository's full ignored-name set remain forbidden, including `target` and `__pycache__`; unsupported file extensions remain `unsupported`. The directory root exception applies only to directory list/revision/close, never to create/move/delete or file endpoints. Names must round-trip through UTF-8 without replacement; exclude undecodable dirent names rather than addressing a different name through lossy decoding. Existing byte-preserving file text rules remain unchanged.

Add `MERDECK_MAX_PATH_DEPTH`, integer 1 through 64, default 64, exposed internally as `limits.maxPathDepth`. Depth is the total slash-separated component count, with root 0. Apply it equally to file and directory operands. Files and folders at depth 64 are valid; paths at depth 65 are refused with `forbidden` before opening ancestors. Listing a directory at the configured limit returns the explicit `depth` boundary response below, not a false empty-directory claim. This removes the old `split(..., directory)` minus-one rule. `maxTreeDepth` remains only a legacy scan bound; it is not an authorization rule.

No path budget is inferred from a cursor, a loaded tree row, or a cached document. Add a common repository-side depth check to each public entry path and a defensive guard in `withDirectory`; service and HTTP validation do not replace these checks. Existing root/ancestor validation and read retries remain necessary.

Directory moves must also account for descendants. A source/destination operand check alone can move reachable children past the depth or string-length limit. If the destination prefix has no more components and no more code units than the source, retain the constant-work move path. Otherwise perform a bounded safety walk of the source's currently addressable visible subtree before opening both mutation parent chains and claiming the destination. Visit at most 8,192 dirents and 1,024 directories, read zero file content, hold at most one active stream plus an ancestor chain, and use depth-first traversal with bounded bookkeeping. Check every currently valid visible descendant's projected path against the new depth and 1,024-code-unit limits; do not follow symlinks or descend hidden/ignored paths. Unsupported regular file extensions need no content read. An invalid projected path returns `forbidden`; exhaustion returns `too_large`; neither creates a placeholder or changes files. Retain observed directory fingerprints and revalidate them before rename; observed churn returns `conflict`. This is a safety check, not a whole-subtree snapshot or a recursive move/copy. The usual external-actor comparison/rename limitation still applies. Ordinary `docs -> guides` moves with hidden content continue to work. Huge growing-prefix moves may be refused; moving files individually or using a non-growing prefix is the bounded alternative.

### 3. Exact HTTP contract

All paths below are relative to the existing API mount (`/api` in production; stripped only in the established development mode). All JSON objects are strict, with no unknown keys on requests. Duplicate/malformed query encoding stays rejected by `queryInput`. All responses retain the existing success/error envelope and `Cache-Control: no-store`.

| Method and path | Request | Success data |
| --- | --- | --- |
| `GET /diagrams/directory` | `path` optional, defaults to `''`; `limit` optional canonical decimal integer 1..200, defaults to 100; `cursor` optional 64 lowercase hex characters | `DirectoryPage` |
| `GET /diagrams/directory/revision` | `path` optional, defaults to `''`; no other parameters | `DirectoryRevision` |
| `POST /diagrams/directory/close` | Empty query; strict JSON `{path: DirectoryPath, cursor: Cursor}`, at most 8,192 bytes | `{closed: true}` |

Continuation requests send the same normalized path and effective limit as the initial request. Omitting `limit` still means 100; therefore a nondefault stream must keep sending its limit. Empty `cursor`, `limit=01`, floats, signs, whitespace, exponent notation, repeated keys and extra keys are `invalid_request`. Root may be omitted or sent as `path=`; `/` is not root. No `offset`, `sort`, recursive flag, file-kind filter or name search is accepted by the new backend.

```typescript
type DirectoryPath = '' | RelativePath
type Cursor = string // /^[a-f0-9]{64}$/, fresh 32 random bytes
type DirectoryRevisionToken = string // /^[a-f0-9]{64}$/, metadata identity only

type DirectoryPageEntry =
  | { kind: 'directory'; path: RelativePath; children: 'unloaded' }
  | { kind: 'file'; path: RelativePath; fileKind: FileKind; state: 'deferred' }

interface DirectoryPage {
  path: DirectoryPath
  parent: DirectoryPath | null
  revision: DirectoryRevisionToken
  entries: DirectoryPageEntry[]
  nextCursor: Cursor | null
  complete: boolean
  stoppedBy: 'entries' | 'visits' | 'bytes' | 'depth' | null
  visited: number
  excluded: number
  limit: number
  maxPathDepth: number
  pollIntervalMs: number
  expiresAt: string | null // UTC ISO instant; null without a cursor
}
interface DirectoryRevision {
  path: DirectoryPath
  revision: DirectoryRevisionToken
  maxPathDepth: number
  pollIntervalMs: number
}
```

`revision` is constant across one stream. It is not a file content version, does not satisfy `expectedVersion`, and cannot be used as a Markdown selector version. Opaque cursors must not be persisted in browser navigation URLs, browser storage, logs, or repository artifacts; the transient API query carries the cursor as specified. The frontend decoder must reject entries that are not immediate children of `path`, duplicate entry paths within a page, forbidden field combinations, malformed revisions/cursors/dates and inconsistent completion shapes. A decode failure invalidates the traversal. All numeric response values are integers. `limit` is 1..200, `visited` is 0..1,024, `excluded` is 0..visited, `maxPathDepth` is 1..64, and `pollIntervalMs` is 1,000..30,000.

Exactly three completion shapes are legal:

1. End of stream observed by `Dir.read() === null`: `complete: true`, `nextCursor: null`, `stoppedBy: null`, `expiresAt: null`.
2. A page budget reached: `complete: false`, a nonnull `nextCursor` and `expiresAt`, and `stoppedBy` equal to the first encountered `entries`, `visits`, or `bytes` boundary.
3. The directory itself is at `maxPathDepth`: `entries: []`, `visited: 0`, `excluded: 0`, `complete: false`, `nextCursor: null`, `stoppedBy: 'depth'`, `expiresAt: null`. Still validate the actual directory and root. The UI says the depth boundary prevents listing children.

An empty page with a cursor is valid and must offer the next page. A final empty page after an exact entry/visit boundary is also valid. `complete` says this stream reached EOF, not that this response alone contains the directory's entire contents. Counts are per response, not global totals. `excluded` counts visited names omitted by visibility/path/type rules, including unsupported extensions, symlinks, special nodes and hardlinked regular files. No hidden name is returned. At a byte boundary a valid not-yet-emitted entry is pending, not excluded.

List ordinary visible directories even when empty or containing no supported files. A directory row never claims an empty child list; `children: 'unloaded'` is intentional. Return only safe regular supported file entries as `deferred`, without `blocks`, `version`, source, size, or a claim of readability. Oversized, invalid-text and zero-diagram Markdown files are still discoverable by name. Their document fetch determines the actual state.

Example initial request: `GET /api/diagrams/directory?path=docs&limit=100`. A complete one-file result has `path: "docs"`, `parent: ""`, one `{kind: "file", path: "docs/overview.md", fileKind: "markdown", state: "deferred"}`, and the EOF fields above. A continuation uses `path=docs`, `limit=100`, and the previous `nextCursor`; it never includes the configured absolute root.

### 4. Error and restart contract

Extend the shared `ErrorCode` union and central safe error mapper with only `directory_changed` and `cursor_stale`, both HTTP 409. Their fixed messages are respectively `The directory changed. Restart its listing.` and `The directory cursor is no longer valid. Restart its listing.` They carry no `currentVersion`. Do not overload the existing file `conflict` message for directory pagination. No extra restart payload is needed: clients already know the selected directory and restart without a cursor.

| Status/code | Trigger | Required client action |
| --- | --- | --- |
| 400 `invalid_request` | Malformed query/body/cursor, changed path or effective limit for a live cursor | Correct request; do not merge results. Wrong path/limit does not consume the valid stream. |
| 401 `unauthorized` | Missing/expired/revoked required session | Existing expire/lock-drafts flow; drop directory state. |
| 403 `forbidden` | Hidden/ignored/unsafe paths, symlink target/ancestor, permission refusal, path depth; live cursor bound to another principal/origin | Display refusal; do not try another root. Wrong-principal use does not consume the stream. |
| 404 `not_found` | Requested directory or an ancestor is absent on a fresh list/revision | Show unavailable folder and allow Up/Root; preserve editor/drafts. |
| 409 `directory_changed` | Valid owned continuation observes changed directory fingerprint or local invalidation during its page | Discard the stream's pages and restart from page one after notifying the user. |
| 409 `cursor_stale` | Well-formed but unknown, consumed, expired, closed, invalidated, or pre-restart cursor; concurrent reuse | Discard that traversal, restart explicitly; no cursor retry loop. |
| 413 `too_large` | Existing HTTP/body limits; growing directory move safety walk cannot finish within its bound | Show bounded-operation refusal; do not repeat automatically. |
| 429 `rate_limited` | New directory work or stream capacity exhausted | Existing `Retry-After: 60`; retain current rows, offer later retry. Capacity rejection occurs before consuming a valid cursor. |
| 503 `unavailable` | Root replacement/unavailable procfs, unknown I/O failure, page deadline, shutdown | Preserve drafts and rows as stale; restart only after recovery. |
| 405 `method_not_allowed` | Wrong method, including HEAD | Existing safe envelope and exact `Allow`. |
| 415 `unsupported_media_type` | Invalid close request body transport | Correct transport. |
| 500 `internal_error` | Unexpected failure after safe mapping | Preserve work; no automatic continuation replay. |

A fresh path that names a file rather than a directory uses the existing `forbidden` mapping for `ENOTDIR`. A disappeared entry encountered during enumeration is `directory_changed`, not silently skipped. A failed child `lstat` due to permissions or unknown I/O fails the page with `forbidden` or `unavailable` respectively, because an accurate classification is unavailable. Symlinks and special nodes observed successfully are excluded without following them. For list and revision requests, root validation errors always win over cursor errors after ordinary syntax/auth checks; close is a state-disposal operation and does not resolve the filesystem.

For a live cursor whose path disappears/renames/replaces with another directory, return `directory_changed` and dispose it. If that path is now a symlink/forbidden ancestor, preserve `forbidden`; if the configured root changed, preserve `unavailable`. An already removed cursor returns `cursor_stale`. These distinctions reflect what is still known without maintaining unbounded tombstones. `close` is idempotent: a syntactically valid unknown/consumed/expired cursor returns `{closed:true}`; a live wrong-directory or wrong-principal cursor is refused as above. Closing never grants filesystem access and need not open the directory.

### 5. Bounded resources and iteration algorithm

| Resource | Default and hard bound | Enforcement |
| --- | --- | --- |
| Emitted entries per page | Default 100, request maximum 200 | Check before reading another dirent. |
| Logical records consumed per page | Fixed 1024 | Count each consumed native record, including dots, undecodable and excluded names. Buffered read-ahead is not yet a logical visit; at any stop there are at most 4096 raw bytes (at most 170 minimum-sized records) ahead of consumed position. Each refill is at most 4096 bytes, with no more than one refill per consumed record; no refill after a stopping boundary. Report existing visited/excluded fields without adding raw-byte counters to the wire schema. |
| Serialized success JSON | Fixed 262,144 UTF-8 bytes (256 KiB), including envelope | Reserve metadata/envelope bytes before appending each entry. |
| File content bytes per page/revision | Exactly 0 | No `repository.read`, hash, parser or descendant document access. |
| Native directory buffer | Fixed 4096 bytes per stream | Call glibc getdents64 only when all previously returned raw records are consumed. Preserve unread bytes across pages. Never prefetch after an entry/visit/byte boundary; no eager readdir or EOF probe at a boundary. Returned bytes are bounded physically, not by a runtime option. |
| Pending entry per stream | At most 1, bounded by the path schema | Preserve an entry crossing the byte cap; emit on the next page, never skip it. |
| Live stream reservations | 32 per service; 4 per authenticated session/origin | Reserve before opening. Open access shares one principal per allowed origin and the global cap. |
| Simultaneous new directory filesystem operations | 4 across page and revision calls | Reject excess work before opening; no unbounded wait queue. Close/reaping must remain possible at capacity. |
| Idle stream TTL | Fixed 120,000 ms | Refresh after a successful page, not on probes, replay, capacity refusal, or close. |
| Absolute stream lifetime | Fixed 3,600,000 ms | Never refreshed; `expiresAt` is the earlier idle/absolute deadline, capped by session expiry. |
| Per-operation logical deadline | Fixed 5,000 ms | Stop issuing new I/O, invalidate stream, close after in-flight I/O settles; no retry within the operation. |
| Expiry sweep | One unref'ed timer every 5,000 ms plus request-time expiry | Reclaim idle streams without new requests; expiry is checked exactly, not only when swept. |
| Stream memory | One pending entry, 32 KiB metadata and one 4096-byte buffer per stream | No previous pages/name set; no retained name views beyond refill. |
| Descriptor retention | At most 2 per stream | One owned target anchor handle plus one directory stream; close ancestor chains after each operation. |
| Directory-move safety audit | 8,192 dirents; 1,024 directories; 5,000 ms; zero file content | Only for a growing destination prefix; exhaustion refuses before mutation. |

Retain no previous page or whole-directory name set. Keep the existing one pending entry and at most 32 KiB serialized metadata per stream, plus exactly one 4096-byte native buffer and constant cursor counters. Maximum raw buffer ownership is 32 × 4096 = 131072 bytes; retain no name views beyond a refill. In-flight JSON and runtime/object overhead remain separately bounded/accounted as already documented.

At most 1024 calls and 4 MiB returned directory bytes per page is a conservative bound, including a possible final EOF call issued only while the visit budget has room. This is not a guarantee about filesystem-internal disk reads, mount latency or kernel cache allocation. Pending metadata entries do not consume another logical visit.

These are protocol/service constants except `limit`, `maxPathDepth`, and the preexisting file/poll/legacy-tree settings. Do not introduce a configuration knob for every constant. At most four active directory operations can hold fresh ancestor chains of at most 65 handles each; idle streams do not retain ancestor chains. This yields at most 324 directory handles for the new page/revision subsystem (64 retained plus 260 temporary), excluding existing document/mutation work. Keep cleanup reservations counted until handles really close. In-flight page JSON is bounded separately at four times 256 KiB; object/string overhead is implementation-dependent and must not be described as a process RSS guarantee.

Algorithm:

1. Validate syntax and authorization. Enforce operation capacity. Validate the configured root and every actual ancestor through fresh `O_NOFOLLOW`/`O_DIRECTORY` opens and existing procfs anchors. After reserving both descriptor slots and the buffer, open an owned target anchor from the freshly validated chain, then a distinct O_RDONLY/O_DIRECTORY/O_NOFOLLOW descriptor through the controlled `/proc/self/fd/<anchor>/.` path. Compare both held identities, validate the named chain, and record the fingerprint before the first syscall. The TypeScript stream owns both descriptors; glibc getdents64 takes neither ownership nor a DIR pointer. Close temporary ancestors in finally and unwind every partially opened resource on failure.
2. For a continuation, validate path/limit/principal bindings and expiry, re-open/revalidate all ancestors, compare the held target with the newly validated directory, and compare the fingerprint. A live directory stream is never an exemption from these checks.
3. Atomically consume the current cursor before the first awaited read. One concurrent caller wins; all others see `cursor_stale` without advancing or cancelling the winner. Keep the reservation in a separate bounded active set while it has no published cursor.
4. Emit a pending entry first if present, rechecking its anchored metadata. Read at most 1,024 further dirents, counting each once in that page's `visited`. Skip invisible/invalid names before child metadata work. For each candidate use anchored `lstat` to classify; return only directories and single-link regular supported files. Never follow a symlink based on `Dirent` hints. Validate the directory before child metadata access and at the end of the page.
5. Stop at the first entry/visit/serialized-byte boundary. For a byte overflow retain that one consumed entry; a pending entry contributes zero to next page's `visited` because its actual read was counted previously. A legal single entry must fit the 256 KiB envelope under the path bounds; failure of this invariant is `unavailable`, not a silently skipped row.
6. Revalidate root, ancestors/held-directory identity, fingerprint, local invalidation marker, abort/deadline and service-open state before publishing. On any failure discard the response and dispose the traversal. Otherwise publish a fresh random cursor, or close at EOF. No page is stored for replay.

Expose explicit asynchronous read/close methods over one serialized, forward-only getdents64 byte cursor. The syscall itself is synchronous; the Promise interface does not make it cancellable. Parse and validate linux_dirent64 bounds before decoding each name; ignore d_type and d_off for authorization/classification. Reject malformed records and byte counts, exclude invalid UTF-8/dot names while counting visits, retain raw unread bytes across pages, and cache EOF. Read errno immediately on the calling thread after a negative result; EINTR fails the operation without retry. Keep the fixed runtime, no-helper rule and all wire/security/lifecycle caps. Retain owned library/buffer/fd lifetimes until calls have settled, and close each handle exactly once.

The 5000 ms operation deadline is logical: after it expires, issue no new I/O and publish no page. Main-thread synchronous native I/O can delay observing cancellation, expiry, logout and shutdown. Check time/state on both sides of the call, yield between bounded batches, invalidate before publication, and keep quotas reserved until actual completion/close. Never close/reuse a descriptor or unload FFI while a call might use it. Blocked-kernel-call interruption and a hard shutdown wall-clock bound are not promised.

### 6. Revision, mutation and concurrency semantics

A directory fingerprint uses its held metadata `dev`, `ino`, `birthtimeNs`, `mtimeNs`, `ctimeNs`, `size`, and `nlink`, plus the identities (`dev`, `ino`, `birthtimeNs`) of the root and each ancestor. Hash their decimal string representation in a fixed tuple order with canonical directory path, effective `maxPathDepth`, a protocol version string, and a service-start random nonce. Ancestor timestamps are deliberately excluded: edits to unrelated siblings must not change a deep directory's revision. No raw metadata or absolute path is exposed. Root/ancestor identity checks still run independently of the hash. The startup nonce invalidates directory revision caches across restarts without changing the existing signed-session behavior.

A fresh `directory/revision` call does no enumeration, content reads, or stream allocation. It validates root/ancestors and samples the target before and after final validation; observed churn is `directory_changed`. It reports the same fingerprint hash a newly opened stream would use. It does not refresh a stream TTL. A file's in-place content edit may leave its directory fingerprint unchanged; selected-file revision polling is therefore retained. No directory revision is a content snapshot.

For service mutations, invalidate affected live traversals both before entering the filesystem-changing action and in `finally`, including failed actions that created/removed a temporary file or placeholder. Use the existing serialized mutation critical section. Invalidation may mark an active page unusable synchronously; only its owner closes its stream after pending I/O settles. Idle affected streams close immediately. Compare at page start and before response publication so an in-flight page cannot publish after an affected mutation. No waiting behind all filesystem pages is required for a save.

| Mutation | Affected directory streams/probes |
| --- | --- |
| Save/create/delete file | Its immediate parent directory. |
| Move file | Both source and destination parents. |
| Create/delete directory | Parent, plus streams at or beneath the affected directory path. |
| Move directory | Both parents and every stream whose directory is at/beneath source or destination. |
| Root replacement or shutdown | All streams. |

No unbounded per-directory generation map is needed: walk the at-most-32 active states and mark matching scopes. Revision probes overlapping a local mutation use a bounded active-operation marker and fail instead of publishing an uncertain result. Keep legacy snapshot invalidation separately for old clients. A save under `a` must not invalidate an unrelated `b` stream, although the global capacity cap can limit both.

There is no global directory-page cache and no backend single-flight sharing of mutable streams. Separate initial requests, even for the same directory, create independent traversals subject to caps. Repeated calls with one cursor never replay a response. Losing a successful response requires a restart from the beginning; clients use `retry:false`, no automatic refetch of consumed page keys, and one next-page action at a time. This avoids page-response caches, unbounded replay history, and ambiguous multi-consumer stream ownership.

External additions, deletions, renames and replacements visible through the fingerprint or per-entry validation invalidate rather than splice two traversals. A changed directory may conservatively invalidate on chmod or a hidden temporary sibling even though visible rows did not change. Filesystem order is unspecified across and within pages, and may differ after restart. There is no globally sorted page, stable offset, total count, random jump, backward cursor, or filesystem snapshot. For a quiescent directory, one uninterrupted traversal must return each eligible immediate entry exactly once.

Metadata freshness is an explicit limitation: cached/coarse filesystem attributes or an uncooperative actor changing entries between the last comparison and response can evade detection. No bounded built-in iterator can prove a snapshot against arbitrary external writers without filesystem support or indexing. Do not claim all concurrent filesystem mutations are detected, or weaken root/write admission to make a fixture pass. Acceptance must demonstrate ordinary observable namespace mutations on each actual supported target; if a target cannot provide that evidence, continuation on it remains unaccepted and must fail conservatively rather than be advertised as verified. This preserves the existing external-actor limitation; it is not approval of an unconditional no-omission guarantee.

### 7. Cleanup, cancellation and service lifecycle

Bind token-mode streams to authenticated `session.id` and verified origin; open-mode streams to the verified origin's shared open principal. No credential is encoded in a cursor. Auth checks happen on every continuation and close. Expiry deadlines include the session's own expiry. On logout, dispose that session's streams; on service close, reject new work, invalidate all states, clear the one timer, and await idempotent closure of idle/in-flight states. Direct consumers of `createDiagramService` must call its new async `close()` in cleanup. Wire this through `createApp.close()` and `startService`, including startup failures after service creation, while preserving graceful completion of in-flight saves.

Abort an in-flight page/revision when `Request.signal` aborts. Once a cursor is consumed, cancellation discards the entire traversal; never put that cursor back. A page that finishes immediately before the transport disconnects may leave an undisclosed next cursor until TTL expiry; that bounded orphan is expected. Navigation explicitly closes a known outstanding next cursor, cancels in-flight queries, and rejects late responses with a view generation check. Close does not require writable storage, but its POST still uses the existing Origin/CSRF protections. It is a resource operation and never changes project files.

A JavaScript deadline cannot forcibly interrupt a hung kernel filesystem operation. After timeout/abort, do not release its resource reservation or open replacements until the outstanding operation settles and all handles close. Caps therefore still hold during slow storage; the service may return capacity/unavailable failures rather than queue indefinitely. Sweep/close must not call `Dir.close` concurrently with `Dir.read`; mark closing and let the active owner finish disposal. No unhandled close rejection or response publication after disposal is acceptable.

### 8. Frontend behavior and independently implementable state

- Extend the file-based route search to `{path, block, directory}`. `directory` is root `''` or a valid directory path. When absent, derive the open file's parent (root if no file), preserving old deep links. Folder, breadcrumb, Up and Root navigation change only `directory`; they preserve the selected editor and all drafts. Selecting a file sets `path`, block 0 and its parent `directory`. Back/Forward restores both independently. Validate search through the existing route boundary; never store a cursor in it.
- Use the existing base-nova Button/Input/Menu/Tooltip primitives and Tailwind theme tokens. Preserve filled folder versus outline file distinction, keyboard focus, row actions, and the narrow drawer. Breadcrumbs are semantic navigation composed of existing controls, not a new primitive ecosystem. New file/folder defaults to the browsed directory rather than the selected file's parent. At the depth boundary disable child creation with an explanation; Up/Root still work.
- The current view owns one traversal run id and one page request in flight. Query keys are `['directory-page', epoch, directory, runId, requestCursor ?? 'first', limit]`; revisions use `['directory-revision', epoch, directory]`. Disable retries, focus/reconnect refetch and polling for page requests. Poll only the current directory revision at the server interval with existing error backoff (at most 30 seconds); the selected-file revision/document flow remains independent.
- Retain at most five page responses (at most 1,000 entries / 1.25 MiB serialized data) for the current directory, discarding the oldest page as another is appended. Render an explicit earlier-rows-not-shown notice with Restart. Queries outside this window/current directory are cancelled and removed; page query `gcTime: 0` is appropriate. Shared desktop/drawer views observe this one state, not two cursors. Next page advances even when the current page contains no eligible or filter-matching files. Do not automatically exhaust many empty pages.
- Search and file-type filtering apply to the loaded window only. Keep folders visible regardless of file-type filter or unknown descendants; name search may narrow folder names but must not imply a recursive search. Label counts as loaded files; with a cursor or discarded pages, say more entries may exist. Only a single-stream EOF with no retained/discarded eligible rows proves there were no supported visible entries during that traversal; it never proves a filesystem-empty folder.
- File rows initially show a loadable file, not zero diagrams or an unsupported badge. Selecting a deferred Markdown file uses the existing bounded document endpoint and expands the selected file's block rows after success. `blocks: []` means no supported blocks only on an actual loaded `DiagramDocument`. Show loading/too-large/unsupported/unreadable errors without hiding its list row. Do not prefetch every page's documents. Only the selected file needs automatic content/revision work; document limits remain unchanged.
- Obtain `expectedVersion` for file move/delete from the selected loaded document or one explicit bounded document read when opening that file's action dialog; no file mutation proceeds with an invented empty version. Existing dirty/locked draft baselines remain authoritative for their selectors. Directory Delete may be offered with the existing confirmation on writable storage; only server `rmdir` decides empty, including hidden content. Do not infer emptiness from `children: unloaded`, no rows, filter results or a partial EOF page.
- Remove the loaded-tree membership gate from application-owned diagram links. Keep existing allowed relative target syntax, base-directory resolution, stale-preview refusal and source-byte preservation. Validate the canonical resolved file path, navigate to it and its parent, then let the document/revision endpoint establish present/deleted/forbidden. Being absent from the current page is never an error in itself. Do not broaden preview links to arbitrary URLs or traversal.
- On local save/mutation completion, restart only affected active directory views using the scope table and invalidate relevant directory revision keys. A moved selected file/directory continues to remap drafts and route selection; a browsed directory at/below a moved path follows that move as well. Deleting the browsed directory goes to its parent. External deletion/rename shows a folder error with Up/Root and does not clear the editor.
- Directory fingerprint change marks accumulated rows stale and starts a new run at page one (an explicit notice records the reset). A consumed/stale cursor, network ambiguity or page decode failure offers Restart and never appends responses from another run. Preserve rows as stale while a replacement initial page is loading; replace them atomically on success. One background revision refresh is not permission to discard drafts or cancel saves.
- Session expiration/logout follows the existing lock/clear rules, additionally cancelling/closing/removing directory state. Directory errors alone must not label a loaded document deleted or unsupported. The current `disconnected` calculation must distinguish list failure from selected-document failure so a paginated empty or expired list does not erase valid editor state.

### 9. Legacy compatibility and routing choice

Keep `GET /diagrams/tree` strict-empty query, the existing `TreeSnapshot`/`TreeEntry` shapes, bounded sorting, content/block semantics and safe truncation. Do not quietly turn it into page one or accept `path` on it. Old frontend plus new backend must still load and edit, with the intended relaxation that `maxTreeDepth` no longer refuses direct deep file operations. If `maxPathDepth` is configured below `maxTreeDepth`, the legacy scan stops at the safer bound and marks truncation. The legacy global snapshot/refresh promise is never consulted by the new directory endpoint.

Retain plain Hono + Zod and the existing `queryInput`/`jsonInput` validation within the scoped [routing decision](../decisions/20260913-1628-directory-contract-routing.md). Add exact method handling for directory list/revision GET and close POST to the current path-based method guard, preserving authentication order, `Allow`, GET-body refusal and CSRF/Origin behavior. No whole-backend OpenAPI migration, new validator dependency, runtime upgrade, database, workspace promotion, logging framework or production nsl change is part of this proposal. This is an explicit continuation of the repository's compatibility decision, not a claim of meeting the newer skill's default OpenAPI baseline unchanged.

## Operation-depth call-chain audit

This table is exhaustive for the repository's file-domain public operations at the investigated commit. Every changed path guard must have boundary and beyond-four-level tests. No file endpoint is allowed to rely on prior listing.

| Entry/caller | Actual repository chain | Required depth treatment and invariants |
| --- | --- | --- |
| Startup `loadConfig -> FileRepository.create` | canonical root -> `lstat/realpath -> withDirectory('')` | Root is immutable depth 0; keep Linux/procfs/root identity and birth-time checks. |
| Session capabilities -> `storageStatus` | `withDirectory('') -> inspectFilesystem` | No scanning/depth coupling; preserve measured admission and no root disclosure. |
| Legacy `treeSnapshot -> scanTree` | `entries -> withDirectory`; file `read -> readIn` | Keep recursive scan budget at `maxTreeDepth`, additionally cap paths by `maxPathDepth`; no other use of scan depth. |
| New page initial/continuation | common path guard -> fresh ancestor chain -> owned stream -> anchored `lstat` | Path-depth guard before opens; revalidate every continuation, pending entry and final response. |
| New directory revision | guard -> `withDirectory -> fingerprint` | Same path limit and ancestor validation, zero dirents/content. |
| New close | syntax/auth -> bound state lookup -> disposal | No filesystem path resolution; root is allowed as a binding only. |
| GET document -> `readDocument` | `allowedPath -> read -> withDirectory -> readIn -> parseDocument` | Replace `read`'s `maxTreeDepth` guard; preserve at most three full read-consistency attempts and all byte/identity checks. |
| GET file revision -> `documentRevision` | `readDocument -> read -> readIn -> parseDocument` | Same new guard; retain full-content hash/parser and only `deleted` maps to state deleted. |
| PUT source -> `saveDiagram -> mutate` | `replace -> allowedPath -> withDirectory -> assertWritable/readIn -> transform -> staged/publish checks` | Replace `replace` guard; do not alter mount admission, full-file version, selectors, byte preservation, compare/rename or cleanup. |
| POST create file -> `createEntry -> mutate` | `createFile -> allowedPath -> split(false) -> withDirectory -> assertWritable -> exclusive open` | Check full target with `maxPathDepth`; retain existing-parent, no overwrite and template rules. |
| POST create folder -> `createEntry -> mutate` | `createDirectory -> allowedDirectoryPath -> split(true) -> withDirectory -> assertWritable -> mkdir` | Full directory operand uses same limit, no scan-depth minus one; at-limit folder is valid but cannot hold addressable children. |
| POST move file -> `moveEntry -> mutate` | `moveFile -> allowedPath` twice -> `split` twice -> nested `withDirectory -> readIn -> link/unlink` | Bound source and destination separately; retain kind/version checks and both storage profiles' actual link proof. |
| POST move folder -> `moveEntry -> mutate` | `moveDirectory -> allowedDirectoryPath` twice -> `split` twice -> nested `withDirectory -> lstat -> placeholder/rename` | Bound both operands and growing-prefix descendant safety audit; keep self-descendant/no-overwrite/refused-mount behavior. |
| POST delete file -> `deleteEntry -> mutate` | `deleteFile -> allowedPath -> split -> withDirectory -> readIn -> retained -> unlink` | New full target depth; original version/admission checks remain. |
| POST delete folder -> `deleteEntry -> mutate` | `deleteDirectory -> allowedDirectoryPath -> split -> withDirectory -> lstat -> rmdir` | New full target depth; no recursive deletion or client-derived empty assertion. |
| Internal `withDirectory`, `readIn`, `validateDirectory`, `validateRoot` | every ancestor/held descriptor and original root | Defensive maximum at the shared walker; do not add fallback direct absolute reads or trust Dirent/cursor. |
| Selected-file polling, review, save response parse | existing service methods above | No tree membership requirement, no cached listing as document/selector/version authority. |
| Shutdown/direct consumers | `app.close -> diagrams.close`, startup failure cleanup | Dispose all new retained resources without stopping existing atomic saves midway. |

## Risks

- Metadata-based traversal is not a namespace snapshot, especially with cached host-share attributes. Real mutation tests are mandatory; final external-actor windows remain disclosed. Continuous external churn may require repeated manual restart.
- Cursor loss has a deliberate restart cost. Single-use cursors simplify memory and concurrency, but generic GET retries and automatic query refetch must be disabled for pages. Expiration during slow browsing is expected and visible.
- Native filesystem order and a five-page UI window trade global sorting/backward pagination for bounded memory and linear traversal. Filter UI must not promise whole-directory search.
- Deep path opens increase descriptor and validation work; the hard depth and four-operation cap bound the new subsystem, not every existing endpoint's aggregate resource use. Deadlines cannot interrupt blocked kernel calls.
- Growing-prefix directory moves require a bounded metadata audit and can refuse a very large subtree; this is necessary to avoid silently stranding addressable descendants and must appear in mutation error/help text. Hidden content is preserved and not traversed.
- Changing `AppConfig.limits` and adding async disposal affects test factories and direct consumers. Leaving one undisposed stream/timer or one `maxTreeDepth` guard is an acceptance failure.
- Historical storage/read consistency failures must be classified with evidence, never skipped or described as passing. Do not mistake old AGENTS/storage summaries for current admission policy.

## Scope

This delivery changes only task/plan/decision documents and a concise changelog entry. Later implementation scope is the diagrams repository/service/routes, shared contracts/errors, config and tests, app/service lifecycle and necessary auth logout integration, the frontend workspace/API/route and tests, targeted setup/API documentation, and a separately maintained self-contained prototype update if included in the UI delivery. Any prototype update must apply the full design methodology and remain needs-review. This task does not edit executable code, configuration, README, frontend or design assets.

## Alternatives

| Alternative | Reason not selected |
| --- | --- |
| Raise recursive root entry/depth budgets | Still spends unrelated-folder budget and eager content work; no continuation for a huge directory. |
| Stateless offset/last-name pagination | Reopens and rescans the prefix or requires a full sort; cannot supply linear bounded continuation in filesystem order. |
| Materialize/sort directory or root | Unbounded latency/memory before first page; violates the required paging budget. |
| Database/index/watch service | Larger persistent consistency model and lifecycle; unnecessary file-based scope expansion. |
| Replay cache/multi-consumer shared stream | Additional response retention, sequence and concurrency protocol; single-use cursors plus explicit restart are smaller. |
| Reject every growing-prefix folder move | Constant work but regresses ordinary longer renames such as `docs -> guides`; bounded audit preserves those operations. |
| Scan all Markdown blocks per directory page | File byte limits can starve later entries and multiply page latency; deferred reads preserve names and usability. |
| OpenAPI migration during pagination | Conflicts with this task's explicit scope and the existing compatibility choice; retain strict schemas and contract tests. |

## Phases and acceptance

1. **Investigation and proposal:** complete this plan, the routing decision, and the bounded contract task. Record existing owner authorization only after the proposal is complete. Validate document links, exact schemas/bounds, write scope and whitespace; review using applicable documentation/security/concurrency policy. No executable gate is needed for this task.
2. **Backend and contract implementation:** claim a separate task; establish RED tests for root-independent listing, empty/excluded-only pages and deep operations, then implement the shared schema, safe iterator, cursor table, invalidation, disposal and config separation. Update README/architecture/env guidance in that task. Keep the old frontend usable throughout.
3. **Frontend integration:** claim a separate task; implement directory search state, breadcrumbs/up/root, five-page window/Next/Restart, deferred blocks, mutations and direct links against the finalized schema. Keep the existing UI stack and design assumptions; preserve prototype review status. Tests must use the actual API contract, not a second invented tree-shaped mock.
4. **Integrated acceptance and delivery:** review the final implementation with pma-cr; run the existing frozen-install/full `check:ci` gate with the pinned runtimes in tmux and actual identified supported/refused fixture parents. The integration owner handles required actual Linux x64/ext4 `check:ci --native`, source/bundle/executable browser checks, final main approval, and publication. This plan remains implementing until frontend and integrated acceptance are finished.

Required implementation evidence:

- At default `maxTreeDepth: 4`, browse/read/revision/save/create/move/delete a file at depth 6 and boundary depth 64; reject depth 65 before I/O. Verify directory creation/deletion at 64, the depth-boundary page, configured smaller path limits, both endpoints of moves, and all descendants affected by growing-prefix folder moves. Assert a shallow legacy tree remains truncated and an old frontend still works.
- Create a sibling subtree larger than legacy root budgets and show it contributes zero dirents/content reads to the current directory listing. Traverse a directory with more than 10,000 immediate eligible files to EOF, with no total-list allocation, no duplicate/omitted eligible names, and all per-page caps met. Interleave more than 1,024 excluded names, unsupported extensions, oversized Markdown, empty/no-diagram Markdown, folders and long Unicode names; later pages stay reachable. Force byte-boundary pending entries through a trusted small-budget test seam without changing production constants.
- Contract tests cover strict query/body decoding, all completion shapes, exact envelope fields and bound values, no file data on a page, parent/root representation, misleading Dirent hints, malformed/cross-directory/cross-principal cursors, expiry/restart, duplicate simultaneous requests, no automatic replay, capacity before cursor consumption, and both API mount modes. Existing auth/CSRF/Host/method/body tests remain valid.
- Schedule actual directory add/delete/rename/replacement between pages and during page reads; assert no mixed page publication and a typed restart. Change a sibling directory and verify an unrelated continuation survives. Cover save temp-file churn, failed mutations, moves with source/destination ancestor effects, changed root, symlink ancestors and target replacement. Never substitute cursor validity for containment checks.
- Count real opened/closed handles for EOF, page failure, pending entry, cancellation, late transport disconnect, capacity exhaustion, idle/absolute/session expiry, logout, shutdown and failed startup. Use injected clock/deadline hooks for bounded deterministic tests; also demonstrate pinned Bun stream resume/close on real disposable directories. No unhandled rejections or resource growth after repeated cycles.
- Exercise directory moves whose projected descendants exceed depth/length; show refusal leaves source and destination unchanged. Verify growing-prefix audit cap refusal before placeholder creation, visible subtree churn conflicts, non-growing moves avoid audit, and hidden content is preserved. Existing directory move/delete semantics and unsupported writes remain intact.
- Browser checks cover root/subfolder breadcrumbs/Up/Root, Back/Forward and old links, empty/excluded-only pages, loaded-window filters, Next/Restart after dropped/expired cursors, the five-page cap, Markdown block loading/error/zero-block states, linked unlisted files, deep file actions, server-only folder-empty decisions, out-of-order response rejection, session changes, dirty drafts, and narrow drawer keyboard use.
- Preserve actual overlay/ext4 stable identity and virtiofs content identity with held mount/type/device checks, byte-preserving saves and publication verification. Retain separate unsupported storage refusal, external-writer limitation and the 0.8.4 preview regression suite. Historical passes are not new feature acceptance.

## Annotations

- No new dependency is proposed, so there is no new registry pin or upgrade acceptance claim.
- This contract intentionally describes observable namespace consistency rather than a filesystem snapshot. Global sort, global search and random page access are outside scope.
- Investigation/proposal completion is not feature completion, prototype approval, integration, or release acceptance.

- 2026-09-13 16:33 UTC: investigation and concrete proposal completed; existing owner authorization applied. The overall feature remains implementing, with backend/frontend and integrated acceptance outstanding.

- 2026-09-13 16:54 UTC: backend runtime investigation found that pinned Bun 1.4.2 `Dir.read()` materializes `fs.readdir` results and does not honor bufferSize as an enumeration bound. The provisional implementation is not accepted. The [backend task](../task/20260913-1637-directory-backend.md) retains actual runtime, descriptor and first-read syscall evidence. The streaming/no-helper/runtime-pin constraints require a reviewed correction before bounded pagination can be accepted; no alternate API schema or dependency is inferred. This overall plan remains implementing.

- 2026-09-13 17:10 UTC: applied the explicitly reviewed section 1/5 native-buffer and logical-record correction from [the correction plan](20260913-1657-streaming-directory-correction.md). Original owner authorization and historical rejected eager-runtime evidence remain intact. Candidate implementation is authorized; production/native acceptance remains pending.

## Frontend implementation candidate

The owner confirmed reviewed backend integration on 2026-09-13: native run 34772642752 passed normal Linux x64/ext4 acceptance at `c3fb12bcde038eaa4de599d4ecce967293688160`, tree-identical to backend integration `9642799f0def47b685c57fa7e5558ed6bfc6f1d4`. Backend completion is recorded separately from whole-feature acceptance.

The [frontend implementation task](../task/20260913-1802-directory-frontend.md) reuses the completed [frontend proposal](20260913-1746-directory-frontend.md). Production now implements route directory state, bounded five-page navigation, deferred documents, independent drafts and validated links. The candidate includes unit/browser acceptance and extends source, bundle and executable browser coverage through the existing normal gate. Local candidate verification and final integrated native acceptance remain distinct. Status stays implementing until whole-feature acceptance; both prototypes stay needs-review and brand approval is unchanged.

The bounded frontend acceptance repair is complete in the [implementation task](../task/20260913-1802-directory-frontend.md). It corrects selected-document refresh and redundant/concurrent namespace reads, retains the original aggregate failure and unchanged-executable reproduction, and records focused passing unit/browser evidence. The original failed aggregate has not been relabeled or rerun. Final exact-candidate hosted/native validation and v0.9.0 publication remain pending; v0.8.4 is the published release. This plan remains implementing.

Hosted run 34775581757 on repaired candidate `17e50a4ac4d115d35b9f7ee81e767e31feae6a2b` passed physical directory and browser checks but failed supported executable trace completeness; whole native and bundle acceptance remain pending. The same implementation task records a bounded diagnostic candidate and focused actual local lifecycle evidence. The exact hosted record is unavailable, so no speculative parser acceptance or shutdown change was made. The diagnostic preserves rejection and supplies only fixed redacted categories for the next hosted run. This plan remains implementing.

The next diagnostic hosted run 34776441244 again passed source/physical/browser checks but rejected a successful-looking `openat` return as `numeric-format`; native acceptance still failed. The same implementation task now records a proven narrow correction for complete deleted-descriptor annotations, reproduced with actual strace 6.8 and 6.13 and verified by focused parser and application lifecycle checks. The exact hosted raw record remains unavailable; final exact-candidate hosted/native validation and release remain pending. Status stays implementing.
