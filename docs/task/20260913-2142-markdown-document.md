# 20260913-2142-markdown-document Render whole Markdown documents

- **status**: in_progress
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
- Frontend coverage: the current root gate's `vitest run --coverage` — 25 files / 522 tests passed; backend `bun test --coverage` also passed as part of that gate.
- Production Chromium: `bun scripts/test-e2e.ts` — 70 passed, 1 intentionally skipped performance-gated case, audit reported zero unexpected errors. The focused complete Markdown case was run twice before the aggregate. It covers desktop and 390 px layouts, light/dark themes, prose/table rendering, two arrowheaded diagrams, no active raw HTML or image/request, guarded project/unsafe links, selection/reveal, and exact BOM/CRLF byte-preserving block save/reload. Existing `.mmd` and `.mermaid` behavior remains in the aggregate suite.
- Repository gate: `bun run check` — exit 0 (`tmp/markdown-root-check.log`); `git diff --check` — clean.

### Chromium performance

`MERDECK_TEST_PERFORMANCE=true MERDECK_TEST_MAX_FILE_BYTES=2097152 bun scripts/test-e2e.ts markdown-performance.spec.ts` produced `tmp/markdown-document-performance.json` against the production build and local same-origin service. Four samples were taken per corpus. The Markdown corpus is exactly 1,048,576 bytes; the second corpus has 100 selectable Mermaid fences.

- After the decoded-text chunk correction, the 1 MiB rerun recorded Worker parse 262.6 ms in its representative sample (off-thread), API completion median/p95/worst 313.1/332.3/332.3 ms, document readiness 619.8/650.6/650.6 ms, main-thread Long Task 0/0/0 ms and request-animation-frame heartbeat 19.6/20.3/20.3 ms.
- The 100-diagram rerun recorded API completion median/p95/worst 102.7/157.2/157.2 ms, document readiness 279.3/331.3/331.3 ms, main-thread Long Task 0/0/0 ms and heartbeat 32.8/39.6/39.6 ms. The test asserts fewer than 100 inline SVGs render before scrolling, proving viewport deferral.

The prior 220–337 ms main-thread samples were attributed to a production Worker startup failure (`document is not defined`) that invoked the intentional synchronous fallback. The Vite worker resolution now uses the parser's non-DOM entry; the Worker parse may take longer than 100 ms off-thread, while the acceptance metric — largest main-thread input delay — is below the approximately 100 ms threshold.

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

Incremental shared, TypeScript frontend and TypeScript backend review found no remaining CRITICAL/HIGH findings after the documented corrections. Security tests cover literal raw HTML/comments, inert images, URL classes and no resource requests; accessibility tests cover independent diagram-selection controls and SVG file links; transport and browser cases cover same-revision text, Markdown-without-diagrams, byte preservation, responsive/theme behavior and standalone Mermaid regression.

The task and plan remain **in progress** deliberately: actual Linux x64/ext4 native `bun run check:ci --native` acceptance remains a post-integration release gate. Local overlayfs admission verifies supported/refused behavior but is not a substitute. This is the sole external gate; the `[-]` markers in both indexes therefore correctly mean active release acceptance, not missing local Markdown evidence.
