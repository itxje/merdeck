# 20260915-0924-split-angle-marker Restore split encoded-angle markers safely

- **status**: completed
- **priority**: P0
- **owner**: root/split-angle-marker
- **createdAt**: 2026-09-15 09:24

## Description

Repair the release-blocking compiled Linux x64 browser failure where Mermaid splits the private encoded-angle placeholder marker across generated SVG text nodes and the preview leaves it visible. Preserve the narrow source admission and all render, sanitizer, persistence and browser safety contracts.

## ActiveForm

Restoring split encoded-angle markers safely.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation: hosted Linux x64/native run 34951414554 attempt 1 at candidate `8e0a389a508bfa52eb0bcd5305fa32694ba4e7c5` failed `renderer-flowchart.spec.ts:129`; aggregate SVG text retained `\uE000merdeck-angle-p7\uE001`. The prior restorer only calls `replaceAll` per Text node. A marker divided across adjacent/nested `tspan` Text nodes is visible in aggregate text but absent from every individual node, proving the platform-dependent failure mechanism.
- Proposal: preserve generated SVG element structure and replace accepted markers through explicit ranges spanning adjacent Text nodes, in descending order. Derive markers deterministically from source and select a candidate absent from that exact source, so marker-like source text cannot collide silently. Continue to restore only Text.data, never markup or attributes.
- Risks: cross-node mutation can alter SVG layout if it removes neighboring content. Focused tests will assert split/nested structures, multiple placeholders, collision avoidance and unchanged unsafe-source refusals; browser tests retain bytes and no-execution/network guarantees.
- Authorization: the owner explicitly authorized repair implementation in the request on 2026-09-15.
- RED: the hosted executable's aggregate SVG text contained the whole private token, while the prior per-Text-node `replaceAll` can only remove a complete token from one node. Therefore the hosted renderer had split the token across Text nodes. A deterministic unit reproduction divided both accepted markers across adjacent and nested `tspan` nodes; the former implementation left the token visible.
- GREEN/IMPROVE: restoration now groups Text nodes by each rendered SVG `text` label, finds each accepted source-specific marker across that label's concatenated node data, and applies replacements right-to-left. It mutates only `Text.data`; the marker is selected deterministically with a source-absence suffix, so a marker-like source token stays literal rather than colliding.
- Verification: pinned Bun 1.4.2; focused renderer/policy/boundary tests passed 275 tests; frontend coverage passed 528 tests (93.56% statements, 89.41% branches, 93.73% lines); `bun run check` passed with supported `/tmp` overlay and refused `/dev/shm` tmpfs fixtures (the existing unrelated `document-view.tsx:329` lint warning remains); the production compiled-browser exact-source case passed three repetitions, with visible `mica-board-<board>`, unchanged request/disk/reload bytes, and zero unexpected network requests, errors, scripts or event execution.
- Review: incremental shared-policy and TypeScript frontend review found no CRITICAL or HIGH findings. The text-label grouping prevents accidental matching across independent labels; no admission, sanitizer, resource, persistence or mounting behavior changed.
- External gate: this environment is Linux ARM64, so it cannot establish the required Linux x64/native executable result. Re-run the hosted native acceptance at the new commit before release.

- complete: Focused, frontend, root and production-browser checks passed; Linux x64 native acceptance remains external.
