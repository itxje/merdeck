# PREVIEW-001 Give diagram subgraphs a visible neutral background

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-10 13:45

## Description

Flowchart subgraphs rendered with no visible background because the renderer maps Mermaid's `tertiaryColor` to the page background and the base theme derives the cluster fill from `tertiaryColor`. The project owner compared the result with the public Mermaid editor on 2026-09-10 and chose a neutral background that follows the application's grey theme tokens in both colour modes rather than Mermaid's default yellow. Acceptance: subgraph containers show a fill and border distinct from both the page background and the default node fill, in light and dark themes, with no change to node colours, the sanitizer or the trusted renderer settings.

## ActiveForm

Theming subgraph containers from dedicated tokens.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation: `web/src/features/preview/renderer.ts` sets `theme: 'base'` with `tertiaryColor` mapped to `--background`; Mermaid 11.17.2 derives `clusterBkg` from `tertiaryColor` when unset, so clusters inherit the page colour. The sanitizer bakes computed presentation values into attributes before stripping styles, so theme variables survive; the missing tint was a mapping choice, not a sanitization loss.
- Proposal (owner decision "B", 2026-09-10): add dual-channel tokens `--diagram-cluster-bg` and `--diagram-cluster-border` in `web/src/index.css` (light `oklch(0.985 0 0)` / `oklch(0.87 0 0)`, dark `oklch(0.205 0 0)` / `oklch(0.35 0 0)`, mirrored in the `@theme inline` block) and map `clusterBkg`, `clusterBorder` and `titleColor` in the renderer's `themeVariables`. Values are opaque so the canvas-based hex conversion stays exact, and they sit between the page background and the default node fill (`--muted`) on the neutral scale.
- Implementation: the three source files above plus a render-queue test asserting the trusted configuration carries the token-derived cluster colours. No dependency or lockfile change.
- Verification and deployment evidence are recorded below once the checks complete.
- Verification (2026-09-10, main checkout, pinned Bun 1.4.2): `bun run --cwd web lint` and `typecheck` clean; `bun run --cwd web test:coverage` 136 passed (10 files) including the new cluster-token test; root `bun run lint` clean; `bun run build` succeeded and the built bundle references the new tokens; `git diff --check` clean. The full storage-dependent backend suite and the browser suite were not rerun for this frontend-only theme change.
- Deployment (2026-09-10): the service now runs from this checkout instead of a temporary worktree, built from `e8ef8e5` with the pinned Bun, launched through the owner-scoped `merdeck` nsl route in the project tmux session (`domain` window) with the retained demo root and token. HTTPS checks after the restart: `/api/health` 200 with service `merdeck`, page 200.
- Live evidence: a real browser session against https://merdeck.example.test/ rendered a nested-subgraph diagram in both colour schemes. Cluster rectangles carried fill `rgb(250, 250, 250)` with border `rgb(212, 212, 212)` in light mode and fill `rgb(23, 23, 23)` with border `rgb(58, 58, 58)` in dark mode, matching the tokens; screenshots are kept under ignored `tmp/preview/`. The draft was discarded and the session logged out afterwards.
