# 20260926-0818-phone-explorer-dark-preview Reset the file type on Up and give diagrams a stable paper palette

- **status**: completed
- **createdAt**: 2026-09-26 08:18
- **approvedAt**: 2026-09-26 08:26
- **relatedTask**: 20260926-0818-phone-explorer-dark-preview

## Context

The first owner screenshot circles the Up control in the phone project-files drawer while `.mmd` is selected. `web/src/features/workspace/file-tree.tsx` sends Up to `openDirectory(parentDirectory(directory))`, and `openDirectory` only browses. `kinds` is a persisted preference in `file-filter.ts`; a non-All kind keeps the recursive search view active after the parent changes. The existing result-folder branch already clears the query and chooses All before browsing, but Up and breadcrumb navigation do not.

The second screenshot shows `ai/mermaid/bkd-skill-flow.mmd` in dark mode. That source explicitly sets almost every subgraph to `#f8fafc` or `#ffffff`, pastel nodes, and dark text/borders. `renderer.ts` respects those author colours. Its other Mermaid colours come from the current UI theme, and `index.css` leaves the preview canvas on the dark UI background. The result places light authored groups and some dark author text/edges on black. The default Mermaid palette is already fed through CSS tokens, so the colour boundary is in one renderer function and the preview surface CSS.

The earlier mobile swipe report is tracked separately in `20260926-0812-mobile-drawer-touch-scroll`. A true touch swipe from a file row moved the local Chromium list by 265px at the pictured viewport size; iPhone/WebKit behavior and the reported gesture start area remain unresolved.

## Proposal

1. When Up is activated, call `chooseKinds('all')` before browsing the parent. Keep the file-type preference for ordinary file selection and unrelated workspace activity. Leave breadcrumbs and folder-row navigation as they are unless the owner's clarification asks for all directory moves to reset the type.
2. Treat the Mermaid preview as a light diagram sheet inside either UI theme. Give `.preview-surface` an opaque light paper background and a subtle edge to distinguish it from the dark surrounding chrome. Define diagram-specific paper, ink, line, node, and cluster tokens in `index.css` that stay light in `.dark`; feed those tokens to Mermaid's existing `themeVariables` in `renderer.ts`. Preserve every explicit `style` and `classDef` colour from the source, and keep the SVG sanitization and zoom/pan behavior unchanged.
3. Add a focused navigation regression: from `.mmd` recursive results, Up must show the parent directory's All listing and its other file types. Add a browser colour regression with a small light-styled subgraph: in dark UI the canvas is light, authored fills remain exact, and labels/lines remain readable; confirm light UI and theme changes too. Establish the failures before the implementation.

## Risks

- A light sheet in dark UI is visually deliberate but a choice; the owner may prefer automatic dark recolouring instead. An authored diagram with dark fills can still look different from a light-authored diagram. Rewriting authored styles would lose source fidelity and is excluded from this proposal.
- Freezing the Mermaid default palette to light means unstyled diagrams no longer recolour with the UI theme. This keeps one consistent diagram background and palette, but changes the existing theme-linked behavior. The browser check must include an unstyled diagram.
- Resetting only Up leaves breadcrumbs as a way to keep the selected type across directory moves. If the owner expects every directory navigation to return to All, the scope should change to the common `openDirectory` path before implementation.

## Scope

Frontend only: `file-tree.tsx`, `renderer.ts`, `index.css`, and focused frontend/browser tests. No backend, file content, persisted drafts, dependency, security boundary, or deployment mutation. This is a full PMA task because the repair spans explorer and preview modules and at least three files.

## Alternatives

- Auto-recolour explicit source colours in dark mode: could create an all-dark diagram, but changes the author's intended semantic palette, requires contrast work for every Mermaid element, and risks making exported/source colours diverge from the preview.
- Leave Mermaid theme-linked and recolour only the canvas: default Mermaid labels and lines would remain light against a light canvas, so the pictured inconsistency would become a different contrast failure.
- Reset file type on every folder and breadcrumb move: simpler to centralize in `openDirectory`, but broader than the specifically circled Up action.

## Annotations

- 2026-09-26: Owner supplied screenshots for Up/type reset and the dark-background mismatch. Light paper was recommended because the pictured source explicitly authors a light palette.
- 2026-09-26 08:26: Owner approved the proposal with "continue" and deferred the earlier mobile swipe report. Implement the Up reset and light paper treatment; leave swipe behavior for its separate task.
- 2026-09-26 08:34: Implemented and verified the Up reset and a stable light palette for Mermaid previews, including inline Markdown diagrams. Both focused browser tests failed before the changes and passed afterward; 17 related browser tests, 579 frontend unit tests, lint/typecheck, and build passed. Full clean-source CI follows the local commit.
