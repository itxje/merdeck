# LAYOUT-004 Select Markdown diagrams from the explorer only

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-11 02:56

## Description

The project owner asked on 2026-09-11 to drop the Markdown diagram tabs above the editor ("1. Diagram 1", "2. Diagram 2"), because the explorer already lists each diagram, and reported that the explorer's selection colour is too faint to tell which item is selected. Acceptance:

- There is no diagram tab bar at any width, and diagrams are selected from the explorer (the sidebar, or the file drawer on narrow screens).
- Exactly one row carries a clearly visible selection fill in both colour schemes: the selected standalone file, empty Markdown file or Markdown diagram. An open Markdown file is marked without a fill, and expanded folders carry no fill.
- Unsaved changes stay visible for each diagram.
- Saving, drafts and navigation are unchanged.

## ActiveForm

Moving diagram selection to the explorer.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation:
  - `web/src/features/workspace/workspace.tsx` renders a `.block-bar` with a line-style `Tabs` list ("Markdown blocks") for files with more than one diagram. It duplicates the explorer's nested diagram rows in `file-tree.tsx`, and its tab labels carried the per-diagram unsaved marker.
  - In the explorer, `.tree-row[aria-current="true"]` fills with `--sidebar-accent` (`oklch(0.97 0 0)` on the `oklch(0.985 0 0)` sidebar in the light scheme). Both a Markdown file row and its selected diagram row are current, and expanded folder rows also get the ghost button's `aria-expanded` fill, so three rows look alike.
  - Browser specs switch diagrams through the tabs in `workspace.spec.ts`, `save-race.spec.ts` and `renderer-flowchart.spec.ts`.
- Proposal (owner request, routine visual defaults; the prototype stays unchanged and needs-review):
  - Remove the diagram tab bar and its CSS at every width; on narrow screens, diagrams are chosen from the file drawer.
  - Mark only the selected row as current (`aria-current`) and fill it with 10% of the foreground colour mixed into the sidebar colour, with foreground text, icon and number. Mark an open Markdown file with `data-open` (foreground colour and weight, no fill), and remove the fill from expanded folders except on hover.
  - Show the unsaved dot on each diagram row, label each diagram list "Diagrams in <file>", and separate the number from the label so rows have clear accessible names.
  - In the browser specs, replace tab clicks with a `chooseBlock` helper that also asserts that the chosen row is current. Add checks that the tab bar is gone and that the selection fill contrasts with the sidebar in both colour schemes.
- Implementation:
  - **Tab bar:** `workspace.tsx` no longer renders the diagram tab bar, and `index.css` drops the `.block-bar` rules at every width.
  - **Current rows** (`file-tree.tsx`): a file row is current only for a standalone file or a Markdown file without diagrams. An open Markdown file with diagrams gets `data-open` instead, and a diagram row is current when it is selected.
  - **Diagram lists:** rendered only when a file has diagrams, and labelled "Diagrams in <file>". Each row separates the number from the label and shows an unsaved dot when its draft differs from the draft baseline.
  - **Styling** (`index.css`): the current row is filled with `color-mix(in oklch, var(--foreground) 12%, var(--sidebar))`, and its icon and number use the foreground colour. `data-open` rows are marked by colour and weight only, and expanded folder rows stay unfilled except on hover. Computed from the tokens, the previous fill gave a contrast ratio of about 1.04 against the light sidebar; the new fill gives about 1.36 in the light scheme and 1.32 in the dark scheme.
  - **Browser specs:** diagrams are switched through a new `chooseBlock` helper in `support.ts`, which asserts that the chosen row is current. The new `explorer.spec.ts` checks:
    - the tab bar is gone and exactly one row is current;
    - the open file and the expanded folder are unfilled;
    - the selection fill reaches a contrast ratio of at least 1.25 in both colour schemes;
    - unsaved markers appear per diagram;
    - a diagram can be chosen from the narrow drawer.
  - **Docs:** `docs/architecture.md` describes explorer-only diagram selection and corrects the refresh button position left over from LAYOUT-003.
- Pitfall: the first targeted browser run failed twice.
  - `renderer-flowchart.spec.ts` also switched diagrams through a dynamically built tab name that the first replacement missed; it now uses `chooseBlock` too.
  - In the save-race deletion case, the retained draft of a deleted Markdown file appeared under Retained drafts without diagram rows, so its second diagram could no longer be reached once the tabs were gone. Diagram rows are now a `DiagramList` component shared by the tree and the retained-drafts section, and retained file rows use the same current and open marking.
- Verification (2026-09-11, main checkout, pinned Bun 1.4.2): `bun run --cwd web lint` and `typecheck` were clean, `bun run --cwd web test:coverage` passed 173 tests in 12 files, root `bun run lint` was clean and `bun run build` succeeded. The full browser suite then passed 36 of 36 in 1.8 minutes, including `explorer.spec.ts`, with services stopped and fixtures removed. The storage-dependent backend suite was not rerun for this frontend-only change.
- Deployment and live evidence (2026-09-11):
  - **Relaunch:** the hosted instance was stopped through its `domain` tmux window and relaunched from the main checkout with a build of the sources committed as `be74405`. Its service processes exited and its route disappeared before the relaunch, while the unrelated `/design` route stayed. HTTPS `/api/health` returned 200 with service `merdeck`, and `/` and `/favicon.svg` returned 200.
  - **Desktop, light scheme:** in a real Chromium session against https://merdeck.example.test/ at 1440×900, opening `docs/overview.md` and choosing its second diagram showed no diagram tab bar and exactly one current row. That row, `02 Diagram 2`, was filled with `oklch(0.8842 0 0)` at weight 600, a contrast ratio of 1.352 against the sidebar. The open `overview.md` row was unfilled at weight 600, the expanded `docs` folder and every other row were unfilled at weight 400, and the file bar read "Diagram 2 · Markdown diagram".
  - **Dark scheme:** the selected row's contrast ratio was 1.302.
  - **Narrow screen:** at 390 px, choosing the first diagram from the file drawer closed the drawer, the file bar read "Diagram 1 · Markdown diagram", and the page did not overflow horizontally.
  - **Result:** the session logged out with no page or console errors. Screenshots are kept under the ignored `tmp/` directory.
