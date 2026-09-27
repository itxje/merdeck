# 20260924-1803-wireviz-qet-preview Preview WireViz harnesses and QElectroTech projects through local renderers

- **status**: draft
- **createdAt**: 2026-09-24 18:03
- **approvedAt**: (pending)
- **relatedTask**: 20260924-1813-wireviz-qet-preview

## Context

Merdeck admits `.mmd`/`.mermaid`, `.md` and `.html`/`.htm` by extension (`fileKind` in
`src/modules/diagrams/parser.ts`); every other file is invisible to listing, search and reads. Mermaid
renders in the browser and its sanitized SVG is mounted in `web/src/features/preview/preview.tsx`, which
owns zoom, pan and fit. A whole-file kind (Mermaid) is edited through the `standalone` selector and saved
with `expectedVersion`; HTML is read-only in the application. External programs are already run by the
agent adapters through `spawnProvider` (`src/modules/agents/process.ts`): canonical executable outside the
project, fixed argv, no shell, restricted environment, bounded output and SIGTERM-to-SIGKILL termination.
Executable paths are configured by environment variables validated in `src/config.ts`.

Merdeck's licence is proprietary. WireViz (GPL-3.0) and QElectroTech (GPL-2.0-or-later) are therefore
used only as separately installed programs invoked as processes; neither is bundled, imported or ported.

Measured during the investigation (evidence in the ignored `tmp/wireviz-research/` and
`tmp/qet-research/`):

- **WireViz 0.4.1.** `wireviz -f gt -o <dir> <file>` writes only the Graphviz DOT (`.gv`) and the BOM
  (`.bom.tsv`) and needs no Graphviz binary. All 24 upstream examples and tutorials produce DOT. Graphviz
  compiled to WASM (`@viz-js/viz`, MIT wrapper, Graphviz EPL-1.0, about 466 KB gzip) renders every one of
  them with the same element counts as native `dot`, including WireViz's HTML-like tables and colour bars;
  layout differs by about 1-10% because of font metrics. Image `src` paths are resolved without
  confinement (absolute and `../` paths are accepted), and `href`/`URL` attributes can carry
  `javascript:` links into the SVG.
- **QElectroTech.** Only the development branch (after 0.100) has `--export-svg <project> <dir>`, writing
  one `NN_<title>.svg` per folio. Built from source on this arm64 host, it runs with
  `QT_QPA_PLATFORM=offscreen` and no display, exporting 23 of 24 examples in 0.1-0.7 s (one example
  crashes). The output is plain SVG (`g`, `path`, `polyline`, `text`, `circle`, `rect`, `ellipse`, with
  `fill`/`stroke`/`font-*`/`transform` attributes) sized in millimetres; one folio is 0.1-0.8 MB. It
  reproduces bicolour conductors, shapes, conductor texts and title blocks faithfully; text falls back to
  another font when the project's font is not installed. The runtime is the 18 MB program plus about
  66 MB of Qt 6 libraries. Sample projects range from 107 KB to 3.4 MB.

## Proposal

Two deliveries sharing one mechanism. WireViz ships first; QET follows as a separate release.

### Shared: optional local renderers

1. Configuration: `MERDECK_WIREVIZ_PYTHON` (the interpreter of a Python environment with `wireviz`
   installed) and `MERDECK_QELECTROTECH_PATH`, validated like the agent executables (absolute, canonical,
   executable, outside the project root). Unset means the renderer is unavailable; nothing else changes.
2. A renderer runner in a new `src/modules/renderers/` module: creates a private (0700) temporary
   directory outside the root, copies in only bytes the service read itself through confined reads, and
   runs the child through `prlimit` (CPU time, address space, per-file size, open files, no core dumps) with fixed argv, `cwd`
   inside that directory and the restricted environment (plus `HOME`/`XDG_*` pointing into it, and
   `QT_QPA_PLATFORM=offscreen` for QET). A private `cwd` does not stop a child from opening absolute paths,
   so confinement is enforced on the input before execution (items 10 and 13), not by the directory.
   Limits: one render at a time per renderer with a short queue (a full queue answers `rate_limited`), a
   timeout (10 s WireViz, 30 s QET), bounded output file count and total bytes, stdout/stderr discarded.
   Failures map to a generic `render_failed` message, never raw tool output. The directory is always
   removed.
3. Starting a render spawns a process, so it is a `POST` behind the existing mutation and Origin boundary;
   only reading an already produced result is a `GET`.
4. Rendered SVG never leaves the service as a navigable `image/svg+xml` document. It is returned inside JSON
   and mounted only after sanitizing.
5. The session capabilities gain `renderers: { wireviz: boolean, qet: boolean }`, so the interface can tell
   "renderer not configured" apart from a render error.
6. The SVG sanitizer gains a separate, narrow variant used only by these previews: it keeps `<image>` only
   when its `href` is a `data:image/(png|jpeg|gif|webp);base64` URI that the service supplied, below a size
   cap. It is not a general URI allow-list; links, scripts, `foreignObject`, style URLs, external
   references and every other `href` stay removed as today.
7. Deployment prerequisites (documented in README; installed on persistent storage outside the project
   root, with the tested versions pinned): a Python environment with `wireviz` 0.4.1 for phase 1, and a
   QElectroTech development build with its Qt libraries, a wrapper script setting the library path, and the
   fonts the projects use for phase 2. Renderers are optional, so the repository gate and the hosted Linux
   x64 acceptance use fake renderers; an opt-in check exercises the real ones on the deployment host.

### Phase 1: WireViz (`*.wireviz.yml` / `*.wireviz.yaml`)

8. File kind `wireviz`, recognised by the double extension, checked before any single-extension rule in
   backend discovery, frontend decoding, creation and moves. A plain `.yml`/`.yaml` file stays unlisted,
   because the served root is full of YAML that is not a harness and recognising content would mean reading
   every YAML file during listing. The kind joins the explorer filter, search `kind`, file creation (with a
   minimal harness template) and same-kind moves.
9. Source editing: the whole file is one `standalone` block, exactly like a `.mmd` file, so the existing
   editor, drafts, `expectedVersion` saves, conflict handling and external-change polling apply unchanged.
10. `POST /api/diagrams/wireviz/render` with `{ path, source }` (the current draft, bounded by the file limit;
    it writes nothing to the project). The service:
    - runs the configured interpreter on a short Merdeck script that loads the source with PyYAML's
      `safe_load`, the same loader WireViz uses, and prints only the `image.src` values under
      `connectors` and `cables` (the only places WireViz reads images) as JSON, so the references
      validated are exactly the ones WireViz will read;
    - refuses the render before running WireViz unless every reference is relative, resolves from the
      file's directory to a regular file inside the root without crossing a symbolic link, is PNG, JPEG, GIF
      or WebP by content, and stays within bounds (16 images, 2 MiB each, 8 MiB total, 4096 px per side);
    - rejects a non-string `src`, and copies the source and those images, read through a new internal
      confined asset reader (image files stay unreadable through the public API), into the temporary
      directory at their root-relative positions (`a/b/h.wireviz.yml` referring to `../images/x.png`
      becomes `tmp/a/b/h.wireviz.yml` and `tmp/a/images/x.png`), so WireViz resolves each reference to a
      copy; the bytes WireViz reads are the same bytes the preflight parsed;
    - runs `wireviz -f gt` there (the CLI entry point of the configured environment) and reads only the
      `.gv` file, bounded to 4 MiB;
    - checks every image reference in the DOT, both HTML-label `<img src>` and `image`/`imagepath`
      attributes a `tweak` may add, against the copied images, replaces the temporary paths with opaque image
      names, and otherwise refuses the render;
    - returns `{ dot, images: [{ name, width, height, dataUri }] }`.
11. Browser: Graphviz WASM (`@viz-js/viz`, latest stable at implementation time, licence notices included in
    the bundle) runs in a dedicated Worker with a DOT size bound and a deadline that terminates the Worker.
    It returns an SVG string with the declared image sizes; the page substitutes the data URIs, sanitizes
    with the variant from item 6 and mounts the result in the existing preview canvas (zoom, pan, fit).
    Renders are debounced while typing and stale results are dropped. A referenced image changing does not
    change the harness file's version, so the preview re-renders on open, on each source change and from a
    Refresh control. Without a configured renderer the source editor works and the preview shows "WireViz
    renderer is not configured on this service".

### Phase 2: QElectroTech (`.qet`), read-only in Merdeck

12. File kind `qet`: listed, searchable, movable to another `.qet` path and deletable; creation of a `.qet`
    file is refused explicitly, and Merdeck never saves one. Its bytes never reach the browser, so it has
    its own size bound `MERDECK_MAX_QET_BYTES` (default 8 MiB) instead of the text limit. The AI panel may
    still change a `.qet` file like any project file; the content-version cache and polling pick that up.
13. `POST /api/diagrams/qet/render` with `{ path }`: the service reads the file once, hashes the exact bytes
    it copies, runs `qelectrotech --info` for authoritative page indices, titles and dimensions, refuses
    more than 64 pages or oversized pages, then runs `--export-svg` and requires a one-to-one match between
    reported pages and regular, bounded output files (a zero exit alone is not trusted). Before publishing,
    it rechecks that the file still has the hashed version. Results are cached per path and content version
    within 64 MiB (least recently used), and a single render is bounded by the output limits in item 2. The
    response is `{ version, folios: [{ index, title }] }`.
14. `GET /api/diagrams/qet/folio?path=&version=&index=` returns `{ svg }` from the cache, with the millimetre
    `width`/`height` removed so the `viewBox` drives layout; a version that is no longer current answers
    `conflict`, and a missing entry asks the client to render again.
15. Browser: a folio selector above the preview canvas and the sanitized folio SVG in the canvas. The existing
    polling re-renders after QElectroTech, the AI panel or another program changes the file. Editing stays
    in QElectroTech. Without a configured renderer the file opens to "QElectroTech renderer is not
    configured on this service".

### Verification

- Backend: renderer runner (timeouts, queue, `prlimit` limits, output bounds, restricted environment, and
  temporary directory removal after success, timeout and a crashing renderer); image confinement with
  absolute, escaping `../`, admitted inside-root `../images`, symlinked, non-string, non-image, oversized and
  too-many images, YAML 1.1 cases, identical source bytes across preflight and execution, and a `tweak` that
  adds an image attribute; direct navigation to the JSON folio endpoint;
  the QET page cross-check, a crashing export (the upstream example that segfaults), version races,
  refused creation and cache bounds; capability reporting with and without renderers. Fake executables
  drive the suites.
- Frontend: kind decoding including the double extension, filter and creation, Worker deadline, render
  debouncing and stale drops, the sanitizer variant (keeps service-supplied raster data images, removes
  links, SVG data URIs and external images), unavailable states.
- Browser suite: a WireViz file edited and previewed, a `.qet` folio switch and refresh after an external
  change, both with fake renderers.
- The repository gate and hosted native acceptance as for every release; each phase releases as a minor
  version because it extends the API contract. The opt-in real-renderer check runs the upstream WireViz
  examples and tutorials and the QElectroTech examples on the deployment host, and is required before
  either renderer is enabled there. Fake-renderer acceptance on x64 makes no claim about real renderers on
  x64.

## Risks

- **Host dependencies.** Both previews depend on software installed beside the service; the QElectroTech
  CLI exists only in development builds, which on arm64 means building from source (about 1.8 GB of build
  tooling, 90 MB kept). A container rebuild must keep these installs, so they live on persistent storage.
- **Fidelity.** WireViz layout in the browser differs from native Graphviz by a few percent. QET text uses
  whatever fonts are installed. One of 24 QET examples crashes the exporter; such files show a render
  error.
- **Untrusted input to external programs.** Both tools parse project files with full user privileges.
  Only copies of confined bytes reach them, outputs are verified before anything returns to the browser,
  and time and size are bounded, but a malicious file could still exploit a bug in either program. The
  projects are the owner's own files.
- **Cost.** A QET render spawns a Qt program (0.1-0.7 s per project); caching by content version keeps
  polling from re-rendering unchanged files. WireViz renders take about 50-90 ms per request.
- **Licence.** Invoking separately installed GPL programs as processes, exchanging only arguments and
  files, keeps their code out of Merdeck's artifact; this is a reasonable separation, not a legal
  guarantee, and it would not hold if a deployment shipped them together with Merdeck. Graphviz itself is
  distributed in the frontend inside the WASM package under EPL-1.0, so its notices ship with the bundle.
  Bundling WireViz or QElectroTech, or running WireViz in the browser through Pyodide, is out of scope.
- **Child privileges and resources.** `prlimit` limits resources; it is not filesystem or network
  isolation, and the child keeps the service user's privileges. That is acceptable while the inputs are the
  owner's own project files and the service runs as a limited account with a scrubbed environment;
  namespace isolation (bubblewrap or Landlock) is needed if projects become untrusted. `prlimit` caps each
  file's size, not the total written to the temporary directory during a render: the timeout bounds it in
  practice and the output checks bound only what is read back.

## Scope

Backend: `src/config.ts`, `src/shared/contracts.ts`, `src/modules/diagrams/` (kinds, listing, reads, saves),
new `src/modules/renderers/` (runner, WireViz and QET adapters, confined asset reader), routes and suites. Frontend: `web/src/features/workspace/` (kinds, filter,
creation, view routing), `web/src/features/preview/` (sanitizer variant, canvas input), new WireViz and QET
views, one new dependency (`@viz-js/viz`), suites and browser specs. Docs: README (prerequisites and
configuration), architecture, changelog. Deployment configuration is updated separately after release.

## Alternatives

- **PNG instead of SVG** (an earlier draft for this feature, discarded at the owner's request). Avoids a new sanitizer
  variant but loses vector zoom and needs server-side Graphviz for WireViz. The SVG here is produced by
  Graphviz in the browser (WireViz) or by QElectroTech (QET) and passes the existing sanitizer boundary, so
  PNG is not needed for safety.
- **Recognise WireViz by content in any `.yml`.** Needs reading every YAML file under the root during
  listing and search; kept as a later option if the naming convention proves inconvenient.
- **Pyodide in the browser for WireViz.** No host dependency and byte-identical DOT, but a 6.3 MB gzip
  download, about 1.5 s cold start, and GPL code shipped inside Merdeck.
- **A browser-side QET renderer.** No Qt dependency, but weeks of clean-room work for an approximate picture
  (conductor routing, cross references, rich text and tables are computed by QElectroTech at runtime).
- **Server-side `dot` for WireViz.** Exact native layout, but adds Graphviz as a host dependency and lets a
  raw DOT `image=` attribute read host files.

## Annotations

- Written at the owner's request on 2026-09-24 for the two chosen approaches: WireViz through the local
  CLI producing DOT with Graphviz WASM in the browser, and QET through the local QElectroTech SVG export.
- Reviewed on 2026-09-24 by the session that wrote the earlier draft. It agreed with SVG, browser-side
  Graphviz and the naming convention, and asked for: pre-execution image confinement on the same parse
  WireViz uses, an internal asset reader, a Worker with a deadline, JSON-wrapped SVG, POST to start a
  render, the QET `--info` cross-check and version recheck, explicit `.qet` creation refusal, aggregate and
  child resource limits, image-change refresh, and the AI-panel contract. All are incorporated above.
  A second round found no blocker; it confirmed root-relative mirroring over re-serialising the YAML,
  accepted `prlimit` as the phase-1 minimum under the owner-file threat model, and added the tests and the
  resource-limit wording above.
- Decision needed: the `*.wireviz.yml` naming convention (item 8).
