# 20260915-0516-encoded-angle-placeholder Render encoded angle placeholders safely

- **status**: completed
- **createdAt**: 2026-09-15 05:16
- **approvedAt**: 2026-09-15 (explicit implementation authorization in the request)
- **relatedTask**: 20260915-0516-encoded-angle-placeholder

## Context

The supplied flowchart is rejected by the source-policy entity boundary before Mermaid sees it. Its only entity is `&lt;board&gt;` in a quoted flowchart label. Existing raw `<board>` placeholder validation already rejects element names and custom-element-like names, but accepts an inert identifier placeholder.

## Proposal

Introduce a private render projection that recognizes only complete lowercase ASCII identifier tokens encoded exactly as `&lt;name&gt;`, checks the resulting placeholder through the existing inert-placeholder predicate, and gives Mermaid the raw inert placeholder. Source validation masks only recognized tokens while evaluating the existing boundary. The editor, drafts, requests and persistence retain the original bytes. Add exact-source policy/render tests, refusal neighbors, and a browser save/render case with request and execution assertions.

## Risks

Entity decoding may turn text into markup. The grammar excludes element/custom-element names, attributes, whitespace, nested or malformed entities, numeric entities, mixed case, double encodings and all non-allowlisted named entities. The existing strict Mermaid settings and SVG sanitizer remain unchanged.

## Scope

The preview source policy and focused unit/browser regressions; PMA task/plan/changelog records. No dependency, server API, sanitizer, or CSP change.

## Alternatives

- Require source rewriting: rejected because it violates the requested byte preservation.
- Decode general entities: rejected because it expands the HTML/URL injection surface.

## Implementation record

The exact supplied source now renders through a private Mermaid marker and text-node-only SVG restoration. The original entity remains untouched outside the render projection. Focused policy, renderer and browser regressions cover the exact source, rejected neighbors, visible text, sanitized output, no outbound requests or event execution, and exact save/reload bytes. Pinned Bun frontend coverage, lint, typecheck and build passed; root `bun run check` passed on explicit supported/refused local fixtures. Incremental shared and TypeScript frontend review found no actionable findings.

Hosted Linux x64/native executable smoke later found that Mermaid can split a private marker across generated SVG text nodes, defeating the original per-node replacement. The correction is tracked under 20260915-0924-split-angle-marker; this record remains the completed original narrow-admission repair.
