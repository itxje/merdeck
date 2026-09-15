# 20260913-2142-markdown-document Render whole Markdown documents

- **status**: implementing
- **createdAt**: 2026-09-13 21:42
- **approvedAt**: 2026-09-15
- **relatedTask**: 20260913-2142-markdown-document

## Context

Opening a `.md` file shows one Mermaid block at a time: the preview pane is a single-diagram canvas, the explorer lists the file's diagrams, and a Markdown file without a selectable block shows the "No Mermaid blocks" empty state. The owner asked for the whole document to render, prose included.

This is a documented boundary, not a missing piece. README states that prose, other fenced code, raw HTML and ordinary Markdown context are never rendered, and the architecture states that surrounding Markdown is never returned as renderable HTML and that mounted markup comes only from the SVG sanitizer. Approving this plan replaces that boundary with the one below.

Findings from the current code:

- `parseDocument` in [the parser](../../src/modules/diagrams/parser.ts) reads the file with `mdast-util-from-markdown` 2.0.3, plain CommonMark without extensions, and keeps only direct root `code` nodes with language `mermaid` whose fences pass the lossless checks. Each block carries a byte selector, its Mermaid `source` and one-based `lineStart` and `lineEnd`. `DiagramDocument` is `{ path, kind, version, blocks }`; the complete text never leaves the service.
- [Workspace](../../web/src/features/workspace/workspace.tsx) renders the source editor and the preview only while a block is selected. [Preview](../../web/src/features/preview/preview.tsx) is keyed by file and block and draws one diagram through the serialized `renderDiagram` queue, with zoom, pan, node location, label editing and file links. Drafts keep the baseline document and one source per block in tab memory.
- The web application has DOMPurify 3.4.15 and Mermaid 11.17.2, which depends on `marked`, but no Markdown renderer. `mdast-util-from-markdown` 2.0.3, `mdast-util-gfm` 3.1.0, `micromark-extension-gfm` 3.0.0, `mdast-util-frontmatter` 2.0.1, `micromark-extension-frontmatter` 2.0.0, `github-slugger` 2.0.0 and `@types/mdast` 4.0.4 are already in `web/bun.lock` through lint tooling.
- The Content-Security-Policy sets `img-src 'self' data:` and `connect-src 'self'`, so remote images would be blocked anyway, and the service reads only Mermaid and Markdown text files, so project images have no endpoint.
- `openLinkedFile` resolves a diagram's file link against the document's folder, refuses `.` and `..` segments, and reads the target before navigating.

## Proposal

1. **Read-only document view, block editing unchanged.** The preview pane of a Markdown file renders the whole document: prose from the file revision the drafts belong to, and each selectable diagram in place from its current draft. The source editor, drafts, selectors and the save protocol stay exactly as they are, and prose is not editable. A Markdown file without a selectable diagram renders the document alone instead of the empty state, with no source editor and nothing to save. `.mmd` and `.mermaid` files are unchanged.
2. **API.** `GET /diagrams/document` and the `PUT /diagrams/source` response add `text` to Markdown documents: the complete decoded file text without its byte order mark, taken from the same bytes as `version` and `blocks`, so prose and selectors can never come from different revisions. The name keeps it apart from a block's Mermaid `source`. Mermaid documents carry no `text`. It is bounded by the configured file limit, 1 MiB by default. The frontend decoder requires `text` for Markdown and refuses it for Mermaid. The tree, directory, revision and search endpoints are unchanged. As an API contract change, this releases as a minor version.
3. **Parsing on the client, into React elements.** The web application parses `text` with the same `mdast-util-from-markdown` 2.0.3 plus the GFM extension (tables, task lists, strikethrough, autolink literals and footnotes) and the YAML front matter extension, promoted from the lockfile to exact direct dependencies without changing their locked versions. A small component turns the syntax tree into React elements. No HTML string is built from file content and none of it passes through `innerHTML`, so React's text escaping is the boundary for prose and the SVG sanitizer stays the only source of mounted markup. Parsing runs when the baseline revision changes, not on each keystroke.
4. **Placing diagrams.** A direct root `code` node with language `mermaid` whose opening and closing fence lines agree with a server block's `lineStart` and `lineEnd` becomes that block's diagram. Mermaid fences the service does not select, nested in lists or blockquotes, unclosed or with ambiguous tab indentation, stay ordinary code, just as they stay uneditable. If any server block has no matching node, the document shows a notice and renders every Mermaid fence as code for that revision instead of guessing a placement; the Diagram view still works.
5. **Inline diagrams.** Each placed diagram goes through the unchanged source policy, renderer, sanitizer and serialized queue, fitted to the column width. Diagrams render as they approach the viewport, the selected one first, and obsolete work is skipped as today. A refused or failing diagram shows its reason in place, and the selected one keeps its last valid drawing with the stale label while its draft is invalid. Flowchart file links inside a diagram open their file as today. Selecting a diagram in the document selects that block for the source editor.
6. **Links.** `http:`, `https:` and `mailto:` links open in a new window with `rel="noopener noreferrer"` and no referrer. A relative link ending in `.md`, `.mmd` or `.mermaid` resolves against the document's folder, with `.` and `..` resolved lexically and percent-encoding decoded once. If the result stays inside the project root and passes the path rules, activating it opens the file through the workspace's own navigation, reading it first as a diagram file link does; otherwise it is plain text. A same-document `#fragment` scrolls to the heading with that GitHub-style slug through a map the component owns: headings get no `id` attribute from file content, so a heading can never shadow an element the application looks up. Every other target, including `javascript:`, `data:`, `vbscript:`, `file:`, protocol-relative and root-absolute paths, renders as plain text.
7. **Images and HTML.** Images are not loaded: an image renders as a labelled placeholder showing its alt text and target as text. HTML comments are omitted and other raw HTML renders as its literal text. Math is not enabled and stays text. Fenced code other than placed diagrams renders as preformatted text without highlighting.
8. **Interface.** A Markdown file's preview pane gains a **Document | Diagram** switch, Document by default and kept for the tab. Document is the view above: a readable column with inline diagrams and the selected diagram outlined. Diagram is today's canvas for the selected block, with zoom, pan, node location and label editing. Choosing a diagram row in the explorer, or loading a URL that names a block other than the first, scrolls that diagram into view; opening the file itself starts at the top. Editing a block redraws its inline diagram without moving the scroll position. On narrow screens the existing Source and Preview tabs remain, and Preview shows the document.

## Evidence required before this is accepted

- Service and HTTP cases: Markdown documents carry `text` equal to the decoded file without its byte order mark, including CRLF files; Mermaid documents carry none; a save response carries the new text.
- Decoder cases for the presence, absence and type of `text`.
- Rendering cases: headings, emphasis, lists, task lists with inert checkboxes, tables with alignment, blockquotes, code, footnotes, reference links, thematic breaks and front matter; raw HTML such as `<script>`, `<img onerror>` and `<iframe>` appears as text and creates no element; every link class above, including `..` resolution, targets escaping the root and fragments; images create no `img` element.
- Placement cases: adjacent diagrams, a byte order mark, CRLF, a table or footnote next to a fence, nested, unclosed and tab-indented Mermaid fences staying code, and a forced mismatch showing the notice.
- Component cases: choosing a block scrolls to and outlines it; editing changes only that inline diagram; a refused block shows its reason; a Markdown file without diagrams renders; the Diagram view keeps zoom, pan and label editing; Mermaid files are unchanged.
- A browser case opening a Markdown document with prose, a table, links, a remote image and two diagrams: the prose and both drawings appear with their arrowheads, the network log shows no request beyond the service, a relative link opens the other document, choosing the second diagram in the explorer reveals it, and saving an edit to it preserves every other byte and redraws the document. Desktop and 390 px, light and dark themes.
- Measurements recorded in the task: parse and first-render time in Chromium for a 1 MiB document and for a document with 100 diagrams, and the change in SPA and executable size. If parsing the largest allowed file blocks input for more than about 100 ms, parsing moves into a same-origin module worker before acceptance.
- `bun run check`, the complete browser suite and the native continuous-integration gate before release.

## Risks

- **File content reaches the application page.** Converting the syntax tree to React elements builds no HTML from content, links pass an allowlist, no content becomes an element `id`, and nothing is fetched; the Content-Security-Policy stays unchanged as an independent layer. Raw HTML and images are the capabilities given up for this.
- **Two parser configurations.** The service parses plain CommonMark while the client adds GFM and front matter, and the two could disagree next to a fence, for example a Mermaid fence written inside a front matter block. Placement requires agreement on exact lines and falls back visibly, and the fixtures target those neighbours.
- **Many diagrams.** Rendering is serialized on the main thread and the largest diagrams take seconds. Viewport-driven rendering and skipped obsolete work bound the cost of opening a long document, but scrolling quickly through many large diagrams shows pending frames.
- **Payload and memory.** A Markdown document response roughly doubles, and cached documents and draft baselines hold the text too, each bounded by the configured file limit.
- **Literal HTML looks rough** in documents that rely on `<details>`, `<br>` or centred images. It is visible and safe; rendering a sanitized HTML subset would be a separate decision.

## Scope

`src/shared/contracts.ts`, `src/modules/diagrams/parser.ts` and their service and HTTP tests; `web/src/features/workspace/api.ts`; a new document view with its Markdown parsing, link policy and inline diagram component; a render hook shared by the inline diagram and the existing preview; `workspace.tsx` for the view switch, scrolling and Markdown files without diagrams; styles for the document column from existing tokens; `web/package.json` and `web/bun.lock` for the promoted dependencies, with a decision record; their tests and the browser case; README, architecture and changelog.

Out of scope: editing prose or the whole file, loading images, rendering raw HTML, math, code highlighting, drawing unselectable Mermaid fences, heading anchors in the address bar, printing and export, and prototype changes; the prototype stays needs-review.

## Implementation decisions

`github-slugger` **2.0.0** and `@types/mdast` **4.0.4** are promoted as exact direct dependencies from the existing lockfile. Both versions were verified against the npm registry on 2026-09-15 and match the approved renderer contract: the former owns GitHub-compatible duplicate heading slugs, and the latter replaces the renderer's ad-hoc syntax-node shape with MDAST types. No transitive dependency versions changed. Browser, performance and native acceptance evidence remains pending this implementation phase.

## Alternatives

- **Render with `marked`, which Mermaid already depends on.** No new bundle weight, but its output is an HTML string needing a second sanitizer boundary, and it is not the parser the service uses, so diagram placement would depend on two different Markdown implementations agreeing.
- **`micromark` HTML output sanitized with DOMPurify.** Little code, but it adds an `innerHTML` path for file content and loses source positions, so diagrams could only be placed by counting code blocks, which breaks on the fences the service omits.
- **Render on the server.** Moves HTML generation into the API while the client still has to sanitize it, and enlarges every document response for every consumer.
- **Whole-file editing** with one editor for the entire document. Useful, but it needs a whole-file save selector and its own conflict semantics; it can follow as a separate proposal once the document view exists.
