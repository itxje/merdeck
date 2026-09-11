# PLAN-015 Manage project files from the explorer

- **status**: completed
- **createdAt**: 2026-09-11 02:53
- **approvedAt**: 2026-09-11 (explicit owner `Proceed` on the proposal as written, implemented directly on the main checkout in the proposed slices)
- **relatedTask**: FILE-002

## Context

The project owner asked on 2026-09-11 to complete file management in the explorer. [PLAN-001](PLAN-001.md) lists "file creation/rename/delete controls" as out of scope, and the [runtime and scope decision](../decisions/2026-09-07-runtime-and-scope.md) does not authorize new features automatically, so this plan is the explicit scope change to approve.

Current behavior:

- **API** (`src/modules/diagrams/routes.ts`): GET `tree`, `document` and `revision`, and PUT `source` only. The router derives the allowed method from the path suffix. Mutations require the session, the exact Origin and the CSRF token (`requireMutation`). JSON bodies are strict, bounded and reject duplicate keys (`src/shared/lib/http-input.ts`).
- **Repository** (`src/modules/diagrams/repository.ts`):
  - `allowedPath` accepts relative POSIX paths without hidden components, ignored directories (`node_modules`, `dist`, `build`, `secrets` and others) or unsupported extensions.
  - Every directory component is opened with `O_DIRECTORY | O_NOFOLLOW`, and children are reached through the held `/proc/self/fd` anchor. Root and directory identities are revalidated around I/O. Symlinks, hardlinked files and non-regular files are rejected.
  - Writes are admitted only on descriptor-verified overlayfs or ext4 on the root device (`requireWritableFilesystem`).
  - `replace()` writes a synced sibling temporary file and renames it after a final version and identity check.
- **Service** (`src/modules/diagrams/service.ts`): serializes saves per path and invalidates the cached tree snapshot after each save. The tree lists every visible directory, including empty ones, and every supported file.
- **Frontend**:
  - `web/src/features/workspace/file-tree.tsx` only browses and filters.
  - `use-workspace.ts` owns the tree, revision and document queries and the save mutation, with session-generation and expiry handling.
  - `drafts.ts` keys drafts by path, marks drafts of vanished files as deleted and never recreates files.
  - The narrow drawer renders the same tree.
- **Contracts**: `ErrorCode` has no code for an existing destination or a non-empty folder; `not_found` is currently used only for unknown routes.

Probe evidence (2026-09-11, Bun 1.4.2, supported overlay fixture `0x794c7630`, operations through `/proc/self/fd` anchors):

- An exclusive create (`O_CREAT | O_EXCL`) of an existing name fails with `EEXIST`. A new file received mode 664 under the process umask.
- `link` onto an existing name fails with `EEXIST` and leaves that file unchanged. `link` to a free name followed by `unlink` of the source moves a file; the file has two links in between.
- `mkdir` of an empty placeholder followed by `rename` of a folder onto it moves the folder with its contents. Renaming onto a non-empty folder fails with `ENOTEMPTY` and leaves it unchanged.
- `mkdir` of an existing name fails with `EEXIST`, and `rmdir` of a non-empty folder fails with `ENOTEMPTY`.

`fs.protected_hardlinks` is `1` on this host.

## Proposal

1. **Operations**, all inside the configured root and only on admitted storage:
   - Files: create a `.mmd`, `.mermaid` or `.md` file from a minimal template; rename or move a file; delete a file. A rename keeps the file kind: `.mmd` and `.mermaid` are interchangeable, and Markdown stays `.md`.
   - Folders: create a folder, rename or move a folder, delete an empty folder.
   - An existing destination is never overwritten; the operation fails with a clear error instead.
2. **Contracts** (`src/shared/contracts.ts`, `src/shared/errors.ts`):
   - `createEntryRequestSchema`: `{ kind: 'file', path } | { kind: 'directory', path }`.
   - `moveEntryRequestSchema`: `{ kind: 'file', from, to, expectedVersion } | { kind: 'directory', from, to }`.
   - `deleteEntryRequestSchema`: `{ kind: 'file', path, expectedVersion } | { kind: 'directory', path }`.
   - Responses: `{ kind, path }`; creating a file returns the new `DiagramDocument`.
   - New error codes: `exists` (409, "An entry with that name already exists.") and `not_empty` (409, "The folder is not empty."). A missing destination folder returns `not_found` (404); a missing source keeps returning `deleted` (410).
3. **HTTP routes**: `POST /api/diagrams/entries`, `POST /api/diagrams/entries/move` and `POST /api/diagrams/entries/delete`. Each requires the session, exact Origin, CSRF token and a strict JSON body of at most 8 KiB, and responds with the existing `ApiResult` envelope. Other methods return 405 with `Allow: POST`.
4. **Repository**, reusing anchors, identity revalidation and write admission for every directory involved:
   - **Paths**: files use `allowedPath`. Folders use the same component rules without the extension check. Both enforce `maxTreeDepth`. Parent folders must already exist; nothing is created implicitly.
   - **Create file**: in the anchored parent, open the name with `O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW` (mode 0666 before umask), write the template, then sync the file and the directory. `EEXIST` maps to `exists`.
   - **Create folder**: `mkdir` in the anchored parent (0777 before umask), then sync the parent.
   - **Move file**:
     1. Open both parent chains and read the source for write: it must be a regular, single-link, admitted file whose version matches `expectedVersion`.
     2. `link` the source to the destination. `EEXIST` maps to `exists`, because the kernel never replaces an existing name.
     3. Confirm that the destination has the source's identity.
     4. Recheck the source identity and `unlink` it, then sync both directories.
     5. If the source changed before the unlink, remove the new link (identity-checked) and return `conflict`.
   - **Move folder**:
     1. Refuse moving a folder into itself, and confirm that the source is a real directory.
     2. Create the destination as an empty placeholder with `mkdir` (`EEXIST` maps to `exists`).
     3. `rename` the source onto the placeholder. The kernel refuses a non-empty destination.
     4. Sync both parents. On failure, remove the placeholder if it is still the empty directory created here.
   - **Delete file**: read for write, compare `expectedVersion`, recheck identity immediately before `unlink`, then sync the directory.
   - **Delete folder**: `rmdir`. `ENOTEMPTY` maps to `not_empty`; this includes folders that only contain files the explorer hides.
   - **Failures**: `EXDEV` and `EPERM` map to `forbidden`. There is never a fallback to an overwriting rename or a copy.
5. **Service**:
   - Replace the per-path save chain with one service-wide mutation queue shared by saves and the new operations, so a folder move cannot interleave with a save beneath it.
   - Invalidate the tree snapshot after every successful mutation.
   - Create new files from fixed server-side templates, so requests never carry file content: `flowchart TD` with `A[Start] --> B[End]` for Mermaid files, and a level-one heading plus that diagram in a `mermaid` fence for Markdown.
6. **Frontend**:
   - `api.ts` gains `createEntry`, `moveEntry` and `deleteEntry` with response decoders. `errorMessage` explains `exists`, `not_empty`, `not_found` and `forbidden` for these actions.
   - **Explorer heading**: New file, New folder and Refresh files icon buttons with tooltips. The file count moves to the explorer footer beside the supported extensions, and the narrow drawer keeps its initial focus in the filter explicitly.
   - **Row actions**: every file and folder row gets a More actions button (visible on hover and keyboard focus, always visible on narrow screens) that opens a menu. The same menu also opens on right-click. Folders offer New file here, New folder here, Rename or move and Delete; files offer Rename or move and Delete. F2 renames and Delete deletes the focused row. The menus use the existing base-nova `dropdown-menu` and the registry `context-menu` added through the project's shadcn CLI; no new npm package is needed.
   - **Dialogs** (base-nova `Dialog` and `Input`):
     - New file shows the location and prefills `untitled.mmd` with the base name selected.
     - New folder takes a name.
     - Rename or move prefills the full relative path with the base name selected, and says that a folder moves with everything inside it.
     - Delete names the entry, says the deletion is permanent and warns when unsaved changes will be discarded.
     - Server errors appear inline and keep the dialog open.
   - **State** (`use-workspace.ts`, `drafts.ts`):
     - Mutations follow the save pattern: session generation, expiry on 401, and paused revision and document polling while they run.
     - A created file opens immediately.
     - After a move, drafts under the old path are re-keyed to the new path with the document path updated, and the selection follows.
     - After a confirmed delete, that file's drafts are removed and the selection clears.
     - Actions are disabled while an affected file is saving, and when storage is read-only, the connection is interrupted or the session has ended.
7. **Tests**:
   - **Service tests on the supported fixture**: each operation's success path; `exists`, `not_empty`, `conflict`, `deleted` and `not_found`; hidden and ignored names; depth; kind changes; moving a folder into itself; symlinked components and destinations; hardlinked sources; unchanged existing destinations; serialization with saves.
   - **Storage HTTP tests** on the supported and unsupported fixtures: every new route refuses with `filesystem_unsupported` on unsupported storage and changes nothing.
   - **API HTTP tests**: authentication, Origin, CSRF, method and `Allow`, strict JSON and duplicate keys.
   - **Frontend unit tests**: draft moves and removals, response decoding, dialog validation and action availability.
   - **New browser spec**:
     - Create, edit and save a file; rename a file that has an unsaved draft; move a file into another folder; delete with confirmation.
     - Create, rename and delete a folder, and see a non-empty folder refused.
     - The read-only instance shows no enabled actions, and the narrow drawer works.
     - The drawer spec is updated for the new heading controls.
8. **Documentation**: README usage and API contract, architecture (API and service tables, operation semantics, the mutation queue and limitations), SECURITY (write surface), a dated addendum to the runtime and scope decision recording this authorization, and the changelog. The prototype stays unchanged and needs review.
9. **Delivery**: three verified slices on the main checkout, as with PLAN-013 and PLAN-014, each committed separately:
   1. Contracts, repository, service, routes and backend tests.
   2. Explorer UI, state, and frontend and browser tests.
   3. Documentation, the full quality gate, redeployment and live verification.

## Risks

- **Permanent deletion**: there is no trash or undo. Confirmation and the version check reduce mistakes.
- **External writers**: the documented external-writer window remains. An external write or replacement that lands between the final check and `unlink` (delete, or the source removal of a move) can be lost; this is the same class of limitation already documented for saves. Destinations are never overwritten.
- **Two-link moment**: a moving file briefly has two links. A tree or revision read at that moment reports it unreadable until the next refresh.
- **Hardlink protection**: with `fs.protected_hardlinks=1`, the kernel permits the link only when the service owns the file or can read and write it. Otherwise the move is refused with 403 rather than done another way.
- **overlayfs folders**: overlayfs refuses renaming a directory that exists in a lower layer unless `redirect_dir` is enabled, so such folder moves are refused with 403. Folders created on the upper layer, as in the hosted demo root, move normally, and ext4 is unaffected.
- **Save serialization**: one service-wide queue serializes saves across files. With a single owner this adds no noticeable delay.
- **Folder contents**: moving a folder also moves files the explorer hides and can break relative links in Markdown; the dialog says so.
- **Draft consistency**: re-keyed drafts and selection must stay consistent with polling. Tests cover revision and document observations that arrive during a move.
- **Write surface**: three more authenticated write endpoints exist. All reuse the session, Origin, CSRF, strict JSON, containment and storage admission, and none accepts file content or absolute paths.

## Scope

- **Backend**: `src/shared/contracts.ts`, `src/shared/errors.ts`, `src/modules/diagrams/repository.ts`, `service.ts`, `routes.ts` and their tests, plus `tests/integration/storage/http.test.ts` and `tests/integration/api/http.test.ts`.
- **Frontend**:
  - `web/src/features/workspace/api.ts`, `drafts.ts`, `use-workspace.ts`, `file-tree.tsx` and `workspace.tsx`, plus a new dialogs component.
  - `web/src/shared/components/ui/context-menu.tsx` from the registry, and `web/src/index.css`.
  - Unit tests, a new browser spec and drawer spec updates.
- **Documentation**: README, architecture, SECURITY, the scope decision addendum, the changelog and FILE-002.

About 25 files, with no new npm packages, database, configuration or storage outside the root.

Out of scope: uploads and downloads, drag-and-drop moves, copy or duplicate, recursive folder deletion, trash or undo, bulk selection, changing a file's kind by renaming, implicit creation of missing parent folders, editing non-diagram files, Git operations and prototype changes.

## Alternatives

- **Rename after checking the destination**: renaming files with `rename()` after checking that the destination is absent is simpler and avoids the two-link moment and the hardlink permission rule. However, an entry created at the destination between the check and the rename would be replaced silently. `renameat2` with `RENAME_NOREPLACE` would be exact, but it needs a foreign-function call outside the built-in filesystem APIs the file layer is limited to.
- **Hidden trash folder**: soft deletion into a `.merdeck-trash` folder in the project allows recovery, but it writes service state into the owner's project (visible to Git and other tools) and needs retention rules. A trash outside the root would break the root-only rule.
- **Block moves on unsaved files**: blocking rename and move while a file has unsaved changes needs less state logic. There is no quick way to discard a draft today, though, so it would often block the action.
- **Branch with merge review**: delivering on a separate branch with a merge review before `main` adds isolation but is slower.
- **External tools only**: keep file management in external tools (the current state).

## Annotations

(none yet)

## Implementation record

Implemented in the proposed slices on the main checkout: `d7d234d` (service and API), `5fcbe55` (explorer, together with the LAYOUT-005 label cleanup) and a documentation commit with the live verification.

Deviations from the proposal:
- Every entry route returns `{ kind, path }`, including file creation; the interface opens a created file through its usual document query.
- New Markdown files contain only the fenced example diagram.
- Right-click opens the row's dropdown menu through its controlled state, so no context-menu component was added.
- After success the mutation refreshes only the tree, because refetching the old path's document reported the change as a deletion.

[FILE-002](../task/FILE-002.md) records the verification and live evidence.
