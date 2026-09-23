# 20260913-2142-markdown-document Render whole Markdown documents

- **status**: completed
- **priority**: P2
- **owner**: markdown-document-20260915
- **createdAt**: 2026-09-13 21:42

## Description

Opening a Markdown file shows only its Mermaid diagrams, one at a time, and a Markdown file without a selectable diagram shows an empty state. The owner asked for the whole document to render. Acceptance, as proposed in [the plan](../plan/20260913-2142-markdown-document.md): Markdown documents render read-only with their diagrams in place while per-block editing and saving stay unchanged; the document API carries the complete text of Markdown files; prose becomes React elements without any HTML built from file content; links follow an allowlist and project documents open in the workspace; images and raw HTML are neither loaded nor rendered; the single-diagram canvas remains available; and the evidence listed in the plan is produced.

## ActiveForm

Rendering whole Markdown documents.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-13): the service parses Markdown only to locate top-level Mermaid fences and never returns the complete text; README and the architecture state that surrounding Markdown is never rendered; the web application has no Markdown renderer, although the needed parser packages are already in its lockfile; the preview is a single-diagram canvas keyed by file and block. Details are in the plan's context.
- Approval: recorded in [the plan](../plan/20260913-2142-markdown-document.md) on 2026-09-15; implementation and acceptance evidence remain in progress.

- Reopened (2026-09-15): quality assessment requires complete local browser, component-security and performance evidence before completion.

## Implementation and acceptance evidence

The implementation is delivered through `7312cb6` after the preceding Markdown document commits. Markdown responses carry their same-revision, BOM-free complete text; Mermaid responses intentionally have no `text`. The client parses Markdown in a same-origin module Worker and constructs React elements only. Raw HTML remains text, images remain placeholders, document/file links use the guarded navigation path, and inline Mermaid keeps the existing constrained renderer and sanitizer boundary. Per-block selectors, drafts, conflict handling, BOM/CRLF conventions and unrelated bytes remain unchanged.

### Local verification (2026-09-15)

All commands used Bun `1.4.2` first on `PATH`, Node `v24.20.0`, the project tmux session, supported overlay fixtures `MERDECK_TEST_FIXTURE_PARENT=/tmp/merdeck-browser-parent` and `MERDECK_TEST_EXPECTED_FS=0x794c7630`, and refused tmpfs fixtures `MERDECK_TEST_UNSUPPORTED_PARENT=/dev/shm` and `MERDECK_TEST_UNSUPPORTED_FS=0x1021994`.

- Focused component/workspace tests: `cd web && bunx vitest run src/features/document/document-view.test.tsx src/features/workspace/workspace.test.tsx` — 39/39 passed.
- Frontend lint/typecheck/build: `cd web && bun run lint && bun run typecheck && bun run build` — passed. The sole lint warning is the established `dangerouslySetInnerHTML` warning at the separately sanitized Mermaid-SVG boundary.
- Recovery verification: `bun install --frozen-lockfile && cd web && bun install --frozen-lockfile && bun ./node_modules/vitest/vitest.mjs run --no-coverage src/features/document/document-view.test.tsx && bun run lint && bun run typecheck && bun run build && git -C .. diff --check` — passed with Bun 1.4.2 and Node v24.20.0; the focused document suite was 33/33 and the only lint warning was the established sanitized-SVG boundary.
- Frontend coverage: the current root gate's `vitest run --coverage` — 25 files / 522 tests passed; backend `bun test --coverage` also passed as part of that gate.
- Production Chromium: `bun scripts/test-e2e.ts` — 70 passed, 1 intentionally skipped performance-gated case, audit reported zero unexpected errors. The focused complete Markdown case was run twice before the aggregate. It covers desktop and 390 px layouts, light/dark themes, prose/table rendering, two arrowheaded diagrams, no active raw HTML or image/request, guarded project/unsafe links, selection/reveal, and exact BOM/CRLF byte-preserving block save/reload. Existing `.mmd` and `.mermaid` behavior remains in the aggregate suite.
- Repository gate: `bun run check` — exit 0 (`tmp/markdown-root-check.log`); `git diff --check` — clean.

### Chromium performance

The fresh production command was `MERDECK_TEST_PERFORMANCE=true MERDECK_TEST_MAX_FILE_BYTES=1200000 bun scripts/test-e2e.ts markdown-performance.spec.ts`. It produced `tmp/markdown-document-performance.json` against the built SPA and a local same-origin service using the explicit overlay/tmpfs fixtures above. Four samples were taken per corpus. The Markdown corpus is exactly 1,048,576 bytes and has an exact decoded paragraph length of 1,048,554 characters; the second corpus has 100 selectable Mermaid fences.

Before the four-sample run, `MERDECK_TEST_PERFORMANCE_SAMPLES=1` ran the same production case with a 30-second test bound. It passed in 2.9 seconds and required both `[data-document-text-complete]` and exact `<p>` text (including `MERDECK_COMPLETE_DOCUMENT_TAIL`), proving that the measurement does not treat the leading heading as complete materialization.

- For 1 MiB Markdown, API completion median/p95/worst was 308.4/342.8/342.8 ms; first visible content was 613.9/648.9/648.9 ms; fully materialized decoded paragraph was 1756.0/1775.0/1775.0 ms. Worker parse wall-clock samples were 229.5, 244.6, 211.1 and 204.0 ms off the main thread. Main-thread Long Task median/p95/worst was 0/0/0 ms and request-animation-frame heartbeat was 62.7/67.9/67.9 ms.
- For 100 diagrams, API completion was 98.5/150.7/150.7 ms; first selected drawing was 269.5/336.7/336.7 ms; document readiness was 292.6/340.8/340.8 ms; Worker parse samples were 7.8, 7.8, 7.3 and 7.6 ms; Long Task was 0/0/0 ms and heartbeat was 32.5/41.0/41.0 ms. The samples mounted 2, 4, 4 and 4 inline SVGs before scrolling, below 100 and therefore prove viewport deferral.

The prior 220–337 ms main-thread samples came from a production Worker startup failure (`document is not defined`) that invoked the intentional synchronous fallback. `decode-named-character-reference` is now a declared exact dependency and Vite aliases only that parser dependency to its non-DOM entry; global export conditions are unchanged. The new production run has no `worker-fallback` or `worker-runtime-error` stage and decodes the named `&amp;` reference in the complete paragraph, proving the Worker path rather than fallback. The Worker can take longer than 100 ms wall-clock off-thread; the acceptance metric is the largest main-thread input delay, which passes the approximately 100 ms threshold.

Deferred text is carried as bounded chunks of the already decoded MDAST `value`, never reconstructed from raw source offsets. The focused regression uses a >4096-character text node with named and numeric character references plus a backslash escape and verifies decoded rendered output without raw `&amp;` or `\\*` leakage.

The final boundary rerun also verifies that a zero-block Markdown file removes the mobile Source control and editor even when the prior file left that pane selected. Deferred chunks keep astral Unicode code points intact at a 4096-code-unit boundary. Focused document/text/workspace tests passed 43/43; the production performance rerun passed, and the complete production Chromium suite passed 70 tests with 1 intentionally performance-gated skip and zero audit errors (`tmp/markdown-full-boundaries.log`).

### Reproducible size comparison

The integration base `da21051a51e6cd968a4d5f858c0c636d5c63a9e9` was checked out detached at `/tmp/merdeck-markdown-size-base` with the current locked dependencies. Both base and `7312cb6` used Bun 1.4.2, `bun run build`, then `compile('v0.0.0', 'bun-linux-x64', { output: 'tmp/size-{base,head}', built: true })` from their required tmux sessions. Measured raw bytes:

| Artifact | Base | Head | Delta |
| --- | ---: | ---: | ---: |
| `web/dist` total files | 4,076,421 | 4,325,498 | +249,077 |
| primary SPA JavaScript | 801,084 | 935,362 | +134,278 |
| primary SPA CSS | 71,055 | 72,547 | +1,492 |
| module Worker asset | 0 | 113,188 | +113,188 |
| root server bundle `dist/index.js` | 290,406 | 290,473 | +67 |
| `bun-linux-x64` standalone executable | 85,710,304 | 85,956,064 | +245,760 |

### Review and remaining gate

Incremental shared, TypeScript frontend and TypeScript backend review found no remaining CRITICAL/HIGH findings after the documented corrections, including the final Worker-resolution, complete-materialization and dependency-resolution diff. Security tests cover literal raw HTML/comments, inert images, URL classes and no resource requests; accessibility tests cover independent diagram-selection controls and SVG file links; transport and browser cases cover same-revision text, Markdown-without-diagrams, byte preservation, responsive/theme behavior and standalone Mermaid regression.

The task and plan remain **in progress** deliberately: actual Linux x64/ext4 native `bun run check:ci --native` acceptance remains a post-integration release gate. Local overlayfs admission verifies supported/refused behavior but is not a substitute. This is the sole external gate; the `[-]` markers in both indexes therefore correctly mean active release acceptance, not missing local Markdown evidence.
- Closed (2026-09-23): the remaining external gate passed. Release `v0.12.0` resolves to `e20b6b05f7c9bcfbf44c955999669e379514119b`, its tag workflow [run 35008093035](https://github.com/itxje/merdeck/actions/runs/35008093035) repeated the hosted Linux x64/ext4 native acceptance and succeeded, and the release was published on 2026-09-15 with `merdeck.tar.gz` and `SHA256SUMS`.
