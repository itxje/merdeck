# 20260916-0011-html-document-support Add HTML document support

- **status**: completed
- **priority**: P2
- **owner**: html-document-20260916
- **createdAt**: 2026-09-16 00:11

## Description

Investigate and, after approval, add read-only `.html` and `.htm` document support. The proposed acceptance contract is recorded in [the plan](../plan/20260916-0011-html-document-support.md): HTML is parsed in a same-origin Worker, projected to a bounded inert tree and rendered through an explicit React element allowlist; scripts, styles, resource loads, forms, embedded/foreign content and file-provided DOM attributes remain outside the boundary; same-read text and exact disk bytes are preserved; and the new public file kind is covered across discovery, search, links, file operations, browser security evidence and native release acceptance.

## ActiveForm

Adding safe HTML document support.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- The owner requested HTML document support on 2026-09-16. The implementation scope requires approval after investigation because rendering untrusted HTML crosses the frontend execution and resource-loading boundary.
- Investigation (2026-09-16): the current public contract enumerates Mermaid and Markdown in backend parsing, directory search, frontend decoding, filters, link resolution and entry validation. HTML cannot reuse the block-only save contract. Existing Markdown avoids browser-parsed file markup, and the service CSP currently forbids frames. The recommended first increment is therefore a read-only semantic preview rather than an iframe, sanitized `innerHTML` or whole-file editor.
- Dependency check (2026-09-16): `parse5` 8.0.1 is already locked through test tooling and is the current registry release. The proposal promotes that exact version for standards-compatible Worker parsing without creating a browser DOM.
- The owner approved the read-only semantic HTML proposal on 2026-09-16; implementation is in progress.
- Implementation (2026-09-16): added `.html`/`.htm` recognition to the shared, backend and frontend contracts; exact same-read BOM-free text with empty blocks; read-only create/move/delete/search behavior; a direct `parse5` 8.0.1 Worker dependency; a bounded semantic projection and explicit React element allowlist; guarded project/external/fragment navigation; explorer/workspace integration; and hostile-input, decoder, service, HTTP, component, browser and performance coverage. No file markup, file attribute, active/resource element or HTML save path is mounted or exposed.
- Verification (2026-09-16): focused backend/frontend tests, lint, strict types, production build and the complete source `bun run check` passed. The production Chromium hostile document retained exact request/disk/reload bytes at desktop and 390 px, made no unexpected request, executed no script/event code, created no forbidden active node and verified table framing in both themes. The complete production browser suite passed 72 cases with two opt-in performance cases skipped. Separate production performance runs measured a 1 MiB document at 116.6 ms first-visible and 1,110 ms fully materialized, and a 10,000-node adversarial document at 120 ms first-visible and 128 ms truncation, with no observed main-thread Long Task. The clean aggregate and hosted native gates remain required before completion.
- Review (2026-09-16): shared, TypeScript backend and TypeScript frontend review found no remaining CRITICAL/HIGH issue in the HTML boundary. The application-owned tree, strict Worker decoder, no-resource browser evidence and byte-preserving server path remain intact. Task stays in progress until the exact clean candidate passes hosted Linux x64/ext4 acceptance.

- complete: Exact candidate fb9f698 passed the clean local check:ci gate and hosted Linux x64/ext4 native run 35051994698.
