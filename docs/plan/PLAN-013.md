# PLAN-013 Edit flowchart node labels from the preview

- **status**: completed
- **createdAt**: 2026-09-10 16:58
- **approvedAt**: 2026-09-10 (explicit owner `proceed` on the recommended flowchart label scope, implemented directly on the main checkout)
- **relatedTask**: EDIT-001

## Context

On 2026-09-10 the project owner asked for two-way editing between the source editor and the preview. Mermaid renders from text and computes layout on every render, and it provides no mapping from SVG elements back to source ranges. The sanitised preview keeps flowchart node group ids of the form `diagram-<n>-flowchart-<nodeId>-<counter>`, which identifies a node but not where it is written. Edits must stay inside the existing draft, conflict and save flow and must not weaken the renderer's security boundary.

## Proposal

1. Add `web/src/features/preview/flowchart-labels.ts`: a bounded scanner over flowchart source, reusing the statement, quote and comment boundaries of `source-policy.ts`, that finds each node's first labelled definition (`id[...]`, `id(...)`, `id{...}`, `id((...))`, `id([...])`, `id[[...]]`, `id[(...)]`, `id{{...}}`, `id>...]`, `id[/.../]`, with plain or quoted text) and returns its label range. A pure rewrite function replaces only that range, quotes the text when it contains bracket or quote characters, and refuses text the preview policy would refuse.
2. In `preview.tsx`, resolve a clicked or double-clicked `g.node` to its source node id from the sanitised element id. Double-click opens an inline input over the node with the current label; Enter or leaving the field applies it and Escape cancels. A single click reports the definition range so the workspace can select it in the source textarea.
3. In `workspace.tsx`, pass a callback that dispatches the ordinary `edit` action, and disable on-diagram editing whenever the source editor is read-only.
4. A node written without a label (`A --> B`) gains a bracketed label at its first occurrence. Other diagram types, subgraph titles and edge labels stay read-only in this slice and show a short hint.
5. Cover the scanner and rewrite with unit tests (shapes, quotes, fan-out `&`, `:::class`, comments, repeated definitions, refused text) and the interaction with component tests, add one browser case, and verify on the live instance.

## Risks

A hand-written scanner can disagree with Mermaid's grammar and rewrite the wrong text; mitigated by editing only definitions whose rendered node id matches, refusing ambiguous cases, and letting the rewritten source pass through the existing validation and render path like any typed edit. An inline editor over a transformed SVG must follow zoom and scroll; mitigated by positioning it from the node's client rectangle and closing it on zoom, pan or re-render. Interaction with sanitised markup must not reintroduce active content; the editor is a React input outside the SVG and never writes markup.

## Scope

Frontend only: the new scanner module and its tests, `preview.tsx`, `workspace.tsx`, `web/src/index.css`, one browser test, README usage text, `docs/architecture.md`, a changelog entry, this plan and EDIT-001. Out of scope: structural edits (adding, deleting or connecting nodes), dragging nodes to new positions, edge labels, subgraph titles, non-flowchart diagrams, backend or storage changes, new dependencies and the prototype.

## Alternatives

Structural editing (adding, deleting and connecting nodes) needs a full flowchart model and a serializer that preserves comments and formatting; it is larger and riskier and is better decided once label editing is in use. A one-way "locate in source" on click is the cheapest option and is already part of step 2. Replacing Mermaid rendering with a graph-editor library would abandon the file-first text model and is rejected.

## Implementation record

Step 1 changed approach during implementation: rather than a hand-written scanner that mirrors Mermaid's grammar, the label sites come from Mermaid's own flowchart lexer, reached through the parser that `mermaid.mermaidAPI.getDiagramFromText` returns, with whole-line comments blanked so offsets stay aligned. That removes the grammar-disagreement risk named above for locating labels; the post-edit parse comparison remains as the safety check. The module is `web/src/features/preview/flowchart-labels.ts`, and the Mermaid-dependent parsing, tokenizing, inspection and edit verification live in `renderer.ts` inside the existing serialized render queue. Steps 2 to 5 were implemented as proposed; additionally, panning now starts only after 4 px of pointer travel so that clicks and double-clicks reach nodes. [EDIT-001](../task/EDIT-001.md) records the details and the verification evidence.
