# FILE-002 Manage project files from the explorer

- **status**: completed
- **priority**: P2
- **owner**: Workspace maintainer
- **createdAt**: 2026-09-11 02:44

## Description

The project owner asked on 2026-09-11 to complete file management in the explorer. Today the explorer lists, filters and opens supported files and Markdown diagram blocks, and existing files can be edited and saved; files cannot be created, renamed, moved or deleted from the application. Acceptance is defined by the approved plan and must keep every read and write inside the configured project root, keep the existing storage admission, version and conflict rules, and never discard unsaved drafts silently.

## ActiveForm

Investigating file management for the explorer.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation started 2026-09-11 02:44.
- Investigation: [PLAN-001](../plan/PLAN-001.md) lists "file creation/rename/delete controls" as out of scope, so the change needs explicit authorization. The API offers GET `tree`, `document` and `revision` and PUT `source` only. The repository already provides the building blocks: path rules, descriptor-anchored directory access with identity revalidation, rejection of symlinks and hardlinks, and storage write admission. The service serializes saves per path, and the frontend keys drafts by path and never recreates vanished files. A probe on the supported overlay fixture confirmed the no-overwrite primitives through `/proc/self/fd` anchors: exclusive create, `link` followed by `unlink` for file moves, an empty `mkdir` placeholder followed by `rename` for folder moves, and `rmdir` refusing non-empty folders. `fs.protected_hardlinks` is 1 on this host. Details are in [PLAN-015](../plan/PLAN-015.md).
- Proposal: [PLAN-015](../plan/PLAN-015.md) covers creating, renaming or moving and deleting files; creating, renaming or moving folders; and deleting empty folders. Operations never overwrite an existing destination. They are exposed through three authenticated POST routes, and the explorer offers them from heading buttons, row menus, right-click, dialogs and F2/Delete shortcuts. Drafts follow moves, and a confirmed deletion discards that file's drafts. Delivery is in three verified slices. The plan awaits the owner's approval.
- Approval: the project owner replied `Proceed` on 2026-09-11 to the proposal as written. Implementation follows the plan's slices directly on the main checkout, after the explorer selection change in LAYOUT-004 is delivered.
- Implementation, slice 1 (service and API):
  - **Contracts:** `src/shared/contracts.ts` adds `createEntryRequestSchema`, `moveEntryRequestSchema`, `deleteEntryRequestSchema`, their request types and `EntryChange`. `src/shared/errors.ts` adds `exists` and `not_empty` (both 409).
  - **Repository** (`src/modules/diagrams/repository.ts`):
    - `allowedDirectoryPath` applies the path rules without the extension check, and `allowedPath` builds on it.
    - `withDirectory` can report a missing destination parent as `not_found`.
    - New methods `createFile`, `createDirectory`, `moveFile`, `moveDirectory`, `deleteFile` and `deleteDirectory`. They use an exclusive create, `link` then `unlink` for file moves, an empty `mkdir` placeholder then `rename` for folder moves, and `rmdir`, all through descriptor anchors after write admission. `EEXIST` maps to `exists`, `ENOTEMPTY` to `not_empty` (or `exists` for a folder move) and `EXDEV` to `forbidden`.
    - A file move removes its extra link on failure only while the source name still holds the file. A folder move removes its placeholder only while it is still the empty directory it created.
  - **Service** (`src/modules/diagrams/service.ts`): `createEntry`, `moveEntry` and `deleteEntry` run through one mutation queue that saves now share. The queue invalidates the tree snapshot after each successful mutation.
  - **Routes** (`src/modules/diagrams/routes.ts`): `POST /diagrams/entries`, `/entries/move` and `/entries/delete` require the session, Origin and CSRF token, accept strict JSON bodies of at most 8 KiB, and return 405 with `Allow: POST` for other methods.
  - **Deviations from PLAN-015:** every route returns `{ kind, path }`, including file creation (the interface opens a new file through its usual document query). New Markdown files contain only the fenced example diagram, so the template stays bounded whatever the file name.
  - **Tests:** the new `src/modules/diagrams/entries.test.ts` covers creation, refusals, file moves, folder moves, deletion and waiting for an in-flight save. Contract tests cover the new schemas and statuses, `tests/integration/api/http.test.ts` covers the route boundary and typed outcomes, and the unsupported-storage checks in `tests/integration/files/practical.test.ts` and `tests/integration/storage/http.test.ts` now include every operation.
- Verification, slice 1 (2026-09-11, pinned Bun 1.4.2, supported overlay and unsupported fixture parents):
  - Root lint (fixer) and `bun run typecheck` were clean, and the api, files and storage test projects typechecked.
  - `bun test` passed 53 tests across the contract, entries and service files.
  - `bun test ./tests/integration/api/http.test.ts ./tests/integration/files/practical.test.ts ./tests/integration/storage/http.test.ts` passed 31 tests.
  - The slice was committed as `d7d234d`, after backend lint, typecheck and `bun run test:coverage` (185 passed, 98.82% lines).
- Implementation, slice 2 (explorer):
  - **Data layer:**
    - `api.ts` adds `createEntry`, `moveEntry`, `deleteEntry`, `decodeEntry` and `entryErrorMessage`.
    - `drafts.ts` adds `move` and `remove`. `move` re-keys the drafts of a moved file or folder, keeps any retained draft already at a destination, and clears a deletion warning observed at the old path.
    - `use-workspace.ts` adds the `entries` mutation. It sends the session CSRF token, pauses document and revision fetches while it runs, updates drafts after success, refreshes the tree, and ends the session on 401.
  - **Actions and dialog:** `entries.ts` holds the action types, client-side path checks (mirroring the service's excluded folders), default paths and request building. `entry-dialog.tsx` renders the New file, New folder, Rename or move and Delete dialogs with the name preselected, inline validation and service errors.
  - **Explorer** (`file-tree.tsx`):
    - The heading holds New file, New folder and Refresh files. New file and New folder use the open file's folder by default, and the file count moves to the footer.
    - Each file and folder row has a More actions menu, also opened by right-click, plus F2 and Delete shortcuts.
    - Actions are disabled on read-only storage, while saving or disconnected, for files without a version, and (for Delete) on folders with visible contents.
  - **Workspace** (`workspace.tsx`): starting an action closes the narrow drawer, and the drawer keeps its initial focus on the filter. The selection moves to a created file, follows a moved file or folder, and clears when the open file is deleted.
  - **Deviation from PLAN-015:** right-click opens the same dropdown menu through its controlled state instead of a separate context-menu component, so no registry component was added.
- Pitfall: the first browser run of `files.spec.ts` failed its audit with two unexpected 410 responses for `/api/diagrams/document`. Invalidating document queries after a move or delete refetched the old path before the selection moved. The mutation now refreshes only the tree, and the new path loads through its own queries.
- Pitfall: the next full browser run failed one existing case in `acceptance.spec.ts`. Its unanchored locator `getByRole('button', { name: /binary.mmd/ })` now matched both the file row and the new "Actions for binary.mmd" button (strict mode violation); the other 37 cases passed. The locator is now anchored to the start of the row name, and no other spec uses an unanchored button name outside a diagram list.
- Verification, slice 2 (2026-09-11, main checkout, pinned Bun 1.4.2):
  - `bun run --cwd web lint` and `typecheck` were clean.
  - `bun run --cwd web test:coverage` passed 177 tests in 14 files, with 93.12% line coverage over the covered modules.
  - Root `bun run lint` was clean, `bun run build` succeeded and `git diff --check` was clean.
  - After the two pitfalls above, the full browser suite passed 38 of 38 in 1.9 minutes, with services stopped and fixtures removed. This includes the new `files.spec.ts`, which covers creation, name refusals, renaming with a draft, moving by right-click, disabled and refused folder deletion, file and folder deletion, the narrow drawer and read-only storage.
- Deployment and live evidence (2026-09-11):
  - **Relaunch:** the hosted instance was stopped through its `domain` tmux window and relaunched from the main checkout with a build of the sources committed as `5fcbe55`. Its service processes exited and its route disappeared before the relaunch, while the unrelated `/design` route stayed. HTTPS `/api/health` returned 200 with service `merdeck`, and `/` and `/favicon.svg` returned 200.
  - **Explorer:** in a real Chromium session against https://merdeck.example.test/ at 1440×900, the explorer heading offered enabled New file, New folder and Refresh files buttons. The footer read "3 files · .mmd · .mermaid · .md".
  - **Folder and file creation:** New folder proposed `new-folder` and created a uniquely named check folder. The folder's actions menu listed New file here…, New folder here…, Rename or move… and Delete…. New file here proposed `<folder>/untitled.mmd`, and the created `check.mmd` opened as the current row with the example diagram.
  - **Rename and deletion:** F2 renamed the file to `renamed.mmd`, which stayed current. The Delete key opened the permanent-deletion confirmation, and deleting the file cleared the selection ("Choose a diagram"). Deleting the then-empty folder asked for confirmation and removed it, and the tree API afterwards listed no entry under the check folder.
  - **Result:** the session logged out with no page or console errors. Screenshots are kept under the ignored `tmp/` directory.
