# 20260916-0011-html-document-support Add HTML document support

- **status**: completed
- **createdAt**: 2026-09-16 00:11
- **approvedAt**: 2026-09-16 01:00
- **relatedTask**: 20260916-0011-html-document-support

## Context

The application admits `.mmd`, `.mermaid` and `.md` files only. `FileKind`, directory search, the document response decoder, explorer filters and file-operation validation all enumerate `mermaid | markdown`. The backend parser decodes a bounded UTF-8 file, returns exact same-read text only for Markdown, and extracts only editable Mermaid blocks. The save request replaces a standalone Mermaid file or one byte span inside Markdown; there is no whole-document save contract.

The existing Markdown document view is deliberately not an HTML renderer. It parses in a same-origin module Worker, converts a syntax tree to React elements, renders raw HTML as escaped text, represents images as inert text placeholders, and allows only guarded external, project-document and local-fragment links. Sanitized Mermaid SVG is the only file-derived markup mounted through `dangerouslySetInnerHTML`.

The service Content-Security-Policy has `default-src 'none'`, no `frame-src`, `script-src 'self'`, `img-src 'self' data:` and `connect-src 'self'`. A sandboxed `iframe` would therefore require widening that policy. It would still need a resource and navigation policy: inert browser HTML parsing can initiate image and frame downloads, and moving parsed nodes into the application document can reactivate handlers or scripts. A same-origin sanitized `innerHTML` view would also introduce CSS, DOM-clobbering and active-URL review surfaces that the Markdown renderer currently avoids.

`parse5` 8.0.1 is already locked transitively through the test-only `jsdom` dependency. The npm registry and the parser's official documentation were checked on 2026-09-16: 8.0.1 is the current release and implements browser-compatible WHATWG HTML parsing without creating a browser DOM. Promoting that exact version to a direct runtime dependency permits parsing and projecting untrusted HTML entirely inside a module Worker before React receives a bounded inert tree.

## Proposal

1. **Read-only HTML documents.** Admit `.html` and `.htm` as one new `html` file kind. Existing files can be listed, searched, opened, linked, renamed, moved and deleted. New HTML files use a small static document template, but their contents remain read-only in Merdeck; authors edit them with an external editor. Mermaid and Markdown editing and saving remain unchanged. Whole-file HTML editing is a separate feature because it needs a new persistence, conflict and byte-convention contract.
2. **Same-read API text.** Add `html` to `FileKind`, directory search and document decoders. An HTML document is `{ kind: 'html', path, version, text, blocks: [] }`, where `text` is complete BOM-free decoded UTF-8 from the same bytes as its SHA-256 version. CRLF and every non-BOM character remain exact. No read rewrites disk bytes, and the existing maximum-file-size, path, containment and invalid-text boundaries apply. Markdown and Mermaid response shapes stay unchanged.
3. **Standards parser in a Worker.** Promote exact `parse5` 8.0.1 to a direct web dependency and parse HTML in a same-origin module Worker. The Worker immediately projects the parse tree into a small application-owned render tree; the raw parse5 tree never reaches React. Output has explicit node, depth, text and URL-length bounds, reports truncation visibly, and chunks long text for progressive materialization. A Worker failure shows a safe preview error rather than parsing file content through a browser DOM or injection sink on the main thread.
4. **Semantic allowlist, not page emulation.** React creates only application-selected semantic elements: headings, paragraphs, line/thematic breaks, quotations, pre/code, emphasis, lists, definition lists, tables and a small set of inert inline semantics such as `mark`, `sub`, `sup`, `time` and `abbr`. Unknown and interactive containers are unwrapped to safe children when useful. Script, style, template, noscript, frame, object, embed, SVG, MathML and other active/foreign subtrees are dropped. Images and media become labelled text placeholders. Forms and controls never become interactive elements.
5. **No file-provided DOM capabilities.** File attributes are never spread onto React elements. Event handlers, `style`, `class`, arbitrary `id`, `src`, `srcset`, `poster`, `action`, `formaction`, `background`, `data-*`, `aria-*` and namespace attributes are ignored. The renderer creates no stylesheet, script, custom element, image, media, frame, form submission, fetch or browser-parsed markup. HTML entities are decoded only by parse5 and then rendered as React text. The CSP remains unchanged as an independent containment layer.
6. **Guarded links and anchors.** Reuse the Markdown link boundary. HTTP(S) and `mailto:` links open in a new window with no opener or referrer. Relative links ending in `.md`, `.mmd`, `.mermaid`, `.html` or `.htm` resolve lexically against the current file, are decoded once, must remain inside the project path rules, and are pre-read before workspace navigation. Other schemes, protocol-relative/root-absolute paths, encoded traversal and malformed URLs become plain text. Same-document `#fragment` controls scroll through an application-owned source-ID-to-element map; file-provided IDs are never mounted, so they cannot shadow application DOM.
7. **Workspace presentation.** HTML opens directly in a responsive document column using existing theme tokens, with a persistent notice that scripts, styles, forms, media and resources are not executed or loaded. It has no Mermaid Source/Preview pane, draft, dirty state or save action. The explorer gets an HTML filter and distinct document icon; file-operation copy and errors name both HTML suffixes. A source `<pre class="mermaid">` remains inert preformatted content in this increment.
8. **Version and release.** Adding the public `html` file kind widens the API and deployment behavior, so the reviewed candidate targets the next minor release after `v0.12.0` (`v0.13.0`). Tagging and publication occur only after the normal hosted Linux x64/ext4 native gate and explicit release authorization.

## Evidence required before this is accepted

- Parser, service and HTTP cases for `.html` and `.htm`, BOM/CRLF and entities, empty `blocks`, exact same-read text/version, invalid UTF-8/control rejection, maximum size, discovery/search/filtering, HTML-to-HTML/HTM moves, cross-kind move refusal and byte-preserving reads.
- Strict frontend decoder cases: require `text` and empty blocks for HTML, reject unexpected fields and extension/kind mismatches, and preserve the existing Markdown/Mermaid contracts.
- Worker-policy cases for normal, malformed and deeply nested HTML; comments and doctypes; raw-text elements; duplicate attributes; custom elements; SVG/MathML namespace transitions; `template`, `base`, meta refresh, scripts, styles, event attributes, forms, frames, embeds, media and every resource-bearing attribute. Assert bounded output and a visible truncation/error state.
- Component cases for the semantic element set, decoded text, table/list structure, inert image/media placeholders, safe external/project/fragment links, duplicate source IDs, unsafe URL classes and Worker failure. Assert that file content creates no `script`, `style`, `img`, `iframe`, `object`, `embed`, `form`, form control, SVG, MathML, custom element or `dangerouslySetInnerHTML` path.
- Workspace/explorer cases for HTML selection, filter/search, no source pane or save affordance, rename/delete/create behavior, external-change refresh, responsive layout and both colour themes. Existing Mermaid and Markdown cases remain unchanged.
- A production-browser hostile-document case must prove readable semantic content, exact request/disk/reload bytes, safe project navigation, zero script/event execution, zero file-created active elements, zero unexpected requests/navigation/page errors and unchanged storage/session state. Run at desktop and 390 px.
- Chromium measurements for a maximum-size long-text document and an adversarial many-node document: Worker parse/projection time, first-visible and fully-materialized time, main-thread Long Tasks and output truncation. Record the built JS/Worker/CSS and release-artifact size delta; no main-thread task attributable to parsing/materialization may exceed the existing approximately 100 ms interaction threshold.
- Frozen installs, focused tests, frontend lint/typecheck/build/coverage, `bun run check:ci`, `git diff --check`, the complete production browser suite, PMA shared/frontend/backend review with no CRITICAL/HIGH findings, a clean worktree, and the normal hosted `bun run check:ci --native` Linux x64/ext4 gate before release.

## Risks

- **HTML is an executable document format.** The proposal intentionally does not mount it as HTML. A standards parser runs off-main-thread, and an application-owned allowlist creates React elements and text only. No file attribute is forwarded and no resource element is created.
- **Semantic preview is not browser fidelity.** CSS, JavaScript, images, media, forms, embedded documents, canvas, SVG and MathML are omitted or represented inertly. Documents depending on them will look different; the UI states that boundary instead of implying full page emulation.
- **Parser/output denial of service.** A 1 MiB file can contain hundreds of thousands of tiny nodes or extreme nesting. Worker isolation, depth/node/text/URL bounds, progressive text materialization and visible truncation keep that from becoming an unbounded React commit.
- **A new public kind crosses many enums.** Backend discovery, search, links, frontend decoders, filters and file operations must agree on both extensions. Strict kind/extension tests prevent a partial rollout that lists files the current client cannot open.
- **Payload and cache growth.** HTML responses carry complete text like Markdown and remain in query/draft baselines, bounded by the configured file limit.

## Scope

`src/shared/contracts.ts`; backend file-kind recognition, parsing/template, discovery/search and their service/HTTP tests; frontend API decoding, extension validation, filtering, icons and link resolution; a new HTML Worker, safe projection policy and document component; workspace integration and existing-token styles; `web/package.json`/`web/bun.lock`; unit, integration, production-browser, performance and security-boundary evidence; README, architecture, changelog and the release record.

Out of scope: editing or saving HTML source, inline Mermaid extraction/editing from HTML, executing scripts, applying file CSS, loading images/media/fonts/subdocuments, submitting forms, browser-faithful page emulation, print/export, changing CSP, server-side HTML rendering and prototype redesign.

## Alternatives

- **Sandboxed `iframe srcdoc`.** Best visual fidelity, but it requires widening the current `frame-src` boundary and still needs sanitization, a restrictive embedded CSP, navigation/resource controls and cross-frame accessibility. Rejected for the first increment.
- **DOMPurify followed by `innerHTML`.** Smaller implementation and more markup fidelity, but adds a same-origin injection sink plus CSS, URL, DOM-clobbering and namespace behavior that the current document boundary avoids. Rejected.
- **Browser `DOMParser` followed by node copying.** The returned document is mostly inert, but parsing can initiate image/frame resource downloads and copied nodes can become active. It also happens on the main thread. Rejected.
- **Display HTML as source text only.** Safest and cheapest, but does not satisfy document support beyond admitting another extension.
- **Add whole-file editing now.** Useful, but it would introduce a new save selector/route, BOM and newline rules, conflicts, draft reconciliation and file-size behavior. Defer to a separate approved proposal after the read-only renderer is accepted.

## Annotations

- 2026-09-16: The owner asked whether HTML document support can be added. No rendering or editing semantics have been approved yet.
- 2026-09-16: Investigation selected a read-only semantic renderer as the recommended boundary. The plan remains draft and implementation has not started.
- 2026-09-16: The owner approved the HTML proposal and authorized implementation.

## Outcome

The read-only HTML document contract, inert semantic renderer, complete file lifecycle and security/performance evidence were implemented and reviewed. Exact candidate `fb9f69809dff4f51210ea1323bcec8d46a7501d1` passed the clean local gate and [hosted Linux x64/ext4 native verification](https://github.com/itxje/merdeck/actions/runs/35051994698).
