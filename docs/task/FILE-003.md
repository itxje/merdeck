# FILE-003 List only the chosen file types in the explorer

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-12

## Description

The project owner asked on 2026-09-12 for a way to list only `.mmd` files in the explorer, because some projects contain many `.md` files. Acceptance: the explorer offers a remembered choice between all supported types, diagram files (`.mmd`, `.mermaid`) and Markdown files (`.md`); the choice applies to the sidebar and the narrow-screen drawer, combines with the existing text filter, hides folders that hold no listed file, and is reflected in the file count and the empty-list hint. The service is unchanged.

## ActiveForm

Adding a file type filter to the explorer.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-12): `web/src/features/workspace/file-tree.tsx` keeps one free-text `filter` state and lists an entry when its path contains that text, or when a directory holds a matching file. Typing `.mmd` therefore already narrows the list by name, but it matches any path containing that text and is forgotten on reload. Every file entry already carries `fileKind` (`mermaid` for `.mmd` and `.mermaid`, `markdown` for `.md`) in `src/shared/contracts.ts`, so no service change is needed. `workspace.tsx` renders the same tree twice from one `treeProps` object, for the sidebar and the file drawer. View preferences are kept per browser in local storage (`merdeck.theme`, `merdeck-panes`). The explorer footer reports the file count and the supported extensions, and a `toggle-group` component is already part of the interface.
- Proposal: recorded in [PLAN-017](../plan/PLAN-017.md) and presented to the owner on 2026-09-12.
- Approval: the owner chose the three-way control, confirmed that `.mermaid` belongs with `.mmd`, and replied `proceed`.
- Implementation (2026-09-12): `web/src/features/workspace/file-filter.ts` holds the `all | mermaid | markdown` preference with its extension lists and a hook that reads local storage once and writes only when the reader changes the choice. `file-tree.tsx` receives the choice and its setter, lists only files of the chosen kind, keeps a folder while it holds a listed file (and, with every type listed, by its own name as before), and derives the footer count, the footer extensions and the empty-list hint from the choice. The control is a small three-way toggle group under the search field, with the accessible names `All files`, `.mmd and .mermaid files` and `.md files` around the visible `All`, `.mmd` and `.md`. `workspace.tsx` holds the preference once and passes it to both the sidebar and the drawer, so they always agree. Retained drafts stay listed in every mode, because they hold unsaved work.
- Verification (2026-09-12, main checkout, pinned Bun 1.4.2): `bun run check` passed inside the project tmux session with the supported overlay fixture parent under `/tmp` and the checkout `tmp/` as the refused parent. It ran 190 backend tests across 9 files and 192 frontend tests across 18 files, including five new tests for the tree rows, the footer, the empty-list hint and the stored preference, with lint, strict type checks and the production build. The full browser suite then passed 42 of 42 in 2.0 minutes, including the new explorer case, and all services stopped with their fixtures removed.
- Deployment and live evidence (2026-09-12): the hosted instance was relaunched from the main checkout in the `domain` window of the project tmux session with a build of these sources. The previous service processes exited and the `merdeck` route disappeared before the relaunch; afterwards HTTPS `/api/health` returned 200 with service `merdeck`, and `/` and `/favicon.svg` returned 200. In a real Chromium session the explorer listed four files with `4 files · .mmd · .mermaid · .md`. Choosing `.mmd` left the three diagram files and the folder that holds one of them, with `3 files · .mmd · .mermaid`, and a reload kept that choice pressed with the same rows. Choosing `.md` left the Markdown file, its folder and its two diagram rows, with `1 file · .md`. At 390 px the file drawer showed the same choice, the same rows and the same footer. Returning to **All** restored all four files, and the session reported no page or console errors.
