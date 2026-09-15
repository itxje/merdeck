# 20260915-0924-split-angle-marker Restore split encoded-angle markers safely

- **status**: completed
- **createdAt**: 2026-09-15 09:24
- **approvedAt**: 2026-09-15 (explicit implementation authorization in the request)
- **relatedTask**: 20260915-0924-split-angle-marker

## Context

The integrated candidate `8e0a389a508bfa52eb0bcd5305fa32694ba4e7c5` failed native Linux x64 executable browser smoke in GitHub Actions run 34951414554. The existing text-node restorer only replaces a complete marker inside one Text node. Mermaid's generated SVG can split a label marker across adjacent or nested `tspan` text nodes; the final SVG's aggregate text then contains the marker while no individual node does.

## Proposal

Keep validation and Mermaid projection unchanged. Use source-specific collision-free private markers. Collect generated Text nodes, identify each accepted marker against their concatenated text, and restore from right to left across the affected Text.data ranges while retaining all element and attribute structure. Add deterministic split/nested, multi-marker, collision and existing-boundary regressions plus production browser repetitions.

## Risks

Changing SVG text must never become markup. The algorithm mutates Text.data only, does not call `innerHTML`, and runs before the existing sanitizer. Range bookkeeping across node boundaries is the main correctness risk; focused tests cover it.

## Scope

Preview source policy/renderer tests, production browser regression, PMA evidence and changelog. No dependency, API, sanitizer, CSP or admission-grammar expansion.

## Alternatives

- Rely on another native retry: rejected because the exact hosted failure is deterministic evidence of a structural compatibility gap.
- Decode entities or render raw tags: rejected because both weaken the HTML trust boundary.

## Implementation record

The repair keeps the original validation, render projection, Mermaid invocation, sanitizer and mounting path. It restores only complete accepted private markers discovered within one generated SVG text label, including markers split across adjacent or nested Text nodes. Source-specific marker selection rejects collisions with literal marker-like input without decoding or interpreting it. Focused policy/renderer/boundary tests, full frontend coverage, root `bun run check`, and three compiled-browser production repetitions passed. The local machine is ARM64; hosted Linux x64/native acceptance remains required before release.
