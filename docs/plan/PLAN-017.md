# PLAN-017 List only the chosen file types in the explorer

- **status**: completed
- **createdAt**: 2026-09-12
- **approvedAt**: 2026-09-12 (explicit owner `proceed` on the three-way control, with `.mermaid` grouped with `.mmd`)
- **relatedTask**: FILE-003

## Context

The explorer lists every supported file under the project root: `.mmd`, `.mermaid` and `.md`. In a project whose documentation is mostly Markdown, the diagram files are hard to find among the `.md` files. The only narrowing today is the text field above the tree, which matches the path and is not remembered.

The tree already distinguishes the two file kinds. Each file entry carries `fileKind`, the rows already use a different icon per kind, and the explorer footer names the supported extensions. The same tree component renders the sidebar and the narrow-screen drawer.

## Proposal

1. **Control.** Below the text field, the explorer shows a three-way choice: **All**, **.mmd** and **.md**, as a small toggle group whose accessible names are `All files`, `.mmd and .mermaid files` and `.md files`. Exactly one choice is active, and pressing the active one again keeps it.
2. **Filtering.** With `.mmd`, the tree lists only files whose kind is `mermaid`; with `.md`, only Markdown files. The text field keeps working and applies on top. A folder is listed while it holds a file of the chosen kinds; with **All** an empty folder still appears by name, so file management is unaffected. Retained drafts stay listed in every mode, because they hold unsaved work.
3. **Footer and empty list.** The footer counts the listed files and names the extensions of the current choice. When nothing is listed, the hint names the chosen extensions instead of the general one.
4. **Persistence.** The choice is kept per browser in local storage under `merdeck.file-filter`, like the colour scheme and the pane layout, and is read once when the workspace mounts. Nothing is written before the reader changes it. The sidebar and the drawer share one choice.
5. **Tests.** Web unit tests for the tree (each choice lists the expected rows, folders without listed files disappear, the footer count and the empty hint follow the choice) and for the stored preference. One browser case chooses `.mmd`, checks that the Markdown file and its folder disappear while the diagram files stay, checks the footer, reloads to confirm the choice survives, and returns to **All**.
6. **Documentation.** The explorer section of README, the interface description in the architecture document, the task and plan records and the changelog.

## Risks

- A reader who forgets the active choice may think files are missing. The footer states the active extensions, and the empty-list hint names them, so the reason stays visible.
- Hiding Markdown files also hides their diagram rows; the choice is reversible at any time and nothing on disk changes.
- Local storage may be unavailable; the filter then works for the session without being remembered.

## Scope

`web/src/features/workspace/file-tree.tsx`, a small preference module beside it, the tree props in `web/src/features/workspace/workspace.tsx`, the explorer styles in `web/src/index.css`, the web unit tests, one browser spec and the documentation listed above. Out of scope: server-side filtering, new file types, changes to file management, and hiding diagram rows inside a listed Markdown file.

## Alternatives

- **A single "only `.mmd`" switch.** Smaller, but it cannot express "only Markdown", which is the mirror case for prose-heavy projects.
- **Filtering in the service.** The tree request could take a kind parameter, but the client already knows each kind, and a client-side choice keeps the cached tree usable for every mode.
- **Relying on the text field.** No code change, but `.mmd` also matches a file named `notes.mmd.md`, and the choice is lost on every reload.

## Implementation record

Implemented as proposed. A small preference module keeps the choice and the extension lists, the tree derives its rows, footer and empty-list hint from it, and the workspace holds one choice for both the sidebar and the drawer. The source gate and the full browser suite passed, and the hosted instance was relaunched and checked in a real browser; the evidence is recorded in [FILE-003](../task/FILE-003.md).
