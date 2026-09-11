# DESIGN-001 Create the interface prototype

- **status**: completed
- **priority**: P1
- **owner**: Interface designer
- **createdAt**: 2026-09-07 17:42
- **completedAt**: 2026-09-07 18:31

## Description

Create a TypeScript-authored, bundled self-contained HTML prototype in `designs/diagramdock/`. Carry the required shadcn/ui base-nova, Base UI and Tailwind visual language into a restrained file-tree/source-editor/diagram-preview tool. Include responsive layouts, light/dark/system themes, block selection, zoom/fit, save and error states, and representative realistic diagram content.

Read the full design methodology, matching preview/tool reference, high-fidelity and interactive prototype references, and design-system consumption/asset recording instructions. Keep copied assets and metadata self-contained. Metadata uses `needs-review` and `designSystems: []` unless a real packaged manifest is imported. Document visual defaults as assumptions; no user-approved design is implied.

## ActiveForm

Creating the interface prototype

## Dependencies

- **blocked by**: STACK-001
- **blocks**: FILE-001

## Notes

- Claim before investigation, re-read index/detail, and persist investigation/proposal here. Existing authorization covers routine layout defaults. Use the [plan](../plan/PLAN-001.md) and [architecture](../architecture.md) as the product brief.
- Proposed layout: compact header, approximately 240 px tree, balanced source and preview, system controls and monospace source, neutral surfaces and muted accent. Medium screens collapse the tree; narrow screens use a drawer and source/preview tabs. These are assumptions.
- Required states: loading, empty project, no selection, no Mermaid block, invalid source, saved/dirty/saving, conflict, external change, deletion, auth error and disconnected events. Distinguish interactive prototype behavior from backend behavior.
- Planned checks: run the actual TypeScript-to-HTML build command, validate asset metadata using the design reference's supported checker, inspect local asset paths, serve through a named tmux session, and verify the actual route with `nsl get diagramdock-design` and `curl -fsS <verified-url>`.
- Browser evidence must cover desktop/narrow layouts, themes, focus/keyboard behavior, no unexpected console errors and working prototype controls. Record actual viewport sizes, URL, reachability and results here; place temporary screenshots under `tmp/`.
- The app must later reuse the design's hierarchy, tokens and interaction states. At investigation start, no prototype or preview existed.

### Investigation

- Claimed the task and re-read its index/detail before substantive work. The foundation provides CLI-owned Button, Textarea, Tabs, Dialog, Input, Tooltip and other Base UI controls, semantic light/dark tokens, and a theme provider. There is no existing `designs/` directory or packaged design-system manifest.
- Read the complete design methodology and the high-fidelity, interactive, system-consumption, standalone-export and environment references. Inspected the authorized plan, architecture, sample multi-block Markdown and stack configuration. No backend implementation or dependency changes are necessary for this prototype.
- Existing pins are reused: React 19.2.8, Mermaid 11.17.2, DOMPurify 3.4.15, Vite 8.2.2, Tailwind 4.3.3, Base UI 1.8.0 and Playwright 1.63.0. No dependency is added. Official Mermaid API/security, Vite build and Base UI Button documentation were checked on 2026-09-07. TypeScript remains 6.0.3 for the recorded lint compatibility constraint.

### Proposal

- Build one TypeScript/React prototype and a reproducible Vite library bundle with embedded CSS and JavaScript. Import existing controls and `web/src/index.css`; use no CDN, font service, backend, or packaged-system binding. Keep asset metadata at `needs-review` with `designSystems: []` and `primaryDesignSystem: null`.
- Use a quiet neutral developer workspace: compact project header, 232 px tree, source pane and generous preview. Render real Mermaid, keep the last valid SVG with a stale label on syntax errors, and provide zoom/fit, keyboard save, themes and mobile pane tabs. File navigation preserves independent drafts. Multiple Markdown blocks remain individually selectable.
- Model saved snapshots, in-flight saves, external changes, conflicts, missing files and connection/auth/empty states in memory. Put explicit prototype/review context in a small review panel and design README. Never claim server persistence. Add a review-only scenario selector rather than expose implementation details in the normal editing flow.
- Reuse Button, Textarea, Input, Tabs, Dialog and ThemeProvider. The file hierarchy is a feature composite made from existing buttons in semantic nested lists; the preview is a feature-specific scrollable SVG surface. Neither warrants a new UI primitive or component ecosystem. No new routes or server queries exist in the standalone artifact; the application's existing file routes and Query boundary remain unchanged.
- Verify the built single file, metadata, real browser interactions, desktop/narrow layouts, console and external-resource independence. Read-only verification writes only ignored browser evidence. Root/web quality gates must remain green.
- Authority: the original 2026-09-07 implementation and routine-default authorization in PLAN-001 covers this proposal. No later approval is asserted. Visual defaults remain assumptions; final integration is outside this task.


### Implementation and verification

- Delivered `designs/diagramdock/DiagramDock.html` (3,854,029 bytes), TypeScript/React source, shared-token stylesheet, repeatable `build.ts`, read-only `check.ts`, fixed-route preview server, local TypeScript configuration and reproduction/review README. No application source, dependencies or locks changed.
- Recorded the asset using the installed recording helper with `--status needs-review`; read back metadata confirming one asset, no packaged-system bindings and no approval claim. Repository docs preserve the original authorization; this task completes the prototype only.
- Provisioned the documented local Bun 1.4.2 runtime. `bun install --frozen-lockfile` and `bun install --cwd web --frozen-lockfile` succeeded without lock changes.
- Exact mandatory gate, with `DIAGRAMDOCK_DESIGN_URL` set to the verified URL: `bun run designs/diagramdock/build.ts && bun run designs/diagramdock/check.ts && git diff --check` passed (exit 0). Evidence: `tmp/design/final-design-check.log` and `tmp/design/check-results.json`.
- `node_modules/.bin/tsc --noEmit -p designs/diagramdock/tsconfig.json && bun run check` passed (exit 0). Root/web lint and type checks passed; 14 backend tests and 8 frontend tests passed; measured backend and frontend coverage was 100% for the existing covered boundaries; both production builds passed. Prototype interaction coverage is the separate browser gate, not a production acceptance claim. Evidence: `tmp/design/final-repository-check.log`.
- Browser: local Playwright Chromium, 1440x960 desktop and 390x844 narrow viewports, reduced-motion enabled. Nine verification groups passed: resource/metadata validation; live SVG and containment of graphical bounds; block/standalone selection; independent drafts, errors and stale preview; keyboard save and edits during save; conflict preservation/discard; zoom/fit and light/dark/system; loading/empty/no-selection/no-block/session/disconnected/deleted states; narrow pane/dialog navigation and visible restored focus; blocked hostile source and offline rendering. Console/runtime errors: 0. External resource requests: 0.
- Inspected final screenshots: `tmp/design/desktop-light.png`, `desktop-dark.png`, `syntax-error.png`, `conflict.png`, `narrow-preview.png`, `narrow-source.png` and `narrow-files.png`. Screenshot capture waits for dialog opacity to settle; the final conflict and file dialogs are visibly rendered. The standalone export also loaded and re-rendered with browser networking disabled.
- HTTP preview: `http://diagramdock-design-8acb25.localhost:3003/diagramdock/DiagramDock.html`. Confirmed with `node_modules/.bin/nsl get diagramdock-design-8acb25`, route listing, `curl -fsS` and byte comparison against the delivered HTML. Reachability is local-machine `.localhost` only. The process runs in the prescribed project tmux session; browser binaries and evidence are ignored project-local files.
- Environment exception: installed nsl 0.1.7 has no `serve` command. Its attempted invocation failed with exit 127. The supported `nsl run` wraps `serve.ts`, which serves only the exact design HTML and a minimal index. The exception and reproducible commands are in the design README. No shared daemon or unrelated service was altered.

### Implementation review

- Reviewed state ownership, save snapshot handling, stale rendering, output sanitization, resource boundaries, keyboard semantics and component provenance. No unresolved high-confidence findings remain in this prototype scope.
- Verification caught and corrected root-level Mermaid HTML-label configuration, measured SVG bounds under reduced motion, stable sanitized markup across layout updates, and pending-theme rendering status. Added graphical-bound checks so a visible SVG alone cannot conceal cropping. Dialog screenshots now wait for actual visible opacity rather than relying only on DOM visibility.
- Remaining boundaries: data, saves, auth/connection states, deletion and conflicts are simulations; refresh resets drafts. The 3.9 MB single file embeds the renderer for offline use. Production file security, API integration, real persistence and final application acceptance belong to the subsequent implementation tasks. Design remains `needs-review`.

- Final packaging correction: preserved the compiled program through a safely escaped inline script string, eliminating generated trailing whitespace without changing runtime string contents or enabling eval. Re-ran all nine browser groups and the mandatory build/check/diff command successfully. `bun run lint && node_modules/.bin/tsc --noEmit -p designs/diagramdock/tsconfig.json` also passed after this correction; evidence is `tmp/design/final-source-check.log`.
