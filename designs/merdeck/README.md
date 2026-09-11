# Merdeck prototype

Open `Merdeck.html` for the interactive design. It is a single offline file compiled from the TypeScript/React source in this directory. Review status is **needs-review**. Layout, density and visual defaults are assumptions under the existing MVP authorization; this is not an approved design.

## Design context

The prototype imports the application's actual CLI-owned shadcn/ui base-nova Button, Input, Textarea, Tabs and Dialog components, plus its ThemeProvider. It compiles Tailwind from `web/src/index.css`, which remains the source of all semantic color values. There is no imported packaged design-system manifest: metadata intentionally has `designSystems: []` and `primaryDesignSystem: null`.

The desktop hierarchy is a 64 px project header, 232 px explorer, selected file and block navigation, readable monospace source, and a generous diagram canvas. Quiet neutral surfaces, thin borders and small controls keep attention on the source and diagram. Error color comes from the existing destructive token. The explorer collapses below 1100 px; below 700 px, source/preview tabs replace the split layout and controls have 44 px touch targets. System fonts require no network or bundled font files. The tree and scrollable SVG are feature compositions, built with existing buttons and semantic lists rather than new UI primitives.

## Brand mark

`brand.html` is a self-contained brand sheet for the Merdeck mark. Open it directly in a
browser; it needs no build step, loads no network resource and embeds no font.

The mark reads Merdeck as Mermaid plus deck: three flowchart nodes and their edges form an
**M** standing on a deck bar. It is stroke-only in `currentColor` on a `0 0 24 24` viewBox at
stroke width `1.7`, node radius `1.6`, with round caps and joins, so it is a drop-in
replacement for the lucide icons around it and inherits the same theme tokens in light and
dark.

One geometry serves every surface. `web/src/shared/components/brand/merdeck-mark.tsx` is the
source; `app.tsx` imports that same component, so the rebuilt `Merdeck.html` cannot drift from
the application. `web/public/favicon.svg` and the `<symbol>` in `brand.html` repeat the same
path data verbatim and must be changed together. The favicon carries a small internal
stylesheet so it follows `prefers-color-scheme`; it names `black` and `white` rather than any
hex value, because a favicon has no theme token to inherit.

Sizes verified visually, not by assertion, from the rendered brand sheet and the running
application: 16, 24, 32, 64 and 128 px on both light and dark surfaces, the wordmark lockup,
and the 32 px `.brand-symbol` header tile (18 px of glyph inside 7 px of padding) in both
themes.

**The mark is approved.** The project owner reviewed the brand sheet on 2026-09-09 and chose
the deck-without-wave direction as the product mark. An earlier direction — the same layout
with an added wave line beneath the deck — carried an open, honestly-recorded disagreement
about whether it read as an M or a crown; that concern was specific to the wave version and is
resolved by this choice, since the approved mark does not carry the wave. The wave version and
a solid-node alternate are both kept in the brand sheet, clearly labelled not chosen, for
comparison. `brand.html` is **approved**; `Merdeck.html` — the prototype layout as a whole —
remains **needs-review**.

## What works

- Select standalone Mermaid files or either Markdown diagram; filter and collapse the file list. Selection retains independent drafts.
- Edit source and see real Mermaid SVG. Syntax errors keep the previous valid diagram with an explicit stale label. Rendering is serialized and stale results are ignored.
- Save with the button or Ctrl/Cmd+S. The submitted snapshot is saved after a short simulated delay; typing during that delay stays dirty.
- Open **Prototype review** using the information button. It contains light/dark/system choices, loading/empty/no-selection/session/disconnected/deleted states and **Simulate external change**.
- A simulated external change pauses saving. **Keep draft** preserves edits; **Discard draft and load file** explicitly replaces them. The dialog compares both versions.
- Zoom, fit and scroll the preview; switch themes, narrow panes and the file dialog. Escape closes dialogs and returns keyboard focus.

## Simulation boundaries

The sample project, block labels and line numbers are representative in-memory fixtures. The prototype never accesses project directories, sends API requests or writes server files. Saves, connection/authentication states, deletion and conflict detection are simulated; refreshing discards all draft and saved snapshots. Only the existing theme preference is persisted. These controls illustrate the eventual server-file workflow; there is no upload, file creation, download-centric flow or unconditional overwrite.

The one-screen standalone artifact uses local React state, with no artificial network queries or routes. The working application's file-based TanStack Router and TanStack Query integration remain separate application work. Carry this hierarchy, shared controls, source/preview states and narrow-layout behavior into that implementation, while using real whole-file versions, containment, byte-preserving edits and authentication from the established API contract.

Mermaid uses strict mode and root-level `htmlLabels: false`; SVG is sanitized with DOMPurify. The prototype rejects configuration directives, HTML, links, remote-resource constructs, math and source over 16,000 characters. Its CSP blocks network connections and non-embedded resources. This intentionally constrained design renderer is not proof of complete production renderer or filesystem security acceptance.

## Rebuild and verify

From the repository root, provision Bun 1.4.2 and install both frozen locks as documented in the root README. No dependencies or lockfile changes are required. Reused pins include React 19.2.8, Base UI 1.8.0, Mermaid 11.17.2, DOMPurify 3.4.15, Vite 8.2.2, Tailwind 4.3.3, Playwright 1.63.0 and TypeScript 6.0.3. TypeScript's compatibility exception is recorded in the existing stack decision.

```bash
export PATH="$PWD/.cache/runtime/node_modules/.bin:$PATH"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/playwright"
web/node_modules/.bin/playwright install chromium
bun run designs/merdeck/build.ts
bun run designs/merdeck/check.ts
node_modules/.bin/tsc --noEmit -p designs/merdeck/tsconfig.json
bun run check
git diff --check
```

Run browser installation and longer checks inside the project tmux session. `build.ts` embeds the full renderer, React, controls and styles into approximately 3.9 MB of HTML; output has no CDN, live service or sibling asset dependency. Vite/Rolldown's IIFE metadata can list a dynamic import of the output itself; the builder rejects other imports and any executable dynamic import expression. It fails if unexpected separate assets are emitted. The compiled program is stored as a safely escaped JavaScript string and mounted as an inline script, preserving every runtime string while avoiding trailing whitespace in generated HTML. No eval or external script URL is used.

`check.ts` reads source delivery and asset metadata without modifying them. It checks resource closure, real rendering, navigation, errors, saves, conflicts, themes, responsive layout, keyboard focus and a hostile resource fixture. It blocks external requests and also opens the exported file with the browser offline. It writes only evidence under ignored `tmp/design/`. A primary HTTP run requires `MERDECK_DESIGN_URL`; without it, verification uses the standalone file and explicitly reports export-only reachability. Browser binaries stay under ignored `.cache/playwright/`.

Asset versions must be maintained with the installed asset-recording helper, retaining `needs-review` until actual review. The source and delivered HTML are both committed; screenshots and temporary logs are not.

## Local HTTP preview

The installed nsl 0.1.7 does not implement `serve`; its CLI treats that word as an executable and fails. Use its supported `run` command to wrap the included fixed-route design server. That server serves only the design index and exact HTML path, never arbitrary files or project directories. Production application startup does not use this server or nsl.

```bash
export PATH="$PWD/.cache/runtime/node_modules/.bin:$PATH"
path_hash="$(echo -n "$PWD" | md5sum | cut -c1-6)"
session_name="$(basename "$PWD" | tr '.' '-')-$path_hash"
design_name="merdeck-design-$path_hash"
tmux has-session -t "$session_name" 2>/dev/null || tmux new-session -d -s "$session_name" -c "$PWD" /bin/bash
# Reuse an existing design-preview window if it is already serving this route.
tmux new-window -t "$session_name" -n design-preview -c "$PWD" \
  "env PATH='$PATH' node_modules/.bin/nsl run -n '$design_name' -- bun designs/merdeck/serve.ts"
node_modules/.bin/nsl list
node_modules/.bin/nsl get "$design_name"
```

Use the actual origin printed by `nsl get`, including its port, followed by `/merdeck/Merdeck.html`. The verified origin for this checkout is `http://merdeck-design-8acb25.localhost:3003`. Its `.localhost` hostname is local-machine access only; no public or remote browser reachability is claimed. Stop the preview with `tmux send-keys -t "$session_name:design-preview" C-c`; leave the shared nsl daemon running.

For a repeatable HTTP check in another tmux window:

```bash
export MERDECK_DESIGN_URL="$(node_modules/.bin/nsl get "$design_name")/merdeck/Merdeck.html"
curl -fsS "$MERDECK_DESIGN_URL" -o tmp/design/served.html
cmp designs/merdeck/Merdeck.html tmp/design/served.html
bun run designs/merdeck/build.ts && bun run designs/merdeck/check.ts && git diff --check
```

Evidence files: `tmp/design/check-results.json`, `desktop-light.png`, `desktop-dark.png`, `syntax-error.png`, `conflict.png`, `narrow-preview.png`, `narrow-source.png` and `narrow-files.png`. Actual results and viewport sizes are recorded in DESIGN-001.

## Official API references

Checked on 2026-09-07: [Mermaid rendering](https://mermaid.js.org/config/usage.html), [root-level HTML label configuration](https://mermaid.js.org/config/schema-docs/config.html#htmllabels), [Base UI Button](https://base-ui.com/react/components/button), [Vite builds](https://vite.dev/guide/build.html), and [Rolldown single-bundle behavior](https://rolldown.rs/reference/OutputOptions.codeSplitting).
