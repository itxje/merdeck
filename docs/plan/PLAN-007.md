# PLAN-007 Preserve ordinary Mermaid label line breaks

- **status**: completed
- **createdAt**: 2026-09-08
- **approvedAt**: 2026-09-08 (existing explicit bug-correction authorization; day-level precision)
- **relatedTask**: RENDER-001

## Context

The accepted source is `881dbe259cc30a507dec2c43b75425e9df25d9aa`, synchronized from the exact authorized local ref with retained history. RENDER-001 is claimed by Frontend maintainer. Existing completion, retry, native and prototype records are preserved; they do not accept this new correction.

The caller passes memory-only draft source to Preview, which debounces and serializes renderDiagram calls, ignores stale responses, retains the previous valid SVG on failure, and handles fit/zoom. renderer.ts rejects every less-than character before calling Mermaid. The exact supplied UTF-8 input has 16 nodes and six ordinary break tags, SHA-256 `0d95ee02341f7fa2e0b80abcf76bc5654ef7662d248c0e6cb30ac1ff73d3aeec`. Supplied original-failure/space-control evidence is retained read-only; it proves the defect, not a fix. The fixture will be generated from those actual bytes using Unicode escapes, without transcribing source into documentation.

The installed Mermaid 11.17.2 source sanitizes labels, converts bare break tokens into structured lines and emits SVG tspans when htmlLabels=false. A direct real Chromium HTTP probe using strict mode and disabled HTML labels rendered all 16 original nodes. The probed two-line label has two SVG rows at distinct vertical positions (approximately 17.6 px apart), with no literal break token. A first probe used an outdated node-ID selector and returned no geometry; that incomplete observation is retained separately. The corrected selector confirms ordinary support without relaxing Mermaid configuration.

Primary references: [traditional flowchart strings](https://mermaid.js.org/syntax/flowchart.html#markdown-strings) document break tags; [usage and strict security](https://mermaid.js.org/config/usage.html) document the host security boundary. Actual installed behavior, including application sanitization, must still pass the regression.

Project-local Bun 1.4.2 and actual Node v24.20.0 are verified. Both frozen installs passed. Project-local browser, digest-verified actionlint 1.7.12 and distribution-digest-verified strace 6.13 are installed without changing global tools. Explicit exclusively owned fixture parents were observed on overlayfs `0x794c7630`, device `70`, and separate host-shared storage `0x6a656a63`, device `41`.

## Proposal

1. Add a single exact, case-insensitive bare-break recognizer for `<br>`, `<br/>` and `<br />`. Validate the entire original-length input with only these tokens masked as spaces; retain every other global restriction. Canonicalize those tokens to `<br/>` only in the private Mermaid call. No editor, draft, API, or saved-byte transformation.
2. Add focused tests for all permitted spellings, exact source identity, adjacent attribute-bearing/malformed/encoded hostile forms, limits, trusted renderer settings and immutable queue input. Retain existing sanitizer and stale/recovery controls.
3. Add a browser regression using the original escaped Unicode fixture: all 16 nodes, all branch labels, all intended rows with real separated SVG geometry, no literal tags or active/resource DOM, zero unexpected network/page errors, zero implicit PUTs, unchanged draft, and exact explicit save/request/read bytes on an exclusively owned disposable file. Exercise desktop and narrow panes. Add a small variant/hostile browser control.
4. First retain failing regression evidence against unchanged renderer behavior. Then apply the correction, run focused checks, review the scoped diff, and run the complete prescribed frozen-install/check:ci/whitespace AND-list in the owned tmux session, including actual embedded executable, every asset and the discovered browser suite. Keep unchanged coverage thresholds and all existing cases.
5. Record concrete results and remaining acceptance limits in the task/plan and concise support/security documentation. Commit clean scoped work and hand it off for review; hosted/live acceptance and final integration remain separate.

## Risks

Permissive HTML matching could broaden the trust boundary. The recognizer therefore accepts no attributes, encoded forms, malformed tags, arbitrary whitespace, or other HTML. Masking uses a space, avoiding concatenation of forbidden keywords; validation remains global and length checks use the original input. Canonicalization preserves traditional label boundaries and uses neither directives nor Markdown conversion. Strict configuration, output sanitization and callback avoidance stay unchanged. The browser must verify real row geometry because a successful SVG alone can hide literal or flattened labels.

## Scope

Only the renderer and focused preview tests, one focused browser spec and escaped fixture under web/src/test, RENDER-001/PLAN-007 with their own appended index rows, and concise preview support/security wording in README/architecture/changelog. No dependency, backend, deployment, design, native admission, release or historical tracking edits.

## Alternatives

Removing breaks, translating labels, changing saved source, enabling HTML labels or lowering security are unacceptable. A newline conversion is unnecessary: the installed strict SVG renderer already supports canonical bare break tags. Preserve its ordinary syntax rather than introducing a label parser or Markdown rewrite.

## Annotations

Implementation proceeds under the user's existing explicit 2026-09-08 correction authorization after this investigation/proposal record. No new approval time or event is inferred. The inherited base-nova layout, semantic colors, source/tree/preview hierarchy and narrow tabs remain unchanged. The standalone prototype remains needs-review. Historical x64/ext4 and remote results do not establish acceptance of this correction; this environment supplies ARM64/overlay evidence only.

## Implemented outcome

The bounded correction and fresh local verification are complete; exact results and retained failed attempts are recorded in [RENDER-001](../task/RENDER-001.md). The prescribed full AND-list passed at clean implementation `718757a5a4f427f00bb77a5c75354f70c220aa40`: unchanged frozen dependencies, backend/frontend gates and thresholds, actual ARM64 executable, 93 embedded assets and all 26 browser cases. The original 991-byte input retains 16 nodes, 7 branch labels and six intended breaks; draft/request/saved bytes stay equal. Scoped review found no actionable issues. Only evidence/status documentation follows that tested implementation commit.

This closes the bounded local implementation, not final integration or fresh hosted/live acceptance. Actual new x64/ext4 and live HTTPS original-source/saved-byte proof remain separate. Historical evidence and prototype needs-review status are unchanged. Owned fixtures/services/credentials were cleaned; shared services and user files were untouched. The original day-level authorization is preserved.
