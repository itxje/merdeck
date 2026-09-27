# PLAN-009 Support bounded ordinary flowchart syntax

- **status**: completed
- **createdAt**: 2026-09-08
- **approvedAt**: 2026-09-08 (existing explicit regression-continuation authorization; day-level precision)
- **relatedTask**: RENDER-002

## Investigation

Frontend maintainer claimed RENDER-002 before investigation. The exact authorized local baseline is `67cb4914bab62a005869cf36438fc0a99fc0284e`; prior acceptance and failure records remain historical. The new original input is 2,614 UTF-8 bytes including its terminal newline, SHA-256 `44c8ffecb9956bda1e85313875d52c616a24d56c0609a61655302f99807faad3`. Supplied read-only evidence establishes current application rejection without writes and successful installed-renderer control, not corrected-application acceptance. The original has 24 nodes and four groups. Its unusual thick labeled arrow is accepted by installed Mermaid 11.17.2 and must remain unchanged.

The current guard rejects all less-than and ampersand characters after bare-break masking, plus all classDef/style keywords. Thus ordinary quoted comparison text, fan-out and class definitions cannot reach Mermaid. The existing private measurement pipeline extracts computed presentation attributes before removing styles from final SVG. Installed FlowDB.addClass splits comma-separated style declarations, getCompiledStyles supplies shape styles, and createCssStyles inserts selectors/declarations into CSSStyleSheet before final sanitization. Any newly permitted styles therefore require validation before mermaid.render, including identifiers and the entire value, rather than post-render filtering alone.

Primary references: [flowchart quoted text, fan-out, classes and traditional breaks](https://mermaid.js.org/syntax/flowchart.html), [trusted initialization and strict security](https://mermaid.js.org/config/usage.html). These references and the installed parser confirm the intended grammar; browser regression must verify final application geometry and presentation.

## Proposal

Introduce a small typed source-policy helper. Keep original length and global active-content/resource/configuration checks. For flowcharts only, distinguish quoted text and complete statement boundaries, allow literal comparison operators in quoted text and normal fan-out, and validate complete classDef/class statements. Restrict class/target identifiers to ASCII identifier lists. Permit only fill/stroke hex colors (three or six digits), stroke-width bounded pixel numbers, and bounded space-separated stroke-dasharray numbers. Reject unknown properties, selectors, trailing tokens, encoded/escaped values and resource syntax before Mermaid or measurement DOM is invoked. Retain conservative limitations for other diagram families. Preserve canonical bare-break rendering, strict configuration, SVG sanitizers, computed presentation extraction, limits and render queue behavior. No editor/request/disk transformation.

Generate an ASCII-source Unicode-escaped fixture directly from the exact original file and prove decoded byte/hash identity. First retain a failing unit regression and real built-service browser failure on the old guard. Then implement the policy and focused ordinary/adversarial tests. Browser checks must cover exact nodes/groups, complete labels and line geometry, fan-out/thick edges and all defined class presentation, unchanged drafts and standalone/individual Markdown saves including unrelated bytes, responsive preview, no active DOM or unexpected network/runtime effects. Preserve the earlier original-break and drawer regressions.

Review the scoped change using core/frontend security guidance. Run focused lint/types/tests/build and built-service browsers, then commit implementation and run both frozen installs and the entire prescribed check:ci AND-list at that clean SHA with verified local pins, actual supported/refusal fixture parents and executable browser discovery. Retain immediate exits, screenshots, hashes/provenance and cleanup evidence. Evidence-only documentation may follow without repeating unchanged gates. Local ARM64/overlay does not establish native, remote or live acceptance.

## Authorization and boundaries

The user's explicit 2026-09-08 continuation authorizes this proposal and implementation; no additional approval event is invented. Scope is preview policy/pipeline/tests, new fixtures/browser regressions, concise relevant support documentation and this task/plan with only their own appended index rows. No dependency, backend, workspace state, global layout, deployment, prototype or other active-task changes. Final integration and hosted acceptance remain separate.

## Outcome

Implemented the bounded helper and immutable original escaped fixture, focused policy/queue regressions and three real browser cases. Old-guard unit and browser failures were retained before implementation. Review additionally found and resolved a comment-tail masking gap; its validator-only failure and the first complete gate remain historical. No remaining actionable findings after the correction.

Final clean implementation `78e24e322392d91a371f05e5b2f46f0d31a68aa2` passed the complete frozen/check:ci/whitespace AND-list (immediate exit 0), including 135 frontend tests, 30 actual executable browser cases, 93 embedded resources, four lazy families and tracing/cleanup. Actual original-source geometry, styles and standalone/individual Markdown byte preservation passed. Final screenshots were inspected. Detailed failures, counts, coverage, hashes and local tool/storage observations are recorded in RENDER-002; subsequent evidence-only documentation does not change tested binary provenance.

The deliverable is complete for local integration review. ARM64/overlay verification does not establish native/remote/live acceptance. No other active-task, backend, dependency, workspace-state, deployment or prototype changes were made; prior index bytes and history remain preserved.

The subsequent read-only user visual reference corroborates the preserved groups, palette, stroke/dash distinctions, comparisons and fan-out. Its external renderer version/configuration and pixel identity remain unverified. RENDER-002 records its digest and the precise future `/api/build` request-list allowance needed in both original-source browser specs when deployment identity is integrated. This adds evidence and an integration constraint only; source, tests, authorization, completed status and tested-binary provenance are unchanged.
